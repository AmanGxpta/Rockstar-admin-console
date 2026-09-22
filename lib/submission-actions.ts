"use server";

import { revalidatePath } from "next/cache";

import { requireTeam } from "./session";
import { createSupabaseServerClient } from "./supabase";

/** What a reviewer may rule. `pending` is the student's state, not a verdict. */
export type ReviewDecision = "approved" | "needs_revision";

export type ReviewResult = { error: string } | { ok: true };

/**
 * Rule on a piece of practical work.
 *
 * One RPC rather than two writes from here. The verdict lives on
 * `submissions.status` and the reason lives in `submission_feedback`, and sent
 * as two PostgREST requests a failure between them leaves a student sent back
 * with no reason given. 0022's `review_submission()` does both in one
 * statement — as the caller, so 0016's policies and triggers still decide
 * whether this account may rule on this course at all.
 */
export async function reviewSubmission(
  submissionId: string,
  decision: ReviewDecision,
  note: string,
): Promise<ReviewResult> {
  await requireTeam();

  const body = note.trim();

  // Checked here as well as in the function: the reviewer should be told
  // before the round trip, and the database should not depend on them being.
  if (decision === "needs_revision" && !body) {
    return { error: "Say what needs changing before sending work back." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("review_submission", {
    p_submission_id: submissionId,
    p_status: decision,
    // An approval with nothing typed writes no note rather than an empty one.
    p_body: body || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/submissions");
  revalidatePath(`/submissions/${submissionId}`);
  return { ok: true };
}
