"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { currentEducatorId } from "./courses";
import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { Database } from "@/types/database";

type Category = Database["public"]["Enums"]["course_category"];
type Level = Database["public"]["Enums"]["course_level"];
type BlockKind = Database["public"]["Enums"]["lesson_block_kind"];

export type ActionResult = { error: string } | { ok: true };

const CATEGORIES = ["color", "cutting", "styling", "editorial", "business"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const KINDS = ["video", "text", "image", "pdf", "embed"];

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/**
 * Next appends the position rather than asking the author for it: a form that
 * lets you type "3" lets you type it twice, and (course_id, position) is
 * unique. Reading the current max is a round trip, but it is the only way to
 * append without trusting a number from the client.
 */
async function nextPosition(
  table: "course_modules" | "lessons" | "lesson_blocks",
  column: string,
  parentId: string,
): Promise<number> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from(table)
    .select("position")
    .eq(column, parentId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data as { position: number } | null)?.position ?? 0) + 1;
}

// ------------------------------------------------------------------ course --

export async function createCourse(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const session = await requireSession("educator");
  const educatorId = await currentEducatorId();

  if (!educatorId) {
    // The RLS policy would reject the insert anyway; saying so plainly beats
    // surfacing a Postgres error to an educator.
    return {
      error:
        "Your account has no educator profile yet. Ask an admin to finish setting it up.",
    };
  }

  const title = str(form, "title");
  if (!title) return { error: "A title is required." };

  const category = str(form, "category");
  const level = str(form, "level");
  if (!CATEGORIES.includes(category)) return { error: "Pick a category." };
  if (!LEVELS.includes(level)) return { error: "Pick a level." };

  const priceInput = str(form, "price");
  // Priced in minor units so no course is ever stored at 88.99999.
  const price_cents = priceInput ? Math.round(Number(priceInput) * 100) : null;
  if (price_cents !== null && (!Number.isFinite(price_cents) || price_cents < 0)) {
    return { error: "Price must be a positive number." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      subtitle: str(form, "subtitle") || null,
      category: category as Category,
      level: level as Level,
      educator_id: educatorId,
      overview: str(form, "overview"),
      price_cents,
      // Always starts unpublished: publishing is a separate, deliberate act,
      // and an admin reviews it first.
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[courses] create failed:", error?.message, "as", session.email);
    return { error: error?.message ?? "Could not create the course." };
  }

  revalidatePath("/educator/courses");
  redirect(`/educator/courses/${data.id}`);
}

export async function updateCourseDetails(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const id = str(form, "courseId");
  if (!id) return { error: "Missing course." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: str(form, "title"),
      subtitle: str(form, "subtitle") || null,
      overview: str(form, "overview"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/educator/courses/${id}`);
  return { ok: true };
}

// ----------------------------------------------------------------- modules --

export async function addModule(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const title = str(form, "title");
  if (!title) return { error: "Name the chapter." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("course_modules").insert({
    course_id: courseId,
    title,
    position: await nextPosition("course_modules", "course_id", courseId),
  });

  if (error) return { error: error.message };
  revalidatePath(`/educator/courses/${courseId}`);
  return { ok: true };
}

export async function deleteModule(form: FormData): Promise<void> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const supabase = createSupabaseServerClient();
  await supabase.from("course_modules").delete().eq("id", str(form, "moduleId"));
  revalidatePath(`/educator/courses/${courseId}`);
}

// ----------------------------------------------------------------- lessons --

export async function addLesson(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const moduleId = str(form, "moduleId");
  const title = str(form, "title");
  if (!title) return { error: "Name the lesson." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("lessons").insert({
    course_id: courseId,
    module_id: moduleId,
    title,
    // Derived by trigger from the video blocks the author attaches, so it
    // starts at zero rather than being typed and left to drift.
    duration_seconds: 0,
    position: await nextPosition("lessons", "module_id", moduleId),
    is_preview: form.get("is_preview") === "on",
  });

  if (error) return { error: error.message };
  revalidatePath(`/educator/courses/${courseId}`);
  return { ok: true };
}

export async function deleteLesson(form: FormData): Promise<void> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const supabase = createSupabaseServerClient();
  await supabase.from("lessons").delete().eq("id", str(form, "lessonId"));
  revalidatePath(`/educator/courses/${courseId}`);
}

// ------------------------------------------------------------------ blocks --

export async function addBlock(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const lessonId = str(form, "lessonId");
  const kind = str(form, "kind");
  if (!KINDS.includes(kind)) return { error: "Pick a block type." };

  const url = str(form, "url") || null;
  const body = str(form, "body") || null;

  // Mirrors the lesson_blocks_has_payload check constraint, so the author gets
  // a sentence instead of a constraint violation.
  if (!url && !body) {
    return {
      error:
        kind === "text"
          ? "Write something for this text block."
          : "Add a URL or storage path, or some text.",
    };
  }

  const minutes = str(form, "minutes");
  const duration_seconds =
    kind === "video" && minutes ? Math.round(Number(minutes) * 60) : null;
  if (duration_seconds !== null && !Number.isFinite(duration_seconds)) {
    return { error: "Length must be a number of minutes." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("lesson_blocks").insert({
    lesson_id: lessonId,
    kind: kind as BlockKind,
    url,
    body,
    duration_seconds,
    position: await nextPosition("lesson_blocks", "lesson_id", lessonId),
  });

  if (error) return { error: error.message };
  revalidatePath(`/educator/courses/${courseId}`);
  return { ok: true };
}

export async function deleteBlock(form: FormData): Promise<void> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const supabase = createSupabaseServerClient();
  await supabase.from("lesson_blocks").delete().eq("id", str(form, "blockId"));
  revalidatePath(`/educator/courses/${courseId}`);
}

// -------------------------------------------------------------- publishing --

/**
 * Publishing is the admin's call, not the educator's, so this takes the role
 * it needs rather than defaulting to whoever is signed in. RLS enforces the
 * same thing server-side; this is the readable half of that rule.
 */
export async function setPublished(form: FormData): Promise<void> {
  await requireSession("admin");
  const id = str(form, "courseId");
  const next = str(form, "next") === "true";

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("courses")
    .update({ is_published: next, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("[courses] publish toggle failed:", error.message);

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
}

/**
 * Rejects a course under review: takes it out of the catalog and sends the
 * reason to the educator's inbox.
 *
 * The message is sent as the Institute (a null sender) rather than as the
 * admin personally — a review decision comes from the school, and an admin
 * has no educator profile to be the sender anyway.
 */
export async function rejectCourse(form: FormData): Promise<void> {
  await requireSession("admin");
  const id = str(form, "courseId");
  const reason = str(form, "reason");

  const supabase = createSupabaseServerClient();

  const { data: course } = await supabase
    .from("courses")
    .select("title, educator:educator_profiles ( users ( id ) )")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("courses")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[courses] reject failed:", error.message);
    return;
  }

  const recipientId = (
    course as { educator?: { users?: { id: string } | null } | null } | null
  )?.educator?.users?.id;

  if (recipientId && reason) {
    const { error: messageError } = await supabase.from("inbox_messages").insert({
      recipient_id: recipientId,
      sender_id: null,
      kind: "review",
      subject: `Changes needed: ${course?.title ?? "your course"}`,
      preview: reason.slice(0, 140),
      body: reason,
    });

    if (messageError) {
      // The course is already unpublished; losing the note is worth a log
      // rather than leaving the decision half-applied.
      console.error("[courses] reject note failed:", messageError.message);
    }
  }

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
}
