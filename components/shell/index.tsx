import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getShellNotifications } from "@/lib/shell-data";
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
  // The sidebar and the frame around this column are app/(app)/layout.tsx's,
  // which persists across navigations. The header belongs to the page — its
  // title, back link and actions differ per screen — and so does its bell.
  const notifications = await getShellNotifications();

  return (
    <>
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
    </>
  );
}
