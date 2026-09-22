"use client";

import { useState, useTransition } from "react";

import { Toast } from "@/components/ui/controls";
import { Modal, Textarea, WBtn } from "@/components/ui/primitives";
import { requestReview, withdrawReview } from "@/lib/review-actions";
import { type CourseReviewState } from "@/lib/course-tree";

/**
 * The educator's half of a review: hand the course over, or take it back.
 *
 * One control that changes what it says, rather than four buttons three of
 * which are disabled. What it offers is decided by the state and nothing else:
 *
 *   draft, changes_requested → "Send for review"
 *   revised                  → "Send changes for review" (it is already live)
 *   in_review                → "Withdraw request", because the course is locked
 *                              and this is the only way back to editing
 *   approved                 → nothing; there is nothing to ask for
 *
 * The note is optional and goes in with the request. Most say nothing, and a
 * mandatory box would be filled with "please review"; when there is something
 * to say — "chapter 3 is the one I changed" — it saves the reviewer reading
 * the whole course to find it.
 */
export function ReviewRequest({
  courseId,
  state,
}: {
  courseId: string;
  state: CourseReviewState;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (state === "approved") return null;

  const locked = state === "in_review";

  const run = (work: () => Promise<{ error: string } | { ok: true }>) => {
    start(async () => {
      const result = await work();
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      setToast(
        locked
          ? "Taken back off the reviewer's desk — you can edit again."
          : "Sent. An admin will take a look.",
      );
    });
  };

  if (locked) {
    return (
      <>
        <WBtn
          kind="ghost"
          icon="refresh"
          sm
          disabled={pending}
          onClick={() => run(() => withdrawReview(courseId))}
        >
          {pending ? "Withdrawing…" : "Withdraw request"}
        </WBtn>
        <Toast message={toast} />
      </>
    );
  }

  return (
    <>
      <WBtn icon="send" sm onClick={() => setOpen(true)}>
        {state === "revised" ? "Send changes for review" : "Send for review"}
      </WBtn>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={state === "revised" ? "Send your changes for review" : "Send this course for review"}
        width={520}
        footer={
          <>
            <WBtn kind="ghost" sm onClick={() => setOpen(false)}>
              Cancel
            </WBtn>
            <WBtn
              sm
              icon="send"
              disabled={pending}
              onClick={() => run(() => requestReview({ courseId, note }))}
            >
              {pending ? "Sending…" : "Send for review"}
            </WBtn>
          </>
        }
      >
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 14px",
          }}
        >
          An admin will read the whole course — every clip, every quiz and the
          final exam. <b>While it is with them you will not be able to edit
          it</b>, so that what they approve is what you sent. You can withdraw
          the request at any time to carry on working.
        </p>

        <div className="rs-label" style={{ marginBottom: 8 }}>
          Anything they should know? (optional)
        </div>
        <Textarea
          value={note}
          onChange={setNote}
          rows={3}
          placeholder="Chapter 3 is the part I reworked…"
        />
      </Modal>

      <Toast message={toast} />
    </>
  );
}
