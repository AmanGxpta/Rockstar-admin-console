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
        background: "var(--surface)",
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
          background: "var(--paper)",
        }}
      >
        <header
          style={{
            height: 70,
            flexShrink: 0,
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 18,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="rs-display"
              style={{ fontSize: 21, margin: 0, letterSpacing: "-.02em" }}
            >
              {title}
            </h1>
            {sub && (
              <div
                style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}
              >
                {sub}
              </div>
            )}
          </div>

          <div
            style={{
              width: 240,
              height: 40,
              borderRadius: 11,
              background: "var(--paper)",
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "0 14px",
              boxShadow: "inset 0 0 0 1px var(--line-2)",
            }}
          >
            <Icon name="search" size={17} c="var(--ink-3)" />
            <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>
              Search…
            </span>
          </div>

          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "var(--paper)",
              boxShadow: "inset 0 0 0 1px var(--line-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Icon name="bell" size={19} c="var(--ink-2)" />
            <div
              style={{
                position: "absolute",
                top: 9,
                right: 10,
                width: 7,
                height: 7,
                borderRadius: 99,
                background: "var(--clay)",
                border: "1.5px solid var(--paper)",
              }}
            />
          </div>

          {actions}
        </header>

        <div
          style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}
          className="rs-noscroll"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
