"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";

import { Icon } from "@/components/ui/icon";
import { Card, SectionH, WBtn } from "@/components/ui/primitives";
import {
  updateNotificationPrefs,
  type ActionResult,
} from "@/lib/profile-actions";
import {
  NOTIFICATION_KEYS,
  type NotificationPrefs,
} from "@/lib/notification-prefs";

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 0",
        borderBottom: "0.5px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--red)" }}
      />
      <span style={{ flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: 13.5,
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: 3,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      </span>
    </label>
  );
}

/**
 * The switches are controlled off `draft`, with `saved` holding what is
 * believed to be in the row, because the Save button only exists while the
 * two disagree. Uncontrolled inputs on a `defaultChecked` cannot answer "has
 * anything changed" — the DOM knows its own state but nothing re-renders when
 * it flips, so the button could never appear.
 *
 * There is deliberately no `<form>` here, and that is not tidiness. React
 * queues `requestFormReset` when a `<form action>` settles and the commit runs
 * the DOM's own `form.reset()`. A text box survives that because React writes
 * the controlled value back; a checkbox does not — reset returns it to the
 * value it mounted with, `draft` never changed so nothing re-renders, and the
 * DOM is left contradicting the state. Seen on this screen before the form
 * came out: turning a switch off and saving wrote `false` to the row, said
 * "Saved.", and then drew the switch back on, so the one thing the educator
 * had just changed was the one thing the screen denied. The switch positions
 * go to the action as an object instead; there is nothing left for a reset to
 * undo.
 *
 * `saved` is advanced by a successful write rather than read back from the
 * `prefs` prop. The action revalidates the path, so the prop does catch up,
 * but not on a clock this component can depend on; moving the baseline when
 * the action says it wrote means the button goes away exactly when the save
 * lands and stays put when it fails.
 */
export function SettingsForm({
  email,
  prefs,
}: {
  email: string;
  prefs: NotificationPrefs;
}) {
  const { openUserProfile, signOut } = useClerk();
  const [saved, setSaved] = useState<NotificationPrefs>(prefs);
  const [draft, setDraft] = useState<NotificationPrefs>(prefs);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const dirty = NOTIFICATION_KEYS.some(({ key }) => draft[key] !== saved[key]);

  // Flipping a switch retires the last verdict: "Saved." sitting over a row
  // of switches that have been changed since describes a form that no longer
  // exists. Toggling back to what was stored clears `dirty` on its own, which
  // is the honest answer — nothing is waiting to be written.
  const toggle = (key: keyof NotificationPrefs) => (next: boolean) => {
    setDraft((d) => ({ ...d, [key]: next }));
    setResult((r) => (r === null ? r : null));
  };

  const save = () => {
    // Snapshot what is being sent. A switch flipped while the write is in
    // flight belongs to the next save, and advancing the baseline to the
    // current draft instead would hide that change behind a Save button that
    // never came back.
    const attempted = draft;
    start(async () => {
      setResult(null);
      const outcome = await updateNotificationPrefs(attempted);
      setResult(outcome);
      if ("ok" in outcome) setSaved(attempted);
    });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <SectionH>Notifications</SectionH>
      <Card>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            margin: "0 0 6px",
            lineHeight: 1.6,
          }}
        >
          What you hear about. These are saved now; delivery itself is not
          wired up yet, so nothing is sent either way.
        </p>

        {NOTIFICATION_KEYS.map(({ key, label, hint }) => (
          <Switch
            key={key}
            label={label}
            hint={hint}
            checked={draft[key]}
            onChange={toggle(key)}
          />
        ))}

        {result && (
          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              color:
                "error" in result ? "var(--red)" : "var(--text-secondary)",
            }}
          >
            {"error" in result ? result.error : "Saved."}
          </div>
        )}

        {dirty && (
          <div style={{ marginTop: 18 }}>
            <WBtn icon="check" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save preferences"}
            </WBtn>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 28 }}>
        <SectionH>Sign-in</SectionH>
        <Card>
          {/*
            Email, password and MFA are Clerk's, not ours — `users.email` is a
            mirror the webhook keeps current, so editing it here would be
            writing to a copy. Clerk's own modal is the honest control.
          */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingBottom: 16,
              borderBottom: "0.5px solid var(--border)",
            }}
          >
            <Icon name="mail" size={17} c="var(--text-muted)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: "var(--text-primary)" }}>
                {email}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Email, password and two-factor are managed by your sign-in
                provider.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <WBtn kind="ghost" icon="gear" onClick={() => openUserProfile()}>
              Manage sign-in
            </WBtn>
            <WBtn
              kind="ghost"
              icon="logout"
              onClick={() => signOut({ redirectUrl: "/login" })}
            >
              Sign out
            </WBtn>
          </div>
        </Card>
      </div>
    </div>
  );
}
