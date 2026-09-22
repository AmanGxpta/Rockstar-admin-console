"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { Ph } from "@/components/ui/primitives";
import {
  QUESTION_IMAGE_ACCEPT,
  QUESTION_IMAGE_HINT,
  questionImageProblem,
  useQuestionImageRemove,
  useQuestionImageUpload,
  useSignedMediaUrl,
} from "@/lib/media-upload";

/**
 * The reference image on an Image ID question.
 *
 * Uploads the moment a file is chosen rather than at Save, for the reason the
 * cover editor does: the storage policy resolves the course from the object
 * path, so there is nothing to defer — the course already exists by the time a
 * question is being written. What the draft carries is the object *path*,
 * which is what quiz_questions.media_url stores; the signed URL below exists
 * only so the author can see what they uploaded.
 *
 * A question with no image is not an Image ID question, so the control is
 * never optional-looking: it is the one field that makes this type mean
 * anything, and draftQuestionReady() refuses the question without it.
 */
export function QuestionImagePicker({
  courseId,
  questionId,
  path,
  onChange,
}: {
  courseId: string;
  questionId: string;
  /** The stored object path, or null. */
  path: string | null;
  onChange: (path: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useQuestionImageUpload();
  const remove = useQuestionImageRemove();

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  // Shown the instant a file is chosen, so the frame does not sit empty for
  // the length of the upload.
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const signed = useSignedMediaUrl(path);
  const shown = preview ?? signed.url;

  const take = async (picked: File | undefined) => {
    if (!picked || busy) return;

    const problem = questionImageProblem(picked);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(picked));

    const previous = path;
    const result = await upload(courseId, questionId, picked);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      setPreview(null);
      return;
    }

    onChange(result.path);
    // The old object is only dropped once the new path is on the draft, so a
    // failed replace never leaves the question pointing at nothing.
    if (previous && previous !== result.path) void remove(previous);
  };

  const clear = () => {
    if (busy) return;
    setError(null);
    setPreview(null);
    if (path) void remove(path);
    onChange(null);
  };

  const swallow = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const label = busy
    ? "Uploading…"
    : signed.loading
      ? "Loading…"
      : "DROP AN IMAGE OR CLICK TO CHOOSE";

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={QUESTION_IMAGE_ACCEPT}
        hidden
        onChange={(e) => {
          void take(e.target.files?.[0]);
          // Cleared so picking the same file twice still fires a change.
          e.target.value = "";
        }}
      />

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
          void take(e.dataTransfer.files?.[0]);
        }}
        style={{
          position: "relative",
          height: 176,
          borderRadius: 12,
          overflow: "hidden",
          border: `2px dashed ${over ? "var(--red-hover)" : shown ? "transparent" : "var(--border-mid)"}`,
          transition: "border-color .15s ease",
        }}
      >
        {shown ? (
          // A plain <img>: the source is a blob: URL as often as a signed one,
          // and next/image optimises neither.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="Reference image for this question"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              // Contained rather than cropped: a student is asked to identify
              // something in this picture, so no part of it may be cut off.
              objectFit: "contain",
              background: "var(--dark)",
              opacity: busy ? 0.55 : 1,
              transition: "opacity .15s ease",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
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
              label={label}
              style={{ height: "100%", borderRadius: 0 }}
            />
          </button>
        )}

        {shown && (
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              display: "flex",
              gap: 8,
            }}
          >
            <OverlayButton
              label={busy ? "Uploading…" : "Replace"}
              icon="upload"
              onClick={() => input.current?.click()}
            />
            {!busy && (
              <OverlayButton label="Remove" icon="trash" onClick={clear} danger />
            )}
          </div>
        )}
      </div>

      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          color: error || signed.error ? "var(--danger)" : "var(--text-secondary)",
          margin: "8px 0 0",
        }}
      >
        {error ?? signed.error ?? QUESTION_IMAGE_HINT}
      </p>
    </div>
  );
}

/** Sits on top of the author's own image, so it carries its own contrast. */
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
