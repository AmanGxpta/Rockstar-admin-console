"use client";

import { useState, useTransition } from "react";

import { Toast } from "@/components/ui/controls";
import { Modal, Textarea, WBtn } from "@/components/ui/primitives";
import { setPublished } from "@/lib/course-actions";
import { decideReview } from "@/lib/review-actions";
import { awaitingReview, type CourseReviewState } from "@/lib/course-tree";

/**
 * Draft or published, and — while educators still send courses in — the
 * verdict on one.
 *
 * The publish toggle is the control this screen is built around now. Since
 * 0034 a published course is frozen for everybody, the team included, so
 * "Publish" and "Move back to draft" are not a catalog preference any more:
 * they are the lock on the editor below. Both modals say so, because a button
 * that quietly turns the page read-only is a button people press once and then
 * distrust.
 *
 * The review verdict stays for the case it was built for: an educator who
 * authored a course and sent it in. An admin who wrote the course themselves
 * never sees it — nothing was sent to them.
 */
export function CourseActions({
  courseId,
  title,
  isPublished,
  reviewState,
  educatorName,
  canPublish,
}: {
  courseId: string;
  title: string;
  isPublished: boolean;
  reviewState: CourseReviewState;
  educatorName: string;
  /** Only an admin may move the column — 0008 enforces it with a trigger. */
  canPublish: boolean;
}) {
  const [modal, setModal] = useState<
    "approve" | "changes" | "publish" | "draft" | null
  >(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (approve: boolean) => {
    start(async () => {
      const result = await decideReview({
        courseId,
        approve,
        note: approve ? "" : note,
      });
      if ("error" in result) {
        setToast(result.error);
        return;
      }
      setModal(null);
      setNote("");
      setToast(
        approve
          ? "Approved — the course is live and its author has been told."
          : "Sent back with your notes.",
      );
    });
  };

  return (
    <>
      {canPublish &&
        (isPublished ? (
          <WBtn kind="ghost" icon="pencil" sm onClick={() => setModal("draft")}>
            Move to draft
          </WBtn>
        ) : (
          <WBtn icon="upload" sm onClick={() => setModal("publish")}>
            Publish
          </WBtn>
        ))}

      {canPublish && awaitingReview(reviewState) && (
        <>
          <WBtn kind="ghost" icon="x" sm onClick={() => setModal("changes")}>
            Ask for changes
          </WBtn>
          <WBtn icon="check" sm onClick={() => setModal("approve")}>
            Approve
          </WBtn>
        </>
      )}

      <Modal
        open={modal === "publish"}
        onClose={() => setModal(null)}
        title="Publish this course"
        width={520}
        footer={
          <>
            <WBtn kind="ghost" sm onClick={() => setModal(null)}>
              Cancel
            </WBtn>
            <form action={setPublished}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="next" value="true" />
              <WBtn type="submit" sm>
                Publish
              </WBtn>
            </form>
          </>
        }
      >
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          <b>{title}</b> goes into the catalog immediately, and students can ask
          for access to it.
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.65,
            margin: "12px 0 0",
          }}
        >
          It also becomes read-only. Chapters, clips, quizzes and the final exam
          are all frozen while it is live — the database refuses the writes, not
          just this screen — so anything still to change has to be changed
          first, or the course moved back to draft afterwards.
        </p>
      </Modal>

      <Modal
        open={modal === "draft"}
        onClose={() => setModal(null)}
        title="Move this course back to draft"
        width={520}
        footer={
          <>
            <WBtn kind="ghost" sm onClick={() => setModal(null)}>
              Cancel
            </WBtn>
            <form action={setPublished}>
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="next" value="false" />
              <WBtn type="submit" sm>
                Move to draft
              </WBtn>
            </form>
          </>
        }
      >
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          <b>{title}</b> becomes editable again, and leaves the catalog while it
          is in draft.
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.65,
            margin: "12px 0 0",
          }}
        >
          Students already enrolled keep their access and their progress — the
          course stays on their Learn tab and the lessons still play. What
          changes is that nobody new can find it, and no new access request can
          be opened against it, until it is published again.
        </p>
      </Modal>

      <Modal
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title={isPublished ? "Approve these changes" : "Approve this course"}
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
            margin: 0,
          }}
        >
          {isPublished
            ? `${title} stays live, and the changes since it was last approved are signed off. ${educatorName} will be told.`
            : `${title} goes into the catalog immediately. ${educatorName} will be told.`}
        </p>
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
          This goes to {educatorName}&rsquo;s inbox and sits at the top of their
          editor until they send the course again. The note is required, here
          and in the database: a course sent back with no reason is a course
          nobody knows how to fix.
        </p>
      </Modal>

      <Toast message={toast} />
    </>
  );
}
