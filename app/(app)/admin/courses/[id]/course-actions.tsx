"use client";

import { useState } from "react";
import { Modal, Textarea, WBtn } from "@/components/ui/primitives";
import { rejectCourse, setPublished } from "@/lib/course-actions";

/**
 * The schema has one flag, `is_published`, not the four-state lifecycle the
 * seed data modelled — so "pending review" is simply a course that is not yet
 * live, and there is no separate archived state. Each confirm posts a form to
 * a server action, which revalidates the route; nothing is refreshed by hand.
 */
export function CourseActions({
  courseId,
  title,
  isPublished,
  educatorName,
}: {
  courseId: string;
  title: string;
  isPublished: boolean;
  educatorName: string;
}) {
  const [modal, setModal] = useState<"approve" | "reject" | "unpublish" | null>(null);

  if (!isPublished) {
    return (
      <>
        <WBtn kind="ghost" icon="x" sm onClick={() => setModal("reject")}>
          Reject
        </WBtn>
        <WBtn icon="check" sm onClick={() => setModal("approve")}>
          Approve &amp; publish
        </WBtn>

        <Modal
          open={modal === "approve"}
          onClose={() => setModal(null)}
          title="Publish this course"
          footer={
            <>
              <WBtn kind="ghost" sm onClick={() => setModal(null)}>
                Cancel
              </WBtn>
              <form action={setPublished}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="next" value="true" />
                <WBtn type="submit" sm>
                  Approve &amp; publish
                </WBtn>
              </form>
            </>
          }
        >
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 14px" }}>
            The course will go live immediately. {educatorName} will be notified.
          </p>
          <div
            style={{
              background: "var(--dark-3)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "10px 14px",
              fontFamily: "monospace",
              fontSize: 12.5,
              color: "var(--cream-3)",
            }}
          >
            {title}
          </div>
        </Modal>

        <Modal
          open={modal === "reject"}
          onClose={() => setModal(null)}
          title="Reject course"
          width={520}
        >
          <form action={rejectCourse} id="reject-form">
            <input type="hidden" name="courseId" value={courseId} />
            <div className="rs-label" style={{ marginBottom: 8 }}>
              Reason for rejection
            </div>
            <Textarea
              name="reason"
              placeholder="What needs to change before this can be approved?"
              rows={4}
            />
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 14px" }}>
              This message will be sent to {educatorName}.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <WBtn kind="ghost" sm onClick={() => setModal(null)}>
                Cancel
              </WBtn>
              <WBtn type="submit" sm>
                Reject &amp; notify
              </WBtn>
            </div>
          </form>
        </Modal>
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
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {title} will leave the catalog. Students already enrolled keep their
          access and their progress.
        </p>
      </Modal>
    </>
  );
}
