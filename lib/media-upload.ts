"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { COVER_MAX_BYTES, isCoverMime } from "./course-cover";
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
 *
 * Bounded, because `loadedmetadata` is not guaranteed to arrive at all: a
 * browser that is throttling a background tab simply never decodes, and an
 * unbounded wait leaves the upload that is already in the bucket showing
 * "Uploading…" for as long as the panel stays open. A missing duration is a
 * number the trigger recomputes; a stuck panel is a file the author cannot
 * save.
 */
const DURATION_PROBE_MS = 10_000;

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), DURATION_PROBE_MS);
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

/**
 * How long a preview URL is good for.
 *
 * The editor signs one object at a time, when a clip is selected, so this only
 * has to outlast someone reading a panel and pressing Save. An hour is
 * Storage's own default and long enough that a paused video keeps playing.
 */
const PREVIEW_URL_TTL_SECONDS = 60 * 60;

export type SignedMedia = {
  url: string | null;
  loading: boolean;
  error: string | null;
};

/**
 * A URL the browser can actually render, for an object path held on a block.
 *
 * `course-media` is private (0009), so a stored path is not a URL and an
 * `<img>` or `<video>` pointed at one gets a 400. Signing happens here, in the
 * browser and as the author, because the same read policy that lets the
 * console show a clip is the one that will let a student watch it — a preview
 * that renders is evidence the object landed and is readable, which a local
 * `blob:` of the file just chosen would not be.
 *
 * Absolute URLs pass through untouched: an `embed` block holds someone else's
 * link, not a path into our bucket.
 */
export function useSignedMediaUrl(path: string | null | undefined): SignedMedia {
  const supabase = useSupabaseBrowserClient();
  // Keyed by the path it answers, so a result that lands after the author has
  // moved to another clip is ignored rather than shown against the wrong file.
  const [resolved, setResolved] = useState<{
    path: string;
    url: string | null;
    error: string | null;
  } | null>(null);

  const external = !!path && /^(https?:)?\/\//i.test(path);

  useEffect(() => {
    // Nothing to sign: no file, or someone else's link. Both are answered in
    // the derivation below, without a round trip and without a render.
    if (!path || external) return;

    let live = true;
    void supabase.storage
      .from("course-media")
      .createSignedUrl(path, PREVIEW_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (!live) return;
        setResolved({
          path,
          url: data?.signedUrl ?? null,
          error: data?.signedUrl
            ? null
            : // A missing object and a refused read both land here; the author
              // can act on either, and neither is worth the raw
              // "Object not found" string.
              error?.message && /not found/i.test(error.message)
              ? "That file is no longer in storage."
              : "Could not load this file for preview.",
        });
      });

    return () => {
      live = false;
    };
  }, [supabase, path, external]);

  if (!path) return { url: null, loading: false, error: null };
  if (external) return { url: path, loading: false, error: null };
  if (resolved?.path !== path) return { url: null, loading: true, error: null };
  return { url: resolved.url, loading: false, error: resolved.error };
}

// ------------------------------------------------------------------ covers --

/**
 * Course artwork, which is a different bucket and a different question.
 *
 * `course-covers` is public (0015) because a cover exists to be seen by people
 * who have not bought the course. Its write policy asks the same author-or-
 * admin question course-media's does, resolved from the same
 * `courses/<course_id>/…` path shape, so this reuses the browser client above
 * rather than routing through a server action.
 */

const COVER_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function coverObjectPath(courseId: string, file: File): string {
  const ext = COVER_EXT[file.type] ?? "jpg";
  // `cover/` is for humans browsing the bucket; the random name is what makes
  // a replacement a new URL rather than a stale CDN cache of the old image.
  return `courses/${courseId}/cover/${crypto.randomUUID().slice(0, 12)}.${ext}`;
}

export type CoverUploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export function useCoverUpload() {
  const supabase = useSupabaseBrowserClient();

  return async function uploadCover(
    courseId: string,
    file: File,
    /** The path this one replaces, removed once the new object is in. */
    replacing?: string | null,
  ): Promise<CoverUploadResult> {
    if (!isCoverMime(file.type)) {
      return {
        ok: false,
        error: `${file.type || "That file type"} isn't accepted. Use JPG, PNG, WebP or AVIF.`,
      };
    }
    if (file.size > COVER_MAX_BYTES) {
      return {
        ok: false,
        error: `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(COVER_MAX_BYTES)}.`,
      };
    }

    const path = coverObjectPath(courseId, file);
    const { error } = await supabase.storage
      .from("course-covers")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      const denied = /row-level security|not authorized|403/i.test(error.message);
      return {
        ok: false,
        error: denied
          ? "You don't have permission to change this course's cover."
          : `Upload failed: ${error.message}`,
      };
    }

    // Best effort. An orphaned image costs a few hundred kilobytes; failing the
    // save over one would cost the author their new cover.
    if (replacing && replacing !== path) {
      await supabase.storage.from("course-covers").remove([replacing]);
    }

    return { ok: true, path };
  };
}

/** Removes the object as well as clearing the column's worth of it. */
export function useCoverRemove() {
  const supabase = useSupabaseBrowserClient();

  return async function removeCover(path: string): Promise<void> {
    await supabase.storage.from("course-covers").remove([path]);
  };
}
