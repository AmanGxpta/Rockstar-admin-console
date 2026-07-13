import type { IconName } from "@/components/ui/icon";
import type { Role } from "./session";

export type NavItem = {
  label: string;
  icon: IconName;
  /** null until the screen exists — rendered inert rather than as a dead link. */
  href: string | null;
  badge?: number;
};

export type NavGroup = {
  heading: string;
  roles: Role[];
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    heading: "Educator",
    roles: ["educator"],
    items: [
      { label: "Dashboard", icon: "grid", href: "/educator" },
      { label: "Courses", icon: "book", href: null },
      { label: "Submissions", icon: "image", href: null, badge: 3 },
      { label: "Messages", icon: "message", href: null, badge: 5 },
    ],
  },
  {
    heading: "Admin",
    roles: ["admin"],
    items: [
      { label: "Analytics", icon: "chart", href: "/admin" },
      { label: "Course catalog", icon: "layers", href: null },
      { label: "Educators", icon: "users", href: null },
      { label: "Students", icon: "user", href: null },
      { label: "Certifications", icon: "award", href: null },
      { label: "Revenue", icon: "card", href: null },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.filter((g) => g.roles.includes(role));
}
