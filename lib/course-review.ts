import "server-only";

import { createSupabaseServerClient } from "./supabase";
import { getCourseForEditor, getCourseReviews } from "./courses";
import { getExamForCourse, type ExamForBuilder } from "./exams";
import type { CourseForEditor, CourseReview } from "./course-tree";
import type { Database } from "@/types/database";

/**
 * Everything in a course, resolved to something a reviewer can actually look
 * at.
 *
 * The admin's course page used to render chapter titles, lesson titles and a
 * block count — so "approve" meant approving a table of contents. A reviewer
 * could not watch a clip, read a caption, see a quiz's answer key, know
 * whether the Image ID questions had pictures on them, or find out what the
 * final exam asked. This is the same tree the educator's editor reads, plus
 * the two things that hang off a course and not off a chapter (the exam bank
 * and the handouts), plus a URL for every private object in it.
 */

export type ResourceRow =
  Database["public"]["Tables"]["course_resources"]["Row"];

export type CourseForReview = {
  course: CourseForEditor;
  exam: ExamForBuilder;
  resources: ResourceRow[];
  history: CourseReview[];
  /**
   * Object path → a URL that works for the next hour.
   *
   * A map rather than the URLs written back onto the rows, because the same
   * object can appear twice (a clip used in two lessons) and because a row
   * that kept only its signed URL would lose the path, which is the stable key
   * and the only thing worth logging when something will not load.
   */
  media: Record<string, string>;
};

/** Absolute URLs are pasted by authors; object paths are ours to sign. */
function isStoragePath(url: string | null | undefined): url is string {
  return !!url && !/^https?:\/\//i.test(url);
}

/**
 * Signs a whole bucket's worth of paths in one call.
 *
 * A review page is the densest media screen in the console — every clip, every
 * reference image, every handout, all at once. Signing them one at a time is a
 * request per object before the page can render, and `createSignedUrls` takes
 * the list. Failures are silent by design: a missing URL renders as "could not
 * be loaded" beside the path, which is more use to a reviewer than a 500 on
 * the whole course because one object was deleted out from under its row.
 */
async function signAll(
  bucket: "course-media" | "course-resources",
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(isStoragePath))];
  if (unique.length === 0) return {};

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(unique, 60 * 60);

  if (error || !data) {
    console.error(`[review] could not sign ${bucket}:`, error?.message);
    return {};
  }

  const out: Record<string, string> = {};
  data.forEach((row, i) => {
    if (row.signedUrl) out[unique[i]] = row.signedUrl;
  });
  return out;
}

export async function getCourseForReview(
  id: string,
): Promise<CourseForReview | null> {
  const supabase = createSupabaseServerClient();

  // Four reads, all independent, so they go together rather than in series.
  const [course, exam, resources, history] = await Promise.all([
    getCourseForEditor(id),
    getExamForCourse(id),
    supabase
      .from("course_resources")
      .select("*")
      .eq("course_id", id)
      .order("position")
      .order("created_at"),
    getCourseReviews(id),
  ]);

  if (!course) return null;

  if (resources.error) {
    console.error("[review] resources failed:", resources.error.message);
  }
  const handouts = (resources.data ?? []) as ResourceRow[];

  // Clips, captions' images, chapter-quiz reference images and the exam bank's
  // all live in course-media; handouts are the one other bucket.
  const mediaPaths: (string | null)[] = [];
  for (const chapter of course.course_modules) {
    for (const lesson of chapter.lessons) {
      for (const block of lesson.lesson_blocks) mediaPaths.push(block.url);
    }
    for (const quiz of chapter.quizzes) {
      for (const question of quiz.quiz_questions) {
        mediaPaths.push(question.media_url);
      }
    }
  }
  for (const question of exam.bank) mediaPaths.push(question.media_url);

  const [media, handoutUrls] = await Promise.all([
    signAll("course-media", mediaPaths),
    signAll(
      "course-resources",
      handouts.map((r) => r.path),
    ),
  ]);

  return {
    course,
    exam,
    resources: handouts,
    history,
    media: { ...media, ...handoutUrls },
  };
}
