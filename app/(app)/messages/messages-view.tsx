"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  Avatar,
  Empty,
  Modal,
  Select,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import {
  fetchThread,
  markThreadRead,
  sendReply,
  startThreadWithStudent,
} from "@/lib/message-actions";
import type { MessageableStudent, ThreadMessage, ThreadSummary } from "@/lib/messages";

/**
 * Phrased for a thread list — "just now", "4m ago" — where
 * `lib/submissions.ts` phrases the same idea for a review queue reading as a
 * backlog. Two shapes of the same function rather than one with a mode
 * argument; there is no third caller to make it worth unifying.
 */
function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: ThreadSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rs-row"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "14px 12px",
        border: "none",
        borderBottom: "0.5px solid var(--border)",
        background: active ? "var(--dark-3)" : "transparent",
        cursor: "pointer",
      }}
    >
      <Avatar name={thread.with.name} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
            {thread.with.name}
          </span>
          <span
            className="rs-word"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.06em",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            {ago(thread.last_message_at)}
          </span>
        </div>
        {thread.course_title ? (
          <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
            {thread.course_title}
          </div>
        ) : null}
        <div
          style={{
            fontSize: 12.5,
            color: thread.unread_count > 0 ? "var(--text-secondary)" : "var(--text-muted)",
            marginTop: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {thread.last_message_preview || "No messages yet"}
        </div>
      </div>
      {thread.unread_count > 0 && (
        <div
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 99,
            background: "var(--red)",
            color: "#fff",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 3,
            flexShrink: 0,
          }}
        >
          {thread.unread_count > 9 ? "9+" : thread.unread_count}
        </div>
      )}
    </button>
  );
}

