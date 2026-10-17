import { WebShell } from "@/components/shell";
import { Area } from "@/components/ui/charts";
import { Card, Empty, KPI, ProgressBar, SectionH } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { getCategoryMix, getEnrollmentTrend, getPlatformTotals } from "@/lib/reporting";

const CATEGORY_LABEL: Record<string, string> = {
  color: "Colour & balayage",
  cutting: "Cutting",
  styling: "Styling",
  editorial: "Editorial",
  business: "Business",
};

export default async function AdminDashboard() {
  const session = await requireSession("admin");
  const [totals, trend, mix] = await Promise.all([
    getPlatformTotals(),
    getEnrollmentTrend(),
    getCategoryMix(),
  ]);

  const hasTrend = trend.data.some((n) => n > 0);

  return (
    <WebShell
      session={session}
      title="Analytics"
      sub="Platform overview · read live from the database"
    >
      {/*
        Four figures, all of them derived from rows that exist. The previous
        version of this screen also showed average session length, clips
        watched per user and a device split — none of which are measured
        anywhere, so they have been dropped rather than invented. They come
        back when there is event tracking to compute them from.
      */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="users" label="Students" value={totals.students.toLocaleString()} />
        <KPI icon="book" label="Enrollments" value={totals.enrollments.toLocaleString()} />
        <KPI icon="check2" label="Lesson completion" value={`${totals.completionRate}%`} />
        <KPI icon="award" label="Certificates" value={totals.certificates.toLocaleString()} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionH>Enrollments by month</SectionH>
          {hasTrend ? (
            <>
              <Area id="adm-enrollments" data={trend.data} h={170} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {trend.labels.map((m, i) => (
                  <span key={`${m}-${i}`} style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {m}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="No enrollments in the last year"
              hint="The chart draws itself as soon as a student opens their first course."
            />
          )}
        </Card>

        <Card>
          <SectionH>Where students enroll</SectionH>
          {mix.length === 0 ? (
            <Empty title="Nothing to compare yet" />
          ) : (
            mix.map((row) => (
              <div key={row.label} style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {CATEGORY_LABEL[row.label] ?? row.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {row.count} · {row.percent}%
                  </span>
                </div>
                <ProgressBar value={row.percent} h={3} />
              </div>
            ))
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card>
          <SectionH>Catalogue</SectionH>
          <Figure value={totals.published} label="Published" />
          <Figure value={totals.courses - totals.published} label="In draft" muted />
        </Card>
        <Card>
          <SectionH>Access granted</SectionH>
          <Figure value={totals.entitlements} label="Active entitlements" />
          <Figure value={totals.authors} label="Course authors" muted />
        </Card>
        <Card>
          <SectionH>Certificates</SectionH>
          <Figure value={totals.certificates} label="Issued all time" />
          <Figure
            value={totals.enrollments - totals.certificates}
            label="Enrolled, not yet certified"
            muted
          />
        </Card>
      </div>
    </WebShell>
  );
}

function Figure({
  value,
  label,
  muted = false,
}: {
  value: number;
  label: string;
  muted?: boolean;
}) {
  return (
    <div style={{ marginTop: muted ? 14 : 0 }}>
      <div
        style={{
          fontFamily: "var(--font-head)",
          fontWeight: 700,
          fontSize: muted ? 20 : 28,
          color: muted ? "var(--text-secondary)" : "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
