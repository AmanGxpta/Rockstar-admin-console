"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { CoverEditor } from "@/components/ui/cover-picker";
import { Icon } from "@/components/ui/icon";
import { Card, SectionH, Tag, WBtn } from "@/components/ui/primitives";
import { Toast } from "@/components/ui/controls";
import { addLesson, addModule, renameModule } from "@/lib/course-actions";
import { coverPublicUrl } from "@/lib/course-cover";
import { deleteQuiz, duplicateQuiz } from "@/lib/quiz-actions";
import {
  chapterItems,
  quizReady,
  type CourseForEditor,
  type EditorLesson,
  type EditorModule,
  type EditorQuiz,
} from "@/lib/course-tree";
import {
  TYPE_LABEL,
  attemptsToLabel,
  newQuizDraft,
  toDraft,
  type QuizDraft,
} from "@/lib/quiz-draft";

import { ClipForm } from "./editor-forms";
import { QuizModal } from "./quiz-modal";

/** What the right-hand pane is showing. */
type Selection =
  | { kind: "lesson"; id: string }
  | { kind: "quiz"; id: string }
  | null;

type ModalState = { draft: QuizDraft; chapterTitle: string; isNew: boolean } | null;

function chapterLabel(m: EditorModule) {
  return `${String(m.position).padStart(2, "0")} · ${m.title}`;
}

type Current =
  | { kind: "lesson"; lesson: EditorLesson; module: EditorModule }
  | { kind: "quiz"; quiz: EditorQuiz; module: EditorModule }
  | null;

function findSelected(modules: EditorModule[], selected: Selection): Current {
  if (!selected) return null;
  for (const m of modules) {
    if (selected.kind === "lesson") {
      const lesson = m.lessons.find((l) => l.id === selected.id);
      if (lesson) return { kind: "lesson", lesson, module: m };
    } else {
      const quiz = m.quizzes.find((q) => q.id === selected.id);
      if (quiz) return { kind: "quiz", quiz, module: m };
    }
  }
  return null;
}

