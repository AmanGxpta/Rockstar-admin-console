"use client";

import { useEffect, useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { Label, Tag, WBtn } from "@/components/ui/primitives";
import { QuestionImagePicker } from "@/components/ui/question-image-picker";
import { RowSetting, Seg, TArea, Toggle } from "@/components/ui/controls";
import { saveQuiz } from "@/lib/quiz-actions";
import {
  ATTEMPT_OPTIONS,
  QUESTION_TYPES,
  attemptsToLabel,
  draftAnswerKeyed,
  draftQuestionReady,
  draftQuizReady,
  labelToAttempts,
  newChoice,
  newQuestion,
  type QuestionDraft,
  type QuestionType,
  type QuizDraft,
} from "@/lib/quiz-draft";

const FIELD_SHADOW = "inset 0 0 0 1.5px var(--border-mid)";

/**
 * Shared by the chapter-quiz modal and the final-exam builder.
 *
 * `allowed` narrows the type picker: the exam bank is graded by submit_exam(),
 * which matches one chosen choice per question, so multi-select and reorder
 * are not offered there.
 *
 * `courseId` is here for one field only — an Image ID question's picture goes
 * into `course-media` under `courses/<course_id>/…`, which is the path shape
 * every storage policy in 0009 reads the owner out of.
 */
export function QuestionEditor({
  q,
  courseId,
  onPatch,
  allowed,
}: {
  q: QuestionDraft;
  courseId: string;
  onPatch: (patch: Partial<QuestionDraft>) => void;
  allowed?: QuestionType[];
}) {
  const types = allowed
    ? QUESTION_TYPES.filter((t) => allowed.includes(t.value))
    : QUESTION_TYPES;
  const isOrder = q.type === "order";
  const isImage = q.type === "image";
  const isMulti = q.type === "multi";

  const setChoice = (id: string, body: string) =>
    onPatch({
      choices: q.choices.map((c) => (c.id === id ? { ...c, body } : c)),
    });

  const markCorrect = (id: string) =>
    onPatch({
      choices: q.choices.map((c) => ({
        ...c,
        isCorrect: isMulti
          ? c.id === id
            ? !c.isCorrect
            : c.isCorrect
          : c.id === id,
      })),
    });

  const removeChoice = (id: string) =>
    onPatch({ choices: q.choices.filter((c) => c.id !== id) });

  const move = (i: number, delta: number) => {
    const next = q.choices.slice();
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ choices: next });
  };

  return (
    <div>
      <Label>Question type</Label>
      <div
        style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
      >
        {types.map((t) => {
          const on = q.type === t.value;
          return (
            <button
              type="button"
              key={t.value}
              onClick={() =>
                onPatch({
                  type: t.value,
                  // A reorder question needs a third step to mean anything.
                  choices:
                    t.value === "order" && q.choices.length < 3
                      ? [...q.choices, newChoice()]
                      : q.choices,
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 12.5,
                fontWeight: 700,
                background: on ? "var(--red-faint)" : "var(--dark)",
                color: on ? "var(--red-on)" : "var(--text-secondary)",
                boxShadow: on
                  ? "inset 0 0 0 1.5px var(--red-hover)"
                  : FIELD_SHADOW,
              }}
            >
              <Icon
                name={t.icon}
                size={14}
                c={on ? "var(--red-on)" : "var(--text-muted)"}
              />
              {t.label}
            </button>
          );
        })}
      </div>

      <Label>Question</Label>
      <div style={{ marginBottom: 18 }}>
        <TArea
          value={q.prompt}
          onChange={(v) => onPatch({ prompt: v })}
          placeholder="e.g. Which sectioning keeps a balayage seamless?"
          rows={2}
        />
      </div>

      {isImage && (
        <div style={{ marginBottom: 18 }}>
          <Label hint="students identify the area or tool shown">
            Reference image
          </Label>
          <QuestionImagePicker
            // Keyed, because the stepper swaps `q` under one editor instance:
            // without this the blob preview of the question just uploaded to
            // would still be on screen against the next question.
            key={q.id}
            courseId={courseId}
            questionId={q.id}
            path={q.mediaUrl}
            onChange={(mediaUrl) => onPatch({ mediaUrl })}
          />
        </div>
      )}

      <Label
        hint={
          isOrder
            ? "top to bottom = correct order"
            : isMulti
              ? "tick every correct answer"
              : "tick the correct answer"
        }
      >
        {isOrder ? "Steps" : "Answer options"}
      </Label>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {q.choices.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 12px",
              borderRadius: 12,
              background: "var(--dark-2)",
              boxShadow:
                !isOrder && c.isCorrect
                  ? "inset 0 0 0 2px var(--success)"
                  : FIELD_SHADOW,
            }}
          >
            {isOrder ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <button
                  type="button"
                  aria-label="Move step up"
                  onClick={() => move(i, -1)}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    lineHeight: 0,
                    cursor: "pointer",
                    opacity: i === 0 ? 0.3 : 1,
                  }}
                >
                  <Icon
                    name="chevD"
                    size={14}
                    c="var(--text-muted)"
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Move step down"
                  onClick={() => move(i, 1)}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    lineHeight: 0,
                    cursor: "pointer",
                    opacity: i === q.choices.length - 1 ? 0.3 : 1,
                  }}
                >
                  <Icon name="chevD" size={14} c="var(--text-muted)" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => markCorrect(c.id)}
                title="Mark correct"
                aria-label="Mark correct"
                aria-pressed={c.isCorrect}
                style={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  cursor: "pointer",
                  border: "none",
                  padding: 0,
                  borderRadius: isMulti ? 7 : 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: c.isCorrect ? "var(--success)" : "var(--dark)",
                  boxShadow: c.isCorrect ? "none" : FIELD_SHADOW,
                }}
              >
                {c.isCorrect && <Icon name="check" size={15} c="#fff" />}
              </button>
            )}

            {isOrder && (
              <span
                style={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: 8,
                  background: "var(--red-faint)",
                  color: "var(--red-on)",
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
            )}

            <input
              value={c.body}
              onChange={(e) => setChoice(c.id, e.target.value)}
              placeholder={
                isOrder
                  ? `Step ${i + 1}`
                  : isImage
                    ? `Label ${i + 1}`
                    : `Option ${i + 1}`
              }
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 600,
                color:
                  !isOrder && c.isCorrect
                    ? "var(--leaf-on)"
                    : "var(--text-primary)",
              }}
            />

            {q.choices.length > 2 && (
              <button
                type="button"
                aria-label="Remove option"
                onClick={() => removeChoice(c.id)}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  lineHeight: 0,
                  cursor: "pointer",
                }}
              >
                <Icon name="trash" size={16} c="var(--text-muted)" />
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => onPatch({ choices: [...q.choices, newChoice()] })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "11px 13px",
            borderRadius: 12,
            border: "1.5px dashed var(--border-mid)",
            background: "transparent",
            color: "var(--red-on)",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={17} c="var(--red-on)" />
          {isOrder ? "Add step" : "Add option"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginTop: 20,
        }}
      >
        <div>
          <Label hint="shown after answering">Explanation</Label>
          <TArea
            value={q.explanation}
            onChange={(v) => onPatch({ explanation: v })}
            placeholder="Why this is the right answer…"
            rows={2}
          />
        </div>
        <div>
          <Label hint="optional nudge">Hint</Label>
          <TArea
            value={q.hint}
            onChange={(v) => onPatch({ hint: v })}
            placeholder="Think about how the hair falls…"
            rows={2}
          />
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        <RowSetting
          label="Required"
          sub="Student must answer this to finish the quiz"
        >
          <Toggle
            on={q.isRequired}
            label="Required"
            onChange={(v) => onPatch({ isRequired: v })}
          />
        </RowSetting>
      </div>
    </div>
  );
}

