import { cache } from "react";

import { countPendingAccessRequests } from "@/lib/access-requests";
import { countSupportUnread } from "@/lib/messages";
import { getNotificationInbox } from "@/lib/notifications";
import type { Role } from "@/lib/session";

/**
 * The three reads the chrome needs: the notification inbox, and the two
 * sidebar counts an admin sees beside Access requests and Support.
 *
 * Request-scoped through `cache`, which is the whole point — see `warmShell`.
 */
export const getShellData = cache(async (role: Role) => {
  const [notifications, accessRequests, supportUnread] = await Promise.all([
    getNotificationInbox(),
    role === "admin" ? countPendingAccessRequests() : Promise.resolve(0),
    role === "admin" ? countSupportUnread() : Promise.resolve(0),
  ]);

  return { notifications, accessRequests, supportUnread };
});

/**
 * Starts those reads at the top of the request instead of at the bottom.
 *
 * WebShell is the value a page *returns*, so its awaits only began once the
 * page's own awaits had finished. Measured on the built app, that put the
 * chrome's queries last in a chain: ~408ms resolving the session, ~352ms for
 * the page's data, then ~602ms for these — 1.36s of a 1.7s response, almost
 * all of it waiting on a database in ap-southeast-2 where a single round trip
 * costs ~370ms. Nothing here depends on anything the page reads, so the
 * waiting was pure sequence.
 *
 * The layout calls this without awaiting it. By the time WebShell asks, the
 * same promise is already in flight or settled, and the chain is one level
 * shorter for every screen in the console.
 *
 * The `catch` is bookkeeping, not error handling: it marks the promise as
 * having a rejection handler so an early failure is not reported as an
 * unhandled rejection. `cache` hands WebShell that same promise, so a genuine
 * failure still surfaces there and still takes the page down, exactly as it
 * did when the call was made from inside the shell.
 */
export function warmShell(role: Role): void {
  void getShellData(role).catch(() => {});
}
