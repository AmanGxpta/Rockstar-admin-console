import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * Authoritative session check for every signed-in screen. proxy.ts only does
 * the optimistic cookie-presence check.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <div style={{ height: "100%" }}>{children}</div>;
}
