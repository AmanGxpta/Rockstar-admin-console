"use server";

import { getAuthState } from "./session";
import { createSupabaseServerClient } from "./supabase";

type Result = { ok: true } | { error: string };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function signedIn(): Promise<boolean> {
  return (await getAuthState()).status === "ok";
}

/** Mark one message belonging to the current user as read. */
export async function markNotificationRead(id: string): Promise<Result> {
  if (!(await signedIn())) return { error: "Not signed in." };
  if (!UUID.test(id)) return { error: "That notification is not valid." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({ is_read: true })
    .eq("id", id)
    .eq("is_read", false);

  return error ? { error: error.message } : { ok: true };
}

/** Mark every unread message belonging to the current user as read. */
export async function markAllNotificationsRead(): Promise<Result> {
  if (!(await signedIn())) return { error: "Not signed in." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({ is_read: true })
    .eq("is_read", false);

  return error ? { error: error.message } : { ok: true };
}
