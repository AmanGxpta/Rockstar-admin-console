"use client";

import { useClerk } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";

export function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectUrl: "/login" })}
      style={{
        height: 46,
        padding: "0 20px",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        background: "var(--clay)",
        color: "#fff",
        fontFamily: "var(--ui)",
        fontWeight: 700,
        fontSize: 14.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        boxShadow: "0 8px 20px rgba(199,92,60,.28)",
      }}
    >
      <Icon name="logout" size={17} c="#fff" />
      Sign out
    </button>
  );
}
