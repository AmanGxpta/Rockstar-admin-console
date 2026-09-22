import "server-only";

import { createSupabaseServerClient } from "./supabase";

/**
 * The queue behind "Request access".
 *
 * The mobile app stopped enrolling students in 0034: the button on a course
 * now opens a row here and waits. Reading it needs no role filter — the select
 * policy is `is_admin() or user_id = current_user_id()`, so this comes back as
 * the whole queue for the team and as your own two rows for anybody else,
 * which is the same rule rather than a second copy of it.
 */

export type AccessRequestState =
  | "pending"
  | "approved"
  | "declined"
  | "withdrawn";

export type AccessRequestRow = {
  id: string;
  state: AccessRequestState;
  note: string | null;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  student: { id: string; name: string; email: string | null };
  course: { id: string; title: string; coverPath: string | null };
};

const SELECT = `
  id, state, note, decision_note, created_at, decided_at,
  student:users!course_access_requests_user_id_fkey ( id, full_name, email ),
  course:courses ( id, title, cover_path )
`;

type Row = {
  id: string;
  state: AccessRequestState;
  note: string | null;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  student: { id: string; full_name: string | null; email: string | null } | null;
  course: { id: string; title: string; cover_path: string | null } | null;
};

function shape(row: Row): AccessRequestRow {
  return {
    id: row.id,
    state: row.state,
    note: row.note,
    decisionNote: row.decision_note,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
    student: {
      id: row.student?.id ?? "",
      name: row.student?.full_name?.trim() || "A student",
      email: row.student?.email ?? null,
    },
    course: {
      id: row.course?.id ?? "",
      title: row.course?.title ?? "A course",
      coverPath: row.course?.cover_path ?? null,
    },
  };
}

/**
 * Pending first and oldest first within it, then everything answered, newest
 * first. A support queue ordered newest-first leaves the person who asked on
 * Monday still waiting on Friday.
 */
export async function listAccessRequests(): Promise<AccessRequestRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_access_requests")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[access] queue lookup failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as Row[];
  const pending = rows
    .filter((r) => r.state === "pending")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const rest = rows.filter((r) => r.state !== "pending");

  return [...pending, ...rest].map(shape);
}

/** What the sidebar badge draws. A head count, so no rows come back with it. */
export async function countPendingAccessRequests(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { count, error } = await supabase
    .from("course_access_requests")
    .select("id", { count: "exact", head: true })
    .eq("state", "pending");

  if (error) {
    console.error("[access] pending count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Everyone currently enrolled on one course, for its own page. */
export type EnrolledStudent = {
  id: string;
  name: string;
  email: string | null;
  enrolledAt: string;
  /** Null means open-ended access; a past date means it has lapsed. */
  expiresAt: string | null;
  isActive: boolean;
};

export async function listCourseStudents(
  courseId: string,
): Promise<EnrolledStudent[]> {
  const supabase = createSupabaseServerClient();

  // Two reads rather than an embed. `entitlements` and `enrollments` are
  // separate rows with separate policies, and an `!inner` join on the first
  // would drop any student whose access has been revoked — who is exactly the
  // person this list exists to show as lapsed.
  const [{ data: rows, error }, { data: grants }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("enrolled_at, user:users ( id, full_name, email )")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("entitlements")
      .select("user_id, status, expires_at")
      .eq("course_id", courseId),
  ]);

  if (error) {
    console.error("[access] course students failed:", error.message);
    return [];
  }

  const now = Date.now();
  const access = new Map(
    (grants ?? []).map((g) => [
      g.user_id,
      {
        live:
          g.status === "active" &&
          (g.expires_at === null || Date.parse(g.expires_at) > now),
        expiresAt: g.expires_at,
      },
    ]),
  );

  return ((rows ?? []) as unknown as {
    enrolled_at: string;
    user: { id: string; full_name: string | null; email: string | null } | null;
  }[])
    .filter((row) => row.user)
    .map((row) => {
      const grant = access.get(row.user!.id);
      return {
        id: row.user!.id,
        name: row.user!.full_name?.trim() || "A student",
        email: row.user!.email ?? null,
        enrolledAt: row.enrolled_at,
        expiresAt: grant?.expiresAt ?? null,
        isActive: grant?.live ?? false,
      };
    });
}
