import "server-only";

import { auth } from "@clerk/nextjs/server";

import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "./supabase";
import type {
  CourseCategory,
  CourseForEditor,
  CourseLevel,
  CourseListRow,
  CourseReview,
  LessonBlockKind,
} from "./course-tree";

export type * from "./course-tree";

export const CATEGORIES: CourseCategory[] = [
  "color",
  "cutting",
  "styling",
  "editorial",
  "business",
];

export const LEVELS: CourseLevel[] = ["beginner", "intermediate", "advanced"];

export const BLOCK_KINDS: LessonBlockKind[] = [
  "video",
  "text",
  "image",
  "pdf",
  "embed",
];

/**
 * The educator_profiles id for the signed-in user.
 *
 * Courses are attributed to a profile rather than to a user, so this is the id
 * every authoring write needs. Null means the Clerk account has no profile row
 * yet — the webhook creates one for anybody whose role is `educator`, so in
 * practice this is null only for admins and students.
 */
export async function currentEducatorId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("educator_profiles")
    .select("id, users!inner(clerk_id)")
    .eq("users.clerk_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[courses] educator lookup failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * The same id, creating the profile row if the account has not authored before.
 *
 * `courses.educator_id` is NOT NULL against `educator_profiles`, and the Clerk
 * webhook only ever makes that row for an account whose role is `educator`. So
 * an admin — who may now author, and under 0003's insert policy always could —
 * had nothing to attribute a course to and would have hit a foreign key.
 *
 * The row is the person, not a job title: it carries a headline and a
 * specialization the catalog shows beside their courses, and 0013's trigger
 * mirrors their name and avatar onto it. Attributing team-authored courses to
 * a single house profile was the alternative and would have made every course
 * on the platform say the same thing under its title.
 *
 * Written with the service-role client because `educator_profiles` has no
 * insert policy — 0017 added a self-update policy and deliberately nothing
 * else, since who is an educator is the institute's claim rather than the
 * account's. Creating your own row on your first upload is that claim being
 * made by an admin about themselves, which is the one case where it holds.
 */
export async function ensureAuthorProfile(): Promise<string | null> {
  const existing = await currentEducatorId();
  if (existing) return existing;

  const { userId } = await auth();
  if (!userId) return null;

  const admin = createSupabaseAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("id, role")
    .eq("clerk_id", userId)
    .maybeSingle();

  // Only ever for the team. A student reaching this would be a bug elsewhere,
  // and making them an author would be the wrong way to find out about it.
  if (!user || (user.role !== "admin" && user.role !== "educator")) return null;

  const { data, error } = await admin
    .from("educator_profiles")
    .upsert({ user_id: user.id }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (error) {
    console.error("[courses] could not create an author profile:", error.message);
    return null;
  }
  return data.id;
}

const LIST_SELECT = `
  id, title, subtitle, category, level, is_published, is_featured,
  cover_path, price_cents, lesson_count, total_duration_seconds, enrolled_count,
  created_at, updated_at,
  review_state, review_requested_at, reviewed_at, review_note,
  educator:educator_profiles ( id, users ( full_name ) )
`;

/**
 * RLS does the filtering, not a where clause: an educator's own policy already
 * narrows `courses` to the ones they author, and an admin's widens it to all.
 * Adding an educator_id filter here would silently diverge from that.
 */
export async function listCourses(): Promise<CourseListRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return (data ?? []) as unknown as CourseListRow[];
}


/** The whole course tree in one round trip — the editor renders all of it. */
export async function getCourseForEditor(
  id: string,
): Promise<CourseForEditor | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `${LIST_SELECT}, overview, outcomes, accent, access_months,
       course_modules (
         id, title, position,
         lessons (
           id, title, position, is_preview, duration_seconds,
           lesson_blocks ( id, lesson_id, kind, position, url, body, duration_seconds )
         ),
         quizzes (
           id, title, position, attempts_allowed, show_results, gates_progress,
           quiz_questions (
             id, prompt, type, explanation, hint, is_required, media_url, position,
             quiz_choices ( id, body, is_correct, position )
           )
         )
       )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load course: ${error.message}`);
  if (!data) return null;

  const course = data as unknown as CourseForEditor;

  // PostgREST will not order nested embeds, so the tree is sorted here. The
  // editor and the mobile player both treat `position` as the running order,
  // and an unsorted tree would show an author their lessons shuffled.
  course.course_modules.sort((a, b) => a.position - b.position);
  for (const chapter of course.course_modules) {
    chapter.lessons.sort((a, b) => a.position - b.position);
    for (const lesson of chapter.lessons) {
      lesson.lesson_blocks.sort((a, b) => a.position - b.position);
    }
    chapter.quizzes.sort((a, b) => a.position - b.position);
    for (const quiz of chapter.quizzes) {
      quiz.quiz_questions.sort((a, b) => a.position - b.position);
      for (const question of quiz.quiz_questions) {
        question.quiz_choices.sort((a, b) => a.position - b.position);
      }
    }
  }

  return course;
}

/**
 * Every review this course has been through, newest first.
 *
 * Read separately from the tree rather than embedded in it: the editor and the
 * catalog both load the tree on every navigation and neither draws the
 * history, so putting it in LIST_SELECT would pull a growing list of rows into
 * a query that is on the hot path for both roles.
 */
export async function getCourseReviews(
  courseId: string,
): Promise<CourseReview[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select(
      "id, requested_at, request_note, origin, state, decided_at, decision_note",
    )
    .eq("course_id", courseId)
    .order("requested_at", { ascending: false });

  if (error) {
    // A history that will not load is not worth 500ing the page it annotates.
    console.error("[courses] review history failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as CourseReview[];
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "0 min";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
