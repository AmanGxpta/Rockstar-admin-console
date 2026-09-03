import "server-only";

import { createSupabaseServerClient } from "./supabase";
import type { Database } from "@/types/database";

/**
 * Reads behind the admin console's reporting screens.
 *
 * Scoped by RLS rather than by a where clause: these pages are admin-only, and
 * an admin's policies already widen `users`, `enrollments` and `certificates`
 * to the whole platform. Someone reaching these queries without the role sees
 * their own rows and nothing else, which is the right failure rather than a
 * leak.
 *
 * Aggregation happens in JS over narrow selects, because PostgREST has no
 * GROUP BY. That is honest at the current size and would not be past a few
 * thousand enrollments; at that point these become SQL views or RPCs and the
 * page code does not change.
 */

export type CourseCategory = Database["public"]["Enums"]["course_category"];

export type PlatformTotals = {
  students: number;
  educators: number;
  courses: number;
  published: number;
  enrollments: number;
  certificates: number;
  entitlements: number;
  /** Percentage of enrolled lessons completed across the platform, 0–100. */
  completionRate: number;
};

export async function getPlatformTotals(): Promise<PlatformTotals> {
  const supabase = createSupabaseServerClient();

  const [users, educators, courses, enrollments, certificates, entitlements] =
    await Promise.all([
      supabase.from("users").select("role"),
      supabase.from("educator_profiles").select("id", { count: "exact", head: true }),
      supabase.from("courses").select("is_published, lesson_count"),
      supabase.from("enrollments").select("course_id"),
      supabase.from("certificates").select("id", { count: "exact", head: true }),
      supabase.from("entitlements").select("id", { count: "exact", head: true }),
    ]);

  const courseRows = courses.data ?? [];
  const enrollmentRows = enrollments.data ?? [];

  // Completion is derived, never stored: the denominator is every lesson of
  // every course somebody is enrolled in, so adding a lesson to a live course
  // correctly moves the rate down rather than leaving it stale.
  const lessonsByCourse = new Map<string, number>();
  const { data: allCourses } = await supabase.from("courses").select("id, lesson_count");
  for (const c of allCourses ?? []) lessonsByCourse.set(c.id, c.lesson_count);

  const enrolledLessons = enrollmentRows.reduce(
    (total, e) => total + (lessonsByCourse.get(e.course_id) ?? 0),
    0,
  );
  const { count: completed } = await supabase
    .from("lesson_completions")
    .select("lesson_id", { count: "exact", head: true });

  return {
    students: (users.data ?? []).filter((u) => u.role === "student").length,
    educators: educators.count ?? 0,
    courses: courseRows.length,
    published: courseRows.filter((c) => c.is_published).length,
    enrollments: enrollmentRows.length,
    certificates: certificates.count ?? 0,
    entitlements: entitlements.count ?? 0,
    completionRate: enrolledLessons
      ? Math.round(((completed ?? 0) / enrolledLessons) * 100)
      : 0,
  };
}

