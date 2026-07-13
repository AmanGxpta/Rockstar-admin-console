import { cookies } from "next/headers";

export type Role = "admin" | "educator";

export type Session = {
  email: string;
  name: string;
  title: string;
  role: Role;
};

export const SESSION_COOKIE = "rs_session";

/**
 * Demo directory. There is no auth backend yet, so sign-in matches an email
 * here and accepts any non-empty password. Swap this out for a real identity
 * provider before anything ships.
 */
const DEMO_USERS: Session[] = [
  {
    email: "rae@maisonatelier.co",
    name: "Rae Mills",
    title: "Master Colorist · Maison Atelier",
    role: "educator",
  },
  {
    email: "admin@rockstar.co",
    name: "Avery Stone",
    title: "Platform Admin",
    role: "admin",
  },
];

export function findDemoUser(email: string): Session | undefined {
  const needle = email.trim().toLowerCase();
  return DEMO_USERS.find((u) => u.email === needle);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    return findDemoUser(parsed.email) ?? null;
  } catch {
    return null;
  }
}

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/educator";
}
