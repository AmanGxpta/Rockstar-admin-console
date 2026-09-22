"use client";

import { useId, useRef, useState, type DragEvent } from "react";

import { Icon } from "@/components/ui/icon";
import {
  MEDIA_ACCEPT,
  MEDIA_MAX_BYTES,
  formatBytes,
  useMediaUpload,
  type UploadedMedia,
} from "@/lib/media-upload";

type Props = {
  courseId: string;
  lessonId: string;
  onUploaded: (media: UploadedMedia) => void;
};

/**
 * One upload, two shapes.
 *
 * Both call the same hook and report the same result; they differ only in what
 * they look like, because the same act belongs in two places — beside the URL
 * field, where an author is already filling a block in, and as the drop target
 * at the foot of the clip, where a file dragged from the desktop lands.
 */
function useUploader({ courseId, lessonId, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useMediaUpload(courseId, lessonId);

  const run = async (file: File | null | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    const result = await upload(file);
    setBusy(false);
    if (result.ok) onUploaded(result.media);
    else setError(result.error);
  };

  return { busy, error, setError, run };
}

/** The compact control: a button that opens the file picker. */
export function MediaPickerButton(props: Props & { label?: string }) {
  const { busy, error, run } = useUploader(props);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={MEDIA_ACCEPT}
        hidden
        onChange={(e) => {
          void run(e.target.files?.[0]);
          // Cleared so picking the same file twice still fires a change.
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="rs-btn-ghost"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          height: 34,
          padding: "0 12px",
          borderRadius: 10,
          border: "0.5px solid var(--border-mid)",
          background: "var(--dark-2)",
          color: busy ? "var(--text-muted)" : "var(--text-primary)",
          cursor: busy ? "default" : "pointer",
          fontFamily: "var(--font-body)",
          fontSize: 12.5,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <Icon name="upload" size={15} c={busy ? "var(--text-muted)" : "var(--red-on)"} />
        {busy ? "Uploading…" : (props.label ?? "Upload")}
      </button>
      {error && (
        <p
          style={{
            color: "var(--danger)",
            fontFamily: "var(--font-body)",
            fontSize: 12,
            margin: "6px 0 0",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The full-width control: click or drop a file onto it.
 *
 * `label` is the headline on the zone. A clip that already has a file attached
 * says "Change media", because dropping onto it replaces what is there — an
 * "Upload media" button over an attached video reads as a second slot.
 */
export function MediaDropZone(props: Props & { hint?: string; label?: string }) {
  const { busy, error, run } = useUploader(props);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const describedBy = useId();

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
        void run(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={input}
        type="file"
        accept={MEDIA_ACCEPT}
        hidden
        onChange={(e) => {
          void run(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-describedby={describedBy}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 13,
          width: "100%",
          textAlign: "left",
          padding: 20,
          borderRadius: "var(--r-lg, 16px)",
          border: `2px dashed ${over ? "var(--red-hover)" : "var(--border-mid)"}`,
          background: over ? "var(--red-faint)" : "transparent",
          cursor: busy ? "default" : "pointer",
          fontFamily: "var(--font-body)",
          transition: "border-color .15s ease, background .15s ease",
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "var(--red-faint)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="upload" size={20} c="var(--red-on)" />
        </span>
        <span>
          <span
            style={{
              display: "block",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          >
            {busy ? "Uploading…" : (props.label ?? "Upload media")}
          </span>
          <span
            id={describedBy}
            style={{
              display: "block",
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {props.hint ??
              `Drop a file here or click to choose — MP4, MOV, WebM, JPG, PNG, WebP, GIF or PDF, up to ${formatBytes(MEDIA_MAX_BYTES)}.`}
          </span>
        </span>
      </button>
      {error && (
        <p
          style={{
            color: "var(--danger)",
            fontFamily: "var(--font-body)",
            fontSize: 12.5,
            margin: "8px 0 0",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
