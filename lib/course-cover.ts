/**
 * Where a course's artwork lives, and what it costs to put it there.
 *
 * Isomorphic on purpose — a server component rendering a card and a browser
 * uploading a replacement both need the same URL, and neither should have to
 * ask Storage for it. `course-covers` is a public bucket (migration 0015), so
 * resolving a path is string work rather than a round trip.
 */

/** Kept in step with `file_size_limit` on the course-covers bucket (0015). */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

/** Mirrors the bucket's allowed_mime_types. No GIF: a cover does not animate. */
export const COVER_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const COVER_ACCEPT = COVER_MIMES.join(",");

export const COVER_HINT = "JPG, PNG, WebP or AVIF · 16:9 reads best · up to 5 MB";

export function isCoverMime(type: string): boolean {
  return (COVER_MIMES as readonly string[]).includes(type);
}

/**
 * The public URL for a stored cover.
 *
 * Rows hold the object path rather than a URL so the bucket or the CDN in
 * front of it can move without rewriting every course.
 */
export function coverPublicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/course-covers/${encoded}`;
}
