import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Table, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { STUDENTS, formatDate } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "complete" },
  suspended: { label: "Suspended", tone: "active" },
};

const COLS: Col[] = [
  ["Student", 1.6],
  ["Status", 0.9],
  ["Courses", 0.8, "right"],
  ["Joined", 0.9, "right"],
];

export default async function AdminStudents() {
  const session = await requireSession("admin");

  return (
    <WebShell session={session} title="Students" sub={`${STUDENTS.length} students`}>
      <Card pad={0}>
        <div style={{ padding: "0 4px" }}>
          <Table
            cols={COLS}
            rows={STUDENTS.map((s) => {
              const status = STATUS_BADGE[s.status];
              return [
                <Link
                  key="s"
                  href={`/admin/students/${s.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <Avatar name={s.name} size={26} />
                  <span>
                    <span style={{ display: "block" }}>{s.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{s.email}</span>
                  </span>
                </Link>,
                <Badge key="st" tone={status.tone}>
                  {status.label}
                </Badge>,
                s.coursesEnrolled,
                formatDate(s.joinedAt),
              ];
            })}
          />
        </div>
      </Card>
    </WebShell>
  );
}