/** Enrollments per calendar month, oldest first, for the last `months`. */
export async function getEnrollmentTrend(
  months = 12,
): Promise<{ labels: string[]; data: number[] }> {
  const supabase = createSupabaseServerClient();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("enrollments")
    .select("enrolled_at")
    .gte("enrolled_at", since.toISOString());

  const buckets = new Map<string, number>();
  const labels: string[] = [];
  const keys: string[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    keys.push(key);
    buckets.set(key, 0);
    labels.push(d.toLocaleString("en", { month: "short" }));
  }
  for (const row of data ?? []) {
    const d = new Date(row.enrolled_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return { labels, data: keys.map((k) => buckets.get(k) ?? 0) };
}

/** Enrollment share by course category, busiest first. */
export async function getCategoryMix(): Promise<
  { label: CourseCategory; count: number; percent: number }[]
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("enrollments")
    .select("course:courses ( category )");

  const counts = new Map<CourseCategory, number>();
  for (const row of (data ?? []) as unknown as {
    course: { category: CourseCategory } | null;
  }[]) {
    const cat = row.course?.category;
    if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------------ people --

export type StudentRow = {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
  enrollments: number;
  certificates: number;
};

export async function listStudents(): Promise<StudentRow[]> {
  const supabase = createSupabaseServerClient();
  const [{ data: users }, { data: enrollments }, { data: certs }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, is_active, created_at")
        .eq("role", "student")
        .order("created_at", { ascending: false }),
      supabase.from("enrollments").select("user_id"),
      supabase.from("certificates").select("user_id"),
    ]);

  const tally = (rows: { user_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const byEnrollment = tally(enrollments);
  const byCert = tally(certs);

  return (users ?? []).map((u) => ({
    ...u,
    enrollments: byEnrollment.get(u.id) ?? 0,
    certificates: byCert.get(u.id) ?? 0,
  }));
}

export type StudentAccess = {
  status: string;
  expires_at: string | null;
  source: string;
};

export type StudentDetail = StudentRow & {
  /**
   * Every course the student is enrolled in *or* entitled to — the two are
   * not the same set. An admin grant creates access before any enrolment
   * exists, and a lapsed entitlement leaves the enrolment behind, so a list
   * built from either one alone hides half the story.
   */
  courses: {
    id: string;
    title: string;
    enrolled_at: string | null;
    entitlement: StudentAccess | null;
  }[];
  awarded: { id: string; course_title: string; reference: string; issued_at: string }[];
};

/** The courses an admin can hand out. */
export async function listGrantableCourses(): Promise<
  { id: string; title: string }[]
> {
  const supabase = createSupabaseServerClient();
  // Published only: an entitlement to an unpublished course buys nothing —
  // enroll_in_course refuses it and the app's catalog never lists it.
  const { data } = await supabase
    .from("courses")
    .select("id, title")
    .eq("is_published", true)
    .order("title");

  return data ?? [];
}

export async function getStudent(id: string): Promise<StudentDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, full_name, email, is_active, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!user) return null;

  const [{ data: enrollments }, { data: entitlements }, { data: certs }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("course_id, enrolled_at, course:courses ( id, title )")
        .eq("user_id", id)
        .order("enrolled_at", { ascending: false }),
      supabase
        .from("entitlements")
        .select("course_id, status, expires_at, source, course:courses ( id, title )")
        .eq("user_id", id),
      supabase
        .from("certificates")
        .select("id, course_title, reference, issued_at")
        .eq("user_id", id)
        .order("issued_at", { ascending: false }),
    ]);

  const rights = (entitlements ?? []) as unknown as {
    course_id: string;
    status: string;
    expires_at: string | null;
    source: string;
    course: { id: string; title: string } | null;
  }[];

  const byCourse = new Map(
    rights.map((e) => [
      e.course_id,
      { status: e.status, expires_at: e.expires_at, source: e.source },
    ]),
  );

  const rows = new Map<string, StudentDetail["courses"][number]>();

  for (const e of (enrollments ?? []) as unknown as {
    course_id: string;
    enrolled_at: string;
    course: { id: string; title: string } | null;
  }[]) {
    rows.set(e.course_id, {
      id: e.course_id,
      title: e.course?.title ?? "Removed course",
      enrolled_at: e.enrolled_at,
      entitlement: byCourse.get(e.course_id) ?? null,
    });
  }

  // Access granted but never opened: no enrolment row exists yet, and the
  // student would be invisible on this screen without this pass.
  for (const e of rights) {
    if (rows.has(e.course_id)) continue;
    rows.set(e.course_id, {
      id: e.course_id,
      title: e.course?.title ?? "Removed course",
      enrolled_at: null,
      entitlement: byCourse.get(e.course_id) ?? null,
    });
  }

  return {
    ...user,
    enrollments: (enrollments ?? []).length,
    certificates: (certs ?? []).length,
    courses: [...rows.values()],
    awarded: certs ?? [],
  };
}

export type EducatorRow = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  headline: string | null;
  specialization: string | null;
  is_verified: boolean;
  courses: number;
  published: number;
  students: number;
};

export async function listEducators(): Promise<EducatorRow[]> {
  const supabase = createSupabaseServerClient();
  const [{ data: profiles }, { data: courses }] = await Promise.all([
    supabase
      .from("educator_profiles")
      .select("id, user_id, headline, specialization, is_verified, users ( full_name, email )"),
    supabase.from("courses").select("educator_id, is_published, enrolled_count"),
  ]);

  return ((profiles ?? []) as unknown as {
    id: string;
    user_id: string | null;
    headline: string | null;
    specialization: string | null;
    is_verified: boolean;
    users: { full_name: string | null; email: string } | null;
  }[]).map((p) => {
    const mine = (courses ?? []).filter((c) => c.educator_id === p.id);
    return {
      id: p.id,
      user_id: p.user_id,
      full_name: p.users?.full_name ?? null,
      email: p.users?.email ?? null,
      headline: p.headline,
      specialization: p.specialization,
      is_verified: p.is_verified,
      courses: mine.length,
      published: mine.filter((c) => c.is_published).length,
      students: mine.reduce((a, c) => a + c.enrolled_count, 0),
    };
  });
}

export type CertificateRow = {
  id: string;
  reference: string;
  course_title: string;
  educator_name: string;
  recipient_name: string;
  issued_at: string;
};

export async function listCertificates(): Promise<CertificateRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("id, reference, course_title, educator_name, recipient_name, issued_at")
    .order("issued_at", { ascending: false });
  if (error) throw new Error(`Could not load certificates: ${error.message}`);
  return data ?? [];
}

// ---------------------------------------------------------------- commerce --

export type PurchaseRow = {
  id: string;
  provider: string;
  amount_cents: number;
  currency: string;
  status: Database["public"]["Enums"]["purchase_status"];
  purchased_at: string | null;
  created_at: string;
  user: { full_name: string | null; email: string } | null;
  course: { title: string } | null;
};

