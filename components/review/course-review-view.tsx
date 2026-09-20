import type { CSSProperties, ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { CoverImage } from "@/components/ui/cover-image";
import { Card, Empty, SectionH, Tag } from "@/components/ui/primitives";
import { formatDuration } from "@/lib/courses";
import { chapterItems, type EditorQuestion, type EditorQuiz } from "@/lib/course-tree";
import { TYPE_LABEL, attemptsToLabel } from "@/lib/quiz-draft";
import type { CourseForReview } from "@/lib/course-review";

/**
 * A whole course, laid out to be read rather than edited.
 *
 * Built once and rendered for two people. The admin sees it on the review
 * screen, which is what it is for: approving a course used to mean approving a
 * list of lesson titles, because a list of lesson titles was all the page
 * showed. The educator sees the same component while their course is locked —
 * they cannot edit it, and showing them exactly what the reviewer is looking
 * at is both more use and more honest than an empty screen with a padlock.
 *
 * A server component, with no state and no `use client`. Chapters open and
 * close through <details>, which needs no JavaScript and no hydration, and
 * every clip is a plain <video>. The whole thing is one HTML document.
 */

const MUTED: CSSProperties = { fontSize: 12.5, color: "var(--text-muted)" };
const BODY: CSSProperties = {
  fontSize: 13.5,
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap",
  margin: 0,
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: "0.5px solid var(--border)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-secondary)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Something that should be on screen and is not.
 *
 * Every gap in a course is drawn rather than skipped. A reviewer scrolling
 * past a quiz with no questions has to be able to tell that from a quiz whose
 * questions did not load, and a silently absent section reads as neither.
 */
function Missing({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "10px 12px",
        borderRadius: "var(--r-sm)",
        background: "var(--dark-3)",
        border: "0.5px dashed var(--border-mid)",
        fontSize: 12.5,
        color: "var(--warn)",
      }}
    >
      <Icon name="x" size={13} c="var(--warn)" />
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ media --

const FRAME: CSSProperties = {
  width: "100%",
  maxHeight: 420,
  borderRadius: 12,
  background: "#000",
  display: "block",
  objectFit: "contain",
};

/**
 * One lesson block, as a student would meet it.
 *
 * `kind` decides the element, not the file: a block saved as an image with an
 * MP4 attached renders broken here, which is what the student gets and
 * therefore what the reviewer needs to see. An absolute URL is passed straight
 * through — authors paste YouTube links — and anything else is an object path
 * that had to be signed, so a path with no entry in `media` is a file that is
 * no longer in the bucket.
 */
function Block({
  kind,
  url,
  body,
  media,
}: {
  kind: string;
  url: string | null;
  body: string | null;
  media: Record<string, string>;
}) {
  const external = !!url && /^https?:\/\//i.test(url);
  const src = url ? (external ? url : media[url]) : null;
  const broken = !!url && !src;

  return (
    <div style={{ marginTop: 10 }}>
      {broken && (
        <Missing>
          This file is missing from storage — <code>{url}</code>
        </Missing>
      )}

      {src && kind === "video" && (
        <video src={src} controls preload="metadata" style={FRAME} />
      )}

      {src && kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={body ?? "Lesson image"} style={FRAME} />
      )}

      {src && kind === "pdf" && (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: "var(--r-sm)",
            background: "var(--dark-3)",
            border: "0.5px solid var(--border)",
            fontSize: 13,
            color: "var(--text-primary)",
            textDecoration: "none",
          }}
        >
          <Icon name="file" size={15} c="var(--text-muted)" />
          Open the PDF
        </a>
      )}

      {src && kind === "embed" && (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13, color: "var(--clay)", wordBreak: "break-all" }}
        >
          {src}
        </a>
      )}

      {body && (
        <p style={{ ...BODY, marginTop: url ? 10 : 0 }}>{body}</p>
      )}

      {!url && !body && <Missing>This block is empty.</Missing>}
    </div>
  );
}

// ------------------------------------------------------------------ quizzes --

/**
 * A question with its answer key showing.
 *
 * The key is the reason this screen exists at all: a reviewer approving a quiz
 * has to be able to see that the ticked answer is the right one, and that an
 * Image ID question has a picture attached — 2679 shipped the picture, and a
 * review that cannot see it cannot tell a finished question from a broken one.
 */
