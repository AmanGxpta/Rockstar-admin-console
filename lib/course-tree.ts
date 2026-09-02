/**
 * The shape of a course tree in the editor, and the pure functions over it.
 *
 * Split out of lib/courses.ts because that module is server-only (it opens a
 * Supabase client) while the editor is a client component that needs to merge
 * and grade the same tree in the browser.
 */
import type { Database } from "@/types/database";

export type CourseCategory = Database["public"]["Enums"]["course_category"];
export type CourseLevel = Database["public"]["Enums"]["course_level"];
export type LessonBlockKind = Database["public"]["Enums"]["lesson_block_kind"];
export type QuizQuestionType = Database["public"]["Enums"]["quiz_question_type"];

export type EditorBlock = {
  id: string;
  lesson_id: string;
  kind: LessonBlockKind;
  position: number;
  url: string | null;
  body: string | null;
  duration_seconds: number | null;
};

export type EditorLesson = {
  id: string;
  title: string;
  position: number;
  is_preview: boolean;
  duration_seconds: number;
  lesson_blocks: EditorBlock[];
};

export type EditorChoice = {
  id: string;
  body: string;
  is_correct: boolean;
  position: number;
};

export type EditorQuestion = {
  id: string;
  prompt: string;
  type: QuizQuestionType;
  explanation: string | null;
  hint: string | null;
  is_required: boolean;
  media_url: string | null;
  position: number;
  quiz_choices: EditorChoice[];
};

export type EditorQuiz = {
  id: string;
  title: string;
  position: number;
  attempts_allowed: number;
  show_results: boolean;
  gates_progress: boolean;
  quiz_questions: EditorQuestion[];
};

export type EditorModule = {
  id: string;
  title: string;
  position: number;
  lessons: EditorLesson[];
  quizzes: EditorQuiz[];
};

/**
 * One chapter row, ready to render.
 *
 * A chapter is one ordered list in the design, with quizzes sitting between
 * clips — but lessons and quizzes are separate tables, so the merge happens
 * here rather than being asked of Postgres. Both carry a position in the same
 * integer space; a tie puts the lesson first, since a quiz is always appended
 * after the clip it follows.
 */
export type ChapterItem =
  | { kind: "lesson"; position: number; lesson: EditorLesson }
  | { kind: "quiz"; position: number; quiz: EditorQuiz };

export function chapterItems(chapter: EditorModule): ChapterItem[] {
  const items: ChapterItem[] = [
    ...chapter.lessons.map(
      (lesson) => ({ kind: "lesson", position: lesson.position, lesson }) as const,
    ),
    ...chapter.quizzes.map(
      (quiz) => ({ kind: "quiz", position: quiz.position, quiz }) as const,
    ),
  ];
  return items.sort(
    (a, b) =>
      a.position - b.position ||
      (a.kind === "lesson" ? -1 : 1) - (b.kind === "lesson" ? -1 : 1),
  );
}

/** A quiz is finishable by a student only if every question has an answer key. */
export function questionReady(q: EditorQuestion): boolean {
  if (!q.prompt.trim()) return false;
  if (q.type === "order") {
    return q.quiz_choices.filter((c) => c.body.trim()).length >= 2;
  }
  return q.quiz_choices.some((c) => c.is_correct && c.body.trim());
}

export function quizReady(quiz: EditorQuiz): boolean {
  return (
    quiz.quiz_questions.length > 0 && quiz.quiz_questions.every(questionReady)
  );
}

export type CourseListRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category: CourseCategory;
  level: CourseLevel;
  is_published: boolean;
  is_featured: boolean;
  price_cents: number | null;
  lesson_count: number;
  total_duration_seconds: number;
  enrolled_count: number;
  created_at: string;
  updated_at: string;
  educator: { id: string; users: { full_name: string | null } | null } | null;
};

export type CourseForEditor = CourseListRow & {
  overview: string;
  outcomes: string[];
  accent: string;
  access_months: number | null;
  course_modules: EditorModule[];
};
