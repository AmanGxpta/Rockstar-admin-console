import type { IconName } from "@/components/ui/icon";
import type { Role } from "./session";

export type NavItem = {
  label: string;
  icon: IconName;
  /** null until the screen exists — rendered inert rather than as a dead link. */
  href: string | null;
  /**
   * A count the sidebar draws beside the label. Server-supplied, per render —
   * never a literal in this file. A hardcoded badge beside a real queue is a
   * number that is wrong from the first day.
   */
  badgeKey?: BadgeKey;
};

export type NavGroup = {
  heading: string;
  roles: Role[];
  items: NavItem[];
};

/** What the shell counts before it draws the sidebar. */
export type BadgeKey = "accessRequests" | "supportUnread";
export type NavBadges = Partial<Record<BadgeKey, number>>;

/**
 * One panel, two ranges of it.
 *
 * The educator/admin split used to run through the whole navigation: two
 * headings, two sets of routes, and course authoring living entirely on the
 * educator side. It does not any more. The team uploads the courses, so the
 * authoring screens are role-neutral paths (`/courses`, `/upload/course`) that
 * both roles reach, and what is left under "Team" is the part an educator
 * genuinely has no business in — who the students are, who is waiting to be
 * let in, and the numbers across the whole platform.
 *
 * There is no Educators screen. It was a directory of the people who author
 * courses, which was worth having while authoring was somebody else's job;
 * now that every admin who uploads gets an `educator_profiles` row of their
 * own, it would have listed the team back to itself.
 *
 * Certifications and Revenue are gone. Certificates are issued by submit_exam()
 * with nobody to approve them, and no payment has ever been taken, so both were
 * screens reporting on something that does not happen yet.
 *
 * Messages is admin-only because there is now one handle to answer: 0035 made
 * every student's thread a support thread with the whole team on the other side
 * of it, rather than a private line to one educator.
 */
export const NAV: NavGroup[] = [
  {
    heading: "Courses",
    roles: ["admin", "educator"],
    items: [
      { label: "Courses", icon: "book", href: "/courses" },
      { label: "Upload a course", icon: "plus", href: "/upload/course" },
      { label: "Submissions", icon: "image", href: "/submissions" },
    ],
  },
  {
    heading: "Team",
    roles: ["admin"],
    items: [
      {
        label: "Access requests",
        icon: "lock",
        href: "/admin/requests",
        badgeKey: "accessRequests",
      },
      {
        label: "Rockstar Support",
        icon: "message",
        href: "/messages",
        badgeKey: "supportUnread",
      },
      { label: "Analytics", icon: "chart", href: "/admin" },
      { label: "Students", icon: "users", href: "/admin/students" },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.filter((g) => g.roles.includes(role));
}
