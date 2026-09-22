"use client";

import { useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import {
  Card,
  Empty,
  Label,
  SectionH,
  Table,
  Tag,
  TextInput,
  WBtn,
  type Col,
} from "@/components/ui/primitives";
import { RowSetting, Toast, Toggle } from "@/components/ui/controls";
import {
  deleteExamQuestion,
  saveExamQuestion,
  saveExamSettings,
} from "@/lib/exam-actions";
import type { ActionResult } from "@/lib/course-actions";
import type { EditorQuestion } from "@/lib/course-tree";
import type { ExamSettings } from "@/lib/exams";
import {
  TYPE_LABEL,
  newQuestion,
  type QuestionDraft,
} from "@/lib/quiz-draft";

import { QuestionEditor } from "../quiz-modal";

/** submit_exam() grades one chosen choice per question, so the bank is
 *  restricted to the two single-answer types. */
const BANK_TYPES = ["mc", "image"] as const;

const COLS: Col[] = [
  ["#", 0.3],
  ["Question", 3],
  ["Type", 0.9],
  ["Status", 0.9],
  ["", 0.7, "right"],
];

function bankQuestionReady(q: EditorQuestion): boolean {
  return (
    !!q.prompt.trim() &&
    // An Image ID question with no picture is a multiple-choice question with
    // a missing sentence, so it does not count towards what the exam can draw.
    (q.type !== "image" || !!q.media_url) &&
    q.quiz_choices.some((c) => c.is_correct && c.body.trim())
  );
}

/**
 * The settings card's fields, as strings.
 *
 * Strings rather than numbers because that is what a text box holds: an
 * emptied field is "" and not NaN, so the baseline comparison below can say
 * plainly whether what is on screen still matches what was saved. The action
 * does the parsing and the range checks, as it did when this was a <form>.
 */
type SettingsDraft = {
  question_count: string;
  duration_minutes: string;
  pass_percent: string;
  attempts_allowed: string;
  grants_certificate: boolean;
};

const SETTINGS_TEXT_KEYS = [
  "question_count",
  "duration_minutes",
  "pass_percent",
  "attempts_allowed",
] as const;

function settingsDraft(
  settings: ExamSettings | null,
  bankSize: number,
): SettingsDraft {
  return {
    question_count: String(settings?.question_count ?? bankSize ?? 1),
    duration_minutes: String(settings?.duration_minutes ?? 30),
    pass_percent: String(settings?.pass_percent ?? 80),
    attempts_allowed: String(settings?.attempts_allowed ?? 2),
    grants_certificate: settings?.grants_certificate ?? true,
  };
}

function settingsChanged(a: SettingsDraft, b: SettingsDraft): boolean {
  return (
    a.grants_certificate !== b.grants_certificate ||
    SETTINGS_TEXT_KEYS.some((k) => a[k].trim() !== b[k].trim())
  );
}

/** Whether a question has been touched since the modal opened. */
function questionChanged(a: QuestionDraft, b: QuestionDraft): boolean {
  return (
    a.type !== b.type ||
    a.prompt !== b.prompt ||
    a.explanation !== b.explanation ||
    a.hint !== b.hint ||
    a.isRequired !== b.isRequired ||
    a.mediaUrl !== b.mediaUrl ||
    a.choices.length !== b.choices.length ||
    a.choices.some((c, i) => {
      const other = b.choices[i];
      return (
        !other ||
        c.id !== other.id ||
        c.body !== other.body ||
        c.isCorrect !== other.isCorrect
      );
    })
  );
}

function toDraft(q: EditorQuestion): QuestionDraft {
  return {
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
      isCorrect: c.is_correct,
    })),
  };
}

