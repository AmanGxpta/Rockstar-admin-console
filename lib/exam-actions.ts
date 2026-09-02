"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { ActionResult } from "./course-actions";
import type { QuestionDraft } from "./quiz-draft";

const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function num(form: FormData, key: string): number {
  return Number(String(form.get(key) ?? "").trim());
}

export async function saveExamSettings(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");

  const courseId = String(form.get("courseId") ?? "");
  const question_count = num(form, "question_count");
  const duration_minutes = num(form, "duration_minutes");
  const pass_percent = num(form, "pass_percent");
  const attempts_allowed = num(form, "attempts_allowed");

  // These four all carry check constraints in 0002; catching them here means
  // the author reads a sentence rather than a Postgres constraint name.
  if (!Number.isInteger(question_count) || question_count < 1) {
    return { error: "The exam needs at least one question." };
  }
  if (!Number.isInteger(duration_minutes) || duration_minutes < 1) {
    return { error: "Give the exam a time limit of at least a minute." };
  }
  if (!Number.isInteger(pass_percent) || pass_percent < 1 || pass_percent > 100) {
    return { error: "The pass mark must be between 1 and 100." };
  }
  if (!Number.isInteger(attempts_allowed) || attempts_allowed < 1) {
    return { error: "Allow at least one attempt." };
  }

  const supabase = createSupabaseServerClient();
  const { count } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .is("quiz_id", null);

  if ((count ?? 0) < question_count) {
    return {
      error: `The bank holds ${count ?? 0} question${
        count === 1 ? "" : "s"
      }, so the exam cannot draw ${question_count}.`,
    };
  }

  const { error } = await supabase.from("exams").upsert({
    course_id: courseId,
    question_count,
    duration_minutes,
    pass_percent,
    attempts_allowed,
    grants_certificate: form.get("grants_certificate") === "on",
  });

  if (error) return { error: error.message };
  revalidatePath(`/educator/exam/${courseId}`);
  return { ok: true };
}

/**
 * Writes one question into the course-wide bank.
 *
 * A bank question is a quiz_questions row with no quiz_id — that null is what
 * separates the exam pool from the chapter quizzes, and what submit_exam()
 * counts.
 */
export async function saveExamQuestion(
  courseId: string,
  draft: QuestionDraft,
  position: number,
): Promise<ActionResult> {
  await requireSession("educator");

  if (!draft.prompt.trim()) return { error: "The question needs a prompt." };
  if (draft.choices.length < 2) {
    return { error: "Give the question at least two options." };
  }
  if (draft.choices.filter((c) => c.isCorrect).length !== 1) {
    return { error: "Exam questions need exactly one correct answer." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("quiz_questions").upsert({
    id: draft.id,
    course_id: courseId,
    quiz_id: null,
    module_id: null,
    type: draft.type,
    topic: "Final exam",
    prompt: draft.prompt.trim(),
    explanation: draft.explanation.trim() || null,
    hint: draft.hint.trim() || null,
    is_required: draft.isRequired,
    media_url: draft.mediaUrl,
    position,
  });
  if (error) return { error: error.message };

  const { error: clearError } = await supabase
    .from("quiz_choices")
    .delete()
    .eq("question_id", draft.id);
  if (clearError) return { error: clearError.message };

  const { error: choiceError } = await supabase.from("quiz_choices").insert(
    draft.choices.map((c, i) => ({
      id: c.id,
      question_id: draft.id,
      label: LABELS[i] ?? String(i + 1),
      body: c.body.trim(),
      is_correct: c.isCorrect,
      position: i + 1,
    })),
  );
  if (choiceError) return { error: choiceError.message };

  revalidatePath(`/educator/exam/${courseId}`);
  return { ok: true };
}

export async function deleteExamQuestion(
  courseId: string,
  questionId: string,
): Promise<ActionResult> {
  await requireSession("educator");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("quiz_questions")
    .delete()
    .eq("id", questionId);

  if (error) return { error: error.message };
  revalidatePath(`/educator/exam/${courseId}`);
  return { ok: true };
}
