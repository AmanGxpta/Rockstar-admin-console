"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { RSLogo, Avatar } from "@/components/ui/primitives";
import { navFor, type NavItem } from "@/lib/nav";
import type { Session } from "@/lib/session";

function itemStyle(active: boolean, inert: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "9px 10px",
    borderRadius: "var(--r-sm)",
    marginBottom: 2,
    cursor: inert ? "default" : "pointer",
    textDecoration: "none",
    background: active ? "var(--red-faint)" : "transparent",
    color: active ? "var(--text-primary)" : "var(--text-secondary)",
    fontSize: 13.5,
    opacity: inert ? 0.5 : 1,
  } as const;
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const inert = item.href === null;
  const content = (
    <>
      <Icon
        name={item.icon}
        size={17}
        c={active ? "var(--red)" : "var(--text-muted)"}
        sw={active ? 2 : 1.8}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          className="rs-word"
          style={{
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 99,
            background: active ? "var(--red)" : "var(--dark-4)",
            color: active ? "var(--cream)" : "var(--text-secondary)",
            fontSize: 10,
            fontWeight: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  if (inert) {
    return (
      <div style={itemStyle(active, true)} title="Not built yet">
        {content}
      </div>
    );
  }
  return (
    <Link
      href={item.href!}
      className="rs-navitem"
      style={itemStyle(active, false)}
    >
      {content}
    </Link>
  );
}

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const groups = navFor(session.role);

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--dark)",
        borderRight: "0.5px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 14px",
      }}
    >
      <div style={{ padding: "2px 8px 24px" }}>
        <RSLogo size={24} />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }} className="rs-noscroll">
        {groups.map((group) => (
          <div key={group.heading} style={{ marginBottom: 20 }}>
            <div
              className="rs-eyebrow"
              style={{ padding: "0 8px", marginBottom: 10 }}
            >
              {group.heading}
            </div>
            {group.items.map((item) => (
              <NavRow
                key={item.label}
                item={item}
                active={item.href === pathname}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          borderTop: "0.5px solid var(--border)",
          marginTop: 8,
          paddingTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 8px",
            borderRadius: "var(--r-sm)",
          }}
        >
          <Avatar name={session.name} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.name}
            </div>
            <div
              className="rs-word"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
              }}
            >
              {session.role}
            </div>
          </div>
          <Icon name="gear" size={16} c="var(--text-muted)" />
        </div>
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/login" })}
          className="rs-navitem"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            width: "100%",
            padding: "9px 10px",
            marginTop: 2,
            cursor: "pointer",
            borderRadius: "var(--r-sm)",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            fontSize: 13.5,
          }}
        >
          <Icon name="logout" size={17} c="var(--text-muted)" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