export function QuizModal({
  initial,
  chapterTitle,
  isNew,
  onClose,
  onSaved,
  onDelete,
}: {
  initial: QuizDraft;
  chapterTitle: string;
  /** True until this quiz has been written once — a new quiz always has
      something to save, even before a key is pressed. */
  isNew: boolean;
  onClose: () => void;
  onSaved: (title: string, isNew: boolean) => void;
  /** Absent for a quiz that has never been saved — there is nothing to delete. */
  onDelete: (() => void) | null;
}) {
  const [draft, setDraft] = useState<QuizDraft>(initial);
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState<"questions" | "settings">("questions");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // The draft as it was last written. Compared by serialising both: a draft is
  // plain JSON built from the same object literals every time, so key order is
  // stable and stringify is a true equality test for it.
  const [stored, setStored] = useState<string | null>(
    isNew ? null : JSON.stringify(initial),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const qs = draft.questions;
  const active = Math.min(idx, qs.length - 1);
  const q = qs[active];

  const patchQ = (patch: Partial<QuestionDraft>) =>
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((x, i) =>
        i === Math.min(idx, d.questions.length - 1) ? { ...x, ...patch } : x,
      ),
    }));

  /**
   * Starts another question — but only once this one can be marked.
   *
   * An author who moves on from an unkeyed question has no reason to come
   * back: the stepper shows a numbered tab either way, and nothing says the
   * question is unanswerable until the whole quiz refuses to save. So the
   * gate is here, at the moment of leaving, where the missing tick is still
   * on screen.
   */
  const addQ = () => {
    if (!draftAnswerKeyed(q)) {
      setError(
        q.type === "order"
          ? "Write at least two steps for this question before adding another."
          : "Mark the correct answer for this question before adding another.",
      );
      return;
    }
    setError(null);
    setDraft((d) => ({ ...d, questions: [...d.questions, newQuestion()] }));
    setIdx(qs.length);
    setTab("questions");
  };

  const delQ = () => {
    if (qs.length === 1) return;
    setDraft((d) => ({
      ...d,
      questions: d.questions.filter((_, j) => j !== active),
    }));
    setIdx(Math.max(0, active - 1));
  };

  const save = () => {
    setError(null);
    const saving = draft;
    start(async () => {
      const result = await saveQuiz(saving);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // The modal stays open and the button goes instead. Closing on save
      // would mean an author who wanted to keep working had to reopen the
      // quiz, and there would be nothing on screen to show the save landed.
      setStored(JSON.stringify(saving));
      onSaved(saving.title.trim() || "Untitled quiz", isNew);
    });
  };

  const ready = draftQuizReady(draft);
  const keyed = draftAnswerKeyed(q);
  // A quiz that has never been written always has something to save; after
  // that, only a change does.
  const dirty = stored === null || JSON.stringify(draft) !== stored;

  return (
    <div
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quiz builder"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(42,33,28,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="rs"
        style={{
          width: "min(880px, 100%)",
          maxHeight: "100%",
          background: "var(--dark-2)",
          borderRadius: 20,
          boxShadow: "var(--sh-3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "18px 22px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flexShrink: 0,
                background: "var(--red-faint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="zap" size={19} c="var(--red-on)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Quiz title"
                aria-label="Quiz title"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "var(--font-head)",
                  fontWeight: 800,
                  fontSize: 19,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              />
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--text-secondary)",
                  marginTop: 1,
                }}
              >
                {chapterTitle} · {qs.length} question
                {qs.length === 1 ? "" : "s"}
              </div>
            </div>
            <Tag tone={ready ? "leaf" : "gold"}>
              {ready ? "Ready" : "Draft"}
            </Tag>

            {/* Next to the badge that says whether the quiz is finished,
                because the two answer the same question from opposite sides:
                what state is this in, and is there anything outstanding. It
                is not in the footer any more — down there it sat beside Add
                question and Back, which are about moving through the quiz,
                not about keeping it.

                It is on screen only while there is something to write. Once
                the save lands it goes, and comes back the moment anything is
                typed. */}
            {dirty && (
              <WBtn sm icon="check2" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save quiz"}
              </WBtn>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rs-iconbtn"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--dark)",
              }}
            >
              <Icon name="x" size={17} c="var(--text-secondary)" />
            </button>
          </div>

          {/* stepper */}
          <div
            className="rs-noscroll"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 16,
              overflowX: "auto",
            }}
          >
            {qs.map((qq, i) => {
              const on = tab === "questions" && i === active;
              const done = draftQuestionReady(qq);
              return (
                <button
                  type="button"
                  key={qq.id}
                  onClick={() => {
                    setIdx(i);
                    setTab("questions");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "8px 13px",
                    borderRadius: "10px 10px 0 0",
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-body)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: on ? "var(--red-on)" : "var(--text-secondary)",
                    background: on ? "var(--red-faint)" : "transparent",
                    borderBottom: on
                      ? "2px solid var(--red-hover)"
                      : "2px solid transparent",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done ? "var(--success)" : "var(--cream-3)",
                      color: done ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  Q{i + 1}
                </button>
              );
            })}

            <button
              type="button"
              onClick={addQ}
              disabled={!keyed}
              title={
                keyed
                  ? "Add a question"
                  : "Mark the correct answer for this question first"
              }
              style={{
                padding: "8px 11px",
                border: "none",
                background: "none",
                cursor: keyed ? "pointer" : "not-allowed",
                color: keyed ? "var(--red-on)" : "var(--text-muted)",
                opacity: keyed ? 1 : 0.55,
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "var(--font-body)",
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <Icon
                name="plus"
                size={15}
                c={keyed ? "var(--red-on)" : "var(--text-muted)"}
              />
              Add
            </button>

            <button
              type="button"
              onClick={() => setTab("settings")}
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                borderRadius: "10px 10px 0 0",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: 12.5,
                fontWeight: 700,
                color:
                  tab === "settings"
                    ? "var(--red-on)"
                    : "var(--text-secondary)",
                background:
                  tab === "settings" ? "var(--red-faint)" : "transparent",
                borderBottom:
                  tab === "settings"
                    ? "2px solid var(--red-hover)"
                    : "2px solid transparent",
              }}
            >
              <Icon
                name="gear"
                size={15}
                c={tab === "settings" ? "var(--red-on)" : "var(--text-muted)"}
              />
              Settings
            </button>
          </div>
        </div>

        {/* body */}
        <div
          className="rs-noscroll"
          style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}
        >
          {tab === "questions" ? (
            <QuestionEditor q={q} courseId={draft.courseId} onPatch={patchQ} />
          ) : (
            <div style={{ maxWidth: 520 }}>
              <div style={{ marginBottom: 18 }}>
                <Label>Attempts allowed</Label>
                <Seg
                  options={ATTEMPT_OPTIONS}
                  value={attemptsToLabel(draft.attemptsAllowed)}
                  onChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      attemptsAllowed: labelToAttempts(v),
                    }))
                  }
                />
              </div>
              <RowSetting
                label="Show results immediately"
                sub="Score and explanations appear as soon as the quiz is submitted"
              >
                <Toggle
                  on={draft.showResults}
                  label="Show results immediately"
                  onChange={(v) => setDraft((d) => ({ ...d, showResults: v }))}
                />
              </RowSetting>
              <RowSetting
                label="Required to continue course"
                sub="Students can't open the next clip until they pass"
              >
                <Toggle
                  on={draft.gatesProgress}
                  label="Required to continue course"
                  onChange={(v) =>
                    setDraft((d) => ({ ...d, gatesProgress: v }))
                  }
                />
              </RowSetting>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  style={{
                    marginTop: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    background: "none",
                    padding: 0,
                    color: "var(--red-on)",
                    fontFamily: "var(--font-body)",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Icon name="trash" size={16} c="var(--red-on)" />
                  Delete this quiz
                </button>
              )}
            </div>
          )}
        </div>

        {/* footer — questions only. Settings has nothing to step through, and
            Save moved to the header, so there is no bar left to draw there. */}
        {tab === "questions" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 22px",
              borderTop: "1px solid var(--border)",
              background: "var(--dark)",
            }}
          >
            <WBtn
              kind="ghost"
              sm
              icon="trash"
              onClick={delQ}
              disabled={qs.length === 1}
            >
              Delete question
            </WBtn>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {/* Says why Add question is greyed out, beside the button it is
                  about, rather than leaving a dead control to explain itself.
                  Only where that button is: on an earlier question the way on
                  is Next, which is not gated. */}
              {!keyed && active === qs.length - 1 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--gold-on)",
                    fontWeight: 600,
                  }}
                >
                  {q.type === "order"
                    ? "Write at least two steps to continue"
                    : "Tick the correct answer to continue"}
                </span>
              )}
              <span
                style={{
                  fontSize: 12.5,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Question {active + 1} of {qs.length}
              </span>
              <WBtn
                kind="ghost"
                sm
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={active === 0}
              >
                Back
              </WBtn>
              {active < qs.length - 1 ? (
                <WBtn kind="soft" sm onClick={() => setIdx((i) => i + 1)}>
                  Next
                </WBtn>
              ) : (
                <WBtn
                  kind="soft"
                  sm
                  icon="plus"
                  onClick={addQ}
                  disabled={!keyed}
                >
                  Add question
                </WBtn>
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 22px 14px",
              color: "var(--danger)",
              fontSize: 13,
              background: "var(--dark)",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
