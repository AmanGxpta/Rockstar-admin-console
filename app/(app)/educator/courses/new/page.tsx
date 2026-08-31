import { WebShell } from "@/components/shell";
import { requireSession } from "@/lib/session";

import { CourseForm } from "./course-form";

export default async function NewCourse() {
  const session = await requireSession("educator");

  return (
    <WebShell
      session={session}
      title="New course"
      sub="Chapters and lessons come next"
    >
      <CourseForm />
    </WebShell>
  );
}
