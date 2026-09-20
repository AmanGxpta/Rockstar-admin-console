"use client";

import { useState, useTransition } from "react";

import {
  Card,
  Field,
  SectionH,
  TextInput,
  Textarea,
  WBtn,
} from "@/components/ui/primitives";
import { updateEducatorProfile, type ActionResult } from "@/lib/profile-actions";
import type { EducatorAccount } from "@/lib/profile";

/**
 * Every box on this form is driven from `draft` rather than left uncontrolled
 * on a `defaultValue`, and that is the whole point of the screen rather than a
 * style choice. React resets a `<form action={…}>` as soon as the action
 * settles — `startHostTransition` queues `requestFormReset` before it even
 * calls the action, and the commit runs the DOM's own `form.reset()`, which
 * puts every uncontrolled field back to its `defaultValue`. It does that on a
 * rejected save exactly as on an accepted one, so an educator who typed a
 * paragraph and hit a validation error or a dropped connection watched the
 * paragraph vanish back to what was last persisted, with the error message
 * sitting above an empty box telling them to fix something they could no
 * longer see.
 *
 * Held in state, the text belongs to the client: a failed save leaves the
 * form exactly as they left it, the error names what to change, and they
 * change it in place and submit again. React restores a controlled field
 * after `form.reset()` fires, so the reset is harmless once the value comes
 * from here.
 */
type Draft = {
  full_name: string;
  headline: string;
  specialization: string;
  years_experience: string;
  bio: string;
  phone: string;
};

function draftOf(account: EducatorAccount): Draft {
  return {
    full_name: account.fullName,
    headline: account.headline,
    specialization: account.specialization,
    years_experience:
      account.yearsExperience === null ? "" : String(account.yearsExperience),
    bio: account.bio,
    phone: account.phone,
  };
}

export function ProfileForm({ account }: { account: EducatorAccount }) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(account));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  // Editing a field retires the last verdict. "Saved." over a box that has
  // been changed since, or an error naming a value that is no longer typed,
  // both describe a form that no longer exists.
  const field = (key: keyof Draft) => ({
    value: draft[key],
    onChange: (value: string) => {
      setDraft((d) => ({ ...d, [key]: value }));
      setResult((r) => (r === null ? r : null));
    },
  });

  const submit = (form: FormData) =>
    start(async () => {
      const outcome = await updateEducatorProfile(null, form);
      setResult(outcome);
      // The action trims before it writes, so on a clean save the boxes are
      // squared up with the row. On an error nothing here is touched — the
      // draft is the only copy of what they wrote.
      if ("ok" in outcome) {
        setDraft((d) => ({
          full_name: d.full_name.trim(),
          headline: d.headline.trim(),
          specialization: d.specialization.trim(),
          years_experience: d.years_experience.trim(),
          bio: d.bio.trim(),
          phone: d.phone.trim(),
        }));
      }
    });

  return (
    <form action={submit}>
      <SectionH>Public profile</SectionH>
      <Card>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          This is what a student sees on your course cards and in the catalog.
        </p>

        <Field label="Name">
          <TextInput name="full_name" {...field("full_name")} />
        </Field>

        <Field label="Headline">
          <TextInput
            name="headline"
            {...field("headline")}
            placeholder="Master colourist &amp; educator"
          />
        </Field>

        <Field label="Specialization">
          <TextInput
            name="specialization"
            {...field("specialization")}
            placeholder="Balayage, colour correction"
          />
        </Field>

        <Field label="Years of experience">
          <TextInput
            name="years_experience"
            type="number"
            {...field("years_experience")}
            placeholder="12"
          />
        </Field>

        <Field label="About">
          <Textarea
            name="bio"
            rows={5}
            {...field("bio")}
            placeholder="How you trained, what you teach, and who you teach it to."
          />
        </Field>
      </Card>

      <div style={{ marginTop: 24 }}>
        <SectionH>Private</SectionH>
        <Card>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              margin: "0 0 20px",
              lineHeight: 1.6,
            }}
          >
            Only you and an administrator can see these.
          </p>

          <Field label="Phone">
            <TextInput name="phone" type="tel" {...field("phone")} placeholder="Optional" />
          </Field>
        </Card>
      </div>

      {result && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 16,
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            fontSize: 13,
            lineHeight: 1.6,
            background: "error" in result ? "var(--red-faint)" : "var(--dark-2)",
            border: "0.5px solid var(--border)",
            color:
              "error" in result ? "var(--red)" : "var(--text-secondary)",
          }}
        >
          {"error" in result ? (
            <>
              {result.error}
              <div style={{ color: "var(--text-muted)", marginTop: 4 }}>
                Nothing you typed has been lost — correct it below and save
                again.
              </div>
            </>
          ) : (
            "Saved."
          )}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <WBtn type="submit" icon="check" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </WBtn>
      </div>
    </form>
  );
}
