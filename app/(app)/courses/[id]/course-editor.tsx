"use client";

import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import { CoverEditor } from "@/components/ui/cover-picker";
import { Icon } from "@/components/ui/icon";
import { Card, Modal, SectionH, Tag, WBtn } from "@/components/ui/primitives";
import { Toast } from "@/components/ui/controls";
import {
  addLesson,
  addModule,
  deleteLesson,
  deleteModule,
  moveChapterItem,
  renameModule,
} from "@/lib/course-actions";
import { coverPublicUrl } from "@/lib/course-cover";
import { deleteQuiz, duplicateQuiz } from "@/lib/quiz-actions";
import {
  applyChapterMove,
  chapterItemId,
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

/** The card in hand, and where it came from. */
type Drag = {
  kind: "lesson" | "quiz";
  id: string;
  moduleId: string;
  /** Its slot in the chapter it was picked up from. */
  index: number;
};

/** A gap between two cards, which is what a drop actually targets. */
type Gap = { moduleId: string; index: number };

/** What the delete dialog is currently asking about. */
type Doomed =
  | { kind: "module"; id: string; title: string; count: number }
  | { kind: "lesson"; id: string; title: string }
  | null;

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
  const saved = course.course_modules;

  // The tree as the author sees it, which is the saved one with the move they
  // are in the middle of already applied. React drops the optimistic layer
  // when the transition that produced it settles, by which time
  // revalidatePath has brought the real tree back — so nothing here has to be
  // rolled back, and a move that failed simply snaps back with the toast that
  // says why.
  const [modules, optimisticallyMove] = useOptimistic(saved, applyChapterMove);

  const [open, setOpen] = useState<Set<string>>(
    () => new Set(saved.length ? [saved[0].id] : []),
  );
  const [selected, setSelected] = useState<Selection>(() => {
    for (const m of saved) {
      if (m.lessons.length) return { kind: "lesson", id: m.lessons[0].id };
    }
    return null;
  });

  // Below 900px the editing panel stacks under the structure, so picking a
  // row would change something off-screen. Bring the panel up to meet it —
  // only on a selection the author made, not on the one the page opens with.
  // Compared against the last key rather than a "first run" flag, so Strict
  // Mode running the effect twice on mount does not count as a selection.
  const detailRef = useRef<HTMLDivElement>(null);
  const selectedKey = selected ? `${selected.kind}:${selected.id}` : null;
  const lastSelected = useRef(selectedKey);
  useEffect(() => {
    if (lastSelected.current === selectedKey) return;
    lastSelected.current = selectedKey;
    if (!selectedKey || !window.matchMedia("(max-width: 900px)").matches) return;
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedKey]);

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
  // The card in hand and the gap under the pointer. Both live only for the
  // length of a drag; `dragging` also dims the card so its old slot reads as
  // vacated.
  const [dragging, setDragging] = useState<Drag | null>(null);
  const [overGap, setOverGap] = useState<Gap | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // What the dustbin is asking about. Deleting a chapter takes its clips and
  // quizzes with it and deleting a clip takes its blocks, and neither undoes —
  // so the icon opens a question rather than performing anything.
  const [confirming, setConfirming] = useState<Doomed>(null);
  const [deleting, setDeleting] = useState(false);
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
    saved.find((m) => m.id === pendingName.id)?.title === pendingName.title
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

  // -------------------------------------------------------------- moving --

  /**
   * Performs a drop.
   *
   * `gap` counts the gaps in the chapter as it is drawn — 0 above the first
   * card, n below the last. move_chapter_item() instead wants the slot in the
   * destination list *with the dragged card taken out*, so a move down inside
   * one chapter loses a place on the way: the gap below card 3 is index 3 once
   * card 1 is no longer in front of it. Across chapters the card was never in
   * that list, so the gap is already the answer.
   */
  const drop = (from: Drag, gap: Gap) => {
    const sameChapter = from.moduleId === gap.moduleId;
    // Both gaps either side of a card put it back where it was.
    if (sameChapter && (gap.index === from.index || gap.index === from.index + 1)) {
      return;
    }

    const toIndex =
      sameChapter && gap.index > from.index ? gap.index - 1 : gap.index;

    const move = {
      kind: from.kind,
      itemId: from.id,
      toModuleId: gap.moduleId,
      toIndex,
    };

    setOpen((o) => new Set(o).add(gap.moduleId));
    start(async () => {
      optimisticallyMove(move);
      const result = await moveChapterItem({ courseId: course.id, ...move });
      if ("error" in result) say(result.error);
    });
  };

  /**
   * The same move from the keyboard, one slot at a time.
   *
   * A drag handle that only answers to a mouse would put reordering out of
   * reach of anyone not using one, so the handle is a button and the arrow
   * keys are the other half of it. Within a chapter only — stepping a card
   * across a chapter boundary needs somewhere to say which chapter, and the
   * drag already says it.
   */
  const nudge = (from: Drag, delta: -1 | 1) => {
    const chapter = modules.find((m) => m.id === from.moduleId);
    if (!chapter) return;
    const target = from.index + delta;
    if (target < 0 || target >= chapterItems(chapter).length) return;
    // Expressed as a gap so it goes through the same arithmetic as a drop.
    drop(from, { moduleId: from.moduleId, index: delta === 1 ? target + 1 : target });
  };

  const onDuplicate = (quiz: EditorQuiz) =>
    start(async () => {
      const result = await duplicateQuiz(course.id, quiz.id);
      say("error" in result ? result.error : "Quiz duplicated");
    });

  /**
   * Answers the dialog. One handler for both kinds: the two deletes differ in
   * which action they call and in what the dialog said they would take with
   * them, and in nothing else.
   */
  const confirmDelete = () => {
    const doomed = confirming;
    if (!doomed) return;
    setDeleting(true);
    start(async () => {
      const result =
        doomed.kind === "module"
          ? await deleteModule(course.id, doomed.id)
          : await deleteLesson(course.id, doomed.id);
      setDeleting(false);
      setConfirming(null);
      if ("error" in result) {
        say(result.error);
        return;
      }
      // The pane on the right is showing something that no longer exists —
      // for a chapter, anything that was inside it.
      if (doomed.kind === "lesson") {
        setSelected((sel) =>
          sel?.kind === "lesson" && sel.id === doomed.id ? null : sel,
        );
      } else {
        setSelected(null);
      }
      say(doomed.kind === "module" ? "Chapter deleted" : "Clip deleted");
    });
  };

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
        // Side by side on a wide screen; stacked below 900px (.rs-split-aside).
        className="rs-split-aside"
        style={{
          // The two columns are two different jobs — what the course is, and
          // what you are editing inside it — so the gutter between them is
          // wider than the 16 that stacks the cards within a column.
          columnGap: 40,
          rowGap: 16,
          alignItems: "start",
        }}
      >
        {/* The left column is course-level: what the course is called and
            what it looks like, then what is in it.

            minmax(0, 1fr) rather than a bare auto column, and this is load
            bearing rather than tidiness. A grid item's automatic minimum size
            is its min-content, and a chapter row's title is `white-space:
            nowrap` — so a chapter called "Fundamentals of Textured Bobs" gave
            this column a min-content of 376px, the track grew past the 320px
            it had been given, and both cards rendered 57px wider than their
            column. What they overflowed onto was the gutter: the whole of it,
            plus 17px of the editing panel. The gap was always being drawn and
            the Cover card was always painted over it, which is why widening
            it changed nothing. Capping the track at 0 lets the ellipsis these
            rows already carry do the job instead. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: 16,
            alignContent: "start",
          }}
        >
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
                    color: "var(--red-on)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="plus" size={17} c="var(--red-on)" />
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
                      ["New content file", "video", () => {
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
                  {/*
                    A collapsed chapter is a closed drawer, so its header is
                    the drop target: dragging onto it opens the chapter, and
                    the gaps inside then say exactly where the card lands.
                    An open chapter needs none of this — its gaps are already
                    on screen, and a header that also accepted drops would be
                    a second answer to a question the list has already
                    answered.
                  */}
                  <div
                    onDragOver={(e) => {
                      if (isOpen || !dragging) return;
                      e.preventDefault();
                      setOverGap(null);
                      setOpen((o) => new Set(o).add(m.id));
                    }}
                    onDrop={(e) => {
                      if (isOpen || !dragging) return;
                      e.preventDefault();
                      drop(dragging, { moduleId: m.id, index: items.length });
                      setDragging(null);
                      setOverGap(null);
                    }}
                  >
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
                    onDelete={() =>
                      setConfirming({
                        kind: "module",
                        id: m.id,
                        title:
                          pendingName?.id === m.id ? pendingName.title : m.title,
                        count: items.length,
                      })
                    }
                  />
                  </div>

                  {isOpen && (
                    <div style={{ paddingLeft: 22 }}>
                      <DropGap
                        gap={{ moduleId: m.id, index: 0 }}
                        drag={dragging}
                        over={overGap}
                        onOver={setOverGap}
                        onDrop={drop}
                      />

                      {items.map((item, i) => {
                        const id = chapterItemId(item);
                        const card: Drag = {
                          kind: item.kind,
                          id,
                          moduleId: m.id,
                          index: i,
                        };
                        const held = dragging?.kind === item.kind && dragging.id === id;

                        return (
                          <Fragment key={id}>
                            <Draggable
                              card={card}
                              held={held}
                              label={
                                item.kind === "quiz"
                                  ? item.quiz.title || "Untitled quiz"
                                  : item.lesson.title
                              }
                              onPick={setDragging}
                              onRelease={() => {
                                setDragging(null);
                                setOverGap(null);
                              }}
                              onHover={setOverGap}
                              onDropAt={(gap) => {
                                if (dragging) drop(dragging, gap);
                              }}
                              onNudge={(delta) => nudge(card, delta)}
                            >
                              {item.kind === "quiz" ? (
                                <QuizRow
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
                                <ClipRow
                                  lesson={item.lesson}
                                  active={
                                    selected?.kind === "lesson" &&
                                    selected.id === item.lesson.id
                                  }
                                  onOpen={() =>
                                    setSelected({
                                      kind: "lesson",
                                      id: item.lesson.id,
                                    })
                                  }
                                  onDelete={() =>
                                    setConfirming({
                                      kind: "lesson",
                                      id: item.lesson.id,
                                      title: item.lesson.title,
                                    })
                                  }
                                />
                              )}
                            </Draggable>

                            <DropGap
                              gap={{ moduleId: m.id, index: i + 1 }}
                              drag={dragging}
                              over={overGap}
                              onOver={setOverGap}
                              onDrop={drop}
                            />
                          </Fragment>
                        );
                      })}

                      {/* Named for the chapter rather than left to the Add menu
                          at the top: a chapter is created empty, and the next
                          thing to do with it belongs inside it. */}
                      <button
                        type="button"
                        onClick={() => addClip(m)}
                        style={addInChapterStyle}
                      >
                        <Icon name="plus" size={15} c="var(--red-on)" />
                        Add content file to the chapter
                      </button>

                      <button
                        type="button"
                        onClick={() => startNewQuiz(m)}
                        style={addInChapterStyle}
                      >
                        <Icon name="plus" size={15} c="var(--red-on)" />
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
        {/* minWidth:0 for the reason the left column is capped: this track is
            1fr, which is minmax(auto, 1fr), and its automatic minimum would
            let a long clip title or file name push the panel wider than the
            space there is. */}
        <div ref={detailRef} style={{ minWidth: 0, scrollMarginTop: 16 }}>
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
                Pick a clip or a quiz in the structure to edit it.
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
          isNew={modal.isNew}
          onClose={() => setModal(null)}
          onSaved={(title, isNew) => {
            setSelected({ kind: "quiz", id: modal.draft.id });
            // Left open: the Save button disappearing is what says the save
            // landed, and an author part-way through a quiz should not have to
            // reopen it. The quiz exists now, so it stops being new — which is
            // also what gives it a Delete on the Settings tab.
            setModal((m) => (m ? { ...m, isNew: false } : m));
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

      <Modal
        open={confirming !== null}
        onClose={() => {
          if (!deleting) setConfirming(null);
        }}
        title={
          confirming?.kind === "module" ? "Delete this chapter?" : "Remove this clip?"
        }
        width={440}
        footer={
          <>
            <WBtn
              kind="ghost"
              sm
              onClick={() => setConfirming(null)}
              disabled={deleting}
            >
              Cancel
            </WBtn>
            <WBtn sm icon="trash" onClick={confirmDelete} disabled={deleting}>
              {deleting
                ? "Deleting…"
                : confirming?.kind === "module"
                  ? "Delete chapter"
                  : "Remove clip"}
            </WBtn>
          </>
        }
      >
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-body)",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--text-secondary)",
          }}
        >
          <b style={{ color: "var(--text-primary)" }}>
            {confirming?.title || "Untitled"}
          </b>{" "}
          {confirming?.kind === "module"
            ? confirming.count > 0
              ? `and the ${confirming.count} item${
                  confirming.count === 1 ? "" : "s"
                } in it will be deleted.`
              : "will be deleted."
            : "and the media attached to it will be removed from the course."}{" "}
          This can&apos;t be undone.
        </p>
      </Modal>

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
  color: "var(--red-on)",
} as const;

const ellipsis = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

// ------------------------------------------------------------- moving a card --

/**
 * One card, with a handle on it.
 *
 * The whole row is not draggable, and that is the point: a clip row and a quiz
 * row are both already clickable, and making the body draggable turns every
 * slightly-imprecise click into a drag that selects nothing. The grip is the
 * only thing that starts one, which is also what makes a drag deliberate
 * enough not to need an undo.
 *
 * The grip is a button rather than a div so it can be tabbed to, and Arrow
 * Up/Down on it move the card a slot — native drag and drop answers only to a
 * pointer, and a reordering control that cannot be reached without one is not
 * finished.
 *
 * The card is also a drop target, not only the seams between cards: a list of
 * ten-pixel gaps separated by forty-pixel rows is mostly dead surface, and a
 * drop that lands on nothing reads as the drag having failed. Which half of
 * the row the pointer is in decides which seam it means, so the whole list
 * accepts a drop and the line still marks exactly where the card will land.
 */
function Draggable({
  card,
  held,
  label,
  onPick,
  onRelease,
  onHover,
  onDropAt,
  onNudge,
  children,
}: {
  card: Drag;
  held: boolean;
  label: string;
  onPick: (card: Drag) => void;
  onRelease: () => void;
  onHover: (gap: Gap) => void;
  onDropAt: (gap: Gap) => void;
  onNudge: (delta: -1 | 1) => void;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  // Armed by the grip, so the row is only draggable for the gesture that
  // started on it. `held` is the parent's answer to "is this the card in
  // hand", and is set when a drag actually begins rather than on mousedown —
  // arming is not dragging, and a row that dimmed on every press would lie.
  const [armed, setArmed] = useState(false);

  /** Which seam the pointer is nearest: above this card, or below it. */
  const seam = (e: { clientY: number; currentTarget: HTMLElement }): Gap => {
    const box = e.currentTarget.getBoundingClientRect();
    const below = e.clientY > box.top + box.height / 2;
    return { moduleId: card.moduleId, index: below ? card.index + 1 : card.index };
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // Set on the wrapper, not the grip: the drag image is the row, so what
      // follows the pointer is the card and not an eight-pixel handle.
      draggable={armed}
      onDragStart={(e) => {
        // Firefox starts no drag at all without a payload, and the value is
        // never read back — the card in hand is React state.
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onPick(card);
      }}
      onDragEnd={() => {
        setArmed(false);
        onRelease();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onHover(seam(e));
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropAt(seam(e));
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        opacity: held ? 0.4 : 1,
        transition: "opacity .12s ease",
      }}
    >
      <button
        type="button"
        aria-label={`Move ${label}`}
        title="Drag to move, or use the arrow keys"
        // mousedown rather than click: the drag has to be armed before the
        // browser decides a gesture has begun, and a click never arrives
        // during one.
        onMouseDown={() => setArmed(true)}
        onMouseUp={() => setArmed(false)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          onNudge(e.key === "ArrowDown" ? 1 : -1);
        }}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "2px 1px",
          border: "none",
          background: "none",
          cursor: "grab",
          lineHeight: 0,
          // Quiet until the row is under the pointer, for the reason the
          // chapter pencil is: a list of cards should read as titles. Never
          // quiet while it holds focus, or the keyboard path would be
          // invisible to the person using it.
          opacity: hover || held ? 1 : 0,
          transition: "opacity .15s ease",
        }}
        className="rs-grip"
      >
        <Icon name="grip" size={13} c="var(--text-muted)" />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

/**
 * The seam between two cards: the line that says where the card will land, and
 * a drop target in its own right for the two places a card has no neighbour —
 * above the first and below the last.
 *
 * It keeps a hairline's worth of height when nothing is being dragged so the
 * list does not reflow the moment a drag starts.
 */
function DropGap({
  gap,
  drag,
  over,
  onOver,
  onDrop,
}: {
  gap: Gap;
  drag: Drag | null;
  over: Gap | null;
  onOver: (gap: Gap) => void;
  onDrop: (card: Drag, gap: Gap) => void;
}) {
  const active =
    !!drag && over?.moduleId === gap.moduleId && over.index === gap.index;

  return (
    <div
      onDragOver={(e) => {
        if (!drag) return;
        // Without this the browser refuses the drop outright.
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onOver(gap);
      }}
      onDrop={(e) => {
        if (!drag) return;
        e.preventDefault();
        onDrop(drag, gap);
      }}
      style={{
        height: drag ? 10 : 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height: active ? 3 : 0,
          borderRadius: 999,
          background: "var(--red)",
          transition: "height .1s ease",
        }}
      />
    </div>
  );
}

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
  onDelete,
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
  /** Opens the confirm dialog. Nothing is deleted from here. */
  onDelete: () => void;
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
            color: "var(--red-on)",
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
            borderTopColor: "var(--red-hover)",
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
            c={renaming || hover ? "var(--red-on)" : "var(--text-muted)"}
          />
        </button>
      )}

      {/* Beside the pencil, and quiet in the same way, because the two are the
          same kind of thing: what you can do to the chapter itself rather than
          to what is in it. Hidden while the name is being edited — the row is
          a text field at that moment, and a delete a few pixels from the tick
          that saves it is a trap. */}
      {!renaming && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete chapter"
          aria-label={`Delete ${title}`}
          style={{
            display: "flex",
            alignItems: "center",
            padding: 2,
            border: "none",
            background: "none",
            cursor: "pointer",
            opacity: hover ? 1 : 0.4,
            transition: "opacity .15s ease",
          }}
        >
          <Icon
            name="trash"
            size={14}
            c={hover ? "var(--red-on)" : "var(--text-muted)"}
          />
        </button>
      )}
    </div>
  );
}

