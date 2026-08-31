import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Badge, Card, SectionH, WBtn } from "@/components/ui/primitives";
import { deleteBlock, deleteLesson, deleteModule } from "@/lib/course-actions";
import { formatDuration, getCourseForEditor } from "@/lib/courses";
import { requireSession } from "@/lib/session";

import { AddBlockForm, AddLessonForm, AddModuleForm } from "./editor-forms";

const KIND_LABEL: Record<string, string> = {
  video: "Clip",
  text: "Notes",
  image: "Image",
  pdf: "PDF",
  embed: "Link",
};

const muted = {
  fontSize: 10,
  letterSpacing: "0.12em",
  color: "var(--text-muted)",
} as const;

/** A delete control that is a real form post, so it works without JS. */
function DeleteButton({
  action,
  fields,
  label,
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
}) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <WBtn type="submit" kind="text" sm>
        {label}
      </WBtn>
    </form>
  );
}

export default async function CourseEditor({
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

  const lessonCount = course.course_modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  return (
    <WebShell
      session={session}
      title={course.title}
      sub={`${course.course_modules.length} chapters · ${lessonCount} lessons · ${formatDuration(
        course.total_duration_seconds,
      )}`}
      actions={
        <Badge tone={course.is_published ? "complete" : "locked"}>
          {course.is_published ? "Live" : "Draft"}
        </Badge>
      }
    >
      {!course.is_published && (
        <p
          className="rs-word"
          style={{ ...muted, marginBottom: 20, display: "block" }}
        >
          NOT YET VISIBLE TO STUDENTS — AN ADMIN PUBLISHES IT FROM THE COURSES
          CONSOLE.
        </p>
      )}

      {course.course_modules.map((module) => (
        <Card key={module.id} pad={24} style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <SectionH>
              Chapter {module.position} · {module.title}
            </SectionH>
            <DeleteButton
              action={deleteModule}
              fields={{ courseId: course.id, moduleId: module.id }}
              label="Remove chapter"
            />
          </div>

          {module.lessons.map((lesson) => (
            <div
              key={lesson.id}
              style={{
                borderLeft: "2px solid var(--red)",
                background: "var(--dark-2)",
                borderRadius: "0 var(--r-sm) var(--r-sm) 0",
                padding: "16px 20px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {lesson.position}. {lesson.title}
                  </div>
                  <span className="rs-word" style={muted}>
                    {formatDuration(lesson.duration_seconds)} ·{" "}
                    {lesson.lesson_blocks.length} blocks
                    {lesson.is_preview ? " · FREE PREVIEW" : ""}
                  </span>
                </div>
                <DeleteButton
                  action={deleteLesson}
                  fields={{ courseId: course.id, lessonId: lesson.id }}
                  label="Remove"
                />
              </div>

              {lesson.lesson_blocks.length > 0 && (
                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  {lesson.lesson_blocks.map((block) => (
                    <div
                      key={block.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "8px 12px",
                        background: "var(--dark-1)",
                        borderRadius: "var(--r-sm)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 12.5,
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <strong style={{ color: "var(--text-primary)" }}>
                          {KIND_LABEL[block.kind] ?? block.kind}
                        </strong>
                        {" · "}
                        {block.url ?? block.body ?? ""}
                      </span>
                      <DeleteButton
                        action={deleteBlock}
                        fields={{ courseId: course.id, blockId: block.id }}
                        label="×"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <AddBlockForm courseId={course.id} lessonId={lesson.id} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <AddLessonForm courseId={course.id} moduleId={module.id} />
          </div>
        </Card>
      ))}

      <Card pad={24}>
        <SectionH>Add a chapter</SectionH>
        <div style={{ marginTop: 16 }}>
          <AddModuleForm courseId={course.id} />
        </div>
      </Card>
    </WebShell>
  );
}