export function CourseEditor({ course }: { course: CourseForEditor }) {
  const modules = course.course_modules;

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(modules.length ? [modules[0].id] : []),
  );
  const [selected, setSelected] = useState<Selection>(() => {
    for (const m of modules) {
      if (m.lessons.length) return { kind: "lesson", id: m.lessons[0].id };
    }
    return null;
  });
  const [addMenu, setAddMenu] = useState(false);
  // Which chapter is being renamed in place, if any.
  const [renaming, setRenaming] = useState<string | null>(null);
  // The name a chapter is being renamed *to*, shown in its row from the moment
  // it is submitted. Without it the row shows the old title again between the
  // field closing and the server round trip landing, which reads as the rename
  // having failed. Survives the save: once the tree comes back the two agree,
  // and a failure clears it so the row falls back to the real title.
  const [pendingName, setPendingName] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  // Scoped to the rename rather than read off the shared transition, which is
  // also true while a clip is being added and would spin the wrong row.
  const [savingName, setSavingName] = useState<string | null>(null);

  const say = (message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((current) => (current === message ? null : current)),
      2600,
    );
  };

  const quizzes = useMemo(
    () =>
      modules.flatMap((m) =>
        m.quizzes.map((q) => ({ quiz: q, module: m })),
      ),
    [modules],
  );

  // Not memoised: a course has a handful of chapters, and the early returns
  // here are what the React Compiler refuses to preserve inside a useMemo.
  const current = findSelected(modules, selected);

  // Drop the pending name the moment the tree comes back carrying it. Adjusting
  // state during the render that makes it redundant, rather than in an effect,
  // is what keeps the row from ever painting the old title in between.
  if (
    pendingName &&
    modules.find((m) => m.id === pendingName.id)?.title === pendingName.title
  ) {
    setPendingName(null);
  }

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** The chapter a menu action lands in: the open one, else the first. */
  const targetModule = () =>
    modules.find((m) => open.has(m.id)) ?? modules[0] ?? null;

  const openQuiz = (quiz: EditorQuiz, m: EditorModule) => {
    setSelected({ kind: "quiz", id: quiz.id });
    setModal({
      draft: toDraft(quiz, course.id, m.id),
      chapterTitle: chapterLabel(m),
      isNew: false,
    });
  };

  const startNewQuiz = (m: EditorModule) => {
    setOpen((s) => new Set(s).add(m.id));
    setModal({
      draft: newQuizDraft(course.id, m.id),
      chapterTitle: chapterLabel(m),
      isNew: true,
    });
  };

  const addClip = (m: EditorModule) =>
    start(async () => {
      const form = new FormData();
      form.set("courseId", course.id);
      form.set("moduleId", m.id);
      form.set("title", "Untitled clip");
      const result = await addLesson(null, form);
      setOpen((s) => new Set(s).add(m.id));
      say("error" in result ? result.error : "Clip added");
    });

  /**
   * A chapter is created unnamed and then named in place, rather than behind a
   * dialog: naming is the only thing a chapter has, and the row that appears
   * is where the author is already looking. The caret lands in it, so "New
   * chapter" and typing its name are one gesture.
   */
  const addChapter = () =>
    start(async () => {
      const form = new FormData();
      form.set("courseId", course.id);
      form.set("title", "Untitled chapter");
      const result = await addModule(null, form);
      if ("error" in result) {
        say(result.error);
        return;
      }
      setOpen((s) => new Set(s).add(result.id));
      setRenaming(result.id);
    });

  const commitRename = (m: EditorModule, title: string) => {
    setRenaming(null);
    const clean = title.trim();
    if (!clean || clean === m.title) return;

    setPendingName({ id: m.id, title: clean });
    setSavingName(m.id);
    start(async () => {
      const result = await renameModule(course.id, m.id, clean);
      setSavingName(null);
      if ("error" in result) {
        setPendingName(null);
        say(result.error);
      }
    });
  };

  const onDuplicate = (quiz: EditorQuiz) =>
    start(async () => {
      const result = await duplicateQuiz(course.id, quiz.id);
      say("error" in result ? result.error : "Quiz duplicated");
    });

  const onDeleteQuiz = (quiz: EditorQuiz) =>
    start(async () => {
      const result = await deleteQuiz(course.id, quiz.id);
      setModal(null);
      if (selected?.kind === "quiz" && selected.id === quiz.id) setSelected(null);
      say("error" in result ? result.error : "Quiz deleted");
    });

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* The left column is course-level: what the course is called and
            what it looks like, then what is in it. */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Card pad={16}>
            <SectionH>Cover</SectionH>
            <CoverEditor
              courseId={course.id}
              path={course.cover_path}
              url={coverPublicUrl(course.cover_path)}
            />
          </Card>

          {/* ---------------------------------------------------- structure -- */}
          <Card pad={16} style={{ position: "relative" }}>
            <SectionH
              action={
                <button
                  type="button"
                  onClick={() => setAddMenu((m) => !m)}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--red)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="plus" size={17} c="var(--red)" />
                  Add
                </button>
              }
            >
              Structure
            </SectionH>

            {addMenu && (
              <>
                <div
                  onClick={() => setAddMenu(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 20 }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 14,
                    top: 46,
                    zIndex: 21,
                    width: 210,
                    background: "var(--dark-2)",
                    borderRadius: 12,
                    boxShadow: "var(--sh-3)",
                    padding: 6,
                  }}
                >
                  {(
                    [
                      ["New clip", "video", () => {
                        const m = targetModule();
                        if (m) addClip(m);
                        else say("Add a chapter first.");
                      }],
                      ["New quiz", "zap", () => {
                        const m = targetModule();
                        if (m) startNewQuiz(m);
                        else say("Add a chapter first.");
                      }],
                      ["New chapter", "layers", addChapter],
                    ] as const
                  ).map(([label, icon, run]) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => {
                        setAddMenu(false);
                        run();
                      }}
                      className="rs-navitem"
                      style={menuItemStyle}
                    >
                      <Icon name={icon} size={16} c="var(--text-muted)" />
                      {label}
                    </button>
                  ))}

                  {quizzes.length > 0 && (
                    <>
                      <div
                        style={{
                          borderTop: "1px solid var(--border)",
                          margin: "6px 4px",
                        }}
                      />
                      <div className="rs-eyebrow" style={{ padding: "4px 10px 6px" }}>
                        Duplicate a quiz
                      </div>
                      {quizzes.map(({ quiz }) => (
                        <button
                          type="button"
                          key={quiz.id}
                          onClick={() => {
                            setAddMenu(false);
                            onDuplicate(quiz);
                          }}
                          className="rs-navitem"
                          style={{ ...menuItemStyle, color: "var(--text-secondary)" }}
                        >
                          <Icon name="layers" size={15} c="var(--text-muted)" />
                          <span style={ellipsis}>{quiz.title}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}

            {modules.length === 0 && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: "4px 2px 0",
                }}
              >
                No chapters yet. Use Add → New chapter to start the course.
              </p>
            )}

            {modules.map((m) => {
              const isOpen = open.has(m.id);
              const items = chapterItems(m);
              return (
                <div key={m.id} style={{ marginBottom: 6 }}>
                  <ChapterRow
                    chapter={m}
                    title={pendingName?.id === m.id ? pendingName.title : m.title}
                    count={items.length}
                    isOpen={isOpen}
                    renaming={renaming === m.id}
                    saving={savingName === m.id}
                    onToggle={() => toggle(m.id)}
                    onStartRename={() => setRenaming(m.id)}
                    onCommit={(title) => commitRename(m, title)}
                    onCancel={() => setRenaming(null)}
                  />

                  {isOpen && (
                    <div style={{ paddingLeft: 22 }}>
                      {items.map((item) =>
                        item.kind === "quiz" ? (
                          <QuizRow
                            key={item.quiz.id}
                            quiz={item.quiz}
                            active={
                              selected?.kind === "quiz" &&
                              selected.id === item.quiz.id
                            }
                            onOpen={() => openQuiz(item.quiz, m)}
                            onDuplicate={() => onDuplicate(item.quiz)}
                            onDelete={() => onDeleteQuiz(item.quiz)}
                          />
                        ) : (
                          <button
                            type="button"
                            key={item.lesson.id}
                            onClick={() =>
                              setSelected({ kind: "lesson", id: item.lesson.id })
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: 9,
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              fontFamily: "var(--font-body)",
                              fontSize: 12.5,
                              color: "var(--text-secondary)",
                              background:
                                selected?.kind === "lesson" &&
                                selected.id === item.lesson.id
                                  ? "var(--red-faint)"
                                  : "transparent",
                              fontWeight:
                                selected?.kind === "lesson" &&
                                selected.id === item.lesson.id
                                  ? 700
                                  : 500,
                            }}
                          >
                            <Icon
                              name="video"
                              size={14}
                              c={
                                selected?.kind === "lesson" &&
                                selected.id === item.lesson.id
                                  ? "var(--red)"
                                  : "var(--text-muted)"
                              }
                            />
                            <span style={ellipsis}>{item.lesson.title}</span>
                          </button>
                        ),
                      )}

                      {/* Named for the chapter rather than left to the Add menu
                          at the top: a chapter is created empty, and the next
                          thing to do with it belongs inside it. */}
                      <button
                        type="button"
                        onClick={() => addClip(m)}
                        style={addInChapterStyle}
                      >
                        <Icon name="plus" size={15} c="var(--red)" />
                        Add clip to this chapter
                      </button>

                      <button
                        type="button"
                        onClick={() => startNewQuiz(m)}
                        style={addInChapterStyle}
                      >
                        <Icon name="plus" size={15} c="var(--red)" />
                        Add quiz to this chapter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        {/* ------------------------------------------------------- detail -- */}
        <div>
          {current === null && (
            <Card>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                Pick a clip or a quiz on the left to edit it.
              </p>
            </Card>
          )}

          {current?.kind === "quiz" && (
            <QuizDetail
              quiz={current.quiz}
              chapterTitle={chapterLabel(current.module)}
              onEdit={() => openQuiz(current.quiz, current.module)}
              onDuplicate={() => onDuplicate(current.quiz)}
            />
          )}

          {current?.kind === "lesson" && (
            <ClipDetail
              courseId={course.id}
              lesson={current.lesson}
              chapterTitle={chapterLabel(current.module)}
            />
          )}
        </div>
      </div>

      {modal && (
        <QuizModal
          initial={modal.draft}
          chapterTitle={modal.chapterTitle}
          onClose={() => setModal(null)}
          onSaved={(title, isNew) => {
            setSelected({ kind: "quiz", id: modal.draft.id });
            setModal(null);
            say(isNew ? `“${title}” added to the chapter` : "Quiz saved");
          }}
          onDelete={
            modal.isNew
              ? null
              : () => {
                  const quiz = quizzes.find((q) => q.quiz.id === modal.draft.id);
                  if (quiz) onDeleteQuiz(quiz.quiz);
                }
          }
        />
      )}

      <Toast message={toast} />
    </>
  );
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 10px",
  borderRadius: 9,
  border: "none",
  background: "none",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "var(--font-body)",
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--text-primary)",
} as const;

const addInChapterStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "8px 10px",
  marginTop: 2,
  borderRadius: 9,
  border: "none",
  background: "none",
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--red)",
} as const;

const ellipsis = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

// ---------------------------------------------------------- structure row --

/**
 * One chapter in the structure list, and the only place its name can be
 * changed.
 *
 * Renaming does not move the title or put a box around it: the same text keeps
 * the same slot, and an input with no chrome takes it over so the only thing
 * that changes is a caret appearing in it. The pencil at the end becomes a
 * tick while editing — the row itself is the field, and the button says what
 * finishes it.
 *
 * The row had to stop being a single <button> for any of this: a button inside
 * a button is invalid and the nested click is swallowed. So the chevron, the
 * title and the pencil are three controls sharing one flex row, and the title
 * still toggles the chapter when it is not being edited.
 */
function ChapterRow({
  chapter,
  title,
  count,
  isOpen,
  renaming,
  saving,
  onToggle,
  onStartRename,
  onCommit,
  onCancel,
}: {
  chapter: EditorModule;
  /** What to show — the pending name while a rename is in flight. */
  title: string;
  count: number;
  isOpen: boolean;
  renaming: boolean;
  saving: boolean;
  onToggle: () => void;
  onStartRename: () => void;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [hover, setHover] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Escape is what dismisses the field, and leaving the field is what saves
  // it — so the blur that follows Escape would save the text Escape was
  // pressed to discard. This says which of the two happened.
  const abandoned = useRef(false);

  // The title and the field are the same box, so swapping one for the other
  // moves nothing on screen.
  const titleStyle = {
    flex: 1,
    minWidth: 0,
    padding: 0,
    margin: 0,
    border: "none",
    background: "transparent",
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: "18px",
    color: "var(--text-primary)",
    textAlign: "left" as const,
    outline: "none",
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 11px",
        borderRadius: 10,
        fontFamily: "var(--font-body)",
        background: isOpen ? "var(--dark-3)" : "var(--dark)",
        marginBottom: isOpen ? 4 : 0,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Collapse chapter" : "Expand chapter"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Icon name={isOpen ? "chevD" : "chevR"} size={15} c="var(--text-muted)" />
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontWeight: 800,
            fontSize: 13,
            color: "var(--red)",
          }}
        >
          {String(chapter.position).padStart(2, "0")}
        </span>
      </button>

      {renaming ? (
        <input
          ref={input}
          autoFocus
          defaultValue={title}
          aria-label="Chapter name"
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onCommit(e.currentTarget.value);
            } else if (e.key === "Escape") {
              e.preventDefault();
              abandoned.current = true;
              onCancel();
            }
          }}
          onBlur={(e) => {
            if (abandoned.current) return;
            onCommit(e.currentTarget.value);
          }}
          style={titleStyle}
        />
      ) : (
        <button type="button" onClick={onToggle} style={{ ...titleStyle, cursor: "pointer" }}>
          <span style={ellipsis}>{title}</span>
        </button>
      )}

      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
        {count}
      </span>

      {saving ? (
        <span
          className="rs-login-spin"
          aria-label="Saving"
          style={{
            width: 13,
            height: 13,
            margin: 2,
            borderRadius: 999,
            border: "2px solid var(--border-strong)",
            borderTopColor: "var(--red)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      ) : (
        <button
          type="button"
          // mousedown, not click: pressing the tick blurs the field first, and
          // the re-render that follows would unmount this button before its
          // click ever landed.
          onMouseDown={(e) => {
            e.preventDefault();
            if (renaming) onCommit(input.current?.value ?? title);
            else onStartRename();
          }}
          title={renaming ? "Save name" : "Rename chapter"}
          aria-label={renaming ? "Save name" : `Rename ${title}`}
          style={{
            display: "flex",
            alignItems: "center",
            padding: 2,
            border: "none",
            background: "none",
            cursor: "pointer",
            // Always there so it can be found, but quiet until the row is
            // under the pointer — a list of chapters should read as titles,
            // not as a column of icons. The tick is never quiet.
            opacity: renaming || hover ? 1 : 0.4,
            transition: "opacity .15s ease",
          }}
        >
          <Icon
            name={renaming ? "check2" : "pencil"}
            size={14}
            c={renaming || hover ? "var(--red)" : "var(--text-muted)"}
          />
        </button>
      )}
    </div>
  );
}

