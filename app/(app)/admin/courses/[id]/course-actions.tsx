"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Textarea, WBtn } from "@/components/ui/primitives";
import type { CourseStatus } from "@/lib/seed-data";

export function CourseActions({
  title,
  status,
  educatorName,
}: {
  title: string;
  status: CourseStatus;
  educatorName: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"approve" | "reject" | "unpublish" | null>(null);

  // No backend yet — confirming just closes the modal and refreshes the
  // route so the interaction reads as real without persisting anything.
  const confirm = () => {
    setModal(null);
    router.refresh();
  };

  if (status === "pending") {
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
              <WBtn sm onClick={confirm}>
                Approve &amp; publish
              </WBtn>
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
          footer={
            <>
              <WBtn kind="ghost" sm onClick={() => setModal(null)}>
                Cancel
              </WBtn>
              <WBtn sm onClick={confirm}>
                Reject &amp; notify
              </WBtn>
            </>
          }
        >
          <div className="rs-label" style={{ marginBottom: 8 }}>
            Reason for rejection
          </div>
          <Textarea placeholder="What needs to change before this can be approved?" rows={4} />
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
            This message will be sent to {educatorName}.
          </p>
        </Modal>
      </>
    );
  }

  if (status === "live") {
    return (
      <>
        <WBtn kind="ghost" icon="x" sm onClick={() => setModal("unpublish")}>
          Unpublish
        </WBtn>
        <WBtn kind="ghost" icon="eye" sm>
          View as student
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
              <WBtn sm onClick={confirm}>
                Unpublish
              </WBtn>
            </>
          }
        >
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
            New students won&rsquo;t be able to enroll. Existing students keep access until their
            subscriptions expire.
          </p>
        </Modal>
      </>
    );
  }

  if (status === "archived") {
    return (
      <WBtn kind="ghost" icon="refresh" sm>
        Re-publish
      </WBtn>
    );
  }

  return null;
}
