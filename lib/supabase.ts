import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

import type { Database } from "@/types/database";

/**
 * The Clerk session token, fetched at most once per request.
 *
 * `accessToken` below is not called once per client — supabase-js calls it
 * before *every* request it sends. There are 67 `createSupabaseServerClient()`
 * call sites and a single screen commonly fires six or seven queries, so
 * without this the same token was minted six or seven times over, each one a
 * round trip to Clerk. Measured from here, a Clerk call is ~320ms against
 * ~40ms for Supabase, which made token-minting — not the data — the bulk of
 * what a page spent its time on.
 *
 * `cache` is React's request-scoped memo, so this is per request rather than
 * process-wide: two people's tokens never meet, and nothing is held between
 * requests. A token cannot meaningfully expire inside the second or so a
 * render lasts, which is the only window it is reused across.
 */
const sessionToken = cache(async () => (await auth()).getToken());

/**
 * Supabase client that authenticates as the current Clerk user.
 *
 * Supabase is configured with Clerk as a third-party auth provider, so it
 * validates Clerk's session token directly — no JWT template. Setting
 * `accessToken` disables the `supabase.auth` namespace by design; sessions are
 * Clerk's job. RLS policies key off `auth.jwt() ->> 'sub'`, which is the Clerk
 * user id.
 */
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return createClient<Database>(url, key, {
    accessToken: sessionToken,
  });
}

/**
 * Supabase client that bypasses RLS entirely.
 *
 * Only for work that has no user to act as: the Clerk webhook creates the
 * `users` row that every RLS policy resolves against, so it cannot itself be
 * subject to those policies. Never import this into a page or a client
 * component — the key it uses is a full-database credential.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
