import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Table, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { COURSES, EDUCATORS, coursesByEducator, formatDate } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved", tone: "complete" },
  pending: { label: "Pending", tone: "warn" },
  suspended: { label: "Suspended", tone: "active" },
};

const COLS: Col[] = [
  ["Educator", 1.6],
  ["Status", 0.9],
  ["Published courses", 1, "right"],
  ["Total students", 1, "right"],
  ["Joined", 0.9, "right"],
];

export default async function AdminEducators() {
  const session = await requireSession("admin");
  const pending = EDUCATORS.filter((e) => e.status === "pending").length;

  return (
    <WebShell
      session={session}
      title="Educators"
      sub={`${EDUCATORS.length} educators · ${pending} pending approval`}
    >
      <Card pad={0}>
        <div style={{ padding: "0 4px" }}>
          <Table
            cols={COLS}
            rows={EDUCATORS.map((e) => {
              const courses = coursesByEducator(e.id);
              const students = courses.reduce((a, c) => a + c.enrolled, 0);
              const status = STATUS_BADGE[e.status];
              return [
                <Link
                  key="e"
                  href={`/admin/educators/${e.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <Avatar name={e.name} size={26} />
                  <span>
                    <span style={{ display: "block" }}>{e.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{e.email}</span>
                  </span>
                </Link>,
                <Badge key="s" tone={status.tone}>
                  {status.label}
                </Badge>,
                courses.filter((c) => c.status === "live").length,
                students.toLocaleString(),
                formatDate(e.joinedAt),
              ];
            })}
          />
        </div>
      </Card>

      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-muted)" }}>
        {COURSES.length} total courses across all educators.
      </div>
    </WebShell>
  );
}