export function ExamBuilder({
  courseId,
  settings,
  bank,
}: {
  courseId: string;
  settings: ExamSettings | null;
  bank: EditorQuestion[];
}) {
  const [editing, setEditing] = useState<{
    draft: QuestionDraft;
    position: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();

  /**
   * `saved` is what is believed to be in the row; `draft` is what is on
   * screen. Save exists only while the two disagree.
   *
   * There is deliberately no <form> any more, and that is not tidiness. React
   * queues `requestFormReset` when a `<form action>` settles, and the DOM's
   * own reset returns "Auto-issue certificate" to the value it mounted with —
   * `draft` never changed, nothing re-renders, and the toggle is left
   * contradicting the state that was just written. The same trap the
   * notification switches fell into. The values go to the action as FormData
   * built here instead, so there is nothing left for a reset to undo.
   *
   * The baseline advances on a successful write rather than waiting for the
   * revalidated prop, so Save disappears exactly when the save lands and
   * stays put when it fails.
   */
  const [saved, setSaved] = useState<SettingsDraft>(() =>
    settingsDraft(settings, bank.length),
  );
  const [draft, setDraft] = useState<SettingsDraft>(saved);
  const [state, setState] = useState<ActionResult | null>(null);
  const [pending, setPending] = useState(false);

  const dirty = settingsChanged(draft, saved);

  const setField = (key: (typeof SETTINGS_TEXT_KEYS)[number]) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // The last verdict described the numbers as they were; editing retires it.
    setState((r) => (r === null ? r : null));
  };

  const saveSettings = () => {
    // Snapshot what is being sent: a field edited while the write is in flight
    // belongs to the next save, and advancing the baseline to the live draft
    // would hide that edit behind a Save button that never came back.
    const attempted = draft;
    setPending(true);
    start(async () => {
      setState(null);
      const form = new FormData();
      form.set("courseId", courseId);
      for (const key of SETTINGS_TEXT_KEYS) form.set(key, attempted[key]);
      if (attempted.grants_certificate) form.set("grants_certificate", "on");

      const outcome = await saveExamSettings(null, form);
      setPending(false);
      setState(outcome);
      if ("ok" in outcome) {
        setSaved(attempted);
        say("Exam settings saved");
      }
    });
  };

  const say = (message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((c) => (c === message ? null : c)),
      2600,
    );
  };

  const ready = bank.filter(bankQuestionReady).length;

  const remove = (q: EditorQuestion) =>
    start(async () => {
      const result = await deleteExamQuestion(courseId, q.id);
      say("error" in result ? result.error : "Question removed");
    });

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Card pad={0}>
          <div style={{ padding: "18px 20px 6px" }}>
            <SectionH
              action={
                <WBtn
                  kind="soft"
                  icon="plus"
                  sm
                  onClick={() =>
                    setEditing({
                      draft: newQuestion("mc"),
                      position: bank.length + 1,
                    })
                  }
                >
                  Add question
                </WBtn>
              }
            >
              {bank.length} question{bank.length === 1 ? "" : "s"} in the bank
            </SectionH>
          </div>

          {bank.length === 0 ? (
            <Empty
              title="The bank is empty"
              hint="Add questions here and the exam draws from them. Chapter quizzes live in the course editor instead."
            />
          ) : (
            <div style={{ padding: "0 4px 8px" }}>
              <Table
                cols={COLS}
                rows={bank.map((q, i) => [
                  <b key="n" style={{ color: "var(--text-muted)" }}>
                    {i + 1}
                  </b>,
                  <span key="p" style={{ color: "var(--text-primary)" }}>
                    {q.prompt || "Untitled question"}
                  </span>,
                  <Tag key="t" tone="ink">
                    {TYPE_LABEL[q.type]}
                  </Tag>,
                  bankQuestionReady(q) ? (
                    <Tag key="s" tone="leaf">
                      Ready
                    </Tag>
                  ) : (
                    <Tag key="s" tone="gold">
                      Draft
                    </Tag>
                  ),
                  <span
                    key="a"
                    style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
                  >
                    <WBtn
                      kind="ghost"
                      sm
                      onClick={() =>
                        setEditing({ draft: toDraft(q), position: q.position })
                      }
                    >
                      Edit
                    </WBtn>
                    <WBtn kind="text" sm onClick={() => remove(q)}>
                      Remove
                    </WBtn>
                  </span>,
                ])}
              />
            </div>
          )}
        </Card>

        <div>
          <Card>
            <SectionH
              action={
                // Absent, not disabled: there is nothing to save until a
                // number changes, and a greyed-out button says the opposite.
                dirty ? (
                  <WBtn icon="check2" sm disabled={pending} onClick={saveSettings}>
                    {pending ? "Saving…" : "Save"}
                  </WBtn>
                ) : null
              }
            >
              Exam settings
            </SectionH>

            <div style={{ marginBottom: 14 }}>
              <Label hint={`${ready} ready of ${bank.length}`}>
                Questions drawn
              </Label>
              <TextInput
                type="number"
                value={draft.question_count}
                onChange={setField("question_count")}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label hint="minutes">Time limit</Label>
              <TextInput
                type="number"
                value={draft.duration_minutes}
                onChange={setField("duration_minutes")}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <Label hint="percent">Pass mark</Label>
              <TextInput
                type="number"
                value={draft.pass_percent}
                onChange={setField("pass_percent")}
              />
            </div>
            <div style={{ marginBottom: 4 }}>
              <Label>Attempts allowed</Label>
              <TextInput
                type="number"
                value={draft.attempts_allowed}
                onChange={setField("attempts_allowed")}
              />
            </div>

            <RowSetting
              label="Auto-issue certificate"
              sub="A passing attempt awards the certificate straight away"
            >
              <Toggle
                on={draft.grants_certificate}
                label="Auto-issue certificate"
                onChange={(on) => {
                  setDraft((d) => ({ ...d, grants_certificate: on }));
                  setState((r) => (r === null ? r : null));
                }}
              />
            </RowSetting>

            {state && "error" in state && (
              <p
                style={{
                  color: "var(--danger)",
                  fontSize: 12.5,
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                {state.error}
              </p>
            )}

            <div
              style={{
                marginTop: 16,
                background: "var(--warn-bg)",
                borderRadius: 12,
                padding: "13px 14px",
                display: "flex",
                gap: 10,
              }}
            >
              <Icon name="award" size={18} c="var(--warn)" />
              <div style={{ fontSize: 12, color: "var(--gold-on)", lineHeight: 1.4 }}>
                Grading runs inside the database, so the answer key never
                reaches the student&apos;s device.
              </div>
            </div>
          </Card>
        </div>
      </div>

      {editing && (
        <QuestionModal
          courseId={courseId}
          draft={editing.draft}
          position={editing.position}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            say("Question saved");
          }}
        />
      )}

      <Toast message={toast} />
    </>
  );
}

