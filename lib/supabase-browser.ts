"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type BrowserSupabaseClient = SupabaseClient<Database>;

/**
 * Supabase client that authenticates as the signed-in team member, in the
 * browser.
 *
 * Two things need one: uploads, because a Server Action body is capped at 1 MB
 * by default and every clip in `course-media` exceeds that, and Realtime,
 * because a websocket cannot be held open by a server component. Both only
 * ever hold the publishable key and Clerk's own session token — the policies
 * are what make that safe, not the secrecy of the key.
 *
 * Realtime's half of the token is handled by the library rather than here. In
 * `@supabase/realtime-js` 2.110.x the `accessToken` callback below is wired
 * into the socket as well as into PostgREST: `RealtimeClient` calls it on
 * socket open, and again on every heartbeat, pushing a refreshed Clerk token
 * to each joined channel. So there is no `setAuth()` to call by hand, and
 * calling one would be a second source of truth for a token that has one.
 *
 * What the library does *not* cover is the cold start: `useSession()` returns
 * undefined on the first render, and a channel that joins in that window joins
 * with a null token, sees no caller under RLS, and receives nothing until the
 * next heartbeat repairs it. The memo below is keyed on the session, so the
 * client identity changes when it arrives and any effect depending on it
 * re-subscribes. Subscribers should depend on the client, not just mount once.
 */
export function useSupabaseBrowserClient(): BrowserSupabaseClient {
  const { session } = useSession();

  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }
    return createClient<Database>(url, key, {
      accessToken: async () => (await session?.getToken()) ?? null,
    });
  }, [session]);
}
