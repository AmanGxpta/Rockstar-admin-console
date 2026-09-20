"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import {
  NOTIFICATION_KEYS,
  readPrefs,
  type NotificationPrefs,
} from "./notification-prefs";
import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";

export type ActionResult = { error: string } | { ok: true };

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/**
 * Saving an educator's own profile.
 *
 * Split across two tables because the columns are, and in this order for a
 * reason: `users.full_name` is mirrored onto `educator_profiles.display_name`
 * by 0013's trigger, so the name has to land on `users` and be carried across
 * rather than written to the profile row directly. 0017 makes that explicit —
 * writing display_name here raises rather than being silently reverted the
 * next time the mirror fires.
 *
 * Neither client is the service role: this runs as the Clerk user, so 0017's
 * policy is what decides the write is allowed, and this function never has to
 * check whose profile it is.
 */
export async function updateEducatorProfile(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Not signed in." };

  const fullName = str(form, "full_name");
  if (!fullName) return { error: "Your name cannot be empty." };

  const headline = str(form, "headline");
  const specialization = str(form, "specialization");
  const yearsRaw = str(form, "years_experience");

  let years: number | null = null;
  if (yearsRaw) {
    const n = Number(yearsRaw);
    if (!Number.isInteger(n) || n < 0 || n > 70) {
      return { error: "Years of experience should be a whole number, 0 to 70." };
    }
    years = n;
  }

  const supabase = createSupabaseServerClient();

  const { data: user, error: lookup } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (lookup || !user) return { error: "Could not find your account." };

  const { error: userErr } = await supabase
    .from("users")
    .update({
      full_name: fullName,
      bio: str(form, "bio") || null,
      phone: str(form, "phone") || null,
    })
    .eq("id", user.id);

  if (userErr) return { error: userErr.message };

  const { error: profileErr } = await supabase
    .from("educator_profiles")
    .update({
      headline: headline || null,
      specialization: specialization || null,
      years_experience: years,
    })
    .eq("user_id", user.id);

  // A missing profile row is not an error the educator can act on, and the
  // name change above has already been saved. Say so rather than rolling back
  // a write that succeeded.
  if (profileErr) {
    return {
      error: `Your details were saved, but your public profile could not be updated: ${profileErr.message}`,
    };
  }

  revalidatePath("/educator/profile");
  revalidatePath("/educator");
  return { ok: true };
}

/**
 * The notification switches.
 *
 * These live in `users.notification_prefs`, a jsonb column that has existed
 * since 0000 and that nothing has ever written — the mobile user store selects
 * it and ignores it. Using it rather than adding a table keeps this screen from
 * pre-empting 2599, which owns notification delivery and may well want its own
 * schema; a jsonb column of four booleans is an afternoon's migration to move if
 * it does.
 *
 * Takes the switch positions as an object rather than a `FormData`, unlike
 * `updateEducatorProfile` above. The settings form holds the switches in state
 * so it can tell whether anything has changed, which makes the form's own
 * fields a second copy of an answer the client already has — and a costly one:
 * React fires `requestFormReset` when a `<form action>` settles, and a
 * checkbox restored by that reset goes back to its mount-time value while the
 * state behind it stays put, so a saved switch visibly flips itself back. The
 * form element is gone from that screen for exactly that reason.
 *
 * Nothing here trusts the shape that arrives. Only the four known keys are
 * read, anything that is not a boolean falls back to what is stored, and the
 * result is rebuilt rather than spread over the row — a server action is a
 * public endpoint and the argument is whatever the caller sent.
 *
 * Read-modify-write rather than a partial update: jsonb has no column-level
 * merge through PostgREST, and the whole object is four keys.
 */
export async function updateNotificationPrefs(
  submitted: Partial<NotificationPrefs>,
): Promise<ActionResult> {
  await requireSession("educator");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Not signed in." };

  const supabase = createSupabaseServerClient();

  const { data: user, error: lookup } = await supabase
    .from("users")
    .select("id, notification_prefs")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (lookup || !user) return { error: "Could not find your account." };

  const stored = readPrefs(user.notification_prefs);
  const next = Object.fromEntries(
    NOTIFICATION_KEYS.map(({ key }) => [
      key,
      typeof submitted?.[key] === "boolean" ? submitted[key] : stored[key],
    ]),
  ) as NotificationPrefs;

  const { error } = await supabase
    .from("users")
    .update({ notification_prefs: next })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/educator/settings");
  return { ok: true };
}