function QuestionModal({
  courseId,
  draft: initial,
  position,
  onClose,
  onSaved,
}: {
  courseId: string;
  draft: QuestionDraft;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // A question opened and not touched has nothing to write, and one being
  // added is untouched until something is typed into it — so the same
  // comparison covers both, and Cancel is always the way out of an
  // untouched modal.
  const touched = questionChanged(draft, initial);

  const save = () =>
    start(async () => {
      const result = await saveExamQuestion(courseId, draft, position);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSaved();
    });

  return (
    <div
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Exam question"
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
          width: "min(760px, 100%)",
          maxHeight: "100%",
          background: "var(--dark-2)",
          borderRadius: 20,
          boxShadow: "var(--sh-3)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px 22px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "var(--warn-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="award" size={19} c="var(--warn)" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              className="rs-head"
              style={{ fontSize: 17 }}
            >
              Exam question {position}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
              Drawn into the final exam at random
            </div>
          </div>
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

        <div
          className="rs-noscroll"
          style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}
        >
          <QuestionEditor
            q={draft}
            courseId={courseId}
            allowed={[...BANK_TYPES]}
            onPatch={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          />
        </div>

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
          {error && (
            <span style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <WBtn kind="ghost" sm onClick={onClose}>
              Cancel
            </WBtn>
            {touched && (
              <WBtn sm icon="check2" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save question"}
              </WBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
