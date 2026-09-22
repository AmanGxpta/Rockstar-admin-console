import { notFound, redirect } from "next/navigation";

import { WebShell } from "@/components/shell";
import { editsLocked } from "@/lib/course-tree";
import { getCourseForEditor } from "@/lib/courses";
import { getExamForCourse } from "@/lib/exams";
import { requireTeam } from "@/lib/session";

import { ExamBuilder } from "./exam-builder";

export default async function ExamBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTeam();
  const { id: courseId } = await params;

  // Reading the course first is the ownership check: RLS returns null for a
  // course this educator does not author, and the exam read would otherwise
  // come back as a silently empty bank.
  const course = await getCourseForEditor(courseId);
  if (!course) notFound();

  // The editor hides the link into here while a course is locked, but the
  // route is still typeable. Every write on this screen would be refused —
  // by 0026's review lock, or by 0034's publish lock — so the author is sent
  // back to the course rather than left to discover it one save at a time.
  if (course.is_published || editsLocked(course.review_state)) {
    redirect(`/courses/${courseId}`);
  }

  const { settings, bank } = await getExamForCourse(courseId);

  return (
    <WebShell
      session={session}
      back={`/courses/${courseId}`}
      title="Final exam builder"
      sub={`${course.title} · gates the certificate`}
    >
      <ExamBuilder courseId={courseId} settings={settings} bank={bank} />
    </WebShell>
  );
}
