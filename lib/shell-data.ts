import { cache } from "react";

import { countPendingAccessRequests } from "@/lib/access-requests";
import { countSupportUnread } from "@/lib/messages";
import { getNotificationInbox } from "@/lib/notifications";
import type { Role } from "@/lib/session";

/**
 * The two sidebar counts an admin sees beside Enrollment requests and Support.
 *
 * Read by app/(app)/layout.tsx, which is the point of splitting them from the
 * notifications below: a layout is not re-rendered on client navigation, so
 * these are paid on a full load and on `router.refresh()` (LiveRefresh calls
 * that whenever either table changes) — not on every click between screens.
 */
export const getNavBadges = cache(async (role: Role) => {
  if (role !== "admin") return { accessRequests: 0, supportUnread: 0 };

  const [accessRequests, supportUnread] = await Promise.all([
    countPendingAccessRequests(),
    countSupportUnread(),
  ]);
  return { accessRequests, supportUnread };
});

/**
 * The notification inbox the header bell draws. The header belongs to the
 * page, so unlike the badges this is read on every navigation.
 *
 * Request-scoped through `cache`, which is what `warmShell` relies on.
 */
export const getShellNotifications = cache(() => getNotificationInbox());

/**
 * Starts the notification read at the top of the request instead of the
 * bottom.
 *
 * WebShell is the value a page *returns*, so its awaits only began once the
 * page's own awaits had finished — the chrome's query ran last in a chain,
 * against a database where one round trip is a few hundred milliseconds.
 * Nothing here depends on what the page reads, so the waiting was pure
 * sequence. requireSession() and requireTeam() call this the moment the
 * session resolves, before the page asks for its own data.
 *
 * The `catch` is bookkeeping, not error handling: it marks the promise as
 * having a rejection handler so an early failure is not reported as an
 * unhandled rejection. `cache` hands WebShell that same promise, so a genuine
 * failure still surfaces there and still takes the page down.
 */
export function warmShell(): void {
  void getShellNotifications().catch(() => {});
}
