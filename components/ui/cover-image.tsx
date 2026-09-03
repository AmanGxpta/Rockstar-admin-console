import type { CSSProperties } from "react";

import { Ph } from "@/components/ui/primitives";
import { coverPublicUrl } from "@/lib/course-cover";

/**
 * A course's artwork wherever it is only being looked at.
 *
 * Falls back to the gradient plate rather than to a broken image or a grey
 * box, so a course without a cover reads as deliberate — which it is, for as
 * long as covers are optional. Server-safe: `course-covers` is public, so the
 * URL is worked out from the path without asking Storage anything.
 */
export function CoverImage({
  path,
  h,
  style,
  alt = "",
}: {
  path: string | null;
  h?: number;
  style?: CSSProperties;
  /** Left empty by default: next to the title it names the course twice. */
  alt?: string;
}) {
  const url = coverPublicUrl(path);

  if (!url) return <Ph icon="image" h={h} style={style} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      style={{
        display: "block",
        width: "100%",
        height: h,
        objectFit: "cover",
        background: "var(--dark-2)",
        ...style,
      }}
    />
  );
}
