"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { ActionResult } from "./course-actions";

/**
 * Answering a request, one RPC deep.
 *
 * Not table writes from here, for the reason lib/review-actions.ts gives about
 * the review verbs: approving is four writes — the verdict, the entitlement,
 * the enrolment and the student's inbox — and every PostgREST call is its own
 * transaction, so doing it from this file means a request marked approved with
 * no access behind it. decide_course_access_request() in 0034 is one.
 *
 * It is also the only way in. grant_entitlement() is executable by
 * service_role alone, deliberately, so that no signed-in user can grant
 * themselves a course; the RPC is SECURITY DEFINER and asks is_admin() itself.
 * The requireSession("admin") here is the readable half of that rule.
 */

function plainly(message: string): string {
  const colon = message.indexOf(": ");
  const text = colon > 0 && colon < 48 ? message.slice(colon + 2) : message;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function decideAccessRequest(input: {
  requestId: string;
  approve: boolean;
  note: string;
  /** Null means the course's own access_months, which is the usual answer. */
  months: number | null;
}): Promise<ActionResult> {
  await requireSession("admin");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("decide_course_access_request", {
    p_request_id: input.requestId,
    p_approve: input.approve,
    p_note: input.note.trim() || undefined,
    p_months: input.months ?? undefined,
  });

  if (error) return { error: plainly(error.message) };

  revalidatePath("/admin/requests");
  revalidatePath("/courses");
  return { ok: true };
}
