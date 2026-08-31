"use client";

import { useState } from "react";
import { Avatar, Textarea, WBtn } from "@/components/ui/primitives";
import { MESSAGES, relativeTime, studentById, type MessageThread } from "@/lib/seed-data";

function ThreadRow({
  thread,
  active,
  onClick,
}: {
  thread: MessageThread;
  active: boolean;
  onClick: () => void;
}) {
  const student = studentById(thread.studentId);
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
      <Avatar name={student?.name ?? "?"} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
            {student?.name}
          </span>
          <span className="rs-word" style={{ fontSize: 9.5, letterSpacing: "0.06em", color: "var(--text-muted)", flexShrink: 0 }}>
            {relativeTime(thread.lastActivity)}
          </span>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            marginTop: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {thread.preview}
        </div>
      </div>
      {thread.unread && (
        <div style={{ width: 7, height: 7, borderRadius: 99, background: "var(--red)", marginTop: 4, flexShrink: 0 }} />
      )}
    </button>
  );
}

export function MessagesView() {
  const [selected, setSelected] = useState(MESSAGES[0].id);
  const thread = MESSAGES.find((m) => m.id === selected)!;
  const student = studentById(thread.studentId);

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
      <div style={{ borderRight: "0.5px solid var(--border)", overflowY: "auto" }} className="rs-noscroll">
        {MESSAGES.map((m) => (
          <ThreadRow key={m.id} thread={m} active={m.id === selected} onClick={() => setSelected(m.id)} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", background: "var(--dark-2)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "0.5px solid var(--border)",
          }}
        >
          <Avatar name={student?.name ?? "?"} size={32} />
          <div>
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{student?.name}</div>
            <div className="rs-word" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
              {student?.email}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }} className="rs-noscroll">
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
            <div
              style={{
                maxWidth: 420,
                background: "var(--dark-3)",
                border: "0.5px solid var(--border-mid)",
                borderRadius: "var(--r-md)",
                padding: "12px 16px",
                fontSize: 13.5,
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {thread.preview}
            </div>
          </div>
        </div>

        <div style={{ padding: 16, borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Textarea placeholder="Write a reply…" rows={2} />
          </div>
          <WBtn icon="send" sm>
            Send
          </WBtn>
        </div>
      </div>
    </div>
  );
}
