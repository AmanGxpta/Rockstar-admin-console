import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "./supabase";
import type {
  CourseCategory,
  CourseForEditor,
  CourseLevel,
  CourseListRow,
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

const LIST_SELECT = `
  id, title, subtitle, category, level, is_published, is_featured,
  cover_path, price_cents, lesson_count, total_duration_seconds, enrolled_count,
  created_at, updated_at,
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

export function formatDuration(seconds: number): string {
  if (!seconds) return "0 min";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
