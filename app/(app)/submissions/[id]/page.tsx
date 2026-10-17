import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, Empty, SectionH, Tag, type TagTone } from "@/components/ui/primitives";
import { requireTeam } from "@/lib/session";
import { formatDay } from "@/lib/reporting";
import {
  getSubmission,
  relativeTime,
  type SubmissionDetail,
  type SubmissionStatus,
} from "@/lib/submissions";
import { ReviewForm } from "./review-form";

const STATUS: Record<
  SubmissionStatus,
  { label: string; tone: TagTone; line: string }
> = {
  pending: {
    label: "Awaiting review",
    tone: "gold",
    line: "Waiting on you.",
  },
  approved: {
    label: "Approved",
    tone: "leaf",
    line: "You passed this work.",
  },
  needs_revision: {
    label: "Sent back",
    tone: "clay",
    line: "You asked for changes. It returns here when they resubmit.",
  },
};

export default async function SubmissionReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTeam();
  const { id } = await params;

  // Null covers both "no such row" and "not yours": RLS filters rather than
  // refuses, so a submission on somebody else's course simply is not there.
  const submission = await getSubmission(id);
  if (!submission) notFound();

  const status = STATUS[submission.status];

  return (
    <WebShell
      session={session}
      title={submission.student_name}
      sub={`${submission.course_title} · ${submission.module_title ?? "Final reflection"}`}
      back="/submissions"
    >
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={submission.student_name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, marginBottom: 3 }}>{status.line}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Filed {relativeTime(submission.submitted_at)}
              {submission.revision_count > 0 &&
                ` · attempt ${submission.revision_count + 1}`}
              {submission.reviewed_at &&
                ` · last reviewed ${formatDay(submission.reviewed_at)}`}
            </div>
          </div>
          <Tag tone={status.tone}>{status.label}</Tag>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionH>What they sent</SectionH>

        {submission.response ? (
          <div
            className="rs-head"
            style={{
              fontSize: 15.5,
              fontStyle: "italic",
              fontWeight: 400,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            &ldquo;{submission.response}&rdquo;
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No written note — the work is in the attachments.
          </div>
        )}

        <Gallery media={submission.media} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionH>Your review</SectionH>
        <ReviewForm
          submissionId={submission.id}
          reviewed={submission.status !== "pending"}
        />
      </Card>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Feedback history</SectionH>
        </div>
        {submission.feedback.length === 0 ? (
          <Empty
            title="Nothing said yet"
            hint="Every note you write is kept here, so a student sent back once can still read why after they pass."
          />
        ) : (
          <div style={{ padding: "0 20px 20px" }}>
            {submission.feedback.map((note) => (
              <div
                key={note.id}
                style={{
                  borderTop: "0.5px solid var(--border)",
                  padding: "16px 0 0",
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <Tag tone={STATUS[note.resulting_status].tone}>
                    {STATUS[note.resulting_status].label}
                  </Tag>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {note.is_you
                      ? "You"
                      : (note.reviewer_name ?? "A reviewer")}{" "}
                    · {formatDay(note.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {note.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </WebShell>
  );
}

/**
 * The attachments, at a size you can actually judge work by.
 *
 * Videos get a real `<video controls>` rather than a tile: unlike the queue,
 * this screen is opened to watch one. The URLs are signed for an hour, which
 * outlasts any review and expires long before a link can be passed around.
 */
function Gallery({ media }: { media: SubmissionDetail["media"] }) {
  if (media.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 12,
        marginTop: 18,
      }}
    >
      {media.map((item) =>
        item.url === null ? (
          <div
            key={item.id}
            style={{
              height: 200,
              borderRadius: 14,
              background: "var(--dark-3)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: 16,
            }}
          >
            <span>
              <Icon name="x" size={18} c="var(--text-muted)" />
              <div style={{ marginTop: 6 }}>This file could not be opened.</div>
            </span>
          </div>
        ) : item.kind === "video" ? (
          <video
            key={item.id}
            src={item.url}
            controls
            preload="metadata"
            style={{
              width: "100%",
              height: 200,
              objectFit: "cover",
              borderRadius: 14,
              background: "#000",
            }}
          />
        ) : (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt=""
              style={{
                display: "block",
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 14,
                background: "var(--dark-3)",
              }}
            />
          </a>
        ),
      )}
    </div>
  );
}
