import Link from "next/link";

import { WebShell } from "@/components/shell";
import { Badge, ItemCard, WBtn } from "@/components/ui/primitives";
import { formatDuration, listCourses } from "@/lib/courses";
import { requireSession } from "@/lib/session";

const muted = {
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "var(--text-muted)",
} as const;

export default async function EducatorCourses() {
  const session = await requireSession("educator");

  // No educator filter: the RLS policy on `courses` already narrows this to
  // the ones this account authors. Filtering again here would be a second,
  // divergent copy of that rule.
  const courses = await listCourses();

  return (
    <WebShell
      session={session}
      title="Courses"
      sub={`${courses.length} ${courses.length === 1 ? "course" : "courses"}`}
      actions={
        <Link href="/educator/courses/new" style={{ textDecoration: "none" }}>
          <WBtn icon="plus">New course</WBtn>
        </Link>
      }
    >
      {courses.length === 0 && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--text-muted)",
          }}
        >
          No courses yet. Start with “New course”.
        </p>
      )}

      {courses.map((course) => (
        <ItemCard
          key={course.id}
          href={`/educator/courses/${course.id}`}
          eyebrow={course.category}
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>{course.title}</span>
              <Badge tone={course.is_published ? "complete" : "locked"}>
                {course.is_published ? "Live" : "Draft"}
              </Badge>
            </div>
          }
          description={course.subtitle ?? ""}
          footer={
            <>
              <span className="rs-word" style={muted}>
                {course.lesson_count} lessons ·{" "}
                {formatDuration(course.total_duration_seconds)}
              </span>
              <span className="rs-word" style={muted}>
                {course.enrolled_count.toLocaleString()} enrolled
              </span>
              <span className="rs-word" style={muted}>
                {course.level}
              </span>
            </>
          }
        />
      ))}
    </WebShell>
  );
}
