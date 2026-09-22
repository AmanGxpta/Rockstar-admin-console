"use client";

import { useState, useTransition } from "react";

import { Textarea, WBtn } from "@/components/ui/primitives";
import {
  reviewSubmission,
  type ReviewDecision,
} from "@/lib/submission-actions";

/**
 * The verdict and the note are one control.
 *
 * Approving and sending back are the same form with two buttons rather than
 * two panels, because the note means the same thing either way: it is what the
 * student reads. Sending back refuses to submit without one — a revision
 * request with no reason is the one outcome they cannot act on — while an
 * approval with an empty box simply writes no note.
 */
export function ReviewForm({
  submissionId,
  reviewed,
}: {
  submissionId: string;
  /** Already ruled on once: the buttons say so rather than pretending it is new. */
  reviewed: boolean;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ReviewDecision | null>(null);
  const [busy, start] = useTransition();

  const submit = (decision: ReviewDecision) => {
    setError(null);
    start(async () => {
      const result = await reviewSubmission(submissionId, decision, note);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // The page revalidates behind this, so the note has already moved into
      // the history above — clearing the box stops it being sent twice.
      setNote("");
      setDone(decision);
    });
  };

  return (
    <div>
      <Textarea
        placeholder="What did they get right, and what would you change? The student reads this word for word."
        rows={4}
        value={note}
        onChange={(v) => {
          setNote(v);
          setDone(null);
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 14,
        }}
      >
        <WBtn
          icon="pencil"
          kind="ghost"
          onClick={() => submit("needs_revision")}
          disabled={busy}
        >
          {busy ? "Saving…" : "Send back for revision"}
        </WBtn>
        <WBtn icon="check" onClick={() => submit("approved")} disabled={busy}>
          {busy ? "Saving…" : reviewed ? "Approve instead" : "Approve"}
        </WBtn>

        {done && !busy && (
          <span style={{ fontSize: 12.5, color: "var(--success)" }}>
            {done === "approved" ? "Approved." : "Sent back."} The student sees
            this in their app.
          </span>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 10 }}>
          {error}
        </div>
      )}

      {/*
        0019 announces the note, not the verdict: the student's inbox message
        quotes what was written, so an approval with an empty box passes the
        work without telling them anything. Worth saying out loud rather than
        leaving a reviewer to discover it.
      */}
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
        Whatever you write is sent to the student&rsquo;s inbox. Approving with
        the box empty passes the work quietly.
      </div>
    </div>
  );
}
