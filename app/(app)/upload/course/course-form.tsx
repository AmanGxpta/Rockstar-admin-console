"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CoverField } from "@/components/ui/cover-picker";
import {
  Card,
  Field,
  Label,
  Select,
  TextInput,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import { createCourse, setCourseCover } from "@/lib/course-actions";
import { useCoverUpload } from "@/lib/media-upload";

const CATEGORIES = [
  { value: "color", label: "Colour" },
  { value: "cutting", label: "Cutting" },
  { value: "styling", label: "Styling" },
  { value: "editorial", label: "Editorial" },
  { value: "business", label: "Business" },
];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type Draft = {
  title: string;
  subtitle: string;
  category: string;
  level: string;
  price: string;
  overview: string;
};

const EMPTY: Draft = {
  title: "",
  subtitle: "",
  category: "",
  level: "",
  price: "",
  overview: "",
};

const FIELDS = Object.keys(EMPTY) as (keyof Draft)[];

/**
 * A new course, which is the one form on this console where "changed" means
 * "started".
 *
 * The fields are controlled off `draft` rather than left to the DOM, for the
 * reason the settings screen states: an uncontrolled input knows its own value
 * but nothing re-renders when it changes, so nothing can ever decide whether
 * there is anything to create. Create course is therefore absent on a blank
 * form and appears the moment any field is filled in or a cover is chosen —
 * clearing them all again takes it away, which is the honest answer, since
 * there is nothing left to submit.
 *
 * Absent rather than disabled: a greyed-out button on an empty form is a
 * riddle about which field unlocks it. Nothing is missing until something has
 * been started, and what a half-filled form is still missing is said by the
 * action, in a sentence, on submit.
 */
export function CourseForm() {
  const router = useRouter();
  const uploadCover = useCoverUpload();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Said out loud because it is the slow half: the row is one insert, the
  // image can be five megabytes.
  const [stage, setStage] = useState<"idle" | "creating" | "uploading">("idle");

  const started = cover !== null || FIELDS.some((k) => draft[k].trim() !== "");

  const set = (key: keyof Draft) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // The last failure described the form as it was; typing has retired it.
    setError((e) => (e === null ? e : null));
  };

  /**
   * Create, then upload, then go.
   *
   * The order is forced: the storage policy resolves who may write from the
   * course id in the object path, so there is nowhere to put the cover until
   * the course exists. A failure after the insert is therefore not a failed
   * create — the course is real, and the editor is where its cover gets
   * another try, which is what the message says rather than making the author
   * guess whether to fill the form in again.
   */
  const submit = () =>
    start(async () => {
      setError(null);
      setStage("creating");

      // Built here rather than read off the <form>, because the fields are
      // state now and the action's signature is FormData either way.
      const form = new FormData();
      for (const key of FIELDS) form.set(key, draft[key]);

      const created = await createCourse(null, form);

      if ("error" in created) {
        setStage("idle");
        setError(created.error);
        return;
      }

      if (cover) {
        setStage("uploading");
        const uploaded = await uploadCover(created.id, cover);
        if (uploaded.ok) await setCourseCover(created.id, uploaded.path);
        else {
          setStage("idle");
          setError(`Course created, but the cover didn't upload: ${uploaded.error}`);
          return;
        }
      }

      router.push(`/courses/${created.id}`);
    });

  return (
    <Card pad={28}>
      {/* Not a <Field>: that renders a <label>, and a label wrapping the
          picker's own buttons makes every click on them open the file
          dialog a second time. */}
      <div style={{ marginBottom: 16 }}>
        <Label>Cover</Label>
        <CoverField file={cover} onChange={setCover} />
      </div>

      <Field label="Title">
        <TextInput
          placeholder="Balayage that grows out well"
          value={draft.title}
          onChange={set("title")}
        />
      </Field>

      <Field label="Subtitle">
        <TextInput
          placeholder="One line for the course card"
          value={draft.subtitle}
          onChange={set("subtitle")}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Category">
          <Select
            options={CATEGORIES}
            placeholder="Choose one"
            value={draft.category}
            onChange={set("category")}
          />
        </Field>
        <Field label="Level">
          <Select
            options={LEVELS}
            placeholder="Choose one"
            value={draft.level}
            onChange={set("level")}
          />
        </Field>
      </div>

      <Field label="Price (leave blank for free)">
        <TextInput
          type="number"
          placeholder="149"
          value={draft.price}
          onChange={set("price")}
        />
      </Field>

      <Field label="Overview">
        <Textarea
          rows={5}
          placeholder="What the student walks away able to do."
          value={draft.overview}
          onChange={set("overview")}
        />
      </Field>

      {error && (
        <p
          style={{
            color: "var(--red-on)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        {started && (
          <WBtn disabled={pending} onClick={submit}>
            {stage === "uploading"
              ? "Uploading cover…"
              : pending
                ? "Creating…"
                : "Create course"}
          </WBtn>
        )}
        <WBtn kind="ghost" onClick={() => router.back()}>
          Cancel
        </WBtn>
      </div>
    </Card>
  );
}
