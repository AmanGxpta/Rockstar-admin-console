"use client";

import { useState, useTransition } from "react";

import {
  grantCourseAccess,
  revokeCourseAccess,
  type GrantDuration,
} from "@/lib/access-actions";
import { Select, WBtn } from "@/components/ui/primitives";

const DURATIONS: { value: GrantDuration; label: string }[] = [
  { value: "default", label: "Course default" },
  { value: "forever", label: "No expiry" },
  { value: "3", label: "3 months" },
  { value: "12", label: "12 months" },
];

function Note({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div style={{ fontSize: 12.5, color: "var(--red-hover)", marginTop: 8 }}>
      {text}
    </div>
  );
}

export function GrantAccess({
  studentId,
  courses,
}: {
  studentId: string;
  /** Published courses only — access to an unpublished one buys nothing. */
  courses: { id: string; title: string }[];
}) {
  const [courseId, setCourseId] = useState("");
  const [duration, setDuration] = useState<GrantDuration>("default");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  if (courses.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        Nothing to grant — no course is published yet.
      </div>
    );
  }

  const grant = () => {
    setError(null);
    start(async () => {
      const result = await grantCourseAccess(studentId, courseId, duration);
      if ("error" in result) setError(result.error);
      else setCourseId("");
    });
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1.6 }}>
          <Select
            options={courses.map((c) => ({ value: c.id, label: c.title }))}
            placeholder="Choose a course"
            value={courseId}
            onChange={setCourseId}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Select
            options={DURATIONS}
            value={duration}
            onChange={(v) => setDuration(v as GrantDuration)}
          />
        </div>
        <WBtn icon="check2" onClick={grant} disabled={busy || !courseId}>
          {busy ? "Granting…" : "Grant access"}
        </WBtn>
      </div>
      <Note text={error} />
    </div>
  );
}

export function RevokeAccess({
  studentId,
  courseId,
}: {
  studentId: string;
  courseId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <>
      <button
        type="button"
        title={error ?? "Revoke access"}
        onClick={() => {
          setError(null);
          start(async () => {
            const result = await revokeCourseAccess(studentId, courseId);
            if ("error" in result) setError(result.error);
          });
        }}
        disabled={busy}
        style={{
          border: "none",
          background: "none",
          padding: 0,
          cursor: busy ? "default" : "pointer",
          fontFamily: "var(--font-body)",
          fontSize: 12.5,
          fontWeight: 700,
          color: error ? "var(--red-hover)" : "var(--text-muted)",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "Revoking…" : "Revoke"}
      </button>
    </>
  );
}
