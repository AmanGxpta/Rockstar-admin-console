import "server-only";

import { createSupabaseServerClient } from "./supabase";
import type { EditorQuestion } from "./course-tree";

export type ExamSettings = {
  course_id: string;
  question_count: number;
  duration_minutes: number;
  pass_percent: number;
  attempts_allowed: number;
  grants_certificate: boolean;
};

export type ExamForBuilder = {
  settings: ExamSettings | null;
  /** The course-wide bank: questions with no chapter quiz above them. */
  bank: EditorQuestion[];
};

/**
 * The final exam and the pool it draws from.
 *
 * A course can have a bank without an `exams` row — that is the state before
 * an author has set the terms — so settings is nullable and the page renders
 * defaults rather than 404ing.
 */
export async function getExamForCourse(
  courseId: string,
): Promise<ExamForBuilder> {
  const supabase = createSupabaseServerClient();

  const [exam, questions] = await Promise.all([
    supabase.from("exams").select("*").eq("course_id", courseId).maybeSingle(),
    supabase
      .from("quiz_questions")
      .select(
        `id, prompt, type, explanation, hint, is_required, media_url, position,
         quiz_choices ( id, body, is_correct, position )`,
      )
      .eq("course_id", courseId)
      .is("quiz_id", null)
      .order("position"),
  ]);

  if (exam.error) throw new Error(`Could not load exam: ${exam.error.message}`);
  if (questions.error) {
    throw new Error(`Could not load exam questions: ${questions.error.message}`);
  }

  const bank = (questions.data ?? []) as unknown as EditorQuestion[];
  for (const q of bank) q.quiz_choices.sort((a, b) => a.position - b.position);

  return { settings: exam.data as ExamSettings | null, bank };
}
