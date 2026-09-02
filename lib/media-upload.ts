"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import type { LessonBlockKind } from "./course-tree";

/**
 * Kept in step with `file_size_limit` on the course-media bucket (0012). The
 * bucket is the one that actually enforces it; this number exists so an
 * oversize file is refused in the browser instead of after the upload.
 */
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

/** Mirrors the bucket's allowed_mime_types, for the same reason. */
const KIND_BY_MIME: Record<string, LessonBlockKind> = {
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "video/x-m4v": "video",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/avif": "image",
  "application/pdf": "pdf",
};

export const MEDIA_ACCEPT = Object.keys(KIND_BY_MIME).join(",");

/** The block kind a file becomes, or null if the bucket would refuse it. */
export function kindForFile(file: File): LessonBlockKind | null {
  return KIND_BY_MIME[file.type] ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Supabase client that authenticates as the signed-in educator, in the
 * browser.
 *
 * Uploads do not go through a server action on purpose: a Server Action body
 * is capped at 1 MB by default, which every clip in this bucket exceeds. The
 * browser talks to Storage directly, and 0009's insert policy — author or
 * admin, resolved from the course id in the object path — is what makes that
 * safe. This client only ever holds the publishable key and Clerk's own
 * session token.
 */
function useSupabaseBrowserClient() {
  const { session } = useSession();

  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }
    return createClient<Database>(url, key, {
      accessToken: async () => (await session?.getToken()) ?? null,
    });
  }, [session]);
}

/**
 * Where an object lives.
 *
 * `courses/<course_id>/…` is not a convention the editor is free to change:
 * every storage policy in 0009 reads the course id out of the second segment
 * to decide who may touch the file, and a path outside that shape is readable
 * by nobody. The lesson segment is for humans browsing the bucket; the random
 * prefix keeps two uploads of `final.mp4` from colliding.
 */
function objectPath(courseId: string, lessonId: string, file: File): string {
  const safe = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-64);
  return `courses/${courseId}/${lessonId}/${crypto.randomUUID().slice(0, 8)}-${safe}`;
}

/**
 * How long a video runs, read from the file itself.
 *
 * lessons.duration_seconds is derived by trigger from the blocks beneath it,
 * so a number typed by hand quietly decides what students see as the course
 * length. The file already knows, and asking it costs one metadata load.
 * Returns null when the browser cannot decode the container — the author can
 * still type the minutes.
 */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

export type UploadedMedia = {
  path: string;
  kind: LessonBlockKind;
  /** Only ever set for a video, and only when the browser could read it. */
  durationSeconds: number | null;
  fileName: string;
};

export type UploadResult =
  | { ok: true; media: UploadedMedia }
  | { ok: false; error: string };

export function useMediaUpload(courseId: string, lessonId: string) {
  const supabase = useSupabaseBrowserClient();

  return async function upload(file: File): Promise<UploadResult> {
    const kind = kindForFile(file);
    if (!kind) {
      return {
        ok: false,
        error: `${file.type || "That file type"} isn't accepted. Use MP4, MOV, WebM, JPG, PNG, WebP, GIF or PDF.`,
      };
    }
    if (file.size > MEDIA_MAX_BYTES) {
      return {
        ok: false,
        error: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MEDIA_MAX_BYTES)}.`,
      };
    }

    const path = objectPath(courseId, lessonId, file);
    const { error } = await supabase.storage
      .from("course-media")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      // A 403 here means the policy did not recognise the caller as the
      // course's author, which is a different problem from a network failure
      // and worth saying so rather than showing "new row violates…".
      const denied = /row-level security|not authorized|403/i.test(error.message);
      return {
        ok: false,
        error: denied
          ? "You don't have permission to upload to this course."
          : `Upload failed: ${error.message}`,
      };
    }

    return {
      ok: true,
      media: {
        path,
        kind,
        durationSeconds: kind === "video" ? await readVideoDuration(file) : null,
        fileName: file.name,
      },
    };
  };
}