export async function listPurchases(): Promise<PurchaseRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("purchases")
    .select(
      `id, provider, amount_cents, currency, status, purchased_at, created_at,
       user:users ( full_name, email ), course:courses ( title )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load purchases: ${error.message}`);
  return (data ?? []) as unknown as PurchaseRow[];
}

export function formatMinor(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ------------------------------------------------------- educator's own -----

export type EducatorTotals = {
  courses: number;
  published: number;
  students: number;
  certificates: number;
  attempts: number;
  passed: number;
};

/**
 * Totals for the signed-in educator.
 *
 * No educator_id filter anywhere: RLS already narrows `courses` to the ones
 * they author, and 0004 narrows `exam_attempts` and `certificates` to their own
 * courses. Filtering here as well would be a second rule to keep in step with
 * the first.
 */
export async function getEducatorTotals(): Promise<EducatorTotals> {
  const supabase = createSupabaseServerClient();
  const [{ data: courses }, { data: attempts }, { count: certificates }] =
    await Promise.all([
      supabase.from("courses").select("is_published, enrolled_count"),
      supabase.from("exam_attempts").select("passed"),
      supabase.from("certificates").select("id", { count: "exact", head: true }),
    ]);

  const rows = courses ?? [];
  return {
    courses: rows.length,
    published: rows.filter((c) => c.is_published).length,
    students: rows.reduce((a, c) => a + c.enrolled_count, 0),
    certificates: certificates ?? 0,
    attempts: (attempts ?? []).length,
    passed: (attempts ?? []).filter((a) => a.passed).length,
  };
}

// ------------------------------------------------------ course report -----

export type CourseReportRow = {
  id: string;
  title: string;
  category: CourseCategory;
  educator_name: string;
  is_published: boolean;
  enrolled: number;
  lessons: number;
  attempts: number;
  passed: number;
  certificates: number;
};

/**
 * Per-course performance for the admin report.
 *
 * Completion is reported as exam pass rate rather than lessons-watched: a
 * true completion percentage would mean counting lesson_completions against
 * enrolled × lesson_count for every course, which is a table scan per row.
 * Pass rate answers the same question from data that is already aggregated.
 */
export async function getCourseReport(): Promise<CourseReportRow[]> {
  const supabase = createSupabaseServerClient();

  const [courses, attempts, certificates] = await Promise.all([
    supabase
      .from("courses")
      .select(
        `id, title, category, is_published, enrolled_count, lesson_count,
         educator:educator_profiles ( users ( full_name ) )`,
      )
      .order("enrolled_count", { ascending: false }),
    supabase.from("exam_attempts").select("course_id, passed"),
    supabase.from("certificates").select("course_id"),
  ]);

  if (courses.error) {
    throw new Error(`Could not load course report: ${courses.error.message}`);
  }

  const rows = (courses.data ?? []) as unknown as {
    id: string;
    title: string;
    category: CourseCategory;
    is_published: boolean;
    enrolled_count: number;
    lesson_count: number;
    educator: { users: { full_name: string | null } | null } | null;
  }[];

  const byCourse = new Map<string, { attempts: number; passed: number }>();
  for (const a of attempts.data ?? []) {
    const entry = byCourse.get(a.course_id) ?? { attempts: 0, passed: 0 };
    entry.attempts += 1;
    if (a.passed) entry.passed += 1;
    byCourse.set(a.course_id, entry);
  }

  const certCount = new Map<string, number>();
  for (const c of certificates.data ?? []) {
    certCount.set(c.course_id, (certCount.get(c.course_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const a = byCourse.get(r.id) ?? { attempts: 0, passed: 0 };
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      educator_name: r.educator?.users?.full_name ?? "Unassigned",
      is_published: r.is_published,
      enrolled: r.enrolled_count,
      lessons: r.lesson_count,
      attempts: a.attempts,
      passed: a.passed,
      certificates: certCount.get(r.id) ?? 0,
    };
  });
}

/**
 * Certificates bucketed by month, oldest first.
 *
 * Returns a fixed-length window so the chart keeps its shape on a quiet month
 * rather than redrawing with fewer bars.
 */
export function certificatesByMonth(
  certificates: CertificateRow[],
  months = 7,
): { labels: string[]; data: number[] } {
  const now = new Date();
  const labels: string[] = [];
  const keys: string[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("en-GB", { month: "short" }));
    keys.push(`${d.getFullYear()}-${d.getMonth()}`);
  }

  const counts = new Map<string, number>();
  for (const c of certificates) {
    const d = new Date(c.issued_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return { labels, data: keys.map((k) => counts.get(k) ?? 0) };
}

/** Certificates grouped by the course title recorded on them. */
export function certificatesByCourse(
  certificates: CertificateRow[],
): { title: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of certificates) {
    counts.set(c.course_title, (counts.get(c.course_title) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}