function QuizRow({
  quiz,
  active,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  quiz: EditorQuiz;
  active: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ready = quizReady(quiz);

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "9px 10px",
          margin: "3px 0",
          borderRadius: 10,
          cursor: "pointer",
          background: active ? "var(--red-faint)" : "var(--warn-bg)",
          border: "1.5px dashed",
          borderColor: active ? "var(--red)" : "#e3c88f",
        }}
      >
        <Icon name="zap" size={14} c={active ? "var(--red)" : "#b07e2a"} />
        <span
          style={{
            ...ellipsis,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 700,
            color: "#8a6318",
          }}
        >
          {quiz.title || "Untitled quiz"}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: "#b07e2a",
            letterSpacing: "0.04em",
          }}
        >
          {quiz.quiz_questions.length}Q{ready ? "" : " · DRAFT"}
        </span>
        <button
          type="button"
          aria-label="Quiz actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenu((m) => !m);
          }}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            lineHeight: 0,
            cursor: "pointer",
          }}
        >
          <Icon name="dots" size={14} c="#b07e2a" />
        </button>
      </div>

      {menu && (
        <>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setMenu(false);
            }}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            style={{
              position: "absolute",
              right: 6,
              top: 36,
              zIndex: 21,
              minWidth: 150,
              background: "var(--dark-2)",
              borderRadius: 12,
              boxShadow: "var(--sh-3)",
              padding: 6,
            }}
          >
            {(
              [
                ["Edit quiz", "pencil", onOpen],
                ["Duplicate", "layers", onDuplicate],
                ["Delete", "trash", onDelete],
              ] as const
            ).map(([label, icon, run]) => (
              <button
                type="button"
                key={label}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu(false);
                  run();
                }}
                className="rs-navitem"
                style={{
                  ...menuItemStyle,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  color:
                    label === "Delete" ? "var(--red-hover)" : "var(--text-primary)",
                }}
              >
                <Icon
                  name={icon}
                  size={15}
                  c={label === "Delete" ? "var(--red-hover)" : "var(--text-muted)"}
                />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ detail panes --

function QuizDetail({
  quiz,
  chapterTitle,
  onEdit,
  onDuplicate,
}: {
  quiz: EditorQuiz;
  chapterTitle: string;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const ready = quizReady(quiz);
  const first = quiz.quiz_questions[0];

  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              background: "var(--warn-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="zap" size={21} c="#b07e2a" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-head)",
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: "-0.02em",
              }}
            >
              {quiz.title}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {chapterTitle} · sits between clips in the chapter
            </div>
          </div>
          <Tag tone={ready ? "leaf" : "gold"}>{ready ? "Ready" : "Draft"}</Tag>
          <WBtn kind="ghost" sm icon="layers" onClick={onDuplicate}>
            Duplicate
          </WBtn>
          <WBtn sm icon="pencil" onClick={onEdit}>
            Edit quiz
          </WBtn>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {(
            [
              ["Questions", String(quiz.quiz_questions.length)],
              ["Attempts", attemptsToLabel(quiz.attempts_allowed)],
              ["Results", quiz.show_results ? "Immediate" : "On review"],
              ["Gate", quiz.gates_progress ? "Required" : "Optional"],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: "var(--dark)",
                borderRadius: 12,
                padding: "11px 13px",
              }}
            >
              <div className="rs-label">{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {quiz.quiz_questions.map((q, i) => (
            <div
              key={q.id}
              onClick={onEdit}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onEdit()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--dark)",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  flexShrink: 0,
                  background: "var(--dark-2)",
                  boxShadow: "inset 0 0 0 1.5px var(--border-mid)",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  ...ellipsis,
                  minWidth: 0,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: q.prompt ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {q.prompt || "Untitled question"}
              </span>
              {q.is_required && <Tag tone="ink">Required</Tag>}
              <span
                style={{
                  fontSize: 11.5,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                {TYPE_LABEL[q.type]}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionH
          action={
            <span
              style={{
                fontSize: 12.5,
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              How students see it
            </span>
          }
        >
          Student preview
        </SectionH>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              width: 190,
              flexShrink: 0,
              background: "var(--ink)",
              borderRadius: 16,
              padding: 16,
              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                letterSpacing: "0.08em",
                fontWeight: 800,
                opacity: 0.6,
              }}
            >
              QUESTION 1 OF {quiz.quiz_questions.length}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.35,
                margin: "10px 0 14px",
              }}
            >
              {first?.prompt || "Your question appears here"}
            </div>
            {(first?.quiz_choices ?? []).slice(0, 3).map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: "9px 11px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.1)",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 7,
                }}
              >
                {c.body || `Option ${i + 1}`}
              </div>
            ))}
          </div>
          <div
            style={{
              flex: 1,
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
            }}
          >
            <p style={{ marginTop: 0 }}>
              The quiz appears in the chapter feed exactly where it sits in the
              structure.{" "}
              {quiz.gates_progress
                ? "Students must pass it before the next clip unlocks."
                : "Students can skip ahead without passing it."}{" "}
              {quiz.show_results
                ? "Their score and explanations show as soon as they submit."
                : "Results are held until you review them."}
            </p>
            <p style={{ marginBottom: 0 }}>
              Attempts allowed:{" "}
              <b style={{ color: "var(--text-primary)" }}>
                {attemptsToLabel(quiz.attempts_allowed)}
              </b>
              . Hints are revealed on request and don&apos;t affect the score.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function ClipDetail({
  courseId,
  lesson,
  chapterTitle,
}: {
  courseId: string;
  lesson: EditorLesson;
  chapterTitle: string;
}) {
  return (
    <Card>
      <SectionH action={<Tag tone="leaf">{chapterTitle}</Tag>}>
        Editing clip
      </SectionH>
      {/* Keyed on the clip so switching selection resets the fields — and the
          preview — to the clip you moved to, rather than carrying the last
          one's edits. ClipForm lays out its own preview column: the file it
          shows is form state until Save. */}
      <ClipForm key={lesson.id} courseId={courseId} lesson={lesson} />
    </Card>
  );
}
