import { notFound } from "next/navigation";
import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, SectionH, type BadgeTone } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/icon";
import { requireSession } from "@/lib/session";
import { COURSES, educatorById, formatMoney } from "@/lib/seed-data";
import { CourseActions } from "./course-actions";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "complete" },
  pending: { label: "Pending review", tone: "warn" },
  draft: { label: "Draft", tone: "locked" },
  archived: { label: "Archived", tone: "locked" },
};

const MODULE_ICON: Record<string, IconName> = {
  complete: "check2",
  active: "play",
  locked: "lock",
};

export default async function AdminCourseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;
  const course = COURSES.find((c) => c.id === id);
  if (!course) notFound();
  const educator = educatorById(course.educatorId);

  const status = STATUS_BADGE[course.status];

  return (
    <WebShell
      session={session}
      title={course.title}
      sub={course.category}
      actions={<CourseActions title={course.title} status={course.status} educatorName={educator?.name ?? "the educator"} />}
    >
      <Link
        href="/admin/courses"
        className="rs-word"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <Icon name="arrowL" size={12} c="var(--text-muted)" />
        Course catalog
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {course.description}
            </p>
          </Card>

          <Card>
            <SectionH>Curriculum</SectionH>
            {course.modules.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 4px",
                  borderBottom:
                    i < course.modules.length - 1 ? "0.5px solid var(--border)" : "none",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "var(--r-sm)",
                    background: "var(--dark-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    name={MODULE_ICON[m.status]}
                    size={14}
                    c={m.status === "locked" ? "var(--text-muted)" : "var(--red)"}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rs-label" style={{ marginBottom: 2 }}>
                    Module {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{m.title}</div>
                </div>
                <span className="rs-word" style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                  {m.minutes} min
                </span>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionH>Stats</SectionH>
            {[
              ["Enrolled", course.enrolled.toLocaleString()],
              ["Completion rate", `${course.completionRate}%`],
              ["Revenue", formatMoney(course.revenue)],
              ["Price", `${formatMoney(course.price)} / mo`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: "0.5px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ color: "var(--text-secondary)" }}>{value}</span>
              </div>
            ))}
          </Card>

          {educator && (
            <Card>
              <SectionH>Educator</SectionH>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Avatar name={educator.name} size={36} />
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>{educator.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{educator.email}</div>
                </div>
              </div>
              <Link
                href={`/admin/educators/${educator.id}`}
                className="rs-word"
                style={{ fontSize: 10.5, letterSpacing: "0.1em", color: "var(--red)", textDecoration: "none" }}
              >
                View educator profile →
              </Link>
            </Card>
          )}
        </div>
      </div>
    </WebShell>
  );
}
