import { WebShell } from "@/components/shell";
import { Avatar, Badge, WBtn, type BadgeTone } from "@/components/ui/primitives";
import { SUBMISSIONS, courseById, relativeTime, studentById } from "@/lib/seed-data";
import { requireSession } from "@/lib/session";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warn" },
  approved: { label: "Approved", tone: "complete" },
  "needs-revision": { label: "Needs revision", tone: "active" },
};

export default async function EducatorSubmissions() {
  const session = await requireSession("educator");
  const pendingCount = SUBMISSIONS.filter((s) => s.status === "pending").length;

  return (
    <WebShell
      session={session}
      title="Submissions"
      sub={`${pendingCount} awaiting review`}
    >
      {SUBMISSIONS.map((s) => {
        const student = studentById(s.studentId);
        const course = courseById(s.courseId);
        const status = STATUS_BADGE[s.status];
        return (
          <div
            key={s.id}
            style={{
              background: "var(--dark-2)",
              border: "0.5px solid var(--border)",
              borderLeft: "2px solid var(--red)",
              borderRadius: "0 var(--r-card) var(--r-card) 0",
              padding: "24px 28px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={student?.name ?? "?"} size={30} />
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                    {student?.name}
                  </div>
                  <div className="rs-word" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                    {course?.title} &middot; {s.moduleTitle}
                  </div>
                </div>
              </div>
              <Badge tone={status.tone} dot={false}>
                {status.label}
              </Badge>
            </div>

            <div
              className="rs-head"
              style={{ fontSize: 15, fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.65, fontWeight: 400 }}
            >
              &ldquo;{s.response}&rdquo;
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
              }}
            >
              <span className="rs-word" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                {relativeTime(s.submittedAt)}
              </span>
              {s.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <WBtn kind="ghost" sm icon="pencil">
                    Request revision
                  </WBtn>
                  <WBtn sm icon="check">
                    Approve
                  </WBtn>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </WebShell>
  );
}
