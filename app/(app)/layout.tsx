import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/session";
import { warmShell } from "@/lib/shell-data";

/**
 * Authoritative check for every signed-in screen. proxy.ts only verifies that a
 * Clerk session exists; the role comes from Supabase and is checked here.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "no-role") redirect("/no-access");

  // Kicked off here, awaited in WebShell at the bottom of the tree. See
  // lib/shell-data.ts — this is what stops the chrome's three queries from
  // queueing up behind the page's.
  warmShell(state.session.role);

  return <div style={{ height: "100%" }}>{children}</div>;
}
