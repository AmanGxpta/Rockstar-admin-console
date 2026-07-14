import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/session";

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

  return <div style={{ height: "100%" }}>{children}</div>;
}
