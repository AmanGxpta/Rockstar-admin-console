import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { Sidebar } from "./sidebar";
import type { Session } from "@/lib/session";

export function WebShell({
  session,
  title,
  sub,
  actions,
  children,
}: {
  session: Session;
  title: string;
  sub?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
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
      <Sidebar session={session} />

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

          <div
            className="rs-iconbtn"
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--r-sm)",
              background: "var(--dark-2)",
              border: "0.5px solid var(--border-mid)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <Icon name="bell" size={17} c="var(--text-secondary)" />
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 9,
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "var(--red)",
                border: "1.5px solid var(--dark-2)",
              }}
            />
          </div>

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
