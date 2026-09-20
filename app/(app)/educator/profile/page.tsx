import { WebShell } from "@/components/shell";
import { Avatar, Badge, Card, Empty } from "@/components/ui/primitives";
import { getEducatorAccount } from "@/lib/profile";
import { requireSession } from "@/lib/session";

import { ProfileForm } from "./profile-form";

export default async function EducatorProfile() {
  const session = await requireSession("educator");
  const account = await getEducatorAccount();

  return (
    <WebShell
      session={session}
      title="Profile"
      sub="How you appear to students"
    >
      {!account ? (
        <Empty
          title="Your account could not be loaded"
          hint="Your Clerk sign-in is valid but the matching row is missing. An administrator can put that right."
        />
      ) : (
        <div style={{ maxWidth: 640 }}>
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={account.fullName || session.name} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 17,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {account.fullName || session.name}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {account.email}
                </div>
              </div>
              {/*
                Read-only on purpose. Verification is a claim the institute
                makes about an educator, and 0017 raises if this row tries to
                set it — showing it as a control would be offering something
                the database refuses.
              */}
              <Badge tone={account.isVerified ? "complete" : "neutral"} dot={false}>
                {account.isVerified ? "Verified" : "Not verified"}
              </Badge>
            </div>
          </Card>

          {account.profileId === null && (
            <div
              style={{
                marginBottom: 24,
                padding: "14px 16px",
                borderRadius: "var(--r-sm)",
                border: "0.5px solid var(--border)",
                background: "var(--red-faint)",
                color: "var(--text-secondary)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              You have no educator profile row, so the public fields below
              cannot be saved and your name will not appear on your courses. An
              administrator needs to create one.
            </div>
          )}

          <ProfileForm account={account} />
        </div>
      )}
    </WebShell>
  );
}
