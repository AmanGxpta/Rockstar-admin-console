import { WebShell } from "@/components/shell";
import { Bars } from "@/components/ui/charts";
import { Icon } from "@/components/ui/icon";
import { Card, Empty, KPI, SectionH, Table, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import {
  certificatesByCourse,
  certificatesByMonth,
  formatDay,
  listCertificates,
} from "@/lib/reporting";

const COLS: Col[] = [
  ["Reference", 1.1],
  ["Recipient", 1.3],
  ["Course", 1.8],
  ["Educator", 1.2],
  ["Issued", 1, "right"],
];

/** The design tints each course row by rank; these are the brand's five. */
const RANK_COLOURS = [
  "var(--gold)",
  "var(--clay)",
  "var(--berry)",
  "var(--leaf)",
  "var(--rose)",
];

export default async function AdminCertifications() {
  const session = await requireSession("admin");
  const certificates = await listCertificates();

  const trend = certificatesByMonth(certificates);
  const byCourse = certificatesByCourse(certificates).slice(0, 5);
  const thisMonth = trend.data[trend.data.length - 1] ?? 0;
  const lastMonth = trend.data[trend.data.length - 2] ?? 0;

  return (
    <WebShell
      session={session}
      title="Certifications"
      sub={`${certificates.length} issued all-time`}
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI
          icon="award"
          label="Issued all-time"
          value={certificates.length.toLocaleString()}
          tone="gold"
        />
        <KPI
          icon="calendar"
          label="This month"
          value={String(thisMonth)}
          tone="clay"
          delta={
            lastMonth > 0
              ? `${Math.round(((thisMonth - lastMonth) / lastMonth) * 100)}%`
              : undefined
          }
          up={thisMonth >= lastMonth}
        />
        <KPI
          icon="book"
          label="Courses certifying"
          value={String(byCourse.length)}
          tone="berry"
        />
        <KPI
          icon="users"
          label="Recipients"
          value={String(
            new Set(certificates.map((c) => c.recipient_name)).size,
          )}
          tone="leaf"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card>
          <SectionH
            action={
              <span
                style={{ fontSize: 12.5, fontWeight: 700, color: "var(--red-on)" }}
              >
                Last {trend.labels.length} months
              </span>
            }
          >
            Certificates issued
          </SectionH>
          <Bars
            data={trend.data}
            labels={trend.labels}
            c="var(--gold)"
            h={150}
          />
        </Card>

        <Card>
          <SectionH>By course</SectionH>
          {byCourse.length === 0 ? (
            <Empty title="Nothing issued yet" />
          ) : (
            byCourse.map((row, i) => (
              <div
                key={row.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--warn-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="award" size={18} c={RANK_COLOURS[i]} />
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: 600,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.title}
                </span>
                <b style={{ fontSize: 14 }}>{row.count}</b>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 6px" }}>
          <SectionH>Recent issuance</SectionH>
        </div>
        {certificates.length === 0 ? (
          <Empty
            title="No certificates issued yet"
            hint="One is created automatically the first time a student passes a course exam."
          />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={COLS}
              rows={certificates.map((c) => [
                <span
                  key="r"
                  style={{
                    fontFamily: "var(--font-head)",
                    fontWeight: 700,
                    color: "var(--red-on)",
                  }}
                >
                  {c.reference}
                </span>,
                // Names are copied onto the certificate when it is issued, not
                // joined — renaming a course later must not rewrite one that
                // has already been awarded.
                <b key="n" style={{ color: "var(--text-primary)" }}>
                  {c.recipient_name}
                </b>,
                c.course_title,
                <span key="e" style={{ color: "var(--text-secondary)" }}>
                  {c.educator_name}
                </span>,
                <span key="d" style={{ color: "var(--text-secondary)" }}>
                  {formatDay(c.issued_at)}
                </span>,
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
