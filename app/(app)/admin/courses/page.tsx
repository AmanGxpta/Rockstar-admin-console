import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Table, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { COURSES, educatorById, formatMoney } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "complete" },
  pending: { label: "Pending", tone: "warn" },
  draft: { label: "Draft", tone: "locked" },
  archived: { label: "Archived", tone: "locked" },
};

const COLS: Col[] = [
  ["Course", 2],
  ["Educator", 1.2],
  ["Status", 0.9],
  ["Enrolled", 0.8, "right"],
  ["Revenue", 0.9, "right"],
  ["Submitted", 0.9, "right"],
];

export default async function AdminCourses() {
  const session = await requireSession("admin");
  const pending = COURSES.filter((c) => c.status === "pending").length;

  return (
    <WebShell
      session={session}
      title="Course catalog"
      sub={`${COURSES.length} courses · ${pending} pending approval`}
    >
      <Card pad={0}>
        <div style={{ padding: "0 4px" }}>
          <Table
            cols={COLS}
            rows={COURSES.map((c) => {
              const educator = educatorById(c.educatorId);
              const status = STATUS_BADGE[c.status];
              return [
                <Link
                  key="c"
                  href={`/admin/courses/${c.id}`}
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {c.title}
                </Link>,
                <span key="e" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={educator?.name ?? "?"} size={22} />
                  {educator?.name}
                </span>,
                <Badge key="s" tone={status.tone}>
                  {status.label}
                </Badge>,
                c.enrolled.toLocaleString(),
                formatMoney(c.revenue),
                new Date(c.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              ];
            })}
          />
        </div>
      </Card>
    </WebShell>
  );
}
