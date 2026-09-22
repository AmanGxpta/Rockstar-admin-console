import type { Database } from "@/types/database";
import type { EditorQuiz } from "./course-tree";

export type QuestionType = Database["public"]["Enums"]["quiz_question_type"];

/**
 * The quiz the builder edits, before it is a row.
 *
 * These types live apart from lib/quiz-actions.ts because that module carries
 * "use server" and may only export async functions; the modal and the action
 * both need this shape, so it gets its own home.
 */
export type ChoiceDraft = {
  id: string;
  body: string;
  isCorrect: boolean;
};

export type QuestionDraft = {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation: string;
  hint: string;
  isRequired: boolean;
  mediaUrl: string | null;
  choices: ChoiceDraft[];
};

export type QuizDraft = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  attemptsAllowed: number;
  showResults: boolean;
  gatesProgress: boolean;
  questions: QuestionDraft[];
};

export const QUESTION_TYPES: {
  value: QuestionType;
  label: string;
  icon: "check2" | "layers" | "image" | "chart";
}[] = [
  { value: "mc", label: "Multiple choice", icon: "check2" },
  { value: "multi", label: "Multi-select", icon: "layers" },
  { value: "image", label: "Image ID", icon: "image" },
  { value: "order", label: "Reorder steps", icon: "chart" },
];

export const TYPE_LABEL: Record<QuestionType, string> = {
  mc: "Multiple choice",
  multi: "Multi-select",
  image: "Image ID",
  order: "Reorder steps",
};

/** 0 is stored for "no limit"; the design shows it as a word. */
export const ATTEMPT_OPTIONS = ["1", "2", "3", "Unlimited"] as const;

export function attemptsToLabel(n: number): string {
  return n === 0 ? "Unlimited" : String(n);
}

export function labelToAttempts(label: string): number {
  return label === "Unlimited" ? 0 : Number(label);
}

export function newChoice(body = ""): ChoiceDraft {
  return { id: crypto.randomUUID(), body, isCorrect: false };
}

export function newQuestion(type: QuestionType = "mc"): QuestionDraft {
  return {
    id: crypto.randomUUID(),
    type,
    prompt: "",
    explanation: "",
    hint: "",
    isRequired: true,
    mediaUrl: null,
    // A reorder question needs a third step before the order means anything.
    choices:
      type === "order"
        ? [newChoice(), newChoice(), newChoice()]
        : [newChoice(), newChoice()],
  };
}

export function newQuizDraft(courseId: string, moduleId: string): QuizDraft {
  return {
    id: crypto.randomUUID(),
    courseId,
    moduleId,
    title: "",
    attemptsAllowed: 2,
    showResults: true,
    gatesProgress: true,
    questions: [newQuestion()],
  };
}

/** Turns a saved quiz back into an editable draft. */
export function toDraft(
  quiz: EditorQuiz,
  courseId: string,
  moduleId: string,
): QuizDraft {
  return {
    id: quiz.id,
    courseId,
    moduleId,
    title: quiz.title,
    attemptsAllowed: quiz.attempts_allowed,
    showResults: quiz.show_results,
    gatesProgress: quiz.gates_progress,
    questions: quiz.quiz_questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation ?? "",
      hint: q.hint ?? "",
      isRequired: q.is_required,
      mediaUrl: q.media_url,
      choices: q.quiz_choices.map((c) => ({
        id: c.id,
        body: c.body,
        // Reorder questions store every step as correct; the tick is
        // meaningless there and the editor must not show one.
        isCorrect: q.type === "order" ? false : c.is_correct,
      })),
    })),
  };
}

/**
 * Whether the question has an answer key — something to mark a student right
 * or wrong against.
 *
 * Split out from `draftQuestionReady` because it is the one condition the
 * builder enforces *before* letting a second question be started. The rest of
 * readiness (a prompt, an Image ID's picture) can be filled in later and the
 * quiz simply stays a draft; an unkeyed question is the one that gets lost,
 * because a question you have moved on from looks finished in the stepper and
 * only fails at save.
 *
 * A reorder question keys itself: the order its steps are written in *is* the
 * answer, so it is keyed as soon as there are two steps to order.
 */
export function draftAnswerKeyed(q: QuestionDraft): boolean {
  if (q.type === "order") {
    return q.choices.filter((c) => c.body.trim()).length >= 2;
  }
  return q.choices.some((c) => c.isCorrect && c.body.trim());
}

export function draftQuestionReady(q: QuestionDraft): boolean {
  if (!q.prompt.trim()) return false;
  // The picture is the question. Without it an Image ID question reaches the
  // student as four labels and nothing to label, so it is not ready to save.
  if (q.type === "image" && !q.mediaUrl) return false;
  return draftAnswerKeyed(q);
}

export function draftQuizReady(draft: QuizDraft): boolean {
  return draft.questions.length > 0 && draft.questions.every(draftQuestionReady);
}
