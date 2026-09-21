"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-actions";
import type { ConsoleNotification } from "@/lib/notifications";
import type { Role } from "@/lib/session";

const KIND = {
  feedback: { label: "Feedback", color: "var(--berry)" },
  announcement: { label: "Update", color: "var(--gold)" },
  review: { label: "Course review", color: "var(--red)" },
} as const;

export function NotificationPanel({
  messages,
  initialUnread,
  role,
}: {
  messages: ConsoleNotification[];
  initialUnread: number;
  role: Role;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(() => new Set());
  const [allRead, setAllRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  const unread = useMemo(() => {
    if (allRead) return 0;
    const newlyRead = messages.filter(
      (message) => !message.isRead && locallyRead.has(message.id),
    ).length;
    return Math.max(0, initialUnread - newlyRead);
  }, [allRead, initialUnread, locallyRead, messages]);

  const readOne = (message: ConsoleNotification) => {
    setSelected((current) => (current === message.id ? null : message.id));
    if (message.isRead || allRead || locallyRead.has(message.id)) return;

    setError(null);
    setLocallyRead((current) => new Set(current).add(message.id));
    start(async () => {
      const result = await markNotificationRead(message.id);
      if ("error" in result) {
        setLocallyRead((current) => {
          const next = new Set(current);
          next.delete(message.id);
          return next;
        });
        setError("Could not mark that notification as read.");
      }
    });
  };

  const readAll = () => {
    setError(null);
    setAllRead(true);
    start(async () => {
      const result = await markAllNotificationsRead();
      if ("error" in result) {
        setAllRead(false);
        setError("Could not mark notifications as read.");
      }
    });
  };

  return (
    <div style={{ position: "relative", zIndex: 40 }}>
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="console-notification-panel"
        onClick={() => {
          setOpen((current) => !current);
          setError(null);
        }}
        className="rs-iconbtn"
        style={{
          width: 38,
          height: 38,
          borderRadius: "var(--r-sm)",
          background: open ? "var(--dark-3)" : "var(--dark-2)",
          border: "0.5px solid var(--border-mid)",
          display: "grid",
          placeItems: "center",
          position: "relative",
          cursor: "pointer",
        }}
      >
        <Icon name="bell" size={17} c="var(--text-secondary)" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 7,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: 99,
              background: "var(--red)",
              border: "1.5px solid var(--dark-2)",
            }}
          />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              border: 0,
              background: "transparent",
              cursor: "default",
            }}
          />
          <section
            id="console-notification-panel"
            aria-label="Notifications"
            style={{
              position: "absolute",
              top: 48,
              right: 0,
              width: 390,
              maxHeight: "min(560px, calc(100vh - 92px))",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 1,
              background: "var(--dark-2)",
              border: "0.5px solid var(--border-mid)",
              borderRadius: 16,
              boxShadow: "var(--sh-3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 18px 14px",
                borderBottom: "0.5px solid var(--border)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="rs-head" style={{ fontSize: 16 }}>
                  Notifications
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {unread === 0
                    ? "You are all caught up"
                    : `${unread} unread ${unread === 1 ? "message" : "messages"}`}
                </div>
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={readAll}
                  style={{
                    border: 0,
                    padding: "5px 0",
                    background: "transparent",
                    color: "var(--red)",
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: pending ? "wait" : "pointer",
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="rs-noscroll" style={{ overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div
                  style={{
                    minHeight: 190,
                    padding: "34px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--dark-3)",
                      marginBottom: 12,
                    }}
                  >
                    <Icon name="bell" size={19} c="var(--text-muted)" />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Nothing new yet</div>
                  <div
                    style={{
                      maxWidth: 270,
                      marginTop: 4,
                      fontSize: 12.5,
                      lineHeight: 1.55,
                      color: "var(--text-muted)",
                    }}
                  >
                    {role === "educator"
                      ? "Course decisions and other updates will appear here."
                      : "Platform and review updates will appear here."}
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const kind = KIND[message.kind];
                  const isRead = message.isRead || allRead || locallyRead.has(message.id);
                  const expanded = selected === message.id;

                  return (
                    <button
                      type="button"
                      key={message.id}
                      onClick={() => readOne(message)}
                      aria-expanded={expanded}
                      style={{
                        width: "100%",
                        display: "flex",
                        gap: 12,
                        padding: "14px 18px",
                        border: 0,
                        borderBottom: "0.5px solid var(--border)",
                        background: isRead ? "transparent" : "var(--red-faint)",
                        color: "var(--text-primary)",
                        textAlign: "left",
                        fontFamily: "var(--font-body)",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 8,
                          height: 8,
                          marginTop: 6,
                          flexShrink: 0,
                          borderRadius: 99,
                          background: isRead ? "var(--border-mid)" : kind.color,
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            marginBottom: 3,
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 13,
                              fontWeight: isRead ? 600 : 800,
                            }}
                          >
                            {message.subject}
                          </span>
                          <time
                            dateTime={message.sentAt}
                            style={{
                              flexShrink: 0,
                              fontSize: 10.5,
                              color: "var(--text-muted)",
                            }}
                          >
                            {message.timeLabel}
                          </time>
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {expanded && message.body ? message.body : message.preview}
                        </span>
                        <span
                          className="rs-word"
                          style={{
                            display: "block",
                            marginTop: 6,
                            fontSize: 9.5,
                            letterSpacing: "0.08em",
                            color: kind.color,
                          }}
                        >
                          {kind.label} · {message.senderName}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {error && (
              <div
                role="status"
                style={{
                  padding: "9px 18px",
                  borderTop: "0.5px solid var(--border)",
                  fontSize: 11.5,
                  color: "var(--danger)",
                }}
              >
                {error}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
