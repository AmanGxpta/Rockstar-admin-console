import { auth } from "@clerk/nextjs/server";

import { readPrefs, type NotificationPrefs } from "./notification-prefs";
import { createSupabaseServerClient } from "./supabase";

export { NOTIFICATION_KEYS, readPrefs } from "./notification-prefs";
export type { NotificationKey, NotificationPrefs } from "./notification-prefs";

/**
 * The two rows behind an educator's own account screens.
 *
 * `users` carries the private half — email, phone, the notification switches —
 * and `educator_profiles` the public half students actually see on a course
 * card. They are split that way because `users` is readable only by its owner
 * and by admins (0000), and has to stay that way: see 0013, which moved the
 * educator's display name onto the profile row precisely so the catalog could
 * name them without a student reading this table.
 */

export type EducatorAccount = {
  userId: string;
  profileId: string | null;
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  avatarUrl: string | null;
  headline: string;
  specialization: string;
  yearsExperience: number | null;
  isVerified: boolean;
  prefs: NotificationPrefs;
};

/**
 * Two queries rather than one embedded select. PostgREST would resolve
 * `users -> educator_profiles` in a single round trip, but an educator whose
 * profile row is missing is a real state — 0013's webhook creates it only for
 * a Clerk user whose role is `educator` — and an `!inner` join would return
 * nothing at all for them rather than letting the screen say what is wrong.
 */
export async function getEducatorAccount(): Promise<EducatorAccount | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const supabase = createSupabaseServerClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, full_name, email, phone, bio, avatar_url, notification_prefs")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (error || !user) {
    if (error) console.error("[profile] user lookup failed:", error.message);
    return null;
  }

  const { data: profile } = await supabase
    .from("educator_profiles")
    .select("id, headline, specialization, years_experience, is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    profileId: profile?.id ?? null,
    fullName: user.full_name ?? "",
    email: user.email,
    phone: user.phone ?? "",
    bio: user.bio ?? "",
    avatarUrl: user.avatar_url,
    headline: profile?.headline ?? "",
    specialization: profile?.specialization ?? "",
    yearsExperience: profile?.years_experience ?? null,
    isVerified: profile?.is_verified ?? false,
    prefs: readPrefs(user.notification_prefs),
  };
}
