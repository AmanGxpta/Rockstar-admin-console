"use client";

import { useActionState, useRef } from "react";

import { Select, TextInput, Textarea, WBtn } from "@/components/ui/primitives";
import {
  addBlock,
  addLesson,
  addModule,
  type ActionResult,
} from "@/lib/course-actions";

const KINDS = [
  { value: "video", label: "Clip" },
  { value: "text", label: "Notes" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
  { value: "embed", label: "Link" },
];

function Error({ state }: { state: ActionResult | null }) {
  if (!state || !("error" in state)) return null;
  return (
    <p
      style={{
        color: "var(--red)",
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
 * Each add-form clears itself on success. Without this the author's last entry
 * stays in the box after the list below has already grown by one, which reads
 * as the submit having failed.
 */
function useResettingAction(
  fn: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>,
) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, form) => {
      const result = await fn(prev, form);
      if ("ok" in result) ref.current?.reset();
      return result;
    },
    null,
  );
  return { ref, state, action, pending };
}

export function AddModuleForm({ courseId }: { courseId: string }) {
  const { ref, state, action, pending } = useResettingAction(addModule);

  return (
    <form ref={ref} action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <TextInput name="title" placeholder="Chapter name" />
        </div>
        <WBtn type="submit" kind="ghost" icon="plus" disabled={pending}>
          {pending ? "Adding…" : "Add chapter"}
        </WBtn>
      </div>
      <Error state={state} />
    </form>
  );
}

export function AddLessonForm({
  courseId,
  moduleId,
}: {
  courseId: string;
  moduleId: string;
}) {
  const { ref, state, action, pending } = useResettingAction(addLesson);

  return (
    <form ref={ref} action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <TextInput name="title" placeholder="Lesson title" />
        </div>
        <label
          className="rs-word"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          <input type="checkbox" name="is_preview" />
          FREE PREVIEW
        </label>
        <WBtn type="submit" kind="ghost" sm disabled={pending}>
          {pending ? "Adding…" : "Add lesson"}
        </WBtn>
      </div>
      <Error state={state} />
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
  const { ref, state, action, pending } = useResettingAction(addBlock);

  return (
    <form ref={ref} action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 90px auto",
          gap: 10,
          alignItems: "start",
        }}
      >
        <Select name="kind" options={KINDS} defaultValue="video" />
        <div style={{ display: "grid", gap: 8 }}>
          <TextInput name="url" placeholder="Storage path or https:// URL" />
          <Textarea name="body" rows={2} placeholder="Notes, or a caption" />
        </div>
        <TextInput name="minutes" type="number" placeholder="min" />
        <WBtn type="submit" kind="ghost" sm disabled={pending}>
          {pending ? "…" : "Add"}
        </WBtn>
      </div>
      <Error state={state} />
    </form>
  );
}
