import Link from "next/link";

import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Table, type Col } from "@/components/ui/primitives";
import { formatDuration, listCourses } from "@/lib/courses";
import { requireSession } from "@/lib/session";

const COLS: Col[] = [
  ["Course", 2],
  ["Educator", 1.2],
  ["Status", 0.9],
  ["Lessons", 0.8, "right"],
  ["Length", 0.9, "right"],
  ["Enrolled", 0.8, "right"],
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCourses() {
  const session = await requireSession("admin");
  const courses = await listCourses();

  // There is no separate "pending" flag in the schema — a course awaiting
  // review is simply one that is not yet published.
  const awaiting = courses.filter((c) => !c.is_published).length;

  return (
    <WebShell
      session={session}
      title="Course catalog"
      sub={`${courses.length} courses · ${awaiting} awaiting review`}
    >
      <Card pad={0}>
        <div style={{ padding: "0 4px" }}>
          <Table
            cols={COLS}
            rows={courses.map((course) => {
              const educatorName =
                course.educator?.users?.full_name ?? "Unassigned";

              return [
                <Link
                  key="title"
                  href={`/admin/courses/${course.id}`}
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <div style={{ fontSize: 13.5 }}>{course.title}</div>
                  <div
                    className="rs-word"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {course.category} · updated {formatDate(course.updated_at)}
                  </div>
                </Link>,
                <div
                  key="educator"
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Avatar name={educatorName} size={24} />
                  <span style={{ fontSize: 13 }}>{educatorName}</span>
                </div>,
                <Badge key="status" tone={course.is_published ? "complete" : "locked"}>
                  {course.is_published ? "Live" : "Draft"}
                </Badge>,
                course.lesson_count,
                formatDuration(course.total_duration_seconds),
                course.enrolled_count.toLocaleString(),
              ];
            })}
          />
        </div>
      </Card>
    </WebShell>
  );
}
