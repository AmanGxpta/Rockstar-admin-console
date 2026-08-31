import Link from "next/link";
import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Avatar, Badge, Card, SectionH } from "@/components/ui/primitives";
import { formatDuration, getCourseForEditor } from "@/lib/courses";
import { requireSession } from "@/lib/session";

import { CourseActions } from "./course-actions";

export default async function AdminCourseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;

  // The same tree the educator's editor reads — an admin reviewing a course
  // should see exactly what was built, chapters and lessons included.
  const course = await getCourseForEditor(id);
  if (!course) notFound();

  const educatorName = course.educator?.users?.full_name ?? "Unassigned";
  const lessonCount = course.course_modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  return (
    <WebShell
      session={session}
      title={course.title}
      sub={course.category}
      actions={
        <CourseActions
          courseId={course.id}
          title={course.title}
          isPublished={course.is_published}
          educatorName={educatorName}
        />
      }
    >
      <Link
        href="/admin/courses"
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
        Course catalog
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Badge tone={course.is_published ? "complete" : "locked"}>
                {course.is_published ? "Live" : "Draft"}
              </Badge>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              {course.overview || "No overview written yet."}
            </p>
          </Card>

          <Card>
            <SectionH>Curriculum</SectionH>
            {course.course_modules.length === 0 && (
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "12px 0 0" }}>
                No chapters yet.
              </p>
            )}
            {course.course_modules.map((module, i) => (
              <div
                key={module.id}
                style={{
                  padding: "14px 4px",
                  borderBottom:
                    i < course.course_modules.length - 1
                      ? "0.5px solid var(--border)"
                      : "none",
                }}
              >
                <div className="rs-label" style={{ marginBottom: 6 }}>
                  Chapter {String(module.position).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 8 }}>
                  {module.title}
                </div>
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "5px 0 5px 14px",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>
                      {lesson.position}. {lesson.title}
                      {lesson.is_preview ? " · preview" : ""}
                    </span>
                    <span className="rs-word" style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {lesson.lesson_blocks.length} blocks ·{" "}
                      {formatDuration(lesson.duration_seconds)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionH>Stats</SectionH>
            {[
              ["Chapters", String(course.course_modules.length)],
              ["Lessons", String(lessonCount)],
              ["Total length", formatDuration(course.total_duration_seconds)],
              ["Enrolled", course.enrolled_count.toLocaleString()],
              [
                "Price",
                course.price_cents === null
                  ? "Free"
                  : `£${(course.price_cents / 100).toFixed(2)}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "9px 0",
                  borderBottom: "0.5px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span style={{ color: "var(--text-secondary)" }}>{value}</span>
              </div>
            ))}
          </Card>

          <Card>
            <SectionH>Educator</SectionH>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={educatorName} size={36} />
              <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                {educatorName}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </WebShell>
  );
}
