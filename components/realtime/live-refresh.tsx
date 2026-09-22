"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { useSupabaseBrowserClient } from "@/lib/supabase-browser";

/**
 * Keeps the console current without anybody pressing refresh.
 *
 * Subscribes to Postgres changes on the named tables and calls
 * `router.refresh()` when one arrives. That re-runs the server components for
 * whatever route is open *and* the shell around it, which is the whole point:
 * a request that lands while an admin is reading a course lights up the
 * sidebar badge there, rather than only on the queue screen.
 *
 * Re-rendering the route rather than patching a list in place is deliberate.
 * The payload of a change event is one row with no joins on it — no student
 * name, no course title, no cover — so a client-side merge would have to fetch
 * the rest anyway, and would then hold a second copy of the queue that can
 * disagree with the server's. Asking the server to say it again is one round
 * trip and cannot drift.
 *
 * Authorisation is the table's own RLS, applied per subscriber by Realtime.
 * An educator who somehow mounted this would receive their own rows and
 * nothing else, for the same reason their queue read comes back scoped — there
 * is no second rule here to keep in step with the first.
 *
 * ## The two things to know before reusing this
 *
 * **Every table named here must be on the `supabase_realtime` publication.**
 * A table that is not simply never fires, silently. `course_access_requests`
 * is added by 0034 and `messages` by 0027.
 *
 * **Postgres Changes re-evaluates RLS per connected client per change**, which
 * is why Supabase files it under low connection counts and points at Broadcast
 * for anything busier. Fine for a console a handful of staff have open; worth
 * revisiting before this is a room of a hundred.
 */
export function LiveRefresh({
  tables,
  /** Coalesces a burst — an approval writes three tables in one transaction. */
  quietMs = 300,
}: {
  tables: readonly string[];
  quietMs?: number;
}) {
  const supabase = useSupabaseBrowserClient();
  const router = useRouter();

  // Joined rather than passed as an array so a new literal on every render of
  // the parent does not tear the subscription down and build it again.
  const key = tables.join(",");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channels: RealtimeChannel[] = [];

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!cancelled) router.refresh();
      }, quietMs);
    };

    for (const table of key.split(",")) {
      channels.push(
        supabase
          .channel(`console:${table}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            refresh,
          )
          .subscribe(),
      );
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      // Removed rather than left to garbage collection: the socket outlives
      // the component, and a channel still joined under the previous Clerk
      // token would keep delivering to a page that has gone.
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [supabase, key, quietMs, router]);

  return null;
}
