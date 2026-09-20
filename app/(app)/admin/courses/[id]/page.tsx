import Link from "next/link";
import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Avatar, Card, SectionH, Tag } from "@/components/ui/primitives";
import { CourseReviewView } from "@/components/review/course-review-view";
import { ReviewHistory } from "@/components/review/review-history";
import { getCourseForReview } from "@/lib/course-review";
import { REVIEW_STATE, awaitingReview } from "@/lib/course-tree";
import { formatDuration } from "@/lib/courses";
import { requireSession } from "@/lib/session";

import { CourseActions } from "./course-actions";

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCourseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession("admin");
  const { id } = await params;

  /*
    The whole course, not a table of contents.

    This page used to render chapter titles, lesson titles and a block count,
    which meant "approve" was a judgement on a list of headings: a reviewer
    could not watch a clip, read a caption, see which answer a quiz counts as
    correct, tell whether the Image ID questions had pictures on them, or find
    out what the final exam asked. getCourseForReview() pulls the tree, the
    exam and its bank, the handouts and the review history, and signs every
    private object in one call per bucket.
  */
  const data = await getCourseForReview(id);
  if (!data) notFound();

  const { course, exam, resources } = data;
  const educatorName = course.educator?.users?.full_name ?? "Unassigned";
  const state = REVIEW_STATE[course.review_state];
  const lessonCount = course.course_modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  return (
    <WebShell
      session={session}
      title={course.title}
      sub={`${educatorName} · ${course.category}`}
      actions={
        <CourseActions
          courseId={course.id}
          title={course.title}
          isPublished={course.is_published}
          reviewState={course.review_state}
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
        <div style={{ minWidth: 0 }}>
          {/*
            Why this course is on screen, before any of the course itself.
            An automatic request and one the educator sent deliberately need
            reading differently — the first means a live course drifted, the
            second means somebody is waiting on an answer.
          */}
          {awaitingReview(course.review_state) && (
            <Card
              style={{
                marginBottom: 16,
                borderLeft: "3px solid var(--warn)",
                display: "flex",
                gap: 12,
              }}
            >
              <Icon name="clock" size={17} c="var(--warn)" />
              <div>
                <div className="rs-label" style={{ marginBottom: 6 }}>
                  {course.review_state === "in_review"
                    ? `${educatorName} sent this in on ${when(course.review_requested_at)}`
                    : `Live, and edited since it was approved — ${when(course.review_requested_at)}`}
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {course.review_state === "in_review"
                    ? "The course is locked to its author while it is with you, so what is below will not move under you."
                    : "Nobody has signed off on the current version, and students are reading it now. Its author can still edit it — a course that drifted is one somebody is still working on."}
                </p>
              </div>
            </Card>
          )}

          <CourseReviewView data={data} />

          <div style={{ marginTop: 22 }}>
            <ReviewHistory history={data.history} />
          </div>
        </div>

        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionH>Status</SectionH>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <Tag tone={state.tone}>{state.admin}</Tag>
              <Tag tone={course.is_published ? "leaf" : "ink"}>
                {course.is_published ? "In the catalog" : "Not published"}
              </Tag>
              {course.is_featured && <Tag tone="gold">Featured</Tag>}
            </div>
            {[
              ["Sent in", when(course.review_requested_at)],
              ["Last decided", when(course.reviewed_at)],
              ["Last edited", when(course.updated_at)],
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

          <Card style={{ marginBottom: 16 }}>
            <SectionH>Stats</SectionH>
            {[
              ["Chapters", String(course.course_modules.length)],
              ["Clips", String(lessonCount)],
              [
                "Quizzes",
                String(
                  course.course_modules.reduce((n, m) => n + m.quizzes.length, 0),
                ),
              ],
              ["Exam bank", String(exam.bank.length)],
              ["Handouts", String(resources.length)],
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
