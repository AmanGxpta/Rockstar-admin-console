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

/** The row id under a chapter item, whichever of the two it is. */
export function chapterItemId(item: ChapterItem): string {
  return item.kind === "lesson" ? item.lesson.id : item.quiz.id;
}

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

// ------------------------------------------------------------------ moving --

export type ChapterMove = {
  kind: "lesson" | "quiz";
  itemId: string;
  toModuleId: string;
  /**
   * Zero-based slot in the destination chapter's merged list *with the moved
   * item taken out* — which is what a gap between two cards knows, and the
   * same number move_chapter_item() takes.
   */
  toIndex: number;
};

/**
 * The same move the database makes, made here so the card lands where it was
 * dropped instead of after a round trip.
 *
 * Applied through useOptimistic, so this never has to be undone by hand: React
 * throws the result away when the transition that produced it settles and the
 * revalidated tree arrives. It exists to agree with move_chapter_item() for
 * the second that both are true — the positions it writes are the 1..n that
 * function writes, for the same reason (a hole left behind is a slot the next
 * append lands on top of).
 */
export function applyChapterMove(
  modules: EditorModule[],
  move: ChapterMove,
): EditorModule[] {
  const source = modules.find((m) =>
    move.kind === "lesson"
      ? m.lessons.some((l) => l.id === move.itemId)
      : m.quizzes.some((q) => q.id === move.itemId),
  );
  const destination = modules.find((m) => m.id === move.toModuleId);
  if (!source || !destination) return modules;

  // By kind and id, never by identity: chapterItems() builds fresh wrappers on
  // every call, so the item taken from the source chapter is a different
  // object from the one in the destination's list even when they are the same
  // row — which is exactly the case for a move inside one chapter.
  const isMoved = (i: ChapterItem) =>
    i.kind === move.kind && chapterItemId(i) === move.itemId;

  const moved = chapterItems(source).find(isMoved);
  if (!moved) return modules;

  // The destination as it stands, minus the card in hand.
  const rest = chapterItems(destination).filter((i) => !isMoved(i));
  const slot = Math.max(0, Math.min(move.toIndex, rest.length));
  const placed = [...rest.slice(0, slot), moved, ...rest.slice(slot)];

  // The chapter it left, compacted. Same list when the move is within one
  // chapter, in which case `placed` is the only ordering that matters.
  const emptied =
    source.id === destination.id
      ? placed
      : chapterItems(source).filter((i) => !isMoved(i));

  const rebuild = (chapter: EditorModule, items: ChapterItem[]): EditorModule => ({
    ...chapter,
    lessons: items.flatMap((item, i) =>
      item.kind === "lesson"
        ? [{ ...item.lesson, position: i + 1 }]
        : [],
    ),
    quizzes: items.flatMap((item, i) =>
      item.kind === "quiz" ? [{ ...item.quiz, position: i + 1 }] : [],
    ),
  });

  return modules.map((m) => {
    if (m.id === destination.id) return rebuild(m, placed);
    if (m.id === source.id) return rebuild(m, emptied);
    return m;
  });
}

/** A quiz is finishable by a student only if every question has an answer key. */
export function questionReady(q: EditorQuestion): boolean {
  if (!q.prompt.trim()) return false;
  // Mirrors draftQuestionReady(): an Image ID question with no picture asks
  // nothing, so the chapter must not read as Ready on the strength of it.
  if (q.type === "image" && !q.media_url) return false;
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
  /** Object path in the public course-covers bucket, or null for no artwork. */
  cover_path: string | null;
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
