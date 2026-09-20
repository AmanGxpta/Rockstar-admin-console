import Link from "next/link";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, Empty, Tag, type TagTone } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import {
  listSubmissions,
  relativeTime,
  type SubmissionStatus,
  type SubmissionSummary,
} from "@/lib/submissions";

const STATUS: Record<SubmissionStatus, { label: string; tone: TagTone }> = {
  pending: { label: "Awaiting review", tone: "gold" },
  approved: { label: "Approved", tone: "leaf" },
  needs_revision: { label: "Sent back", tone: "clay" },
};

/**
 * The queue opens on what is waiting, not on everything.
 *
 * Reviewed work does not leave the list — an educator needs to re-read what
 * they said, and a student who resubmits comes back through `pending` anyway
 * (0021) — but it starts behind a chip so the screen answers "what is asked of
 * me" before it answers "what has happened".
 */
const FILTERS = [
  { value: "pending", label: "Awaiting review" },
  { value: "needs_revision", label: "Sent back" },
  { value: "approved", label: "Approved" },
  { value: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default async function EducatorSubmissions({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireSession("educator");
  const { filter } = await searchParams;
  const active: Filter =
    FILTERS.find((f) => f.value === filter)?.value ?? "pending";

  const all = await listSubmissions();
  const rows =
    active === "all" ? all : all.filter((s) => s.status === active);

  const pending = all.filter((s) => s.status === "pending").length;

  return (
    <WebShell
      session={session}
      title="Submissions"
      sub={
        all.length === 0
          ? "No practical work filed yet"
          : `${pending} awaiting review · ${all.length} in total`
      }
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const on = f.value === active;
          const count =
            f.value === "all"
              ? all.length
              : all.filter((s) => s.status === f.value).length;
          return (
            <Link
              key={f.value}
              href={
                f.value === "pending"
                  ? "/educator/submissions"
                  : `?filter=${f.value}`
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                background: on ? "var(--ink)" : "var(--dark-2)",
                color: on ? "#fff" : "var(--text-secondary)",
                boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--border-mid)",
              }}
            >
              {f.label}
              <span style={{ opacity: 0.6, fontWeight: 400 }}>{count}</span>
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <Card>
          <Empty
            title={
              all.length === 0
                ? "Nothing has been submitted yet"
                : "Nothing in this filter"
            }
            hint={
              all.length === 0
                ? "Practical work your students file from the app arrives here, newest first."
                : "Try another tab."
            }
          />
        </Card>
      ) : (
        rows.map((s) => <QueueCard key={s.id} submission={s} />)
      )}
    </WebShell>
  );
}

function QueueCard({ submission: s }: { submission: SubmissionSummary }) {
  const status = STATUS[s.status];

  return (
    <Link
      href={`/educator/submissions/${s.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <Thumb submission={s} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={s.student_name} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                    {s.student_name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {s.course_title} · {s.module_title ?? "Final reflection"}
                  </div>
                </div>
              </div>
              <Tag tone={status.tone}>{status.label}</Tag>
            </div>

            {s.response ? (
              <div
                className="rs-head"
                style={{
                  fontSize: 15,
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                &ldquo;{s.response}&rdquo;
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                No note — the work is in the attachments.
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 16,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span>{relativeTime(s.submitted_at)}</span>
              {s.media_count > 0 && (
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <Icon name="image" size={13} c="var(--text-muted)" />
                  {s.media_count}
                </span>
              )}
              {s.revision_count > 0 && (
                <span>
                  Attempt {s.revision_count + 1}
                </span>
              )}
              <span
                style={{
                  marginLeft: "auto",
                  color: "var(--red)",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {s.status === "pending" ? "Review" : "Open"}
                <Icon name="chevR" size={14} c="var(--red)" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/**
 * One frame off the submission, or the plate.
 *
 * A video's signed URL is handed to an `<img>`-shaped slot as a poster-less
 * tile rather than a player: a queue of autoplaying practical clips is not
 * what the reviewer opened, and the detail screen has the real player.
 */
function Thumb({ submission: s }: { submission: SubmissionSummary }) {
  const box = {
    width: 92,
    height: 92,
    flexShrink: 0,
    borderRadius: 14,
    background: "var(--dark-3)",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  } as const;

  if (s.thumbnail && s.thumbnail_kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={s.thumbnail}
        alt=""
        style={{ ...box, objectFit: "cover", display: "block" }}
      />
    );
  }

  return (
    <div style={box}>
      <Icon
        name={s.thumbnail_kind === "video" ? "video" : "file"}
        size={22}
        c="var(--text-muted)"
      />
    </div>
  );
}
