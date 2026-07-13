import { redirect } from "next/navigation";
import { WebShell } from "@/components/shell";
import { Area, Bars, Donut } from "@/components/ui/charts";
import {
  Card,
  KPI,
  ProgressBar,
  SectionH,
  WBtn,
} from "@/components/ui/primitives";
import { getSession, homeFor } from "@/lib/session";

const ENGAGEMENT = [
  2400, 3100, 2800, 3600, 3300, 4200, 4800, 4600, 5400, 5900, 5600, 6400,
];
const MONTHS = [
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
];

const CATEGORIES: [string, number, string][] = [
  ["Color & Balayage", 82, "#C75C3C"],
  ["Cutting", 64, "#9A5B7A"],
  ["Styling", 48, "#CF9A47"],
  ["Barbering", 36, "#5E8C6A"],
  ["Editorial", 22, "#E2858A"],
];

const DEVICES: [string, string, string][] = [
  ["iOS", "68%", "#C75C3C"],
  ["Android", "28%", "#E2858A"],
  ["Web", "4%", "#EDE3D9"],
];

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect(homeFor(session.role));

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
        <KPI
          icon="users"
          label="Active users"
          value="8,412"
          delta="11.4%"
          tone="clay"
        />
        <KPI
          icon="book"
          label="Enrollments"
          value="3,927"
          delta="6.8%"
          tone="berry"
        />
        <KPI
          icon="check2"
          label="Completion rate"
          value="68%"
          delta="3.1%"
          tone="leaf"
        />
        <KPI
          icon="award"
          label="Certs issued"
          value="1,204"
          delta="18%"
          tone="gold"
        />
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
                  fontWeight: 600,
                  color: "var(--ink-2)",
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 3,
                    background: "#C75C3C",
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
                style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}
              >
                {m}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <SectionH>Top categories</SectionH>
          {CATEGORIES.map(([label, value, color]) => (
            <div key={label} style={{ marginBottom: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-2)",
                  }}
                >
                  {value}%
                </span>
              </div>
              <ProgressBar value={value} h={7} c={color} />
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
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Avg session
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 30,
            }}
          >
            14m 20s
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--leaf)",
              fontWeight: 700,
              marginTop: 4,
              marginBottom: 14,
            }}
          >
            ↑ 2m vs last month
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Clips watched / user
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 30,
            }}
          >
            38
          </div>
        </Card>

        <Card>
          <SectionH>Device split</SectionH>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Donut
              segs={[
                [68, "#C75C3C"],
                [28, "#E2858A"],
                [4, "#EDE3D9"],
              ]}
              size={110}
              sw={16}
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
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--ink-2)",
                      fontWeight: 600,
                      width: 54,
                    }}
                  >
                    {label}
                  </span>
                  <b style={{ fontSize: 12 }}>{value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </WebShell>
  );
}
