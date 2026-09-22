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
  await requireSession("admin");

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

  revalidatePath("/messages");
  return { ok: true };
}

/**
 * Opens the support thread with a student, or returns the one already open.
 *
 * Through `open_support_conversation()` (0035) rather than 0027's
 * `start_conversation()`, and the difference is the whole point of this
 * screen: start_conversation() would open a second thread, of kind `educator`,
 * between that student and whichever admin happened to press the button. There
 * is one handle now, so the team writing first has to land in the same thread
 * the student would have opened themselves — which it does, because both verbs
 * key on the same `dedupe_key`.
 *
 * `courseId` is gone from the signature for the same reason. A support thread
 * is about the person, not about one of their courses; 0027 keyed its dedupe
 * on the course as well, which is what made "the same student, twice" a real
 * case there and not one here.
 */
export async function startThreadWithStudent(
  studentUserId: string,
): Promise<StartResult> {
  await requireSession("admin");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("open_support_conversation", {
    p_student: studentUserId,
  });

  if (error) return { error: error.message };

  revalidatePath("/messages");
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
  await requireSession("admin");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation: conversationId,
  });

  if (error) return { error: error.message };

  revalidatePath("/messages");
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
  await requireSession("admin");

  try {
    return { ok: true, messages: await getThreadMessages(conversationId) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That thread could not be opened.",
    };
  }
}
