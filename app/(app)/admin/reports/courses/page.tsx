import { WebShell } from "@/components/shell";
import {
  Avatar,
  Card,
  Empty,
  KPI,
  ProgressBar,
  Table,
  Tag,
  type Col,
} from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { getCourseReport } from "@/lib/reporting";

const COLS: Col[] = [
  ["Course", 2.2],
  ["Educator", 1.3],
  ["Enrolled", 0.9, "right"],
  ["Pass rate", 1.3, "right"],
  ["Certificates", 0.9, "right"],
];

export default async function AdminCourseReport() {
  const session = await requireSession("admin");
  const rows = await getCourseReport();

  const enrolled = rows.reduce((n, r) => n + r.enrolled, 0);
  const attempts = rows.reduce((n, r) => n + r.attempts, 0);
  const passed = rows.reduce((n, r) => n + r.passed, 0);
  const certificates = rows.reduce((n, r) => n + r.certificates, 0);

  return (
    <WebShell
      session={session}
      back="/admin"
      title="Course performance report"
      sub="Detailed breakdown · all educators"
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI
          icon="book"
          label="Total courses"
          value={String(rows.length)}
          tone="clay"
        />
        <KPI
          icon="users"
          label="Total enrollments"
          value={enrolled.toLocaleString()}
          tone="berry"
        />
        <KPI
          icon="check2"
          label="Exam pass rate"
          value={attempts ? `${Math.round((passed / attempts) * 100)}%` : "—"}
          tone="leaf"
        />
        <KPI
          icon="award"
          label="Certificates"
          value={certificates.toLocaleString()}
          tone="gold"
        />
      </div>

      <Card pad={0}>
        {rows.length === 0 ? (
          <Empty
            title="No courses to report on"
            hint="The table fills in as educators create courses."
          />
        ) : (
          <div style={{ padding: "4px 4px 8px" }}>
            <Table
              cols={COLS}
              rows={rows.map((r) => {
                // A course nobody has sat the exam for has no rate — showing
                // 0% would read as everybody failing.
                const rate = r.attempts
                  ? Math.round((r.passed / r.attempts) * 100)
                  : null;
                return [
                  <span key="t">
                    <b style={{ color: "var(--text-primary)" }}>{r.title}</b>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {r.category} · {r.lessons} lessons
                    </span>
                  </span>,
                  <span
                    key="e"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Avatar name={r.educator_name} size={26} />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {r.educator_name}
                    </span>
                  </span>,
                  r.enrolled.toLocaleString(),
                  rate === null ? (
                    <span key="r" style={{ color: "var(--text-muted)" }}>
                      No attempts
                    </span>
                  ) : (
                    <span
                      key="r"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <span style={{ width: 80 }}>
                        <ProgressBar
                          value={rate}
                          h={6}
                          c={rate >= 60 ? "var(--success)" : "var(--warn)"}
                        />
                      </span>
                      <b>{rate}%</b>
                    </span>
                  ),
                  r.is_published ? (
                    r.certificates.toLocaleString()
                  ) : (
                    <Tag key="s" tone="ink">
                      Draft
                    </Tag>
                  ),
                ];
              })}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
