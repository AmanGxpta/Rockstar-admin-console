import { redirect } from "next/navigation";
import { WebShell } from "@/components/shell";
import { Area, Donut } from "@/components/ui/charts";
import {
  Avatar,
  Card,
  KPI,
  SectionH,
  Table,
  Tag,
  WBtn,
  type Col,
} from "@/components/ui/primitives";
import { getSession, homeFor } from "@/lib/session";

const ENROLLMENTS = [120, 180, 150, 220, 260, 240, 320];
const MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const COMPLETION: [string, string, string][] = [
  ["Completed", "72%", "#5E8C6A"],
  ["In progress", "18%", "#CF9A47"],
  ["Lapsed", "10%", "#EDE3D9"],
];

const SUBMISSIONS: [string, string, string][] = [
  ["Mia Castillo", "Balayage · Ch 2 Sectioning", "4h ago"],
  ["Jon Park", "Balayage · Ch 1 Tools", "6h ago"],
  ["Ada Reyes", "Color Theory · Final", "1d ago"],
];

const SUB_COLS: Col[] = [
  ["Student", 1.4],
  ["Course", 1.6],
  ["Submitted", 1],
  ["Status", 0.9, "right"],
];

export default async function EducatorDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "educator") redirect(homeFor(session.role));

  const firstName = session.name.split(" ")[0];

  return (
    <WebShell
      session={session}
      title={`Good morning, ${firstName}`}
      sub="3 submissions need review"
      actions={<WBtn icon="plus">New course</WBtn>}
    >
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <KPI
          icon="users"
          label="Active students"
          value="1,284"
          delta="8.2%"
          tone="clay"
        />
        <KPI
          icon="book"
          label="Published courses"
          value="6"
          delta="1"
          tone="berry"
        />
        <KPI icon="image" label="Pending reviews" value="3" tone="gold" />
        <KPI
          icon="award"
          label="Certs issued"
          value="412"
          delta="14%"
          tone="leaf"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <SectionH
            action={
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "var(--clay)",
                }}
              >
                Last 7 months
              </span>
            }
          >
            Enrollments
          </SectionH>
          <Area id="edu-enrollments" data={ENROLLMENTS} h={150} />
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
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  fontWeight: 600,
                }}
              >
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
                  [72, "#5E8C6A"],
                  [18, "#CF9A47"],
                  [10, "#EDE3D9"],
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
                <div
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: 24,
                  }}
                >
                  72%
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
                  completed
                </div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {COMPLETION.map(([label, value, color]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: "var(--ink-2)",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>
                    {value}
                  </span>
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
              rows={SUBMISSIONS.map(([name, course, when]) => [
                <span
                  key="s"
                  style={{ display: "flex", alignItems: "center", gap: 9 }}
                >
                  <Avatar name={name} size={28} />
                  <b>{name}</b>
                </span>,
                course,
                when,
                <Tag key="t" tone="gold">
                  Pending
                </Tag>,
              ])}
            />
          </div>
        </Card>
      </div>
    </WebShell>
  );
}
