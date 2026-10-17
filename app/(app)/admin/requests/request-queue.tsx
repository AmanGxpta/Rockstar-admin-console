"use client";

import { useState, useTransition } from "react";

import { Toast } from "@/components/ui/controls";
import { CoverImage } from "@/components/ui/cover-image";
import {
  Avatar,
  Card,
  Modal,
  SectionH,
  Tag,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import { decideAccessRequest } from "@/lib/access-request-actions";
import type { AccessRequestRow, AccessRequestState } from "@/lib/access-requests";

const STATE: Record<
  AccessRequestState,
  { label: string; tone: "gold" | "leaf" | "rose" | "ink" }
> = {
  pending: { label: "Waiting on you", tone: "gold" },
  approved: { label: "Approved", tone: "leaf" },
  declined: { label: "Declined", tone: "rose" },
  withdrawn: { label: "Withdrawn", tone: "ink" },
};

/** How long the access lasts. Mirrors lib/access-actions.ts's GrantDuration. */
const DURATIONS = [
  { value: "", label: "The course's own term" },
  { value: "3", label: "3 months" },
  { value: "12", label: "12 months" },
  { value: "forever", label: "No end date" },
] as const;

function ago(iso: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Approve, or say why not.
 *
 * Both verdicts go through decide_course_access_request(), which writes the
 * decision, the entitlement, the enrollment and the student's inbox message in
 * one transaction — the argument lib/review-actions.ts makes about the review
 * verbs applies here for the same reason. Doing it from the browser in four
 * PostgREST calls would leave a request marked approved with no access behind
 * it the first time one of them failed.
 *
 * Declining asks for a reason and does not insist on one. A refusal with
 * nothing attached still reaches the student's inbox saying the team looked at
 * it, which is better than silence; when there is something to say — "this one
 * is for level 2, finish level 1 first" — it goes in the same message.
 */
export function RequestQueue({ requests }: { requests: AccessRequestRow[] }) {
  const [open, setOpen] = useState<{
    request: AccessRequestRow;
    approve: boolean;
  } | null>(null);
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = () => {
    if (!open) return;
    start(async () => {
      const result = await decideAccessRequest({
        requestId: open.request.id,
        approve: open.approve,
        note,
        // "forever" is not a month count. grant_entitlement() cannot express
        // "no expiry" when the course carries an access_months of its own, so
        // the honest way to say it is a very long term rather than a lie about
        // the default — see lib/access-actions.ts, which clears the date after
        // the fact for the same case.
        months: duration === "" || duration === "forever" ? null : Number(duration),
      });

      if ("error" in result) {
        setToast(result.error);
        return;
      }

      const who = open.request.student.name;
      setToast(
        open.approve
          ? `${who} is in, and has been told.`
          : `Sent back to ${who} with your note.`,
      );
      setOpen(null);
      setNote("");
      setDuration("");
    });
  };

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {requests.map((request) => {
          const state = STATE[request.state];
          return (
            <Card key={request.id} pad={0} style={{ overflow: "hidden" }}>
              {/* Below 600px the buttons wrap under the details (.rs-request-*). */}
              <div className="rs-request-row">
                <div className="rs-request-cover">
                  <CoverImage path={request.course.coverPath} h={116} />
                </div>

                <div style={{ flex: 1, minWidth: 0, padding: "14px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Avatar name={request.student.name} size={28} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                        {request.student.name}
                      </div>
                      {/* An email has no spaces to break at, so on a narrow row
                          it ran under the state tag beside it. */}
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--text-muted)",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {request.student.email ?? "—"} · asked {ago(request.createdAt)}
                      </div>
                    </div>
                    {/*
                      Only on a row that has been decided. On a pending one
                      "Waiting on you" said nothing the Decline / Enroll pair
                      beside it was not already saying, and it sat on the line
                      the buttons now occupy.
                    */}
                    {request.state !== "pending" && (
                      <Tag tone={state.tone}>{state.label}</Tag>
                    )}
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-head)",
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: "-0.01em",
                      marginBottom: request.note || request.decisionNote ? 6 : 0,
                    }}
                  >
                    {request.course.title}
                  </div>

                  {request.note && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        margin: 0,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      “{request.note}”
                    </p>
                  )}

                  {request.decisionNote && request.state !== "pending" && (
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-muted)",
                        lineHeight: 1.6,
                        margin: "6px 0 0",
                      }}
                    >
                      You said: {request.decisionNote}
                    </p>
                  )}
                </div>

                {request.state === "pending" && (
                  // Top, not centre: the row's first line — avatar, name, and
                  // the state tag on a decided row — is what these align to,
                  // and 14px is that line's own padding, so the buttons and the
                  // name share a centre line.
                  <div className="rs-request-actions">
                    <WBtn
                      kind="ghost"
                      icon="x"
                      sm
                      onClick={() => {
                        setNote("");
                        setDuration("");
                        setOpen({ request, approve: false });
                      }}
                    >
                      Decline
                    </WBtn>
                    <WBtn
                      icon="check"
                      sm
                      onClick={() => {
                        setNote("");
                        setDuration("");
                        setOpen({ request, approve: true });
                      }}
                    >
                      Enroll
                    </WBtn>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={
          open?.approve
            ? `Enroll ${open.request.student.name}`
            : `Decline ${open?.request.student.name ?? ""}`
        }
        width={540}
        footer={
          <>
            <WBtn kind="ghost" sm onClick={() => setOpen(null)}>
              Cancel
            </WBtn>
            <WBtn sm disabled={pending} onClick={decide}>
              {pending
                ? "Saving…"
                : open?.approve
                  ? "Grant access"
                  : "Send the decline"}
            </WBtn>
          </>
        }
      >
        {open?.approve ? (
          <>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                margin: "0 0 16px",
              }}
            >
              <b>{open.request.student.name}</b> gets access to{" "}
              <b>{open.request.course.title}</b> and is enrolled on it, so it
              appears on their Learn tab straight away.
            </p>

            <SectionH>How long</SectionH>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {DURATIONS.map((d) => {
                const on = duration === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDuration(d.value)}
                    style={{
                      padding: "7px 13px",
                      borderRadius: 999,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      fontFamily: "var(--font-body)",
                      // Selection is carried by the text and the ring, not
                      // by a fill. The filled version used --ink, a cream, and
                      // put #fff text on it, which left the chosen term the
                      // least readable of the four.
                      background: "var(--dark-2)",
                      color: on ? "#fff" : "var(--text-secondary)",
                      boxShadow: on
                        ? "inset 0 0 0 1.5px #fff"
                        : "inset 0 0 0 1.5px var(--border-mid)",
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: "0 0 16px",
            }}
          >
            <b>{open?.request.student.name}</b> is told the team looked at their
            request for <b>{open?.request.course.title}</b>. They can ask again
            afterwards.
          </p>
        )}

        <div className="rs-label" style={{ marginBottom: 8 }}>
          {open?.approve ? "Anything to say with it?" : "Why not?"}
        </div>
        <Textarea
          value={note}
          onChange={setNote}
          rows={3}
          placeholder={
            open?.approve
              ? "Welcome in — start with chapter one."
              : "This one is for level 2. Finish level 1 first and ask again."
          }
        />
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            margin: "10px 0 0",
            lineHeight: 1.6,
          }}
        >
          Optional. Whatever you write here goes into the student&rsquo;s inbox
          with the decision.
        </p>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
