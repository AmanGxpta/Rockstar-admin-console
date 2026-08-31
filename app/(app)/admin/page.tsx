import { WebShell } from "@/components/shell";
import { Area, Bars, Donut } from "@/components/ui/charts";
import { Card, KPI, ProgressBar, SectionH, WBtn } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";

const ENGAGEMENT = [
  2400, 3100, 2800, 3600, 3300, 4200, 4800, 4600, 5400, 5900, 5600, 6400,
];
const MONTHS = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
];

const CATEGORIES: [string, number][] = [
  ["Color & Balayage", 82],
  ["Cutting", 64],
  ["Barbering", 48],
  ["Consultation", 36],
  ["Editorial", 22],
];

const DEVICES: [string, string, string][] = [
  ["iOS", "68%", "var(--red)"],
  ["Android", "28%", "var(--cream-3)"],
  ["Web", "4%", "var(--dark-4)"],
];

export default async function AdminDashboard() {
  const session = await requireSession("admin");

  return (
    <WebShell
      session={session}
      title="Analytics"
      sub="Platform overview · last 30 days"
      actions={
        <WBtn kind="ghost" icon="download" sm>
          Export
        </WBtn>
      }
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI icon="users" label="Active users" value="8,412" delta="11.4%" />
        <KPI icon="book" label="Enrollments" value="3,927" delta="6.8%" />
        <KPI icon="check2" label="Completion rate" value="68%" delta="3.1%" />
        <KPI icon="award" label="Certs issued" value="1,204" delta="18%" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.7fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card>
          <SectionH
            action={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: "var(--red)",
                  }}
                />
                Active users
              </span>
            }
          >
            Engagement
          </SectionH>
          <Area id="adm-engagement" data={ENGAGEMENT} h={170} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
            }}
          >
            {MONTHS.map((m) => (
              <span
                key={m}
                style={{ fontSize: 10, color: "var(--text-muted)" }}
              >
                {m}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <SectionH>Top categories</SectionH>
          {CATEGORIES.map(([label, value]) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {value}%
                </span>
              </div>
              <ProgressBar value={value} h={3} />
            </div>
          ))}
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <SectionH>Weekly active</SectionH>
          <Bars
            data={[140, 180, 160, 220, 200, 260, 300]}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
            h={110}
          />
        </Card>

        <Card>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
            Avg session
          </div>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 28 }}>
            14m 20s
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--success)",
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            ↑ 2m vs last month
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>
            Clips watched / user
          </div>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 28 }}>
            38
          </div>
        </Card>

        <Card>
          <SectionH>Device split</SectionH>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Donut
              segs={[
                [68, "var(--red)"],
                [28, "var(--cream-3)"],
                [4, "var(--dark-4)"],
              ]}
              size={110}
              sw={14}
            />
            <div>
              {DEVICES.map(([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginBottom: 9,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      width: 54,
                    }}
                  >
                    {label}
                  </span>
                  <b style={{ fontSize: 12, fontWeight: 500 }}>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </WebShell>
  );
}
