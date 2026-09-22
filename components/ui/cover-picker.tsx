"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { Ph } from "@/components/ui/primitives";
import {
  COVER_ACCEPT,
  COVER_HINT,
  COVER_MAX_BYTES,
  isCoverMime,
} from "@/lib/course-cover";
import { setCourseCover } from "@/lib/course-actions";
import { formatBytes, useCoverRemove, useCoverUpload } from "@/lib/media-upload";

/**
 * Course artwork, in the two situations it gets chosen in.
 *
 * They differ in one thing and it is not cosmetic: on the New course form
 * there is no course id yet, and the storage policy reads the course id out of
 * the object path to decide who may write there. So nothing can be uploaded
 * until the row exists. `CoverField` therefore holds the File and previews it
 * locally, and the form uploads once it has an id; `CoverEditor`, on a course
 * that already exists, uploads the moment a file is chosen.
 */

const RATIO = "16 / 9";

/** The same check the bucket makes, made early enough to say why. */
export function coverProblem(file: File): string | null {
  if (!isCoverMime(file.type)) {
    return `${file.type || "That file type"} isn't accepted. Use JPG, PNG, WebP or AVIF.`;
  }
  if (file.size > COVER_MAX_BYTES) {
    return `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(COVER_MAX_BYTES)}.`;
  }
  return null;
}

function Problem({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p
      style={{
        color: "var(--danger)",
        fontFamily: "var(--font-body)",
        fontSize: 12.5,
        margin: "8px 0 0",
      }}
    >
      {text}
    </p>
  );
}

function OverlayButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: "upload" | "trash";
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 11px",
        borderRadius: 9,
        border: "none",
        // Sits on top of the author's own image, which could be any colour, so
        // the chrome carries its own contrast rather than borrowing the theme's.
        background: "rgba(14,12,12,0.72)",
        backdropFilter: "blur(6px)",
        color: danger ? "var(--danger-on)" : "#fff",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <Icon name={icon} size={14} c={danger ? "var(--danger-on)" : "#fff"} />
      {label}
    </button>
  );
}

/**
 * The plate itself: the image if there is one, the gradient placeholder if
 * there is not, with whatever controls the caller hangs on it.
 */
function CoverFrame({
  src,
  busy,
  onPick,
  onDropFile,
  children,
}: {
  src: string | null;
  busy: boolean;
  onPick: () => void;
  onDropFile: (file: File | undefined) => void;
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);

  const swallow = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onDragOver={(e) => {
        swallow(e);
        setOver(true);
      }}
      onDragLeave={(e) => {
        swallow(e);
        setOver(false);
      }}
      onDrop={(e) => {
        swallow(e);
        setOver(false);
        onDropFile(e.dataTransfer.files?.[0]);
      }}
      style={{
        position: "relative",
        aspectRatio: RATIO,
        borderRadius: 14,
        overflow: "hidden",
        border: `2px dashed ${over ? "var(--red-hover)" : src ? "transparent" : "var(--border-mid)"}`,
        transition: "border-color .15s ease",
      }}
    >
      {src ? (
        // A plain <img>: the source is a blob: URL as often as a remote one,
        // and next/image optimises neither.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: busy ? 0.55 : 1,
            transition: "opacity .15s ease",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            padding: 0,
            border: "none",
            background: "none",
            cursor: busy ? "default" : "pointer",
          }}
        >
          <Ph
            icon="image"
            label={busy ? "Uploading…" : "Add a cover"}
            style={{ height: "100%", borderRadius: 0 }}
          />
        </button>
      )}

      {children ? (
        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            display: "flex",
            gap: 8,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function HiddenInput({
  inputRef,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={COVER_ACCEPT}
      hidden
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        // Cleared so picking the same file twice still fires a change.
        e.target.value = "";
      }}
    />
  );
}

function Hint() {
  return (
    <p
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 12,
        color: "var(--text-secondary)",
        margin: "8px 0 0",
      }}
    >
      {COVER_HINT}
    </p>
  );
}

// ------------------------------------------------- deferred (new course) --

/**
 * Holds the chosen file until there is a course to attach it to.
 *
 * The preview URL is created in the change handler and revoked when it is
 * replaced, rather than derived during render — a blob URL made in render
 * leaks one object per pass.
 */
export function CoverField({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The last URL outlives the last change, so unmount has to release it.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const take = (picked: File | undefined) => {
    if (!picked) return;
    const problem = coverProblem(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(picked));
    onChange(picked);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    onChange(null);
  };

  return (
    <div>
      <HiddenInput inputRef={input} onFile={take} />
      <CoverFrame
        src={preview}
        busy={false}
        onPick={() => input.current?.click()}
        onDropFile={take}
      >
        {file ? (
          <>
            <OverlayButton
              label="Replace"
              icon="upload"
              onClick={() => input.current?.click()}
            />
            <OverlayButton label="Remove" icon="trash" onClick={clear} danger />
          </>
        ) : null}
      </CoverFrame>
      <Problem text={error} />
      {!error && <Hint />}
    </div>
  );
}

// ------------------------------------------------ live (existing course) --

/** Uploads on pick, because the course already has an id to file it under. */
export function CoverEditor({
  courseId,
  path,
  url,
}: {
  courseId: string;
  path: string | null;
  /** Resolved on the server, so the first paint has the image already. */
  url: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const upload = useCoverUpload();
  const remove = useCoverRemove();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // Shown the instant a file is chosen, so the plate does not sit on the old
  // image for the length of the upload.
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const take = (picked: File | undefined) => {
    if (!picked || busy) return;
    const problem = coverProblem(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(picked));

    start(async () => {
      const result = await upload(courseId, picked, path);
      if (!result.ok) {
        setError(result.error);
        setPreview(null);
        return;
      }
      const saved = await setCourseCover(courseId, result.path);
      if ("error" in saved) {
        setError(saved.error);
        return;
      }
      // The server now has the real URL; drop the local one so the two do not
      // both claim to be the cover.
      setPreview(null);
      router.refresh();
    });
  };

  const clear = () => {
    if (busy) return;
    setError(null);
    start(async () => {
      const saved = await setCourseCover(courseId, null);
      if ("error" in saved) {
        setError(saved.error);
        return;
      }
      // Column first, bytes second: a cleared column with a stray object is
      // untidy, an object deleted out from under a live column is a broken
      // image on every card.
      if (path) await remove(path);
      router.refresh();
    });
  };

  const shown = preview ?? url;

  return (
    <div>
      <HiddenInput inputRef={input} onFile={take} />
      <CoverFrame
        src={shown}
        busy={busy}
        onPick={() => input.current?.click()}
        onDropFile={take}
      >
        {shown ? (
          <>
            <OverlayButton
              label={busy ? "Saving…" : "Replace"}
              icon="upload"
              onClick={() => input.current?.click()}
            />
            {!busy && (
              <OverlayButton label="Remove" icon="trash" onClick={clear} danger />
            )}
          </>
        ) : null}
      </CoverFrame>
      <Problem text={error} />
      {!error && <Hint />}
    </div>
  );
}
