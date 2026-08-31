import { WebShell } from "@/components/shell";
import { Badge, ItemCard, WBtn, type BadgeTone } from "@/components/ui/primitives";
import { requireSession } from "@/lib/session";
import { COURSES, formatMoney } from "@/lib/seed-data";

// Hardcoded until Clerk users are linked to educator records in Supabase.
const CURRENT_EDUCATOR_ID = "ed-1";

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  live: { label: "Live", tone: "complete" },
  pending: { label: "Pending review", tone: "warn" },
  draft: { label: "Draft", tone: "locked" },
  archived: { label: "Archived", tone: "locked" },
};

export default async function EducatorCourses() {
  const session = await requireSession("educator");
  const courses = COURSES.filter((c) => c.educatorId === CURRENT_EDUCATOR_ID);

  return (
    <WebShell
      session={session}
      title="Courses"
      sub={`${courses.length} courses`}
      actions={<WBtn icon="plus">New course</WBtn>}
    >
      {courses.map((course) => {
        const status = STATUS_BADGE[course.status];
        const totalMin = course.modules.reduce((a, m) => a + m.minutes, 0);
        return (
          <ItemCard
            key={course.id}
            href={`/educator/courses/${course.id}`}
            eyebrow={course.category}
            title={
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span>{course.title}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
            }
            description={course.description}
            footer={
              <>
                <span className="rs-word" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                  {course.modules.length} modules · {totalMin} min
                </span>
                <span className="rs-word" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                  {course.enrolled.toLocaleString()} enrolled
                </span>
                <span className="rs-word" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                  {formatMoney(course.revenue)} revenue
                </span>
              </>
            }
          />
        );
      })}
    </WebShell>
  );
}
