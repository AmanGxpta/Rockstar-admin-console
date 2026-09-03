"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "./session";
import { createSupabaseAdminClient } from "./supabase";

export type AccessResult = { error: string } | { ok: true };

/**
 * Handing a student a course by hand.
 *
 * Payments are not wired, so until they are this is how anyone gets into a
 * paid course. It is not a stopgap in the schema, though: `entitlement_source`
 * has always had an `admin_grant` member, and comped access, support refunds
 * and staff accounts will still need this after checkout exists.
 *
 * The admin client is the only one that can do it: `grant_entitlement` and
 * `revoke_entitlement` are SECURITY DEFINER with EXECUTE granted to
 * `service_role` alone — deliberately not to `authenticated`, so no signed-in
 * user can grant themselves a course by calling the RPC directly. That makes
 * this module server-only, and the `requireSession("admin")` on every export
 * is the actual authorisation check.
 */

/** How long a granted entitlement lasts. */
export type GrantDuration = "default" | "forever" | "3" | "12";

function monthsFor(duration: GrantDuration): number | null {
  // null means "use the course's own access_months", which is what
  // grant_entitlement falls back to. Forever is handled after the insert.
  if (duration === "default" || duration === "forever") return null;
  return Number(duration);
}

export async function grantCourseAccess(
  studentId: string,
  courseId: string,
  duration: GrantDuration,
): Promise<AccessResult> {
  const session = await requireSession("admin");

  if (!studentId || !courseId) return { error: "Pick a course first." };

  const supabase = createSupabaseAdminClient();

  // Attribution: entitlements.granted_by is a users.id, and the session only
  // carries the Clerk id.
  const { data: admin } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", session.clerkUserId)
    .maybeSingle();

  const { error } = await supabase.rpc("grant_entitlement", {
    p_user_id: studentId,
    p_course_id: courseId,
    p_source: "admin_grant",
    p_purchase_id: undefined,
    p_months: monthsFor(duration) ?? undefined,
    p_granted_by: admin?.id ?? undefined,
  });

  if (error) return { error: error.message };

  if (duration === "forever") {
    // grant_entitlement cannot express "no expiry" when the course carries an
    // access_months of its own — it coalesces to that. Clearing the date after
    // the fact is the honest way to say it, rather than granting 100 years.
    const { error: openEnded } = await supabase
      .from("entitlements")
      .update({ expires_at: null })
      .eq("user_id", studentId)
      .eq("course_id", courseId);

    if (openEnded) return { error: openEnded.message };
  }

  // Access alone leaves the course sitting in the catalog waiting to be
  // started. The point of this control is to see the course from the student
  // side, so the enrolment is created too — the same row `enroll_in_course`
  // would have made, and the trigger on it keeps courses.enrolled_count true.
  const { error: enrolled } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: studentId, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );

  if (enrolled) return { error: enrolled.message };

  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}

export async function revokeCourseAccess(
  studentId: string,
  courseId: string,
): Promise<AccessResult> {
  await requireSession("admin");

  if (!studentId || !courseId) return { error: "Nothing to revoke." };

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("revoke_entitlement", {
    p_user_id: studentId,
    p_course_id: courseId,
  });

  if (error) return { error: error.message };

  // The enrolment stays. It carries the student's completions and their exam
  // history, and "enrolled but no longer entitled" is a state the rest of the
  // console already reports rather than an inconsistency to tidy away.
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true };
}
