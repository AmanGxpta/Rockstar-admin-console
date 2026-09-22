import Link from "next/link";
import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Card, Tag, WBtn } from "@/components/ui/primitives";
import { CourseReviewView } from "@/components/review/course-review-view";
import { ReviewHistory } from "@/components/review/review-history";
import { listCourseStudents } from "@/lib/access-requests";
import { getCourseForReview } from "@/lib/course-review";
import { REVIEW_STATE, editsLocked } from "@/lib/course-tree";
import { formatDuration, getCourseForEditor, getCourseReviews } from "@/lib/courses";
import { requireTeam } from "@/lib/session";

import { CourseActions } from "./course-actions";
import { CourseEditor } from "./course-editor";
import { EnrolledStudents } from "./enrolled-students";
import { ReviewRequest } from "./review-request";

/**
 * One course, for whoever on the team opens it.
 *
 * This page and `/admin/courses/[id]` used to be two screens with two
 * different jobs — an editor for the author, a read-only review for the admin.
 * They are one now, because the team is both. What decides which half you get
 * is the course, not the reader:
 *
 *   published        → read-only. 0034 freezes a live course for everybody,
 *                      so an editor here would be a form whose every save the
 *                      database refuses.
 *   with a reviewer  → read-only, for 0026's reasons, which still apply while
 *                      educators send courses in.
 *   otherwise        → the editor.
 *
 * Both locks render the same read-only view rather than a disabled editor.
 * Threading a `readOnly` flag through fifteen hundred lines of drag handles,
 * inline renames and modals would leave one of them missed, and the miss shows
 * up as an RLS rejection in front of the person using it.
 */
export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTeam();
  const { id } = await params;

  // RLS already scopes this to courses this account may author — every course
  // for an admin, their own for an educator — so somebody else's comes back
  // null and 404s rather than needing an ownership check here.
  const course = await getCourseForEditor(id);
  if (!course) notFound();

  const isAdmin = session.role === "admin";
  const frozen = course.is_published;
  const inReview = editsLocked(course.review_state);
  const readOnly = frozen || inReview;
  const state = REVIEW_STATE[course.review_state];
  const educatorName = course.educator?.users?.full_name ?? "its author";

  /*
    Only the read-only view needs everything signed and resolved; the editor
    loads its media clip by clip, so fetching the tree unconditionally would
    put a bucket round trip on every navigation into a page that would not use
    it.
  */
  const [review, history, students] = await Promise.all([
    readOnly ? getCourseForReview(id) : Promise.resolve(null),
    readOnly ? Promise.resolve([]) : getCourseReviews(id),
    listCourseStudents(id),
  ]);

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
      back="/courses"
      title={course.title}
      sub={`${frozen ? "Published" : inReview ? "Under review" : "Draft"} · ${clips} ${
        clips === 1 ? "clip" : "clips"
      } · ${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"} · ${formatDuration(
        course.total_duration_seconds,
      )} · ${course.enrolled_count.toLocaleString()} ${
        course.enrolled_count === 1 ? "student" : "students"
      }`}
      actions={
        <>
          {!readOnly && (
            <Link
              href={`/courses/${course.id}/exam`}
              style={{ textDecoration: "none" }}
            >
              <WBtn kind="ghost" icon="award" sm>
                Final exam
              </WBtn>
            </Link>
          )}

          <Tag tone={frozen ? "leaf" : state.tone}>
            {frozen ? "Published" : state.educator}
          </Tag>

          <CourseActions
            courseId={course.id}
            title={course.title}
            isPublished={course.is_published}
            reviewState={course.review_state}
            educatorName={educatorName}
            canPublish={isAdmin}
          />

          {/*
            An educator still asks; an admin publishes directly, so the request
            would be them sending a course to themselves.
          */}
          {!isAdmin && (
            <ReviewRequest courseId={course.id} state={course.review_state} />
          )}
        </>
      }
    >
      {/*
        The reviewer's last word, at the top until the course is sent again:
        0026 clears review_note on the next request, so this takes itself down
        rather than needing to be dismissed.
      */}
      {course.review_note && course.review_state === "changes_requested" && (
        <Card
          style={{
            marginBottom: 16,
            borderLeft: "3px solid var(--danger)",
            display: "flex",
            gap: 12,
          }}
        >
          <Icon name="message" size={17} c="var(--danger)" />
          <div>
            <div className="rs-label" style={{ marginBottom: 6 }}>
              An admin asked for changes
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {course.review_note}
            </p>
          </div>
        </Card>
      )}

      {readOnly && (
        <Card
          style={{
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <Icon name="lock" size={17} c={frozen ? "var(--leaf)" : "var(--warn)"} />
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {frozen
              ? isAdmin
                ? "This course is live, so it is read-only — students are part-way through it. Move it back to draft to edit it, and publish it again when you are done."
                : "This course is live, so it is read-only. An admin can move it back to draft if something needs changing."
              : "This course is with an admin, so it is read-only until they answer — what is below is exactly what they are reading. Withdraw the request if you need to carry on working on it."}
          </p>
        </Card>
      )}

      {readOnly && review ? (
        <>
          <CourseReviewView data={review} />
          <div style={{ marginTop: 22 }}>
            <ReviewHistory history={review.history} />
          </div>
        </>
      ) : (
        <>
          <CourseEditor course={course} />
          {history.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <ReviewHistory history={history} />
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 22 }}>
        <EnrolledStudents students={students} isAdmin={isAdmin} />
      </div>
    </WebShell>
  );
}
