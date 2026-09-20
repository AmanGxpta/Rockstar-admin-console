"use client";

import { useState, useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import {
  Label,
  Select,
  TextInput,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import {
  deleteBlock,
  deleteLesson,
  deleteModule,
  saveClip,
  type ActionResult,
} from "@/lib/course-actions";
import type { EditorLesson, LessonBlockKind } from "@/lib/course-tree";
import type { UploadedMedia } from "@/lib/media-upload";

import { ClipPreview } from "./clip-preview";
import { MediaDropZone } from "./media-picker";

/**
 * What an author picks in Format. `text` is deliberately absent: a clip with a
 * caption and no file *is* a text block, and saveClip works that out rather
 * than asking. Offering it here would let someone choose Notes and then attach
 * a video to it.
 */
const FORMATS = [
  { value: "video", label: "Video" },
  { value: "image", label: "Image or GIF" },
  { value: "pdf", label: "PDF" },
  { value: "embed", label: "Link" },
];

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function FormError({ state }: { state: ActionResult | null }) {
  if (!state || !("error" in state)) return null;
  return (
    <p
      style={{
        color: "var(--danger)",
        fontFamily: "var(--font-body)",
        fontSize: 12.5,
        marginTop: 8,
      }}
    >
      {state.error}
    </p>
  );
}

/** A delete control that is a real form post, so it works without JS. */
export function DeleteButton({
  kind,
  courseId,
  id,
  label,
}: {
  kind: "module" | "lesson" | "block";
  courseId: string;
  id: string;
  label: string;
}) {
  const action =
    kind === "module"
      ? deleteModule
      : kind === "lesson"
        ? deleteLesson
        : deleteBlock;
  const field =
    kind === "module" ? "moduleId" : kind === "lesson" ? "lessonId" : "blockId";

  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name={field} value={id} />
      <WBtn type="submit" kind="text" sm>
        {label}
      </WBtn>
    </form>
  );
}



/**
 * The whole clip: a title, a caption, the format, and the one file attached.
 *
 * Everything saves together, so an author fills the panel in and presses Save
 * once. There is no block list and no add-a-block row — a clip is one piece of
 * media with something written under it, and the editor should not ask for
 * more structure than that.
 */
export function ClipForm({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: EditorLesson;
}) {
  // The block the panel edits. A clip has one; anything beyond it belongs to a
  // course authored before this editor and is left alone.
  const block = lesson.lesson_blocks[0] ?? null;
  const extras = Math.max(0, lesson.lesson_blocks.length - 1);

  const [title, setTitle] = useState(lesson.title);
  const [caption, setCaption] = useState(block?.body ?? "");
  const [kind, setKind] = useState<string>(
    block && block.kind !== "text" ? block.kind : "video",
  );
  const [url, setUrl] = useState<string | null>(block?.url ?? null);
  const [duration, setDuration] = useState<number | null>(
    block?.duration_seconds ?? null,
  );
  const [isPreview, setIsPreview] = useState(lesson.is_preview);
  const [fileName, setFileName] = useState<string | null>(null);
  const [state, setState] = useState<ActionResult | null>(null);
  const [saving, start] = useTransition();

  const onUploaded = (media: UploadedMedia) => {
    setUrl(media.path);
    setKind(media.kind);
    setDuration(media.durationSeconds);
    setFileName(media.fileName);
    setState(null);
  };

  const save = () =>
    start(async () => {
      setState(
        await saveClip({
          courseId,
          lessonId: lesson.id,
          title,
          caption,
          kind: kind as LessonBlockKind,
          url,
          durationSeconds: duration,
          isPreview,
        }),
      );
    });

  const formatLabel = FORMATS.find((f) => f.value === kind)?.label ?? "Video";

  return (
    // The preview sits inside the form, not beside it in ClipDetail, because
    // what it shows is this component's state: the file an author has just
    // dropped is attached here and not saved anywhere yet, and a box rendered
    // one level up could only ever show what the last save left behind.
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>
      <ClipPreview path={url} kind={kind} fileName={fileName} />

      <div style={{ minWidth: 0 }}>
        <Label>Clip title</Label>
        <TextInput value={title} onChange={setTitle} placeholder="Untitled clip" />

        <div style={{ marginTop: 16 }}>
          <Label>Caption</Label>
          <Textarea
            value={caption}
            onChange={setCaption}
            rows={3}
            placeholder="What the student should notice in this clip."
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Label hint={duration !== null ? clock(duration) : undefined}>Format</Label>
          <Select options={FORMATS} value={kind} onChange={setKind} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 7,
              fontSize: 12,
              color: url ? "var(--text-secondary)" : "var(--text-muted)",
              minWidth: 0,
            }}
          >
            <Icon
              name={url ? "check2" : "upload"}
              size={13}
              c={url ? "var(--success)" : "var(--text-muted)"}
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {url
                ? `${formatLabel} attached — ${fileName ?? url.split("/").pop()}`
                : "Nothing attached yet — drop a file below."}
            </span>
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl(null);
                  setDuration(null);
                  setFileName(null);
                }}
                style={{
                  marginLeft: "auto",
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--red)",
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {extras > 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              margin: "10px 0 0",
              lineHeight: 1.5,
            }}
          >
            This clip has {extras} more block{extras > 1 ? "s" : ""} from an older
            import. They still play, and saving here leaves them untouched.
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 18,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {/* Kept though the design does not show it: is_preview is what lets
                a lesson be watched without an entitlement, and dropping the
                control would leave that rule with no way to be set. */}
            <input
              type="checkbox"
              checked={isPreview}
              onChange={(e) => setIsPreview(e.target.checked)}
            />
            Free preview
          </label>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <DeleteButton
              kind="lesson"
              courseId={courseId}
              id={lesson.id}
              label="Remove clip"
            />
            <WBtn type="button" sm icon="check2" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </WBtn>
          </div>
        </div>

        <FormError state={state} />

        <div style={{ marginTop: 18 }}>
          <MediaDropZone
            courseId={courseId}
            lessonId={lesson.id}
            onUploaded={onUploaded}
            hint={
              url
                ? "Drop another file to replace the one attached — then Save."
                : "Video, image, GIF or PDF · drag & drop, or click to choose."
            }
          />
        </div>
      </div>
    </div>
  );
}
