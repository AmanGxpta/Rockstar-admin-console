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

export function CourseForm() {
  const router = useRouter();
  const uploadCover = useCoverUpload();
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Said out loud because it is the slow half: the row is one insert, the
  // image can be five megabytes.
  const [stage, setStage] = useState<"idle" | "creating" | "uploading">("idle");

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
  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      setStage("creating");
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

      router.push(`/educator/courses/${created.id}`);
    });

  return (
    <form action={submit}>
      <Card pad={28}>
        {/* Not a <Field>: that renders a <label>, and a label wrapping the
            picker's own buttons makes every click on them open the file
            dialog a second time. */}
        <div style={{ marginBottom: 16 }}>
          <Label>Cover</Label>
          <CoverField file={cover} onChange={setCover} />
        </div>

        <Field label="Title">
          <TextInput name="title" placeholder="Balayage that grows out well" />
        </Field>

        <Field label="Subtitle">
          <TextInput name="subtitle" placeholder="One line for the course card" />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Category">
            <Select name="category" options={CATEGORIES} placeholder="Choose one" />
          </Field>
          <Field label="Level">
            <Select name="level" options={LEVELS} placeholder="Choose one" />
          </Field>
        </div>

        <Field label="Price (leave blank for free)">
          <TextInput name="price" type="number" placeholder="149" />
        </Field>

        <Field label="Overview">
          <Textarea
            name="overview"
            rows={5}
            placeholder="What the student walks away able to do."
          />
        </Field>

        {error && (
          <p
            style={{
              color: "var(--red)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <WBtn type="submit" disabled={pending}>
            {stage === "uploading"
              ? "Uploading cover…"
              : pending
                ? "Creating…"
                : "Create course"}
          </WBtn>
          <WBtn kind="ghost" onClick={() => router.back()}>
            Cancel
          </WBtn>
        </div>
      </Card>
    </form>
  );
}