function Question({
  q,
  n,
  media,
}: {
  q: EditorQuestion;
  n: number;
  media: Record<string, string>;
}) {
  const image = q.media_url ? media[q.media_url] : null;

  return (
    <div
      style={{
        padding: "14px 0",
        borderTop: "0.5px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span className="rs-word" style={{ ...MUTED, minWidth: 22 }}>
          {String(n).padStart(2, "0")}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <Tag tone="ink">{TYPE_LABEL[q.type]}</Tag>
            {!q.is_required && <Tag tone="gold">Optional</Tag>}
          </div>

          <p style={{ ...BODY, color: "var(--text-primary)", marginBottom: 8 }}>
            {q.prompt.trim() || "— no prompt written —"}
          </p>

          {q.type === "image" &&
            (image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="Reference image students identify"
                style={{ ...FRAME, maxHeight: 260, marginBottom: 10 }}
              />
            ) : (
              <div style={{ marginBottom: 10 }}>
                <Missing>
                  {q.media_url
                    ? "The reference image is missing from storage."
                    : "An Image ID question with no reference image — students would be asked to identify nothing."}
                </Missing>
              </div>
            ))}

          {q.quiz_choices.length === 0 ? (
            <Missing>No answers written.</Missing>
          ) : (
            <div style={{ display: "grid", gap: 5 }}>
              {q.quiz_choices.map((choice, i) => (
                <div
                  key={choice.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 11px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 13,
                    background: choice.is_correct
                      ? "var(--leaf-tint)"
                      : "var(--dark-3)",
                    color: choice.is_correct
                      ? "#3e6b4a"
                      : "var(--text-secondary)",
                    border: "0.5px solid var(--border)",
                  }}
                >
                  {/*
                    A reorder question has no "correct" choice — the order
                    itself is the answer — so it is numbered rather than ticked,
                    which would otherwise read as every step being wrong.
                  */}
                  {q.type === "order" ? (
                    <span className="rs-word" style={{ fontSize: 10.5 }}>
                      {i + 1}
                    </span>
                  ) : (
                    <Icon
                      name={choice.is_correct ? "check" : "x"}
                      size={13}
                      c={choice.is_correct ? "#3e6b4a" : "var(--text-muted)"}
                    />
                  )}
                  {choice.body.trim() || "— blank —"}
                </div>
              ))}
            </div>
          )}

          {q.hint && (
            <p style={{ ...MUTED, marginTop: 8, marginBottom: 0 }}>
              Hint: {q.hint}
            </p>
          )}
          {q.explanation && (
            <p style={{ ...MUTED, marginTop: 6, marginBottom: 0 }}>
              Shown after answering: {q.explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Quiz({
  quiz,
  media,
}: {
  quiz: EditorQuiz;
  media: Record<string, string>;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "0.5px solid var(--border-mid)",
        background: "var(--dark-3)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <Icon name="award" size={15} c="var(--clay)" />
        <b style={{ fontSize: 14 }}>{quiz.title}</b>
        <Tag tone="ink">
          {quiz.quiz_questions.length}{" "}
          {quiz.quiz_questions.length === 1 ? "question" : "questions"}
        </Tag>
        <Tag tone="ink">{attemptsToLabel(quiz.attempts_allowed)} attempts</Tag>
        {quiz.show_results && <Tag tone="ink">Shows results</Tag>}
        {quiz.gates_progress && <Tag tone="gold">Gates the next clip</Tag>}
      </div>

      {quiz.quiz_questions.length === 0 ? (
        <div style={{ marginTop: 12 }}>
          <Missing>This quiz has no questions — students would see nothing.</Missing>
        </div>
      ) : (
        quiz.quiz_questions.map((q, i) => (
          <Question key={q.id} q={q} n={i + 1} media={media} />
        ))
      )}
    </div>
  );
}

// ----------------------------------------------------------------- the page --

export function CourseReviewView({ data }: { data: CourseForReview }) {
  const { course, exam, resources, media } = data;

  const clips = course.course_modules.reduce(
    (n, m) => n + m.lessons.length,
    0,
  );
  const quizzes = course.course_modules.reduce(
    (n, m) => n + m.quizzes.length,
    0,
  );

  return (
    <>
      <Card style={{ marginBottom: 16, display: "flex", gap: 18 }}>
        <CoverImage
          path={course.cover_path}
          style={{ width: 168, height: 112, borderRadius: 12, flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Tag tone="clay">{course.category}</Tag>
            <Tag tone="ink">{course.level}</Tag>
            <Tag tone="ink">
              {course.price_cents === null
                ? "Free"
                : `£${(course.price_cents / 100).toFixed(2)}`}
            </Tag>
            {course.access_months && (
              <Tag tone="ink">{course.access_months} months access</Tag>
            )}
            <Tag tone="ink">
              {clips} {clips === 1 ? "clip" : "clips"} · {quizzes}{" "}
              {quizzes === 1 ? "quiz" : "quizzes"} ·{" "}
              {formatDuration(course.total_duration_seconds)}
            </Tag>
          </div>
          {course.subtitle && (
            <p style={{ ...BODY, color: "var(--text-primary)", marginBottom: 8 }}>
              {course.subtitle}
            </p>
          )}
          <p style={BODY}>
            {course.overview.trim() || "No overview written yet."}
          </p>
          {course.outcomes.length > 0 && (
            <ul
              style={{
                margin: "12px 0 0",
                paddingLeft: 18,
                ...BODY,
                whiteSpace: "normal",
              }}
            >
              {course.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <SectionH>Curriculum</SectionH>
      {course.course_modules.length === 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <Empty
            title="No chapters yet"
            hint="There is nothing here for a student to watch."
          />
        </Card>
      ) : (
        course.course_modules.map((chapter) => {
          const items = chapterItems(chapter);
          return (
            <Card key={chapter.id} pad={0} style={{ marginBottom: 12 }}>
              {/*
                `open` on every chapter: a reviewer's job is to read all of it,
                so the collapsed-by-default tree the editor uses would just be
                a list of things to click before the review can start. They
                still close, for getting back up the page.
              */}
              <details open>
                <summary
                  style={{
                    cursor: "pointer",
                    listStyle: "none",
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span className="rs-label">
                    Chapter {String(chapter.position).padStart(2, "0")}
                  </span>
                  <b style={{ fontSize: 15 }}>{chapter.title}</b>
                  <span style={{ ...MUTED, marginLeft: "auto" }}>
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </summary>

                <div
                  style={{
                    padding: "0 20px 18px",
                    display: "grid",
                    gap: 14,
                  }}
                >
                  {items.length === 0 && (
                    <Missing>This chapter is empty.</Missing>
                  )}

                  {items.map((item) =>
                    item.kind === "quiz" ? (
                      <Quiz key={item.quiz.id} quiz={item.quiz} media={media} />
                    ) : (
                      <div
                        key={item.lesson.id}
                        style={{
                          borderRadius: 14,
                          border: "0.5px solid var(--border)",
                          padding: "14px 16px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <Icon name="play" size={14} c="var(--text-muted)" />
                          <b style={{ fontSize: 14 }}>{item.lesson.title}</b>
                          {item.lesson.is_preview && (
                            <Tag tone="leaf">Free preview</Tag>
                          )}
                          <span style={{ ...MUTED, marginLeft: "auto" }}>
                            {formatDuration(item.lesson.duration_seconds)}
                          </span>
                        </div>

                        {item.lesson.lesson_blocks.length === 0 ? (
                          <div style={{ marginTop: 10 }}>
                            <Missing>
                              This clip has nothing attached — no video, no
                              words.
                            </Missing>
                          </div>
                        ) : (
                          item.lesson.lesson_blocks.map((block) => (
                            <Block
                              key={block.id}
                              kind={block.kind}
                              url={block.url}
                              body={block.body}
                              media={media}
                            />
                          ))
                        )}
                      </div>
                    ),
                  )}
                </div>
              </details>
            </Card>
          );
        })
      )}

      <SectionH>Final exam</SectionH>
      <Card style={{ marginBottom: 16 }}>
        {exam.settings ? (
          <div style={{ marginBottom: exam.bank.length ? 6 : 0 }}>
            <Row label="Questions drawn" value={exam.settings.question_count} />
            <Row label="Time limit" value={`${exam.settings.duration_minutes} min`} />
            <Row label="Pass mark" value={`${exam.settings.pass_percent}%`} />
            <Row label="Attempts" value={exam.settings.attempts_allowed} />
            <Row
              label="Certificate"
              value={exam.settings.grants_certificate ? "Granted on a pass" : "None"}
            />
            <Row label="Questions in the bank" value={exam.bank.length} />
          </div>
        ) : (
          <Missing>
            No exam has been set up. Students finish this course without one.
          </Missing>
        )}

        {exam.settings && exam.bank.length < exam.settings.question_count && (
          <div style={{ marginTop: 12 }}>
            <Missing>
              The bank holds {exam.bank.length} question
              {exam.bank.length === 1 ? "" : "s"} but the exam draws{" "}
              {exam.settings.question_count}.
            </Missing>
          </div>
        )}

        {exam.bank.map((q, i) => (
          <Question key={q.id} q={q} n={i + 1} media={media} />
        ))}
      </Card>

      <SectionH>Handouts</SectionH>
      <Card>
        {resources.length === 0 ? (
          <p style={{ ...MUTED, margin: 0 }}>
            No downloadable resources on this course.
          </p>
        ) : (
          resources.map((resource) => {
            const url = media[resource.path];
            return (
              <div
                key={resource.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 0",
                  borderBottom: "0.5px solid var(--border)",
                }}
              >
                <Icon name="file" size={16} c="var(--text-muted)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5 }}>{resource.title}</div>
                  <div style={MUTED}>
                    {resource.kind}
                    {resource.size_bytes
                      ? ` · ${(resource.size_bytes / 1024 / 1024).toFixed(1)} MB`
                      : ""}
                    {resource.description ? ` · ${resource.description}` : ""}
                  </div>
                </div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12.5, color: "var(--clay)" }}
                  >
                    Open
                  </a>
                ) : (
                  <span style={{ fontSize: 12.5, color: "var(--warn)" }}>
                    Missing
                  </span>
                )}
              </div>
            );
          })
        )}
      </Card>
    </>
  );
}
