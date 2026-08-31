import { WebShell } from "@/components/shell";
import { Area, Donut } from "@/components/ui/charts";
import { Avatar, Badge, Card, KPI, SectionH, Table, WBtn, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { SUBMISSIONS, courseById, relativeTime, studentById } from "@/lib/seed-data";

const ENROLLMENTS = [120, 180, 150, 220, 260, 240, 320];
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const COMPLETION: [string, string, string][] = [
  ["Completed", "72%", "var(--success)"],
  ["In progress", "18%", "var(--warn)"],
  ["Lapsed", "10%", "var(--dark-4)"],
];

const SUB_COLS: Col[] = [
  ["Student", 1.4],
  ["Course", 1.6],
  ["Submitted", 1],
  ["Status", 0.9, "right"],
];

export default async function EducatorDashboard() {
  const session = await requireSession("educator");

  const firstName = session.name.split(" ")[0];
  const pending = SUBMISSIONS.filter((s) => s.status === "pending").slice(0, 3);

  return (
    <WebShell
      session={session}
      title={`Good morning, ${firstName}`}
      sub={`${pending.length} submissions need review`}
      actions={<WBtn icon="plus">New course</WBtn>}
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="users" label="Active students" value="1,284" delta="8.2%" />
        <KPI icon="book" label="Published courses" value="6" delta="1" />
        <KPI icon="image" label="Pending reviews" value={String(pending.length)} />
        <KPI icon="award" label="Certs issued" value="412" delta="14%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Card>
          <SectionH
            action={
              <span style={{ fontSize: 12.5, color: "var(--red)" }}>
                Last 7 months
              </span>
            }
          >
            Enrollments
          </SectionH>
          <Area id="edu-enrollments" data={ENROLLMENTS} h={150} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {MONTHS.map((m) => (
              <span key={m} style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                {m}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <SectionH>Completion rate</SectionH>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative" }}>
              <Donut
                segs={[
                  [72, "var(--success)"],
                  [18, "var(--warn)"],
                  [10, "var(--dark-4)"],
                ]}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 22 }}>
                  72%
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>completed</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {COMPLETION.map(([label, value, color]) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 12.5 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card pad={0}>
          <div style={{ padding: "18px 20px 4px" }}>
            <SectionH>Submissions to review</SectionH>
          </div>
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={SUB_COLS}
              rows={pending.map((s) => {
                const student = studentById(s.studentId);
                const course = courseById(s.courseId);
                return [
                  <span key="s" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar name={student?.name ?? "?"} size={28} />
                    <span style={{ color: "var(--text-primary)" }}>{student?.name}</span>
                  </span>,
                  `${course?.title} · ${s.moduleTitle}`,
                  relativeTime(s.submittedAt),
                  <Badge key="t" tone="warn" dot={false}>
                    Pending
                  </Badge>,
                ];
              })}
            />
          </div>
        </Card>
      </div>
    </WebShell>
  );
}
