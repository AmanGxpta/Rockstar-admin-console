import { WebShell } from "@/components/shell";
import { Badge, Card, Table, WBtn, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { CERTIFICATIONS, courseById, formatDate, studentById } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Active", tone: "complete" },
  revoked: { label: "Revoked", tone: "locked" },
};

const COLS: Col[] = [
  ["Student", 1.3],
  ["Course", 1.5],
  ["Issue date", 0.9],
  ["Cert ID", 1],
  ["Status", 0.8],
  ["", 0.6, "right"],
];

export default async function AdminCertifications() {
  const session = await requireSession("admin");
  const active = CERTIFICATIONS.filter((c) => c.status === "active").length;

  return (
    <WebShell
      session={session}
      title="Certifications"
      sub={`${active} active · ${CERTIFICATIONS.length} total`}
    >
      <Card pad={0}>
        <div style={{ padding: "0 4px" }}>
          <Table
            cols={COLS}
            rows={CERTIFICATIONS.map((cert) => {
              const student = studentById(cert.studentId);
              const course = courseById(cert.courseId);
              const status = STATUS_BADGE[cert.status];
              return [
                student?.name,
                course?.title,
                formatDate(cert.issueDate),
                <span key="id" style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {cert.id}
                </span>,
                <Badge key="s" tone={status.tone} dot={false}>
                  {status.label}
                </Badge>,
                cert.status === "active" ? (
                  <WBtn key="a" kind="text" sm>
                    Revoke
                  </WBtn>
                ) : (
                  <WBtn key="a" kind="text" sm>
                    Reissue
                  </WBtn>
                ),
              ];
            })}
          />
        </div>
      </Card>
    </WebShell>
  );
}
