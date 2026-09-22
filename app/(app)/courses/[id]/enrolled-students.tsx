import Link from "next/link";

import { Avatar, Card, Empty, SectionH, Table, Tag } from "@/components/ui/primitives";
import type { EnrolledStudent } from "@/lib/access-requests";

function day(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Who is actually on this course.
 *
 * Enrolment and access are two different rows and the difference matters here,
 * which is why the table draws both: `enrollments` is the learning
 * relationship and survives everything, while `entitlements` is permission to
 * open the lessons and can lapse or be revoked. Somebody who paid for four
 * months and stopped is still enrolled, still has their progress, and can no
 * longer play a clip — a list that showed only the enrolment would say they
 * were fine, and one that showed only live entitlements would lose them.
 *
 * Emails are an enrichment and are allowed to be missing. `users` is readable
 * by an admin (0010) and by an educator for the students on their own courses
 * (0022); anybody else's row simply does not come back, and a dash is the
 * honest thing to draw rather than a name invented to fill the column.
 */
export function EnrolledStudents({
  students,
  isAdmin,
}: {
  students: EnrolledStudent[];
  isAdmin: boolean;
}) {
  const live = students.filter((s) => s.isActive).length;

  return (
    <Card>
      <SectionH>
        Students
        <span
          style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}
        >
          {students.length === 0
            ? "nobody yet"
            : `${students.length} enrolled · ${live} with live access`}
        </span>
      </SectionH>

      {students.length === 0 ? (
        <Empty
          title="Nobody is on this course yet"
          hint="Students ask for access from the app, and the team lets them in from Access requests."
        />
      ) : (
        <Table
          cols={[
            ["Student", 2.4],
            ["Enrolled", 1.1],
            ["Access until", 1.1],
            ["Status", 1, "right"],
          ]}
          rows={students.map((s) => [
            <div
              key={`${s.id}-who`}
              style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}
            >
              <Avatar name={s.name} size={30} />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isAdmin ? (
                    <Link
                      href={`/admin/students/${s.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {s.name}
                    </Link>
                  ) : (
                    s.name
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {s.email ?? "—"}
                </div>
              </div>
            </div>,
            <span key={`${s.id}-on`} style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {day(s.enrolledAt)}
            </span>,
            <span key={`${s.id}-until`} style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {s.expiresAt ? day(s.expiresAt) : "No end date"}
            </span>,
            <div key={`${s.id}-state`} style={{ textAlign: "right" }}>
              <Tag tone={s.isActive ? "leaf" : "rose"}>
                {s.isActive ? "Active" : "Lapsed"}
              </Tag>
            </div>,
          ])}
        />
      )}
    </Card>
  );
}
