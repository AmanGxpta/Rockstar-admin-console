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
        background: "var(--dark)",
        padding: 40,
      }}
    >
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          <RSLogo width={180} />
        </div>

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "var(--r-card)",
            background: "var(--dark-2)",
            border: "0.5px solid var(--border-mid)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <Icon name="lock" size={24} c="var(--red-on)" />
        </div>

        <h1 className="rs-head" style={{ margin: 0, fontSize: 26 }}>
          Your account isn’t set up yet
        </h1>

        <p
          style={{
            margin: "14px 0 30px",
            color: "var(--text-secondary)",
            fontSize: 14.5,
            lineHeight: 1.65,
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
