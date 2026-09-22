"use server";

import { revalidatePath } from "next/cache";

import { requireSession, requireTeam } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { ActionResult } from "./course-actions";

/**
 * The three verbs of a course review, each one RPC deep.
 *
 * None of this is done with table writes from here, and that is not a
 * preference. Sending a course for review is a state change on `courses` plus
 * a row in `course_reviews`; deciding one is those two plus a message in the
 * educator's inbox. Every PostgREST call is its own transaction, so doing it
 * from this file means a verdict that lands while the note that explains it
 * does not. The functions in migration 0026 are one transaction each.
 *
 * Authorisation is also theirs: request/withdraw ask can_author_course() and
 * decide asks is_admin(), and the triggers behind them mean neither can be
 * skipped by talking to PostgREST directly. requireSession() here is the
 * readable half of that rule, not the enforcing half.
 */

/** Postgres speaks in `request_course_review: …`; the author should not. */
function plainly(message: string): string {
  const colon = message.indexOf(": ");
  const text = colon > 0 && colon < 40 ? message.slice(colon + 2) : message;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function touch(courseId: string) {
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function requestReview(input: {
  courseId: string;
  note: string;
}): Promise<ActionResult> {
  await requireTeam();

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("request_course_review", {
    p_course_id: input.courseId,
    p_note: input.note.trim() || undefined,
  });

  if (error) return { error: plainly(error.message) };

  touch(input.courseId);
  return { ok: true };
}

export async function withdrawReview(courseId: string): Promise<ActionResult> {
  await requireTeam();

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("withdraw_course_review", {
    p_course_id: courseId,
  });

  if (error) return { error: plainly(error.message) };

  touch(courseId);
  return { ok: true };
}

export async function decideReview(input: {
  courseId: string;
  approve: boolean;
  note: string;
}): Promise<ActionResult> {
  await requireSession("admin");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("decide_course_review", {
    p_course_id: input.courseId,
    p_approve: input.approve,
    p_note: input.note.trim() || undefined,
  });

  if (error) return { error: plainly(error.message) };

  touch(input.courseId);
  return { ok: true };
}
