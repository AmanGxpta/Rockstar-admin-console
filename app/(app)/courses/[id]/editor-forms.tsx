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
import { saveClip, type ActionResult } from "@/lib/course-actions";
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

/** The fields an author types, which are what Save is offered for. */
type Typed = {
  title: string;
  caption: string;
  kind: string;
  isPreview: boolean;
};

/** Everything a save writes: the typed fields plus the attached file. */
type Saved = Typed & {
  url: string | null;
  durationSeconds: number | null;
};

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

/**
 * The whole clip: a title, a caption, the format, and the one file attached.
 *
 * Everything saves together, so an author fills the panel in and presses Save
 * once. There is no block list and no add-a-block row — a clip is one piece of
 * media with something written under it, and the editor should not ask for
 * more structure than that.
 *
 * Two things save on their own terms. A file that finishes uploading is saved
 * immediately, because by then it is already in the bucket and a Save the
 * author never pressed is the difference between a clip that plays and an
 * orphaned object. The typed fields are not: they save when Save is pressed,
 * and Save is only on screen while one of them differs from what is stored —
 * a button that is always lit says nothing about whether there is anything to
 * keep.
 *
 * The auto-save carries whatever is typed at that moment along with the file,
 * so an upload leaves the panel clean rather than saving half of it.
 *
 * Deleting the clip is not here. It is the dustbin on the clip's row in the
 * structure list, which is also where a chapter is deleted — this panel used
 * to carry both "Remove" (detach the file) and "Remove clip" (delete the
 * lesson) a line apart, and the pair read as one control that had been drawn
 * twice. What replaced detaching is the drop zone itself: it says "Change
 * media" once something is attached, and a new file replaces the old.
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

  // What the typed fields looked like at the last successful save. Compared
  // against the live ones to decide whether Save has anything to do. Format is
  // in here with the other three: it is an editable control on the same panel,
  // and leaving it out would let an author switch a clip from Video to PDF
  // with no way to keep the change.
  const [stored, setStored] = useState<Typed>({
    title: lesson.title,
    caption: block?.body ?? "",
    kind: block && block.kind !== "text" ? block.kind : "video",
    isPreview: lesson.is_preview,
  });

  const dirty =
    title !== stored.title ||
    caption !== stored.caption ||
    kind !== stored.kind ||
    isPreview !== stored.isPreview;

  /**
   * One save path for both the button and the upload.
   *
   * `patch` is what the upload knows and the component's state does not yet:
   * setState is queued, so reading `url` back here right after setUrl would
   * save the file the clip had before this one.
   */
  const persist = (patch: Partial<Saved> = {}) =>
    start(async () => {
      const next: Saved = {
        title,
        caption,
        kind,
        isPreview,
        url,
        durationSeconds: duration,
        ...patch,
      };

      const result = await saveClip({
        courseId,
        lessonId: lesson.id,
        title: next.title,
        caption: next.caption,
        kind: next.kind as LessonBlockKind,
        url: next.url,
        durationSeconds: next.durationSeconds,
        isPreview: next.isPreview,
      });

      setState(result);
      if (!("error" in result)) {
        setStored({
          title: next.title,
          caption: next.caption,
          kind: next.kind,
          isPreview: next.isPreview,
        });
      }
    });

  const onUploaded = (media: UploadedMedia) => {
    setUrl(media.path);
    setKind(media.kind);
    setDuration(media.durationSeconds);
    setFileName(media.fileName);
    setState(null);
    persist({
      kind: media.kind,
      url: media.path,
      durationSeconds: media.durationSeconds,
    });
  };

  const formatLabel = FORMATS.find((f) => f.value === kind)?.label ?? "Video";

  return (
    // The preview sits inside the form, not beside it in ClipDetail, because
    // what it shows is this component's state: the file an author has just
    // dropped is attached here and not saved anywhere yet, and a box rendered
    // one level up could only ever show what the last save left behind.
    <div className="rs-split-label" style={{ gap: 18 }}>
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
              // Held open so the checkbox does not slide sideways every time
              // the button comes and goes.
              minHeight: 34,
            }}
          >
            {saving ? (
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                Saving…
              </span>
            ) : dirty ? (
              <WBtn type="button" sm icon="check2" onClick={() => persist()}>
                Save
              </WBtn>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}
              >
                <Icon name="check2" size={13} c="var(--success)" />
                Saved
              </span>
            )}
          </div>
        </div>

        <FormError state={state} />

        <div style={{ marginTop: 18 }}>
          <MediaDropZone
            courseId={courseId}
            lessonId={lesson.id}
            onUploaded={onUploaded}
            label={url ? "Change media" : "Upload media"}
            hint={
              url
                ? "Drop another file to replace the one attached — it saves on its own."
                : "Video, image, GIF or PDF · drag & drop, or click to choose."
            }
          />
        </div>
      </div>
    </div>
  );
}
