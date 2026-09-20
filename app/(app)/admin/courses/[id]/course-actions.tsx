"use client";

import { useState, useTransition } from "react";

import { Toast } from "@/components/ui/controls";
import { Modal, Textarea, WBtn } from "@/components/ui/primitives";
import { setPublished } from "@/lib/course-actions";
import { decideReview } from "@/lib/review-actions";
import { awaitingReview, type CourseReviewState } from "@/lib/course-tree";

/**
 * The admin's verdict, and the catalog controls either side of it.
 *
 * What is on offer is decided by the review state, not by `is_published`. That
 * is the change 0026 made: before it, "awaiting approval" meant "not published
 * yet", so Reject was offered on courses nobody had finished — every course
 * was in the queue from the moment it was named — and a live course had no way
 * back into review at all.
 *
 *   in_review / revised → Approve, or ask for changes
 *   anything else       → Publish or unpublish, a catalog decision rather than
 *                         a verdict, and kept separate from one
 *
 * Both verdicts go through decide_course_review(), which writes the decision,
 * the history row and the educator's inbox message in one transaction. The old
 * rejectCourse() did the same work in three PostgREST calls and could leave a
 * course unpublished with nobody told why.
 */
export function CourseActions({
  courseId,
  title,
  isPublished,
  reviewState,
  educatorName,
}: {
  courseId: string;
  title: string;
  isPublished: boolean;
  reviewState: CourseReviewState;
  educatorName: string;
}) {
  const [modal, setModal] = useState<"approve" | "changes" | "unpublish" | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (approve: boolean) => {
    start(async () => {
      const result = await decideReview({ courseId, approve, note });
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setModal(null);
      setNote("");
      setToast(
        approve
          ? "Approved — the course is live and the educator has been told."
          : "Sent back with your notes.",
      );
    });
  };

  if (awaitingReview(reviewState)) {
    return (
      <>
        <WBtn kind="ghost" icon="x" sm onClick={() => setModal("changes")}>
          Ask for changes
        </WBtn>
        <WBtn icon="check" sm onClick={() => setModal("approve")}>
          {isPublished ? "Approve changes" : "Approve & publish"}
        </WBtn>

        <Modal
          open={modal === "approve"}
          onClose={() => setModal(null)}
          title={isPublished ? "Approve these changes" : "Publish this course"}
          width={520}
          footer={
            <>
              <WBtn kind="ghost" sm onClick={() => setModal(null)}>
                Cancel
              </WBtn>
              <WBtn sm disabled={pending} onClick={() => decide(true)}>
                {pending ? "Approving…" : "Approve"}
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
            {isPublished
              ? `${title} stays live, and the changes since it was last approved are signed off. ${educatorName} will be told.`
              : `${title} goes into the catalog immediately. ${educatorName} will be told.`}
          </p>

          <div className="rs-label" style={{ marginBottom: 8 }}>
            A note with the approval (optional)
          </div>
          <Textarea
            value={note}
            onChange={setNote}
            rows={3}
            placeholder="Lovely work on chapter 2…"
          />
        </Modal>

        <Modal
          open={modal === "changes"}
          onClose={() => setModal(null)}
          title="Send this back"
          width={520}
          footer={
            <>
              <WBtn kind="ghost" sm onClick={() => setModal(null)}>
                Cancel
              </WBtn>
              <WBtn
                sm
                disabled={pending || !note.trim()}
                onClick={() => decide(false)}
              >
                {pending ? "Sending…" : "Send back"}
              </WBtn>
            </>
          }
        >
          <div className="rs-label" style={{ marginBottom: 8 }}>
            What needs to change?
          </div>
          <Textarea
            value={note}
            onChange={setNote}
            rows={4}
            placeholder="The Image ID questions in chapter 3 have no pictures on them…"
          />
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              margin: "10px 0 0",
              lineHeight: 1.6,
            }}
          >
            This goes to {educatorName}&rsquo;s inbox and sits at the top of
            their editor until they send the course again. The note is required,
            here and in the database: a course sent back with no reason is a
            course nobody knows how to fix.
            {isPublished ? (
              <>
                {" "}
                <b>{title} stays live in the meantime</b>, so students
                mid-course are not cut off. Unpublish it separately if that is
                what you mean.
              </>
            ) : null}
          </p>
        </Modal>

        <Toast message={toast} />
      </>
    );
  }

  if (!isPublished) {
    return (
      <>
        <span
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            alignSelf: "center",
          }}
        >
          Nothing to decide — {educatorName} has not sent this in yet.
        </span>
        <Toast message={toast} />
      </>
    );
  }

  return (
    <>
      <WBtn kind="ghost" icon="x" sm onClick={() => setModal("unpublish")}>
        Unpublish
      </WBtn>

      <Modal
        open={modal === "unpublish"}
        onClose={() => setModal(null)}
        title="Unpublish this course"
        footer={
          <>
            <WBtn kind="ghost" sm onClick={() => setModal(null)}>
              Cancel
            </WBtn>
            <form action={setPublished}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="next" value="false" />
              <WBtn type="submit" sm>
                Unpublish
              </WBtn>
            </form>
          </>
        }
      >
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {title} will leave the catalog. Students already enrolled keep their
          access and their progress.
        </p>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
