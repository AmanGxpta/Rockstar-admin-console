import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Area } from "@/components/ui/charts";
import { Badge, Card, Empty, KPI, SectionH, Table, WBtn, type Col } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { formatDuration, listCourses } from "@/lib/courses";
import { getEducatorTotals, getEnrollmentTrend } from "@/lib/reporting";

const COURSE_COLS: Col[] = [
  ["Course", 2],
  ["State", 0.8],
  ["Lessons", 0.7, "right"],
  ["Runtime", 0.8, "right"],
  ["Students", 0.8, "right"],
];

export default async function EducatorDashboard() {
  const session = await requireSession("educator");
  const [totals, trend, courses] = await Promise.all([
    getEducatorTotals(),
    getEnrollmentTrend(7),
    listCourses(),
  ]);

  const firstName = session.name.split(" ")[0];
  const hasTrend = trend.data.some((n) => n > 0);
  const passRate = totals.attempts
    ? Math.round((totals.passed / totals.attempts) * 100)
    : null;

  return (
    <WebShell
      session={session}
      title={`Welcome back, ${firstName}`}
      sub={
        totals.courses === 0
          ? "No courses yet"
          : `${totals.published} of ${totals.courses} published`
      }
      actions={
        <Link href="/educator/courses/new" style={{ textDecoration: "none" }}>
          <WBtn icon="plus">New course</WBtn>
        </Link>
      }
    >
      {/*
        Pending reviews used to sit in this row. Practice submissions have no
        table yet, so the tile has been replaced with exam pass rate, which is
        computed from attempts that actually exist.
      */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="users" label="Students" value={totals.students.toLocaleString()} />
        <KPI icon="book" label="Published courses" value={String(totals.published)} />
        <KPI icon="check2" label="Exam pass rate" value={passRate === null ? "—" : `${passRate}%`} />
        <KPI icon="award" label="Certificates" value={String(totals.certificates)} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <SectionH>Enrollments across your courses</SectionH>
        {hasTrend ? (
          <>
            <Area id="edu-enrollments" data={trend.data} h={150} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              {trend.labels.map((m, i) => (
                <span key={`${m}-${i}`} style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                  {m}
                </span>
              ))}
            </div>
          </>
        ) : (
          <Empty
            title="Nobody has enrolled yet"
            hint="Publish a course and this fills in as students open it."
          />
        )}
      </Card>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Your courses</SectionH>
        </div>
        {courses.length === 0 ? (
          <Empty
            title="You have not created a course yet"
            hint="Start one with New course. It stays a draft until an admin publishes it."
          />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={COURSE_COLS}
              rows={courses.map((c) => [
                <Link
                  key="c"
                  href={`/educator/courses/${c.id}`}
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <span style={{ display: "block" }}>{c.title}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)" }}>
                    {c.subtitle ?? `${c.category} · ${c.level}`}
                  </span>
                </Link>,
                <Badge key="s" tone={c.is_published ? "complete" : "warn"}>
                  {c.is_published ? "Published" : "Draft"}
                </Badge>,
                c.lesson_count,
                formatDuration(c.total_duration_seconds),
                c.enrolled_count.toLocaleString(),
              ])}
            />
          </div>
        )}
      </Card>
    </WebShell>
  );
}
