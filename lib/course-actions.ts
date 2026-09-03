"use server";

import { revalidatePath } from "next/cache";

import { currentEducatorId } from "./courses";
import { requireSession } from "./session";
import { createSupabaseServerClient } from "./supabase";
import type { Database } from "@/types/database";

type Category = Database["public"]["Enums"]["course_category"];
type Level = Database["public"]["Enums"]["course_level"];
type BlockKind = Database["public"]["Enums"]["lesson_block_kind"];

export type ActionResult = { error: string } | { ok: true };

/** Like ActionResult, but hands back the id of the row it just created. */
export type CreatedResult = { error: string } | { ok: true; id: string };

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

/**
 * Creating the row.
 *
 * Returns the id rather than redirecting, because a cover chosen on this form
 * cannot be uploaded until the course exists: the storage policy reads the
 * course id out of the object path to decide who may write there, so there is
 * no path to write to before the insert lands. The browser uploads, calls
 * setCourseCover, and navigates — see the form.
 */
export async function createCourse(
  _prev: CreatedResult | null,
  form: FormData,
): Promise<CreatedResult> {
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
  return { ok: true, id: data.id };
}

/**
 * Points a course at its artwork, or clears it.
 *
 * The bytes are already in the bucket by the time this runs — the browser puts
 * them there directly, under a policy that lets only this course's author
 * write to its folder. All that is left is the column, and re-reading the
 * pages that draw it.
 */
export async function setCourseCover(
  courseId: string,
  path: string | null,
): Promise<ActionResult> {
  await requireSession("educator");
  if (!courseId) return { error: "Missing course." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("courses")
    .update({ cover_path: path, updated_at: new Date().toISOString() })
    .eq("id", courseId);

  if (error) return { error: error.message };

  revalidatePath("/educator/courses");
  revalidatePath(`/educator/courses/${courseId}`);
  revalidatePath("/admin/courses");
  return { ok: true };
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

/**
 * Returns the new chapter's id because the editor drops straight into renaming
 * it: a chapter is created unnamed from a menu, so the caret has to land in
 * the right row, and only the insert knows which row that is.
 */
export async function addModule(
  _prev: CreatedResult | null,
  form: FormData,
): Promise<CreatedResult> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const title = str(form, "title");
  if (!title) return { error: "Name the chapter." };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_modules")
    .insert({
      course_id: courseId,
      title,
      position: await nextPosition("course_modules", "course_id", courseId),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not add the chapter." };
  }
  revalidatePath(`/educator/courses/${courseId}`);
  return { ok: true, id: data.id };
}

/** Renames a chapter in place. The only field a chapter has. */
export async function renameModule(
  courseId: string,
  moduleId: string,
  title: string,
): Promise<ActionResult> {
  await requireSession("educator");

  const clean = title.trim();
  if (!clean) return { error: "A chapter needs a name." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("course_modules")
    .update({ title: clean })
    .eq("id", moduleId);

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

export async function updateLesson(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await requireSession("educator");
  const courseId = str(form, "courseId");
  const lessonId = str(form, "lessonId");
  const title = str(form, "title");
  if (!title) return { error: "A clip needs a title." };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("lessons")
    .update({ title, is_preview: form.get("is_preview") === "on" })
    .eq("id", lessonId);

  if (error) return { error: error.message };
  revalidatePath(`/educator/courses/${courseId}`);
  return { ok: true };
}

/**
 * The whole clip in one save: its title, its caption, and the one piece of
 * media attached to it.
 *
 * A clip is one media file and a caption in the editor, not a stack of blocks
 * — so this owns the single lesson_blocks row underneath rather than making
 * the author add, remove and reorder rows to say something that simple. The
 * table still holds a list, because the player renders one and a course
 * imported from elsewhere may have several; this writes the first and leaves
 * any others alone.
 */
export async function saveClip(input: {
  courseId: string;
  lessonId: string;
  title: string;
  caption: string;
  kind: BlockKind;
  url: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
}): Promise<ActionResult> {
  await requireSession("educator");

  const title = input.title.trim();
  if (!title) return { error: "A clip needs a title." };

  const caption = input.caption.trim();
  const url = input.url?.trim() || null;
  // A clip carrying only words is a text block: lesson_blocks_has_payload
  // needs one of the two, and `kind` is what tells the player which it got.
  const kind: BlockKind = url ? input.kind : "text";

  const supabase = createSupabaseServerClient();

  const { error: lessonError } = await supabase
    .from("lessons")
    .update({ title, is_preview: input.isPreview })
    .eq("id", input.lessonId);
  if (lessonError) return { error: lessonError.message };

  const { data: existing } = await supabase
    .from("lesson_blocks")
    .select("id")
    .eq("lesson_id", input.lessonId)
    .order("position")
    .limit(1)
    .maybeSingle();

  if (!url && !caption) {
    // Nothing left to say. Removing the row is the only way to express that,
    // since a block with neither a source nor prose cannot be stored.
    if (existing) {
      const { error } = await supabase
        .from("lesson_blocks")
        .delete()
        .eq("id", existing.id);
      if (error) return { error: error.message };
    }
    revalidatePath(`/educator/courses/${input.courseId}`);
    return { ok: true };
  }

  const payload = {
    kind,
    url,
    body: caption || null,
    // Only a clip has a length, and it is read off the file rather than typed:
    // lessons.duration_seconds is summed from these by trigger, so a number
    // that drifts here becomes the course length students see.
    duration_seconds: kind === "video" ? input.durationSeconds : null,
  };

  const { error } = existing
    ? await supabase.from("lesson_blocks").update(payload).eq("id", existing.id)
    : await supabase
        .from("lesson_blocks")
        .insert({ ...payload, lesson_id: input.lessonId, position: 1 });

  if (error) return { error: error.message };

  revalidatePath(`/educator/courses/${input.courseId}`);
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
 * Features or unfeatures a live course.
 *
 * Featuring is a catalog decision rather than an authoring one, so it sits
 * with the admin actions; `is_featured` has no meaning on a draft, and the
 * catalog only offers the control on published rows.
 */
export async function setFeatured(form: FormData): Promise<void> {
  await requireSession("admin");
  const id = str(form, "courseId");
  const next = str(form, "next") === "true";

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("courses")
    .update({ is_featured: next, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) console.error("[courses] feature toggle failed:", error.message);

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
