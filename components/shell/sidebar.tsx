"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { RSLogo, Avatar } from "@/components/ui/primitives";
import { navFor, type NavItem } from "@/lib/nav";
import { signOut } from "@/lib/auth-actions";
import type { Session } from "@/lib/session";

function itemStyle(active: boolean, inert: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "9px 10px",
    borderRadius: 11,
    marginBottom: 2,
    cursor: inert ? "default" : "pointer",
    textDecoration: "none",
    background: active ? "var(--clay-tint)" : "transparent",
    color: active ? "var(--clay-deep)" : "var(--ink-2)",
    fontWeight: active ? 700 : 600,
    fontSize: 14,
    opacity: inert ? 0.55 : 1,
  } as const;
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const inert = item.href === null;
  const content = (
    <>
      <Icon
        name={item.icon}
        size={18}
        c={active ? "var(--clay)" : "var(--ink-3)"}
        sw={active ? 2 : 1.8}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <span
          style={{
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            borderRadius: 99,
            background: active ? "var(--clay)" : "var(--line-2)",
            color: active ? "#fff" : "var(--ink-2)",
            fontSize: 11,
            fontWeight: 800,
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
  const groups = navFor(session.role);

  return (
    <div
      style={{
        width: 248,
        flexShrink: 0,
        background: "var(--paper)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        padding: "22px 16px",
      }}
    >
      <div style={{ padding: "0 8px 22px" }}>
        <RSLogo size={21} />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }} className="rs-noscroll">
        {groups.map((group) => (
          <div key={group.heading} style={{ marginBottom: 20 }}>
            <div
              className="rs-eyebrow"
              style={{ padding: "0 8px", marginBottom: 8 }}
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
          borderTop: "1px solid var(--line)",
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
            borderRadius: 11,
          }}
        >
          <Avatar name={session.name} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{session.name}</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                textTransform: "capitalize",
              }}
            >
              {session.role}
            </div>
          </div>
          <Icon name="gear" size={17} c="var(--ink-3)" />
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rs-navitem"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              width: "100%",
              padding: "9px 10px",
              marginTop: 2,
              cursor: "pointer",
              borderRadius: 11,
              border: "none",
              background: "transparent",
              color: "var(--ink-2)",
              fontFamily: "var(--ui)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <Icon name="logout" size={18} c="var(--ink-3)" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </div>
  );
}
