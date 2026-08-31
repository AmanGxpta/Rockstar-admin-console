import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

import type { Database } from "@/types/database";

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
    accessToken: async () => (await auth()).getToken(),
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
