/**
 * The notification switches, and how a stored value is read.
 *
 * Deliberately its own module with no imports: the settings form is a client
 * component and needs these, while `lib/profile.ts` reaches for Clerk's
 * server-only `auth()`. Keeping them together meant the browser bundle pulled
 * `server-only` in behind them and the build refused.
 */

export const NOTIFICATION_KEYS = [
  {
    key: "submission_filed",
    label: "New work to review",
    hint: "A student submits practical work on one of your courses.",
  },
  {
    key: "exam_passed",
    label: "Exam passed",
    hint: "A student passes the final exam and earns a certificate.",
  },
  {
    key: "course_state",
    label: "Course approved or rejected",
    hint: "An admin publishes one of your courses, or sends it back.",
  },
  {
    key: "student_message",
    label: "Student messages",
    hint: "A student writes to you directly.",
  },
] as const;

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number]["key"];

export type NotificationPrefs = Record<NotificationKey, boolean>;

/**
 * Absent means on. A switch nobody has touched should behave the way somebody
 * expects on their first day, and reading a missing key as `false` would mean
 * an educator silently stops hearing about work waiting on them.
 */
export function readPrefs(raw: unknown): NotificationPrefs {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    NOTIFICATION_KEYS.map(({ key }) => [key, obj[key] !== false]),
  ) as NotificationPrefs;
}
