import { notFound } from "next/navigation";
import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, SectionH, WBtn, type BadgeTone } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/session";
import { STUDENTS, certificationsByStudent, courseById, formatDate } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "complete" },
  suspended: { label: "Suspended", tone: "active" },
};

export default async function AdminStudentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;
  const student = STUDENTS.find((s) => s.id === id);
  if (!student) notFound();

  const certs = certificationsByStudent(student.id);
  const status = STATUS_BADGE[student.status];

  return (
    <WebShell
      session={session}
      title={student.name}
      sub={student.email}
      actions={
        student.status === "active" ? (
          <WBtn kind="ghost" icon="lock" sm>
            Suspend
          </WBtn>
        ) : null
      }
    >
      <Link
        href="/admin/students"
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
        Students
      </Link>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={student.name} size={56} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="rs-head" style={{ fontSize: 19 }}>
                {student.name}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{student.email}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        {[
          ["Courses enrolled", String(student.coursesEnrolled)],
          ["Certs earned", String(certs.length)],
          ["Joined", formatDate(student.joinedAt)],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1 }}>
            <div className="rs-head" style={{ fontSize: 22 }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionH>Certifications</SectionH>
        {certs.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No certifications yet.</div>
        )}
        {certs.map((cert, i) => {
          const course = courseById(cert.courseId);
          return (
            <Link
              key={cert.id}
              href={`/admin/certifications`}
              className="rs-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "13px 4px",
                borderBottom: i < certs.length - 1 ? "0.5px solid var(--border)" : "none",
                textDecoration: "none",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ fontSize: 13.5 }}>{course?.title}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>
                  {cert.id}
                </span>
                <Badge tone={cert.status === "active" ? "complete" : "locked"} dot={false}>
                  {cert.status === "active" ? "Active" : "Revoked"}
                </Badge>
              </span>
            </Link>
          );
        })}
      </Card>
    </WebShell>
  );
}
