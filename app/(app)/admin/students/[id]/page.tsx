import { notFound } from "next/navigation";
import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Empty, SectionH, Table, type Col } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/session";
import { formatDay, getStudent } from "@/lib/reporting";

const COURSE_COLS: Col[] = [
  ["Course", 1.8],
  ["Enrolled", 0.9],
  ["Access", 1.1, "right"],
];

const CERT_COLS: Col[] = [
  ["Course", 1.6],
  ["Reference", 1],
  ["Issued", 0.9, "right"],
];

export default async function AdminStudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <WebShell
      session={session}
      title={student.full_name ?? "Unnamed student"}
      sub={student.email}
    >
      <Link
        href="/admin/students"
        className="rs-word"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          fontSize: 12.5,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        <Icon name="chevL" size={13} />
        All students
      </Link>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={student.full_name ?? student.email} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, marginBottom: 3 }}>
              {student.full_name ?? "Unnamed student"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Joined {formatDay(student.created_at)} · {student.enrollments} enrolled ·{" "}
              {student.certificates} certified
            </div>
          </div>
          <Badge tone={student.is_active ? "complete" : "locked"}>
            {student.is_active ? "Active" : "Deactivated"}
          </Badge>
        </div>
      </Card>

      <Card pad={0} style={{ marginBottom: 16 }}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Courses</SectionH>
        </div>
        {student.courses.length === 0 ? (
          <Empty title="Not enrolled in anything yet" />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={COURSE_COLS}
              rows={student.courses.map((c) => [
                c.title,
                formatDay(c.enrolled_at),
                // Enrollment and access are separate: a lapsed entitlement
                // leaves the enrollment and its progress intact, so this
                // column reports the entitlement rather than the enrollment.
                c.entitlement === null ? (
                  <span key="a" style={{ color: "var(--text-muted)" }}>No entitlement</span>
                ) : (
                  <Badge
                    key="a"
                    tone={c.entitlement.status === "active" ? "complete" : "locked"}
                    dot={false}
                  >
                    {c.entitlement.status === "active"
                      ? c.entitlement.expires_at
                        ? `Until ${formatDay(c.entitlement.expires_at)}`
                        : "Perpetual"
                      : c.entitlement.status}
                  </Badge>
                ),
              ])}
            />
          </div>
        )}
      </Card>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Certificates</SectionH>
        </div>
        {student.awarded.length === 0 ? (
          <Empty title="No certificates yet" hint="Issued automatically on a passing exam." />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={CERT_COLS}
              rows={student.awarded.map((c) => [
                c.course_title,
                <span key="r" style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {c.reference}
                </span>,
                formatDay(c.issued_at),
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