/**
 * One clip in the structure list.
 *
 * It stopped being a single <button> for the reason ChapterRow did: the
 * dustbin is a button, and a button inside a button is invalid and swallows
 * the inner click. So the title and the dustbin are two controls sharing a
 * row, and the row still selects the clip.
 *
 * This is the only place a clip is deleted. The editing panel on the right
 * used to carry a "Remove clip" of its own next to a "Remove" that meant
 * something else entirely; deleting belongs with the list of what there is to
 * delete, next to the chapter's dustbin, and reads as one idea there.
 */
function ClipRow({
  lesson,
  active,
  onOpen,
  onDelete,
}: {
  lesson: EditorLesson;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 9,
        background: active ? "var(--red-faint)" : "transparent",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
          padding: "8px 2px 8px 10px",
          borderRadius: 9,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-body)",
          fontSize: 12.5,
          color: "var(--text-secondary)",
          fontWeight: active ? 700 : 500,
        }}
      >
        <Icon
          name="video"
          size={14}
          c={active ? "var(--red-on)" : "var(--text-muted)"}
        />
        <span style={ellipsis}>{lesson.title}</span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        title="Remove clip"
        aria-label={`Remove ${lesson.title}`}
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          padding: "2px 8px 2px 2px",
          border: "none",
          background: "none",
          cursor: "pointer",
          // Quiet rather than absent, the way the chapter pencil is: a control
          // that only exists under the pointer cannot be found by anyone
          // looking for it.
          opacity: hover ? 1 : 0.35,
          transition: "opacity .15s ease",
        }}
      >
        <Icon
          name="trash"
          size={13}
          c={hover ? "var(--red-on)" : "var(--text-muted)"}
        />
      </button>
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
          borderColor: active ? "var(--red-hover)" : "var(--gold)",
        }}
      >
        <Icon name="zap" size={14} c={active ? "var(--red-on)" : "var(--gold-on)"} />
        <span
          style={{
            ...ellipsis,
            minWidth: 0,
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--gold-on)",
          }}
        >
          {quiz.title || "Untitled quiz"}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: "var(--gold-on)",
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
          <Icon name="dots" size={14} c="var(--gold-on)" />
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
                    label === "Delete" ? "var(--red-on)" : "var(--text-primary)",
                }}
              >
                <Icon
                  name={icon}
                  size={15}
                  c={label === "Delete" ? "var(--red-on)" : "var(--text-muted)"}
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
            <Icon name="zap" size={21} c="var(--gold-on)" />
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
              background: "var(--dark)",
              boxShadow: "inset 0 0 0 1.5px var(--border-mid)",
              borderRadius: 16,
              padding: 16,
              color: "var(--text-primary)",
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
        Editing content
      </SectionH>
      {/* Keyed on the clip so switching selection resets the fields — and the
          preview — to the clip you moved to, rather than carrying the last
          one's edits. ClipForm lays out its own preview column: the file it
          shows is form state until Save. */}
      <ClipForm key={lesson.id} courseId={courseId} lesson={lesson} />
    </Card>
  );
}
