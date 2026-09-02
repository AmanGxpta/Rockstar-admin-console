import { notFound } from "next/navigation";
import Link from "next/link";
import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Empty, SectionH, Table, type Col } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { requireSession } from "@/lib/session";
import { formatDuration, listCourses } from "@/lib/courses";
import { listEducators } from "@/lib/reporting";

const COLS: Col[] = [
  ["Course", 2],
  ["State", 0.8],
  ["Lessons", 0.7, "right"],
  ["Runtime", 0.8, "right"],
  ["Students", 0.8, "right"],
];

export default async function AdminEducatorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;

  // An admin's RLS policy already returns every course, so the educator's own
  // are filtered from that one read rather than fetched separately.
  const [educators, allCourses] = await Promise.all([listEducators(), listCourses()]);
  const educator = educators.find((e) => e.id === id);
  if (!educator) notFound();

  const courses = allCourses.filter((c) => c.educator?.id === id);

  return (
    <WebShell
      session={session}
      title={educator.full_name ?? "Unnamed educator"}
      sub={educator.headline ?? educator.email ?? undefined}
    >
      <Link
        href="/admin/educators"
        className="rs-word"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
          fontSize: 12.5,
          color: "var(--text-muted)",
          textDecoration: "none",
        }}
      >
        <Icon name="chevL" size={13} />
        All educators
      </Link>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={educator.full_name ?? educator.email ?? "?"} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, marginBottom: 3 }}>
              {educator.full_name ?? "Unnamed educator"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {educator.email ?? "No email"}
              {educator.specialization ? ` · ${educator.specialization}` : ""} ·{" "}
              {educator.students.toLocaleString()} students
            </div>
          </div>
          <Badge tone={educator.is_verified ? "complete" : "warn"}>
            {educator.is_verified ? "Verified" : "Unverified"}
          </Badge>
        </div>
      </Card>

      <Card pad={0}>
        <div style={{ padding: "18px 20px 4px" }}>
          <SectionH>Courses</SectionH>
        </div>
        {courses.length === 0 ? (
          <Empty title="This educator has not created a course yet" />
        ) : (
          <div style={{ padding: "0 4px 8px" }}>
            <Table
              cols={COLS}
              rows={courses.map((c) => [
                <Link
                  key="c"
                  href={`/admin/courses/${c.id}`}
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  {c.title}
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
