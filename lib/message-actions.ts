"use server";

import { revalidatePath } from "next/cache";

import { getThreadMessages, type ThreadMessage } from "./messages";
import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";

export type MessageResult = { error: string } | { ok: true };
export type ThreadResult = { error: string } | { ok: true; messages: ThreadMessage[] };
export type StartResult = { error: string } | { ok: true; conversationId: string };

/**
 * Says something in a thread.
 *
 * `sender_id` is left out deliberately: 0027 defaults it to
 * `current_user_id()` and the insert policy pins it to the same person, so a
 * caller that never sends it is one that cannot forge it. The same applies to
 * everything else this does not write — `last_message_at`, the preview and the
 * other participant's unread count are moved by 0027's trigger, and there is
 * no update policy on `conversations` that would let this touch them.
 */
export async function sendReply(
  conversationId: string,
  body: string,
): Promise<MessageResult> {
  await requireSession("educator");

  const text = body.trim();

  // Checked here as well as by the `messages_not_empty` constraint: the
  // educator should be told before the round trip, and the database should not
  // depend on them being.
  if (!text) return { error: "Write something before sending." };
  if (text.length > 4000) {
    return { error: "That message is too long — 4000 characters is the limit." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body: text });

  if (error) return { error: error.message };

  revalidatePath("/educator/messages");
  return { ok: true };
}

/**
 * Opens a thread with a student, or returns the one already open.
 *
 * `start_conversation()` is idempotent — 0027 keys it on an order-independent
 * `dedupe_key` — so compose and "carry on where we left off" are the same call
 * and this never has to know which it is doing.
 *
 * The refusal is passed through rather than flattened into a generic failure.
 * The realistic reason is a lapsed entitlement: the compose list is built from
 * `enrollments`, because that is what an educator may read, while the function
 * checks `entitlements`, so a student who has stopped paying is still on the
 * list and is refused here. The message the database raises says exactly that,
 * and is more useful than anything this layer could invent.
 */
export async function startThreadWithStudent(
  studentUserId: string,
  courseId: string | null,
): Promise<StartResult> {
  await requireSession("educator");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    p_with_user: studentUserId,
    // `undefined` rather than null: p_course_id is DEFAULT null in 0027, so
    // the generated type spells "not given" as an absent key.
    p_course_id: courseId ?? undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/educator/messages");
  return { ok: true, conversationId: data as string };
}

/**
 * Clears this account's unread count on one thread.
 *
 * Through the RPC rather than an update, because the counter and
 * `last_read_at` have to move together — 0027 explains why a caller allowed to
 * set them separately can leave a thread that never goes unread again.
 */
export async function markThreadRead(
  conversationId: string,
): Promise<MessageResult> {
  await requireSession("educator");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation: conversationId,
  });

  if (error) return { error: error.message };

  revalidatePath("/educator/messages");
  return { ok: true };
}

/**
 * Reads one thread for the client component that draws it.
 *
 * An action rather than a route handler or a prop: the two-pane layout loads a
 * thread when one is clicked, which is a client event, and `lib/messages.ts`
 * is `server-only` because it holds a Supabase client authenticated as this
 * Clerk session. This is the seam between the two — it re-checks the session
 * itself rather than trusting that the page did, because an action is a public
 * endpoint whatever renders it.
 *
 * Attachment URLs are signed for an hour inside `getThreadMessages`, so a
 * thread left open on a desk all afternoon has to be reopened to show its
 * pictures again. That is the bargain a private bucket makes.
 */
export async function fetchThread(
  conversationId: string,
): Promise<ThreadResult> {
  await requireSession("educator");

  try {
    return { ok: true, messages: await getThreadMessages(conversationId) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That thread could not be opened.",
    };
  }
}
