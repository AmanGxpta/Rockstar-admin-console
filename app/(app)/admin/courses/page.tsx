import Link from "next/link";

import { WebShell } from "@/components/shell";
import { CoverImage } from "@/components/ui/cover-image";
import {
  Avatar,
  Card,
  Empty,
  SectionH,
  Table,
  Tag,
  WBtn,
  type Col,
} from "@/components/ui/primitives";
import { setFeatured, setPublished } from "@/lib/course-actions";
import { REVIEW_STATE, awaitingReview } from "@/lib/course-tree";
import { formatDuration, listCourses, type CourseListRow } from "@/lib/courses";
import { requireSession } from "@/lib/session";

const COLS: Col[] = [
  ["Course", 2.2],
  ["Educator", 1.4],
  ["Status", 1],
  ["Lessons", 0.7, "right"],
  ["Enrolled", 0.8, "right"],
  ["", 1.1, "right"],
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function educatorName(course: CourseListRow): string {
  return course.educator?.users?.full_name ?? "Unassigned";
}

/** A one-button form post, so the control works with JS off. */
function ToggleForm({
  action,
  courseId,
  next,
  label,
  kind = "ghost",
  icon,
}: {
  action: (form: FormData) => Promise<void>;
  courseId: string;
  next: boolean;
  label: string;
  kind?: "primary" | "ghost";
  icon?: "check2";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="next" value={String(next)} />
      <WBtn type="submit" kind={kind} sm icon={icon}>
        {label}
      </WBtn>
    </form>
  );
}

export default async function AdminCourses() {
  const session = await requireSession("admin");
  const courses = await listCourses();

  // The queue is courses whose authors have handed them over, plus live ones
  // that have changed since they were approved — not, as it was before 0026,
  // every unpublished row. A course somebody started this morning and has
  // written two chapter titles into is not waiting on an admin, and listing it
  // as though it were is how a review queue stops being read.
  const pending = courses.filter((c) => awaitingReview(c.review_state));
  const live = courses.filter((c) => c.is_published);

  return (
    <WebShell
      session={session}
      title="Course catalog"
      sub={`${live.length} live · ${pending.length} waiting on you`}
    >
      <SectionH>Awaiting approval</SectionH>
      {pending.length === 0 ? (
        <Card style={{ marginBottom: 24 }}>
          <Empty
            title="Nothing waiting on you"
            hint="A course lands here when its educator sends it in, or when a live one is edited after approval."
          />
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {pending.map((course) => (
            <Card
              key={course.id}
              style={{ display: "flex", gap: 14, alignItems: "center" }}
            >
              <CoverImage
                path={course.cover_path}
                style={{
                  width: 84,
                  height: 64,
                  borderRadius: 12,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {course.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    margin: "3px 0 8px",
                  }}
                >
                  {educatorName(course)} ·{" "}
                  {course.review_requested_at
                    ? `sent ${formatDate(course.review_requested_at)}`
                    : `updated ${formatDate(course.updated_at)}`}{" "}
                  · {course.lesson_count} clips
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Tag tone={REVIEW_STATE[course.review_state].tone}>
                    {REVIEW_STATE[course.review_state].admin}
                  </Tag>
                  {/*
                    The one-click Approve that used to sit here is gone on
                    purpose. It published a course without anybody having
                    opened it, which is the thing 2683 is about: approving now
                    means going in and reading it, and the verdict lives on
                    that page beside the material it is a verdict on.
                  */}
                  <Link
                    href={`/admin/courses/${course.id}`}
                    style={{ textDecoration: "none", marginLeft: "auto" }}
                  >
                    <WBtn sm icon="eye">
                      Review it
                    </WBtn>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SectionH>Live courses</SectionH>
      <Card pad={0}>
        {live.length === 0 ? (
          <Empty
            title="Nothing published yet"
            hint="Approving a course above puts it in front of students."
          />
        ) : (
          <div style={{ padding: "0 4px" }}>
            <Table
              cols={COLS}
              rows={live.map((course) => [
                <Link
                  key="title"
                  href={`/admin/courses/${course.id}`}
                  style={{ color: "var(--text-primary)", textDecoration: "none" }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {course.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
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
                  <Avatar name={educatorName(course)} size={26} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {educatorName(course)}
                  </span>
                </div>,
                <Tag
                  key="status"
                  tone={
                    awaitingReview(course.review_state)
                      ? REVIEW_STATE[course.review_state].tone
                      : course.is_featured
                        ? "gold"
                        : "leaf"
                  }
                >
                  {awaitingReview(course.review_state)
                    ? REVIEW_STATE[course.review_state].admin
                    : course.is_featured
                      ? "Featured"
                      : "Live"}
                </Tag>,
                course.lesson_count,
                course.enrolled_count.toLocaleString(),
                <span
                  key="actions"
                  style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
                >
                  <ToggleForm
                    action={setFeatured}
                    courseId={course.id}
                    next={!course.is_featured}
                    label={course.is_featured ? "Unfeature" : "Feature"}
                  />
                  <ToggleForm
                    action={setPublished}
                    courseId={course.id}
                    next={false}
                    label="Unpublish"
                  />
                </span>,
              ])}
            />
          </div>
        )}
      </Card>

      <p
        style={{
          fontSize: 11.5,
          color: "var(--text-muted)",
          marginTop: 14,
          marginBottom: 0,
        }}
      >
        Total runtime across the catalog:{" "}
        {formatDuration(
          courses.reduce((n, c) => n + c.total_duration_seconds, 0),
        )}
        .
      </p>
    </WebShell>
  );
}
