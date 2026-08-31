import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
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
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) {
    // Most often an RLS/claims misconfiguration rather than a real "no access".
    console.error("[auth] Supabase role lookup failed:", error.message);
    return { status: "no-role" };
  }

  if (!data || !isRole(data.role)) return { status: "no-role" };

  const user = await currentUser();
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

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
  return role === "admin" ? "/admin" : "/educator";
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
