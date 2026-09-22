import Link from "next/link";

import { WebShell } from "@/components/shell";
import { Icon } from "@/components/ui/icon";
import { CoverImage } from "@/components/ui/cover-image";
import { Card, Empty, Tag, WBtn } from "@/components/ui/primitives";
import { REVIEW_STATE, awaitingReview } from "@/lib/course-tree";
import { formatDuration, listCourses } from "@/lib/courses";
import { requireTeam } from "@/lib/session";

/**
 * The design's fourth chip is "Archived". There is no archived state in the
 * schema, so the filter offers what exists rather than a tab that can never
 * fill — and since 0026 that includes "with an admin", which is the one an
 * educator actually wants: it answers "what am I waiting on?".
 *
 * The same list for both roles, because `courses` narrows itself: an admin's
 * policy returns every course, an educator's returns the ones they author.
 * This used to be two screens, `/educator/courses` and `/admin/courses`, and
 * the second one is gone rather than moved — a catalog that only an admin
 * could see, listing courses only an admin could publish, was a second copy of
 * this page that existed because publishing lived somewhere else.
 */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "review", label: "With an admin" },
  { value: "drafts", label: "Drafts" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireTeam();
  const { filter } = await searchParams;
  const active: Filter =
    FILTERS.find((f) => f.value === filter)?.value ?? "all";

  // No educator filter: the RLS policy on `courses` already narrows this to
  // the ones this account authors. Filtering again here would be a second,
  // divergent copy of that rule.
  const all = await listCourses();
  const courses = all.filter((c) =>
    active === "published"
      ? c.is_published
      : active === "review"
        ? awaitingReview(c.review_state)
        : active === "drafts"
          ? !c.is_published
          : true,
  );

  return (
    <WebShell
      session={session}
      title="Courses"
      sub={`${all.length} ${all.length === 1 ? "course" : "courses"} · ${all
        .reduce((n, c) => n + c.enrolled_count, 0)
        .toLocaleString()} students enrolled`}
      actions={
        <Link href="/upload/course" style={{ textDecoration: "none" }}>
          <WBtn icon="plus">Upload a course</WBtn>
        </Link>
      }
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {FILTERS.map((f) => {
          const on = f.value === active;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/courses" : `?filter=${f.value}`}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                background: on ? "var(--ink)" : "var(--dark-2)",
                color: on ? "#fff" : "var(--text-secondary)",
                boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--border-mid)",
              }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {courses.length === 0 ? (
        <Card>
          <Empty
            title={
              all.length === 0
                ? "You have not created a course yet"
                : "Nothing in this filter"
            }
            hint={
              all.length === 0
                ? "Start one with Upload a course. Build the chapters, then publish it when it is ready — publishing is what puts it in front of students, and what freezes it."
                : "Try another tab."
            }
          />
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card pad={0} style={{ overflow: "hidden", height: "100%" }}>
                <CoverImage path={course.cover_path} h={120} />
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    {/*
                      Published wins over the review state wherever both are
                      true. Since 0034 it is the fact that decides what you can
                      do with the course — live and frozen, or draft and
                      editable — so it is the fact the chip should carry.
                    */}
                    <Tag
                      tone={
                        course.is_published
                          ? "leaf"
                          : REVIEW_STATE[course.review_state].tone
                      }
                    >
                      {course.is_published
                        ? "Published"
                        : REVIEW_STATE[course.review_state].educator}
                    </Tag>
                    <Tag tone="clay">{course.level}</Tag>
                  </div>

                  <div
                    style={{
                      fontFamily: "var(--font-head)",
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 4,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {course.title}
                  </div>
                  {course.subtitle && (
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-secondary)",
                        marginBottom: 12,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.subtitle}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginBottom: 12,
                    }}
                  >
                    <span>
                      <b style={{ color: "var(--text-primary)" }}>
                        {course.enrolled_count.toLocaleString()}
                      </b>{" "}
                      students
                    </span>
                    <span>
                      <b style={{ color: "var(--text-primary)" }}>
                        {course.lesson_count}
                      </b>{" "}
                      clips
                    </span>
                  </div>

                  {course.is_published ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="lock" size={14} c="var(--text-muted)" />
                      Live · {formatDuration(course.total_duration_seconds)} of
                      runtime
                    </div>
                  ) : awaitingReview(course.review_state) ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--warn)",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="clock" size={14} c="var(--warn)" />
                      {course.review_state === "in_review"
                        ? "Locked while an admin reads it"
                        : "Changes not signed off yet"}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--warn)",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="pencil" size={14} c="var(--warn)" />
                      Continue editing
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </WebShell>
  );
}
