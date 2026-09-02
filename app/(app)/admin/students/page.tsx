import Link from "next/link";
import { WebShell } from "@/components/shell";
import {
  Avatar,
  Badge,
  Card,
  Empty,
  KPI,
  Table,
  type Col,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { formatDay, listStudents } from "@/lib/reporting";

const COLS: Col[] = [
  ["Student", 1.8],
  ["Status", 0.8],
  ["Courses", 0.7, "right"],
  ["Certificates", 0.8, "right"],
  ["Joined", 0.9, "right"],
];

export default async function AdminStudents() {
  const session = await requireSession("admin");
  const students = await listStudents();

  return (
    <WebShell
      session={session}
      title="Students"
      sub={`${students.length} ${students.length === 1 ? "student" : "students"}`}
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI
          icon="user"
          label="Total students"
          value={students.length.toLocaleString()}
          tone="clay"
        />
        <KPI
          icon="check2"
          label="Active"
          value={students.filter((s) => s.is_active).length.toLocaleString()}
          tone="leaf"
        />
        <KPI
          icon="book"
          label="Enrollments"
          value={students
            .reduce((n, s) => n + s.enrollments, 0)
            .toLocaleString()}
          tone="berry"
        />
        <KPI
          icon="award"
          label="Certified"
          value={students
            .filter((s) => s.certificates > 0)
            .length.toLocaleString()}
          tone="gold"
        />
      </div>

      <Card pad={0}>
        {students.length === 0 ? (
          <Empty
            title="No students yet"
            hint="A row appears here the first time somebody signs up on the phone."
          />
        ) : (
          <div style={{ padding: "0 4px" }}>
            <Table
              cols={COLS}
              rows={students.map((s) => [
                <Link
                  key="s"
                  href={`/admin/students/${s.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <Avatar name={s.full_name ?? s.email} size={26} />
                  <span>
                    <span style={{ display: "block" }}>{s.full_name ?? "Unnamed"}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>{s.email}</span>
                  </span>
                </Link>,
                <Badge key="st" tone={s.is_active ? "complete" : "locked"}>
                  {s.is_active ? "Active" : "Deactivated"}
                </Badge>,
                s.enrollments,
                s.certificates,
                formatDay(s.created_at),
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
