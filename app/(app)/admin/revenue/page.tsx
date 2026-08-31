import { WebShell } from "@/components/shell";
import { Bars } from "@/components/ui/charts";
import { Badge, Card, KPI, SectionH, Table, WBtn, type BadgeTone, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { COURSES, TRANSACTIONS, courseById, formatDate, formatMoney, studentById } from "@/lib/seed-data";

const MONTHLY = [8200, 9100, 8700, 10400, 11200, 10800, 12600, 13100, 12400, 14200, 15100, 16400];
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  Success: { label: "Success", tone: "complete" },
  Refunded: { label: "Refunded", tone: "locked" },
};

const COLS: Col[] = [
  ["Date", 0.8],
  ["Student", 1.2],
  ["Course", 1.4],
  ["Type", 1],
  ["Amount", 0.7, "right"],
  ["Status", 0.8, "right"],
];

export default async function AdminRevenue() {
  const session = await requireSession("admin");

  const totalRevenue = COURSES.reduce((a, c) => a + c.revenue, 0);
  const refunds = TRANSACTIONS.filter((t) => t.status === "Refunded");
  const topCourses = [...COURSES].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxRev = Math.max(...topCourses.map((c) => c.revenue));

  return (
    <WebShell session={session} title="Revenue" sub="All time, across every course" actions={<WBtn kind="ghost" icon="download" sm>Export CSV</WBtn>}>
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="card" label="MRR (this month)" value={formatMoney(16400)} delta="8.6%" />
        <KPI icon="chart" label="Total revenue (all time)" value={formatMoney(totalRevenue)} />
        <KPI icon="user" label="Avg revenue / user" value="$24" delta="2.1%" />
        <KPI icon="x" label="Refunds issued" value={String(refunds.length)} up={false} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionH>Monthly recurring revenue</SectionH>
        <Bars data={MONTHLY} labels={MONTHS} h={160} />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionH>Revenue by course</SectionH>
        {topCourses.map((c) => (
          <div key={c.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{c.title}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatMoney(c.revenue)}</span>
            </div>
            <div style={{ height: 3, borderRadius: 999, background: "var(--dark-3)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${(c.revenue / maxRev) * 100}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "var(--red)",
                }}
              />
            </div>
          </div>
        ))}
      </Card>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Transactions</SectionH>
        </div>
        <div style={{ padding: "0 4px 8px" }}>
          <Table
            cols={COLS}
            rows={TRANSACTIONS.map((t) => {
              const student = studentById(t.studentId);
              const course = courseById(t.courseId);
              const status = STATUS_BADGE[t.status];
              return [
                formatDate(t.date),
                student?.name,
                course?.title,
                t.type,
                formatMoney(t.amount),
                <Badge key="s" tone={status.tone} dot={false}>
                  {status.label}
                </Badge>,
              ];
            })}
          />
        </div>
      </Card>
    </WebShell>
  );
}
