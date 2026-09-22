"use server";

import { revalidatePath } from "next/cache";

import { requireTeam } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { ActionResult } from "./course-actions";
import type { QuizDraft } from "./quiz-draft";
import { QUESTION_TYPES } from "./quiz-draft";

/** Choices are labelled A, B, C… by position; the design does not ask for one. */
const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function validate(draft: QuizDraft): string | null {
  if (!draft.courseId || !draft.moduleId) return "Missing course or chapter.";
  for (const q of draft.questions) {
    if (!QUESTION_TYPES.some((t) => t.value === q.type)) {
      return "Unknown question type.";
    }
    if (q.choices.length < 2) {
      return "Every question needs at least two options.";
    }
    if (q.type === "image" && !q.mediaUrl) {
      return "An Image ID question needs a reference image.";
    }
    if (q.type === "mc" || q.type === "image") {
      const correct = q.choices.filter((c) => c.isCorrect).length;
      if (correct > 1) {
        return "A multiple-choice question can only have one correct answer.";
      }
    }
  }
  return null;
}

/**
 * Where a new quiz sits in its chapter.
 *
 * Lessons and quizzes share one position space inside a module, so appending
 * has to look at both — taking the max of only one of them would drop the new
 * quiz into the middle of the chapter.
 */
async function nextChapterPosition(moduleId: string): Promise<number> {
  const supabase = createSupabaseServerClient();
  const [lessons, quizzes] = await Promise.all([
    supabase
      .from("lessons")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("quizzes")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    Math.max(lessons.data?.position ?? 0, quizzes.data?.position ?? 0) + 1
  );
}

export async function saveQuiz(draft: QuizDraft): Promise<ActionResult> {
  await requireTeam();

  const problem = validate(draft);
  if (problem) return { error: problem };

  const supabase = createSupabaseServerClient();
  const title = draft.title.trim() || "Untitled quiz";

  // Upsert the quiz itself. A quiz the author has never saved arrives with an
  // id already minted in the browser, so this is one path rather than two.
  // An existing quiz keeps the slot it already holds in the chapter; a new
  // one is appended after the last clip.
  const { data: existing } = await supabase
    .from("quizzes")
    .select("id, position")
    .eq("id", draft.id)
    .maybeSingle();

  const position =
    existing?.position ?? (await nextChapterPosition(draft.moduleId));

  const { error: quizError } = await supabase.from("quizzes").upsert({
    id: draft.id,
    course_id: draft.courseId,
    module_id: draft.moduleId,
    title,
    attempts_allowed: draft.attemptsAllowed,
    show_results: draft.showResults,
    gates_progress: draft.gatesProgress,
    position,
  });
  if (quizError) return { error: quizError.message };

  // Questions the author deleted in the modal.
  const keep = draft.questions.map((q) => q.id);
  const drop = supabase.from("quiz_questions").delete().eq("quiz_id", draft.id);
  const { error: pruneError } = await (keep.length
    ? drop.not("id", "in", `(${keep.join(",")})`)
    : drop);
  if (pruneError) return { error: pruneError.message };

  if (draft.questions.length > 0) {
    const { error: qError } = await supabase.from("quiz_questions").upsert(
      draft.questions.map((q, i) => ({
        id: q.id,
        quiz_id: draft.id,
        course_id: draft.courseId,
        module_id: draft.moduleId,
        type: q.type,
        topic: title,
        prompt: q.prompt.trim(),
        explanation: q.explanation.trim() || null,
        hint: q.hint.trim() || null,
        is_required: q.isRequired,
        media_url: q.mediaUrl,
        position: i + 1,
      })),
    );
    if (qError) return { error: qError.message };

    // Choices are replaced rather than diffed: nothing references a choice
    // row, and an author reordering options would otherwise need a position
    // reconciliation that buys nothing.
    const { error: clearError } = await supabase
      .from("quiz_choices")
      .delete()
      .in("question_id", keep);
    if (clearError) return { error: clearError.message };

    const choices = draft.questions.flatMap((q) =>
      q.choices.map((c, i) => ({
        id: c.id,
        question_id: q.id,
        label: LABELS[i] ?? String(i + 1),
        body: c.body.trim(),
        // Reorder questions have no "correct" tick — the order is the answer,
        // so every step is stored as correct and position carries the key.
        is_correct: q.type === "order" ? true : c.isCorrect,
        position: i + 1,
      })),
    );
    const { error: cError } = await supabase.from("quiz_choices").insert(choices);
    if (cError) return { error: cError.message };
  }

  revalidatePath(`/courses/${draft.courseId}`);
  return { ok: true };
}

export async function deleteQuiz(
  courseId: string,
  quizId: string,
): Promise<ActionResult> {
  await requireTeam();

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) return { error: error.message };

  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

/**
 * Copies a quiz, its questions and their choices into the same chapter.
 *
 * Every id is minted fresh rather than reused, so the copy is a separate quiz
 * an author can edit without touching the original.
 */
export async function duplicateQuiz(
  courseId: string,
  quizId: string,
): Promise<ActionResult> {
  await requireTeam();

  const supabase = createSupabaseServerClient();
  const { data: source, error: readError } = await supabase
    .from("quizzes")
    .select(
      `id, course_id, module_id, title, attempts_allowed, show_results, gates_progress,
       quiz_questions (
         id, type, topic, prompt, explanation, hint, is_required, media_url, position,
         quiz_choices ( id, label, body, is_correct, position )
       )`,
    )
    .eq("id", quizId)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!source) return { error: "That quiz no longer exists." };

  const newQuizId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("quizzes").insert({
    id: newQuizId,
    course_id: source.course_id,
    module_id: source.module_id,
    title: `${source.title} (copy)`,
    attempts_allowed: source.attempts_allowed,
    show_results: source.show_results,
    gates_progress: source.gates_progress,
    position: await nextChapterPosition(source.module_id),
  });
  if (insertError) return { error: insertError.message };

  for (const q of source.quiz_questions) {
    const newQuestionId = crypto.randomUUID();
    const { error: qError } = await supabase.from("quiz_questions").insert({
      id: newQuestionId,
      quiz_id: newQuizId,
      course_id: source.course_id,
      module_id: source.module_id,
      type: q.type,
      topic: q.topic,
      prompt: q.prompt,
      explanation: q.explanation,
      hint: q.hint,
      is_required: q.is_required,
      media_url: q.media_url,
      position: q.position,
    });
    if (qError) return { error: qError.message };

    if (q.quiz_choices.length > 0) {
      const { error: cError } = await supabase.from("quiz_choices").insert(
        q.quiz_choices.map((c) => ({
          question_id: newQuestionId,
          label: c.label,
          body: c.body,
          is_correct: c.is_correct,
          position: c.position,
        })),
      );
      if (cError) return { error: cError.message };
    }
  }

  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}
