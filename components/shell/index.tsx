import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import type { NavBadges } from "@/lib/nav";
import { getShellData } from "@/lib/shell-data";
import { Sidebar } from "./sidebar";
import { NotificationPanel } from "./notification-panel";
import type { Session } from "@/lib/session";

export async function WebShell({
  session,
  title,
  sub,
  actions,
  back,
  children,
}: {
  session: Session;
  title: string;
  sub?: string;
  actions?: ReactNode;
  /** Href for the header back control. Omitted on top-level screens. */
  back?: string;
  children: ReactNode;
}) {
  /*
    The two sidebar counts are admin-only, and asked for here rather than
    baked into lib/nav.ts, which used to carry `badge: 3` beside Submissions
    as a literal. A hardcoded number beside a real queue is wrong from the
    first day; an educator has no queue to count, so they pay for neither read.
  */
  const { notifications, accessRequests, supportUnread } = await getShellData(
    session.role,
  );

  const badges: NavBadges = { accessRequests, supportUnread };

  return (
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
        other end, so they move on their own. Mounted in the shell rather than
        on the queue screen: a request that arrives while an admin is reading a
        course should light the badge up where they are, not only where they
        would have seen it anyway.
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
        <header
          style={{
            height: 68,
            flexShrink: 0,
            borderBottom: "0.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 18,
          }}
        >
          {back && (
            <Link
              href={back}
              aria-label="Back"
              className="rs-iconbtn"
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--r-sm)",
                flexShrink: 0,
                background: "var(--dark)",
                boxShadow: "inset 0 0 0 1px var(--border-mid)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="arrowL" size={19} c="var(--text-secondary)" />
            </Link>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="rs-head"
              style={{ fontSize: 20, margin: 0 }}
            >
              {title}
            </h1>
            {sub && (
              <div
                style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}
              >
                {sub}
              </div>
            )}
          </div>

          <div
            style={{
              width: 220,
              height: 38,
              borderRadius: "var(--r-sm)",
              background: "var(--dark-2)",
              border: "0.5px solid var(--border-mid)",
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "0 13px",
            }}
          >
            <Icon name="search" size={15} c="var(--text-muted)" />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Search…
            </span>
          </div>

          <NotificationPanel
            messages={notifications.items}
            initialUnread={notifications.unread}
            role={session.role}
          />

          {actions}
        </header>

        <div
          style={{ flex: 1, overflowY: "auto", padding: "28px" }}
          className="rs-noscroll"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
