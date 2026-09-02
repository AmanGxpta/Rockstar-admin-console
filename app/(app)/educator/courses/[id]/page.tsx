import Link from "next/link";
import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Tag, WBtn } from "@/components/ui/primitives";
import { formatDuration, getCourseForEditor } from "@/lib/courses";
import { requireSession } from "@/lib/session";

import { CourseEditor } from "./course-editor";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("educator");
  const { id } = await params;

  // RLS already scopes this to courses the signed-in educator authors, so a
  // course belonging to someone else comes back null and 404s rather than
  // needing an ownership check here.
  const course = await getCourseForEditor(id);
  if (!course) notFound();

  const clips = course.course_modules.reduce(
    (total, m) => total + m.lessons.length,
    0,
  );
  const quizzes = course.course_modules.reduce(
    (total, m) => total + m.quizzes.length,
    0,
  );

  return (
    <WebShell
      session={session}
      back="/educator/courses"
      title={course.title}
      sub={`Course editor · ${clips} ${clips === 1 ? "clip" : "clips"} · ${quizzes} ${
        quizzes === 1 ? "quiz" : "quizzes"
      } · ${formatDuration(course.total_duration_seconds)}`}
      actions={
        <>
          <Link href={`/educator/exam/${course.id}`} style={{ textDecoration: "none" }}>
            <WBtn kind="ghost" icon="award" sm>
              Final exam
            </WBtn>
          </Link>
          {/*
            The design's third action is Publish. Migration 0008 made
            publishing an admin act enforced in the database, so an educator
            pressing it would take an RLS rejection — the state is shown
            instead, and the admin console carries the control.
          */}
          <Tag tone={course.is_published ? "leaf" : "gold"}>
            {course.is_published ? "Live" : "Draft — awaiting admin review"}
          </Tag>
        </>
      }
    >
      <CourseEditor course={course} />
    </WebShell>
  );
}
