import { WebShell } from "@/components/shell";
import { Card, Empty, Table, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { formatDay, listCertificates } from "@/lib/reporting";

const COLS: Col[] = [
  ["Recipient", 1.2],
  ["Course", 1.5],
  ["Educator", 1.1],
  ["Reference", 1],
  ["Issued", 0.9, "right"],
];

export default async function AdminCertifications() {
  const session = await requireSession("admin");
  const certificates = await listCertificates();

  return (
    <WebShell
      session={session}
      title="Certifications"
      sub={`${certificates.length} issued`}
    >
      <Card pad={0}>
        {certificates.length === 0 ? (
          <Empty
            title="No certificates issued yet"
            hint="One is created automatically the first time a student passes a course exam."
          />
        ) : (
          <div style={{ padding: "0 4px" }}>
            <Table
              cols={COLS}
              rows={certificates.map((c) => [
                // Names are copied onto the certificate when it is issued, not
                // joined — renaming a course later must not rewrite one that
                // has already been awarded.
                c.recipient_name,
                c.course_title,
                c.educator_name,
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
