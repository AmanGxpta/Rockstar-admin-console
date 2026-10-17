import "server-only";

import { getAuthState } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { Database } from "@/types/database";

export type SubmissionStatus =
  Database["public"]["Enums"]["submission_status"];

export type SubmissionMedia = {
  id: string;
  kind: "image" | "video";
  /** Signed for an hour; null when Storage would not sign the object. */
  url: string | null;
};

export type SubmissionFeedback = {
  id: string;
  body: string;
  resulting_status: SubmissionStatus;
  created_at: string;
  /** Null when the reviewer was an admin — see `nameReviewers` below. */
  reviewer_name: string | null;
  is_you: boolean;
};

export type SubmissionSummary = {
  id: string;
  status: SubmissionStatus;
  response: string;
  revision_count: number;
  submitted_at: string;
  reviewed_at: string | null;
  student_name: string;
  student_email: string | null;
  course_title: string;
  /** Null for the course-wide submission — 0016's "Final reflection". */
  module_title: string | null;
  media_count: number;
  /** First attachment only, for the card. The detail screen signs them all. */
  thumbnail: string | null;
  thumbnail_kind: "image" | "video" | null;
};

export type SubmissionDetail = SubmissionSummary & {
  course_id: string;
  media: SubmissionMedia[];
  feedback: SubmissionFeedback[];
};

/**
 * No educator filter anywhere in this module.
 *
 * 0016's "authors read submissions on their courses" already narrows every
 * one of these queries to the courses this account authors, and widens it for
 * an admin. A second filter here would be a divergent copy of that rule — the
 * same reasoning `listCourses` carries.
 */
const LIST_SELECT = `
  id, course_id, module_id, response, status, revision_count,
  submitted_at, reviewed_at,
  course:courses ( id, title ),
  module:course_modules ( id, title ),
  enrollment:enrollments ( id, user:users ( id, full_name, email ) ),
  media:submission_media ( id, path, kind, position )
`;

type Row = {
  id: string;
  course_id: string;
  module_id: string | null;
  response: string;
  status: SubmissionStatus;
  revision_count: number;
  submitted_at: string;
  reviewed_at: string | null;
  course: { id: string; title: string } | null;
  module: { id: string; title: string } | null;
  enrollment: {
    id: string;
    user: { id: string; full_name: string | null; email: string } | null;
  } | null;
  media: { id: string; path: string; kind: string; position: number }[] | null;
};

type FeedbackRow = {
  id: string;
  body: string;
  resulting_status: SubmissionStatus;
  created_at: string;
  author_id: string;
};

/**
 * Embedded without `!inner`, deliberately.
 *
 * 0013's lesson: PostgREST resolves `!inner` as an inner join, so a `users`
 * row the caller cannot read removes the whole submission from the result
 * rather than merely blanking the name. 0022 gives an educator the rows of
 * students enrolled on their own courses, so in practice this resolves — but
 * a student who was deleted, or a policy that changes again, should cost the
 * queue a name and not the card.
 */
function studentName(row: Row): string {
  const user = row.enrollment?.user;
  return user?.full_name?.trim() || user?.email || "Unnamed student";
}

function mediaKind(kind: string): "image" | "video" {
  return kind === "video" ? "video" : "image";
}

function sortedMedia(row: Row) {
  return [...(row.media ?? [])].sort((a, b) => a.position - b.position);
}

type Supabase = ReturnType<typeof createSupabaseServerClient>;

/** One Storage round trip for however many objects, rather than one each. */
async function signAll(
  supabase: Supabase,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from("submissions")
    .createSignedUrls(unique, 60 * 60);

  // A gallery that cannot be signed should still show the written half of the
  // submission, so a failure here costs the images and not the screen.
  if (error || !data) return new Map();

  const out = new Map<string, string>();
  data.forEach((signed, i) => {
    if (signed.signedUrl) out.set(unique[i], signed.signedUrl);
  });
  return out;
}

function toSummary(row: Row, signed: Map<string, string>): SubmissionSummary {
  const media = sortedMedia(row);
  const first = media[0];

  return {
    id: row.id,
    status: row.status,
    response: row.response,
    revision_count: row.revision_count,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    student_name: studentName(row),
    student_email: row.enrollment?.user?.email ?? null,
    course_title: row.course?.title ?? "Removed course",
    module_title: row.module?.title ?? null,
    media_count: media.length,
    thumbnail: first ? (signed.get(first.path) ?? null) : null,
    thumbnail_kind: first ? mediaKind(first.kind) : null,
  };
}

/** The review queue: everything filed on a course this account authors. */
export async function listSubmissions(): Promise<SubmissionSummary[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("submissions")
    .select(LIST_SELECT)
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(`Could not load submissions: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];

  // Only the first attachment of each row is signed: the card shows one
  // thumbnail, and signing a whole queue's worth of galleries to draw it
  // would be dozens of URLs nobody looks at.
  const signed = await signAll(
    supabase,
    rows.map((row) => sortedMedia(row)[0]?.path).filter((p): p is string => !!p),
  );

  return rows.map((row) => toSummary(row, signed));
}

/**
 * Who wrote each note.
 *
 * `submission_feedback.author_id` points at `users`, and an educator can read
 * their own row and their students' (0022) — not another reviewer's. So names
 * come from `educator_profiles`, the public mirror 0013 keeps for exactly this
 * problem. An admin reviewer has no profile row and stays unnamed; the screen
 * calls them "A reviewer" rather than inventing one.
 */
async function nameReviewers(
  supabase: Supabase,
  authorIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(authorIds)];
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("educator_profiles")
    .select("user_id, display_name")
    .in("user_id", unique);

  const names = new Map<string, string>();
  (data ?? []).forEach((row) => {
    // user_id is nullable: a profile can exist before the Clerk webhook has
    // attached it to an account.
    if (row.user_id && row.display_name) names.set(row.user_id, row.display_name);
  });
  return names;
}

/**
 * The signed-in account's `users.id`, read off the request's cached session
 * rather than looked up again by Clerk id.
 */
export async function currentUserId(): Promise<string | null> {
  const state = await getAuthState();
  return state.status === "ok" ? state.session.userId : null;
}

export async function getSubmission(
  id: string,
): Promise<SubmissionDetail | null> {
  const supabase = createSupabaseServerClient();

  const [{ data, error }, { data: notes }, me] = await Promise.all([
    supabase.from("submissions").select(LIST_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("submission_feedback")
      .select("id, body, resulting_status, created_at, author_id")
      .eq("submission_id", id)
      .order("created_at", { ascending: false }),
    currentUserId(),
  ]);

  if (error) throw new Error(`Could not load submission: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as Row;
  const media = sortedMedia(row);
  const feedback = (notes ?? []) as FeedbackRow[];

  const [signed, names] = await Promise.all([
    signAll(supabase, media.map((m) => m.path)),
    nameReviewers(
      supabase,
      feedback.map((f) => f.author_id),
    ),
  ]);

  return {
    ...toSummary(row, signed),
    course_id: row.course_id,
    media: media.map((m) => ({
      id: m.id,
      kind: mediaKind(m.kind),
      url: signed.get(m.path) ?? null,
    })),
    feedback: feedback.map((f) => ({
      id: f.id,
      body: f.body,
      resulting_status: f.resulting_status,
      created_at: f.created_at,
      reviewer_name: names.get(f.author_id) ?? null,
      is_you: me !== null && f.author_id === me,
    })),
  };
}

/** "3 days ago" — the queue reads as a backlog, so age is the useful unit. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
