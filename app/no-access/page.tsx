import { redirect } from "next/navigation";
import { RSLogo } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { getAuthState, homeFor } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

/**
 * A valid Clerk user with no row in the Supabase `users` table lands here.
 * Roles are provisioned out of band, so there is nothing to self-serve — the
 * only action is to sign out.
 */
export default async function NoAccessPage() {
  const state = await getAuthState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "ok") redirect(homeFor(state.session.role));

  return (
    <div
      className="rs"
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: 40,
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <RSLogo size={22} />
        </div>

        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: 18,
            background: "var(--gold-tint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
          }}
        >
          <Icon name="lock" size={26} c="var(--gold)" />
        </div>

        <h1
          className="rs-display"
          style={{ margin: 0, fontSize: 26, fontWeight: 800 }}
        >
          Your account isn’t set up yet
        </h1>

        <p
          style={{
            margin: "12px 0 28px",
            color: "var(--ink-2)",
            fontSize: 14.5,
            lineHeight: 1.6,
          }}
        >
          You’re signed in, but this account hasn’t been given an educator or
          admin role yet. Ask your Rockstar administrator to set one up, then
          sign in again.
        </p>

        <SignOutButton />
      </div>
    </div>
  );
}
