"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  Field,
  Select,
  TextInput,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import { createCourse, type ActionResult } from "@/lib/course-actions";

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
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createCourse,
    null,
  );

  return (
    <form action={action}>
      <Card pad={28}>
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

        {state && "error" in state && (
          <p
            style={{
              color: "var(--red)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {state.error}
          </p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <WBtn type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create course"}
          </WBtn>
          <WBtn kind="ghost" onClick={() => router.back()}>
            Cancel
          </WBtn>
        </div>
      </Card>
    </form>
  );
}
