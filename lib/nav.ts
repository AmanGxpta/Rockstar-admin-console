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
      { label: "Courses", icon: "book", href: "/educator/courses" },
      { label: "Submissions", icon: "image", href: "/educator/submissions", badge: 3 },
      { label: "Messages", icon: "message", href: "/educator/messages", badge: 4 },
    ],
  },
  {
    heading: "Admin",
    roles: ["admin"],
    items: [
      { label: "Analytics", icon: "chart", href: "/admin" },
      { label: "Course catalog", icon: "layers", href: "/admin/courses" },
      { label: "Educators", icon: "users", href: "/admin/educators" },
      { label: "Students", icon: "user", href: "/admin/students" },
      { label: "Certifications", icon: "award", href: "/admin/certifications" },
      { label: "Revenue", icon: "card", href: "/admin/revenue" },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.filter((g) => g.roles.includes(role));
}
