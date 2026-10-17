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
  /**
   * Rows in `educator_profiles`, which is "people who have authored a course"
   * rather than "people whose role is educator". Those were the same thing
   * until the team started uploading: ensureAuthorProfile() now makes one of
   * these for any admin on their first upload, so this counts them too.
   */
  authors: number;
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

  // One round of queries, not three. `courses` carries `id` so the completion
  // denominator can be built from this same result — it used to be read a
  // second time, identically but for the column list, after the batch had
  // already resolved. That read and the `lesson_completions` count below
  // depend on nothing in here, so both have joined the batch: the function is
  // now one round trip deep instead of three, which on this screen was three
  // sequential hops to Sydney before a single figure rendered.
  const [
    users,
    educators,
    courses,
    enrollments,
    certificates,
    entitlements,
    completions,
  ] = await Promise.all([
    supabase.from("users").select("role"),
    supabase.from("educator_profiles").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id, is_published, lesson_count"),
    supabase.from("enrollments").select("course_id"),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
    supabase.from("entitlements").select("id", { count: "exact", head: true }),
    supabase.from("lesson_completions").select("lesson_id", { count: "exact", head: true }),
  ]);

  const courseRows = courses.data ?? [];
  const enrollmentRows = enrollments.data ?? [];

  // Completion is derived, never stored: the denominator is every lesson of
  // every course somebody is enrolled in, so adding a lesson to a live course
  // correctly moves the rate down rather than leaving it stale.
  const lessonsByCourse = new Map<string, number>();
  for (const c of courseRows) lessonsByCourse.set(c.id, c.lesson_count);

  const enrolledLessons = enrollmentRows.reduce(
    (total, e) => total + (lessonsByCourse.get(e.course_id) ?? 0),
    0,
  );
  const completed = completions.count;

  return {
    students: (users.data ?? []).filter((u) => u.role === "student").length,
    authors: educators.count ?? 0,
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
  // The three lists below are keyed on `id`, the argument — not on anything
  // the user row returns — so waiting for that row before starting them only
  // ever cost a round trip. The existence check still happens, just after the
  // reads rather than in front of them; the worst case is three small queries
  // for a student id that turns out not to exist, which is a 404 nobody is
  // sitting behind.
  const [{ data: user }, { data: enrollments }, { data: entitlements }, { data: certs }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, is_active, created_at")
        .eq("id", id)
        .maybeSingle(),
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

  if (!user) return null;

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

export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
