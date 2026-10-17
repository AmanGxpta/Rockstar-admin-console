"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { RSLogo, Avatar } from "@/components/ui/primitives";
import { navFor, type NavBadges, type NavItem } from "@/lib/nav";
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

function NavRow({
  item,
  active,
  badge,
}: {
  item: NavItem;
  active: boolean;
  badge?: number;
}) {
  const inert = item.href === null;
  const content = (
    <>
      <Icon
        name={item.icon}
        size={17}
        c={active ? "var(--red-on)" : "var(--text-muted)"}
        sw={active ? 2 : 1.8}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge ? (
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
          {badge}
        </span>
      ) : null}
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

export function Sidebar({
  session,
  badges,
}: {
  session: Session;
  badges: NavBadges;
}) {
  const pathname = usePathname();
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
        <RSLogo width={150} />
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
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              />
            ))}
          </div>
        ))}
      </div>

      <AccountRow session={session} />
    </div>
  );
}

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "9px 10px",
  borderRadius: 9,
  border: "none",
  background: "none",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "var(--font-body)",
  fontSize: 13.5,
  color: "var(--text-primary)",
} as const;

/**
 * Signing out lives behind the gear rather than as a row of its own: it is the
 * one nav item you never mean to hit, and it sat one pixel-slip below Messages.
 */
function AccountRow({ session }: { session: Session }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        borderTop: "0.5px solid var(--border)",
        marginTop: 8,
        paddingTop: 8,
      }}
    >
      {menu && (
        <>
          <div
            onClick={() => setMenu(false)}
            style={{ position: "fixed", inset: 0, zIndex: 20 }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "calc(100% - 4px)",
              zIndex: 21,
              background: "var(--dark-2)",
              borderRadius: 12,
              boxShadow: "var(--sh-3)",
              padding: 6,
            }}
          >
            {/*
              Profile and Settings used to be the educator's alone, because
              /educator/profile was an educator route. They are /account/* now
              and both roles get them: an admin who uploads a course is
              attributed on it exactly as an educator is, so they need somewhere
              to say who they are.
            */}
            {(
              [
                ["Profile", "user", () => router.push("/account/profile")],
                ["Settings", "gear", () => router.push("/account/settings")],
                ["Sign out", "logout", () => signOut({ redirectUrl: "/login" })],
              ] as const
            ).map(([label, icon, run]) => (
              <button
                type="button"
                key={label}
                onClick={() => {
                  setMenu(false);
                  run();
                }}
                className="rs-navitem"
                style={menuItemStyle}
              >
                <Icon name={icon} size={16} c="var(--text-muted)" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}

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
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Account menu"
          aria-expanded={menu}
          className="rs-navitem"
          style={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: 9,
            border: "0.5px solid var(--border)",
            background: menu ? "var(--dark-4)" : "transparent",
            cursor: "pointer",
          }}
        >
          <Icon
            name="gear"
            size={16}
            c={menu ? "var(--text-primary)" : "var(--text-muted)"}
          />
        </button>
      </div>
    </div>
  );
}
