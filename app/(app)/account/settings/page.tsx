import { WebShell } from "@/components/shell";
import { Empty } from "@/components/ui/primitives";
import { getEducatorAccount } from "@/lib/profile";
import { requireTeam } from "@/lib/session";

import { SettingsForm } from "./settings-form";

export default async function EducatorSettings() {
  const session = await requireTeam();
  const account = await getEducatorAccount();

  return (
    <WebShell session={session} title="Settings" sub="Your account">
      {!account ? (
        <Empty
          title="Your account could not be loaded"
          hint="Your Clerk sign-in is valid but the matching row is missing. An administrator can put that right."
        />
      ) : (
        <SettingsForm email={account.email} prefs={account.prefs} />
      )}
    </WebShell>
  );
}
