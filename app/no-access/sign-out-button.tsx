"use client";

import { useClerk } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";

export function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/login" })}
      className="rs-word rs-btn-primary"
      style={{
        height: 48,
        padding: "0 26px",
        borderRadius: "var(--r-sm)",
        border: "none",
        cursor: "pointer",
        background: "var(--red)",
        color: "var(--cream)",
        fontWeight: 200,
        fontSize: 11,
        letterSpacing: "0.16em",
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        transition: "background 0.18s",
      }}
    >
      <Icon name="logout" size={15} c="var(--cream)" />
      Sign out
    </button>
  );
}
