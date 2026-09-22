import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "./supabase";

export type Role = "admin" | "educator";

export type Session = {
  clerkUserId: string;
  name: string;
  email: string;
  role: Role;
};

/**
 * "signed-out" and "no-role" are deliberately distinct: the first means no
 * Clerk session (→ /login), the second means a valid Clerk user with no row in
 * the Supabase `users` table (→ /no-access). Roles are provisioned out of band;
 * a missing row never grants access.
 */
export type AuthState =
  | { status: "signed-out" }
  | { status: "no-role" }
  | { status: "ok"; session: Session };

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "educator";
}

/**
 * Cached per request — the layout and the page it wraps both call this, and
 * without `cache` that would be two Supabase round-trips per navigation.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const { userId } = await auth();
  if (!userId) return { status: "signed-out" };

  const supabase = createSupabaseServerClient();

  // Name and email come out of this same row rather than from Clerk.
  //
  // This used to be a `currentUser()` call alongside the role lookup, and it
  // was the most expensive thing on the console: measured on the built app,
  // `getAuthState` took ~408ms of a 1699ms page, essentially all of it that
  // one call to Clerk's Backend API. Every screen pays it, because the layout
  // awaits this before the page renders. `public.users` already carries
  // `full_name` and `email` — the Clerk webhook writes them and the mobile
  // app reads them as the truth — so asking for two more columns on a query
  // already in flight costs nothing and removes a network hop entirely.
  //
  // The tradeoff is that a name changed in Clerk shows here only once the
  // webhook has written it through, rather than on the next page load. That
  // is the same freshness every other screen in this console already has.
  const { data, error } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) {
    // Most often an RLS/claims misconfiguration rather than a real "no access".
    console.error("[auth] Supabase role lookup failed:", error.message);
    return { status: "no-role" };
  }

  if (!data || !isRole(data.role)) return { status: "no-role" };

  const name = data.full_name?.trim() ?? "";
  const email = data.email ?? "";

  return {
    status: "ok",
    session: {
      clerkUserId: userId,
      name: name || email || "Account",
      email,
      role: data.role,
    },
  };
});

export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/courses";
}

/**
 * Every screen under a role-scoped route starts with this: bounce signed-out
 * users to /login (handled by the (app) layout already, but pages are also
 * reachable directly) and bounce the wrong role to their own home.
 */
export async function requireSession(role: Role): Promise<Session> {
  const state = await getAuthState();
  if (state.status !== "ok") redirect("/");
  if (state.session.role !== role) redirect(homeFor(state.session.role));
  return state.session;
}

/**
 * The guard for everything either role does.
 *
 * Authoring used to live behind requireSession("educator") because authoring
 * was the educator's half of the console. It is now the team's: an admin
 * uploads courses, and the two sidebars have collapsed into one set of routes.
 * Every policy underneath already reads that way — can_author_course() has
 * returned true for an admin since 0003 — so this is the readable half of a
 * rule the database was already enforcing, not a new permission.
 *
 * It is still a real gate. A student who signs in here has a `users` row and
 * so passes the (app) layout's check; without this they would reach the course
 * editor and be refused one write at a time by RLS instead of at the door.
 */
export async function requireTeam(): Promise<Session> {
  const state = await getAuthState();
  if (state.status !== "ok") redirect("/");
  return state.session;
}
