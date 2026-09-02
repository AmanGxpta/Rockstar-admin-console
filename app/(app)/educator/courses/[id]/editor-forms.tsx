"use client";

import { useActionState, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  Label,
  Select,
  TextInput,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import {
  addBlock,
  deleteBlock,
  deleteLesson,
  deleteModule,
  updateLesson,
  type ActionResult,
} from "@/lib/course-actions";
import type { EditorLesson } from "@/lib/course-tree";
import type { UploadedMedia } from "@/lib/media-upload";

import { MediaPickerButton } from "./media-picker";

const KINDS = [
  { value: "video", label: "Clip" },
  { value: "text", label: "Notes" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
  { value: "embed", label: "Link" },
];

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

/** The clip's own fields. Saves on its own, apart from the blocks below it. */
export function ClipTitleForm({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: EditorLesson;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateLesson,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lesson.id} />

      <Label>Clip title</Label>
      <TextInput name="title" defaultValue={lesson.title} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 12,
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
          }}
        >
          <input
            type="checkbox"
            name="is_preview"
            defaultChecked={lesson.is_preview}
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
          <WBtn type="submit" sm icon="check2" disabled={pending}>
            {pending ? "Saving…" : "Save clip"}
          </WBtn>
        </div>
      </div>

      <FormError state={state} />
    </form>
  );
}

export function AddBlockForm({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  // Controlled, because an upload writes into three of them at once: the file
  // decides the source, the kind and — for a clip — its length. An uncontrolled
  // form would leave the author to retype what the file already knew.
  const [kind, setKind] = useState("video");
  const [url, setUrl] = useState("");
  const [minutes, setMinutes] = useState("");
  const [uploaded, setUploaded] = useState<string | null>(null);

  // Not useResettingAction: form.reset() cannot clear a controlled field, so
  // this clears the state instead — and only on success, so a rejected block
  // leaves the author what they typed rather than making them type it again.
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, form) => {
      const result = await addBlock(prev, form);
      if ("ok" in result) {
        ref.current?.reset();
        setUrl("");
        setMinutes("");
        setUploaded(null);
      }
      return result;
    },
    null,
  );

  const onUploaded = (media: UploadedMedia) => {
    setUrl(media.path);
    setKind(media.kind);
    setUploaded(media.fileName);
    if (media.durationSeconds !== null) {
      setMinutes((media.durationSeconds / 60).toFixed(1).replace(/\.0$/, ""));
    }
  };

  return (
    <form ref={ref} action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Label>Add a block</Label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 90px auto",
          gap: 10,
          alignItems: "start",
        }}
      >
        <Select name="kind" options={KINDS} value={kind} onChange={setKind} />
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                name="url"
                placeholder="Upload a file, or paste an https:// URL"
                value={url}
                onChange={(next) => {
                  setUrl(next);
                  setUploaded(null);
                }}
              />
            </div>
            <MediaPickerButton
              courseId={courseId}
              lessonId={lessonId}
              onUploaded={onUploaded}
            />
          </div>
          {uploaded && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <Icon name="check2" size={13} c="var(--success)" />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {uploaded} uploaded — add the block to attach it.
              </span>
            </div>
          )}
          <Textarea name="body" rows={2} placeholder="Notes, or a caption" />
        </div>
        <TextInput
          name="minutes"
          type="number"
          placeholder="min"
          value={minutes}
          onChange={setMinutes}
        />
        <WBtn type="submit" kind="ghost" sm disabled={pending}>
          {pending ? "…" : "Add"}
        </WBtn>
      </div>
      <FormError state={state} />
    </form>
  );
}
