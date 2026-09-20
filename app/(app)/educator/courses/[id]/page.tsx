import Link from "next/link";
import { notFound } from "next/navigation";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { Card, Tag, WBtn } from "@/components/ui/primitives";
import { CourseReviewView } from "@/components/review/course-review-view";
import { ReviewHistory } from "@/components/review/review-history";
import { getCourseForReview } from "@/lib/course-review";
import { REVIEW_STATE, editsLocked } from "@/lib/course-tree";
import { formatDuration, getCourseForEditor, getCourseReviews } from "@/lib/courses";
import { requireSession } from "@/lib/session";

import { CourseEditor } from "./course-editor";
import { ReviewRequest } from "./review-request";

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

  const locked = editsLocked(course.review_state);
  const state = REVIEW_STATE[course.review_state];

  /*
    A locked course is not shown as a disabled editor. It renders the same
    read-only view the admin is looking at, which is both more use to the
    author — this is what they are being judged on — and far less to keep
    working than threading a `readOnly` flag through fifteen hundred lines of
    drag handles, inline renames and modals, any one of which would eventually
    be missed and take an RLS rejection in front of the author.

    Only that view needs everything signed and resolved; the editor loads its
    own media clip by clip, so fetching it unconditionally would put a bucket
    round trip on every navigation into a page that would not use it.
  */
  const [review, history] = await Promise.all([
    locked ? getCourseForReview(id) : Promise.resolve(null),
    locked ? Promise.resolve([]) : getCourseReviews(id),
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
      back="/educator/courses"
      title={course.title}
      sub={`${locked ? "Under review" : "Course editor"} · ${clips} ${
        clips === 1 ? "clip" : "clips"
      } · ${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"} · ${formatDuration(
        course.total_duration_seconds,
      )}`}
      actions={
        <>
          {!locked && (
            <Link
              href={`/educator/exam/${course.id}`}
              style={{ textDecoration: "none" }}
            >
              <WBtn kind="ghost" icon="award" sm>
                Final exam
              </WBtn>
            </Link>
          )}
          {/*
            The design's third action is Publish. 0008 made publishing an admin
            act enforced in the database, and 0026 made asking for it something
            an educator actually does — so the control here is the request, and
            the tag beside it says where that request got to. "Live" wins over
            the state name when both are true, because that is the fact the
            author came to the page for.
          */}
          <Tag tone={course.is_published ? "leaf" : state.tone}>
            {course.is_published && course.review_state === "approved"
              ? "Live"
              : state.educator}
          </Tag>
          <ReviewRequest courseId={course.id} state={course.review_state} />
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

      {locked && review ? (
        <>
          <Card
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Icon name="lock" size={17} c="var(--warn)" />
            <p
              style={{
                fontSize: 13.5,
                color: "var(--text-secondary)",
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              This course is with an admin, so it is read-only until they
              answer — what is below is exactly what they are reading. Withdraw
              the request if you need to carry on working on it.
            </p>
          </Card>

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
    </WebShell>
  );
}
