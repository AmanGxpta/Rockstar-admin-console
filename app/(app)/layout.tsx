import { redirect } from "next/navigation";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { NavDrawerProvider } from "@/components/shell/nav-drawer";
import { Sidebar } from "@/components/shell/sidebar";
import { getAuthState } from "@/lib/session";
import { getNavBadges } from "@/lib/shell-data";

/**
 * Authoritative check for every signed-in screen. proxy.ts only verifies that a
 * Clerk session exists; the role comes from Supabase and is checked here.
 *
 * It also draws the chrome that does not change between screens — the sidebar
 * and the realtime subscription behind its counts. Both used to live in
 * WebShell, inside each page, so every click rebuilt them and re-joined the
 * realtime channels. A layout is kept across client navigations, so they are
 * now built once; loading.tsx beside this file fills the content column while
 * the next page renders, which is what makes a click answer straight away.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "no-role") redirect("/no-access");

  const { session } = state;
  const badges = await getNavBadges(session.role);

  return (
    <NavDrawerProvider>
      <div
        className="rs"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "var(--dark)",
          overflow: "hidden",
        }}
      >
        {/*
          The two numbers in the sidebar are things somebody is waiting on at the
          other end, so they move on their own. Mounted here rather than on the
          queue screen: a request that arrives while an admin is reading a course
          should light the badge up where they are, not only where they would
          have seen it anyway.
        */}
        {session.role === "admin" && (
          <LiveRefresh tables={["course_access_requests", "messages"]} />
        )}

        <Sidebar session={session} badges={badges} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            background: "var(--dark)",
          }}
        >
          {children}
        </div>
      </div>
    </NavDrawerProvider>
  );
}
