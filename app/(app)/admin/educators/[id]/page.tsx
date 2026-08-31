import { notFound } from "next/navigation";
import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, SectionH, WBtn, type BadgeTone } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/session";
import { EDUCATORS, coursesByEducator, formatDate, formatMoney } from "@/lib/seed-data";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Approved", tone: "complete" },
  pending: { label: "Pending", tone: "warn" },
  suspended: { label: "Suspended", tone: "active" },
};

export default async function AdminEducatorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;
  const educator = EDUCATORS.find((e) => e.id === id);
  if (!educator) notFound();

  const courses = coursesByEducator(educator.id);
  const students = courses.reduce((a, c) => a + c.enrolled, 0);
  const revenue = courses.reduce((a, c) => a + c.revenue, 0);
  const status = STATUS_BADGE[educator.status];

  return (
    <WebShell
      session={session}
      title={educator.name}
      sub={educator.email}
      actions={
        educator.status === "pending" ? (
          <WBtn icon="check" sm>
            Approve
          </WBtn>
        ) : educator.status === "approved" ? (
          <WBtn kind="ghost" icon="lock" sm>
            Suspend
          </WBtn>
        ) : null
      }
    >
      <Link
        href="/admin/educators"
        className="rs-word"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <Icon name="arrowL" size={12} c="var(--text-muted)" />
        Educators
      </Link>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={educator.name} size={56} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span className="rs-head" style={{ fontSize: 19 }}>
                {educator.name}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {educator.bio}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        {[
          ["Published courses", String(courses.filter((c) => c.status === "live").length)],
          ["Total students", students.toLocaleString()],
          ["Total revenue", formatMoney(revenue)],
          ["Joined", formatDate(educator.joinedAt)],
        ].map(([label, value]) => (
          <Card key={label} style={{ flex: 1 }}>
            <div className="rs-head" style={{ fontSize: 22 }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionH>Courses</SectionH>
        {courses.map((c, i) => (
          <Link
            key={c.id}
            href={`/admin/courses/${c.id}`}
            className="rs-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "13px 4px",
              borderBottom: i < courses.length - 1 ? "0.5px solid var(--border)" : "none",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <span style={{ fontSize: 13.5 }}>{c.title}</span>
            <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
              {c.enrolled.toLocaleString()} enrolled &middot; {formatMoney(c.revenue)}
            </span>
          </Link>
        ))}
      </Card>
    </WebShell>
  );
}