function Bubble({ message }: { message: ThreadMessage }) {
  const mine = message.is_mine;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        marginBottom: 14,
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div
          style={{
            background: mine ? "var(--red)" : "var(--dark-3)",
            border: mine ? "none" : "0.5px solid var(--border-mid)",
            borderRadius: "var(--r-md)",
            padding: message.media.length ? 6 : "12px 16px",
            fontSize: 13.5,
            color: mine ? "#fff" : "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message.media.map((item) => (
            <div key={item.id} style={{ marginBottom: message.body ? 6 : 0 }}>
              {item.url ? (
                item.kind === "video" ? (
                  <video
                    src={item.url}
                    controls
                    style={{ width: 260, borderRadius: "var(--r-sm)", display: "block" }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    style={{ width: 260, borderRadius: "var(--r-sm)", display: "block" }}
                  />
                )
              ) : (
                // A signed URL that could not be minted, or one that expired
                // while this sat open. The bubble keeps its place so the
                // conversation still reads.
                <div
                  style={{
                    width: 260,
                    height: 150,
                    borderRadius: "var(--r-sm)",
                    background: "var(--dark-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  Attachment unavailable — reopen the thread
                </div>
              )}
            </div>
          ))}
          {message.body ? (
            <div style={{ padding: message.media.length ? "6px 10px 4px" : 0 }}>
              {message.body}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 9.5,
            color: "var(--text-muted)",
            marginTop: 4,
            textAlign: mine ? "right" : "left",
          }}
        >
          {clock(message.created_at)}
        </div>
      </div>
    </div>
  );
}

/**
 * The educator's side of 0027's conversations.
 *
 * This screen existed before the tables did — thread rows, a transcript pane
 * and a reply box, all drawn off a MESSAGES array in `lib/seed-data` (since
 * deleted, along with its MessageThread type), with a Send
 * button wired to nothing. The layout is kept because it was right; what
 * changes is that every row now comes from Postgres and the buttons do what
 * they say.
 *
 * Threads arrive as a prop from the server page, and one thread's messages are
 * loaded on click through a server action. Not all of them upfront: the list
 * is a couple of hundred rows of summary, while the transcripts behind it are
 * unbounded and each one needs its attachments signed.
 */
export function MessagesView({
  threads,
  students,
}: {
  threads: ThreadSummary[];
  students: MessageableStudent[];
}) {
  const router = useRouter();

  const [selected, setSelected] = useState<string | null>(threads[0]?.id ?? null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [composing, setComposing] = useState(false);
  const [composeTarget, setComposeTarget] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeError, setComposeError] = useState<string | null>(null);

  const thread = threads.find((t) => t.id === selected) ?? null;

  // Held rather than cleared when nothing is selected: clearing it would be a
  // setState in the effect body, which cascades a render for a value nothing
  // reads — the "Nothing selected" branch below does not draw messages. What
  // is displayed is derived instead.
  const shown = selected ? messages : [];

  useEffect(() => {
    if (!selected) return;

    let cancelled = false;

    // Inside the callback rather than in the effect body: the same two writes
    // done synchronously cascade an extra render, and the lint rule that says
    // so is right — nothing between here and the first await reads either.
    void (async () => {
      setLoading(true);
      setError(null);

      const result = await fetchThread(selected);
      if (cancelled) return;

      if ("error" in result) {
        setError(result.error);
        setMessages([]);
      } else {
        setMessages(result.messages);
        // Opening a thread is reading it. Fire-and-forget: the badge being a
        // moment stale is not worth blocking the transcript on, and the
        // action revalidates the page when it lands.
        void markThreadRead(selected);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const send = () => {
    const body = draft.trim();
    if (!body || !selected || pending) return;

    startTransition(async () => {
      const result = await sendReply(selected, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      setDraft("");
      setError(null);

      // Read the thread back rather than appending locally: the reply has to
      // come back with the id and timestamp Postgres gave it, and the list
      // row's preview is written by a trigger this never saw.
      const reloaded = await fetchThread(selected);
      if (!("error" in reloaded)) setMessages(reloaded.messages);
      router.refresh();
    });
  };

  const compose = () => {
    if (!composeTarget || pending) return;

    // The value still carries the course the student was picked from, because
    // the list is one row per student per course. A support thread is about
    // the person, so it is dropped here rather than sent.
    const [studentUserId] = composeTarget.split("|");

    startTransition(async () => {
      const started = await startThreadWithStudent(studentUserId);
      if ("error" in started) {
        setComposeError(started.error);
        return;
      }

      const body = composeBody.trim();
      if (body) {
        const sent = await sendReply(started.conversationId, body);
        if ("error" in sent) {
          setComposeError(sent.error);
          return;
        }
      }

      setComposing(false);
      setComposeTarget("");
      setComposeBody("");
      setComposeError(null);
      setSelected(started.conversationId);
      router.refresh();
    });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "100%",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--r-card)",
        overflow: "hidden",
      }}
    >
      <div
        style={{ borderRight: "0.5px solid var(--border)", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: "12px 12px",
            borderBottom: "0.5px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <WBtn icon="plus" sm onClick={() => setComposing(true)}>
            New message
          </WBtn>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }} className="rs-noscroll">
          {threads.length === 0 ? (
            <Empty
              title="No conversations yet"
              hint="Start one with a student on any of your courses, or wait for them to open one from the app."
            />
          ) : (
            threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                active={t.id === selected}
                onClick={() => setSelected(t.id)}
              />
            ))
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", background: "var(--dark-2)" }}>
        {!thread ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Empty
              title="Nothing selected"
              hint="Pick a conversation on the left, or start a new one."
            />
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 20px",
                borderBottom: "0.5px solid var(--border)",
              }}
            >
              <Avatar name={thread.with.name} size={32} />
              <div>
                <div style={{ fontSize: 14, color: "var(--text-primary)" }}>
                  {thread.with.name}
                </div>
                <div
                  className="rs-word"
                  style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}
                >
                  {thread.with.email ?? thread.course_title ?? "Student"}
                </div>
              </div>
            </div>

            <div
              style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }}
              className="rs-noscroll"
            >
              {loading ? (
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Loading…</div>
              ) : shown.length === 0 ? (
                <Empty
                  title="No messages yet"
                  hint="Say something to get this started."
                />
              ) : (
                shown.map((m) => <Bubble key={m.id} message={m} />)
              )}
            </div>

            {error ? (
              <div
                style={{
                  padding: "10px 20px",
                  fontSize: 12,
                  color: "var(--red-on)",
                  borderTop: "0.5px solid var(--border)",
                }}
              >
                {error}
              </div>
            ) : null}

            <div
              style={{
                padding: 16,
                borderTop: "0.5px solid var(--border)",
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: 1 }}>
                <Textarea
                  placeholder="Write a reply…"
                  rows={2}
                  value={draft}
                  onChange={setDraft}
                />
              </div>
              <WBtn icon="send" sm onClick={send} disabled={pending || !draft.trim()}>
                {pending ? "Sending…" : "Send"}
              </WBtn>
            </div>
          </>
        )}
      </div>

      <Modal
        open={composing}
        onClose={() => setComposing(false)}
        title="New message"
        footer={
          <WBtn icon="send" onClick={compose} disabled={pending || !composeTarget}>
            {pending ? "Sending…" : "Start conversation"}
          </WBtn>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {students.length === 0 ? (
            <Empty
              title="No students to message"
              hint="Nobody is enrolled on your courses yet."
            />
          ) : (
            <>
              <Select
                placeholder="Choose a student"
                value={composeTarget}
                onChange={setComposeTarget}
                options={students.map((s) => ({
                  // The pair is the key, because 0027 keys a thread on the
                  // course as well as the two people — the same student on two
                  // of your courses is two threads.
                  value: `${s.id}|${s.course_id}`,
                  label: `${s.name} — ${s.course_title}`,
                }))}
              />
              <Textarea
                placeholder="Write the first message…"
                rows={4}
                value={composeBody}
                onChange={setComposeBody}
              />
            </>
          )}
          {composeError ? (
            <div style={{ fontSize: 12, color: "var(--red-on)" }}>{composeError}</div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
