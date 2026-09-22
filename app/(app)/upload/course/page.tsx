import { WebShell } from "@/components/shell";
import { requireTeam } from "@/lib/session";

import { CourseForm } from "./course-form";

export default async function UploadCourse() {
  const session = await requireTeam();

  return (
    <WebShell
      session={session}
      back="/courses"
      title="Upload a course"
      sub="Chapters, clips and quizzes come next · it stays a draft until you publish it"
    >
      <CourseForm />
    </WebShell>
  );
}
