import { Card, SectionH, Tag } from "@/components/ui/primitives";
import type { CourseReview } from "@/lib/course-tree";

/**
 * Every time this course has been round, newest first.
 *
 * A history rather than "the last decision" because that is the shape 0026
 * stores, and for the reason it stores it: an educator sent back twice and
 * approved on the third pass needs to be able to read the first note, and a
 * reviewer opening a course for the fourth time should be able to see that it
 * is the fourth time.
 */

const STATE: Record<CourseReview["state"], { tone: "gold" | "leaf" | "rose" | "ink"; label: string }> = {
  open: { tone: "gold", label: "Waiting" },
  approved: { tone: "leaf", label: "Approved" },
  changes_requested: { tone: "rose", label: "Changes asked for" },
  withdrawn: { tone: "ink", label: "Withdrawn" },
};

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReviewHistory({ history }: { history: CourseReview[] }) {
  if (history.length === 0) return null;

  return (
    <>
      <SectionH>Review history</SectionH>
      <Card>
        {history.map((review, i) => (
          <div
            key={review.id}
            style={{
              padding: "12px 0",
              borderTop: i === 0 ? "none" : "0.5px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: review.request_note || review.decision_note ? 7 : 0,
              }}
            >
              <Tag tone={STATE[review.state].tone}>{STATE[review.state].label}</Tag>
              <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                {/*
                  An automatic request is worth naming: "the author sent this"
                  and "this changed after it was approved" are different facts
                  about why a reviewer is looking at it.
                */}
                {review.origin === "manual"
                  ? "Sent by the educator"
                  : "Raised by a change after approval"}{" "}
                · {when(review.requested_at)}
                {review.decided_at ? ` · answered ${when(review.decided_at)}` : ""}
              </span>
            </div>

            {review.request_note && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  margin: "0 0 6px",
                  whiteSpace: "pre-wrap",
                }}
              >
                “{review.request_note}”
              </p>
            )}
            {review.decision_note && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  paddingLeft: 12,
                  borderLeft: "2px solid var(--border-mid)",
                }}
              >
                {review.decision_note}
              </p>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
