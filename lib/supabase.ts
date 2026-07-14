import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

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

  return createClient(url, key, {
    accessToken: async () => (await auth()).getToken(),
  });
}
