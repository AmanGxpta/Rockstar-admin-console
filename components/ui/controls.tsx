"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Interactive form controls from the design's quiz builder.
 *
 * These live apart from components/ui/primitives.tsx on purpose: primitives is
 * imported by server components, and everything here takes an onChange, so
 * folding them in would pull the whole primitives module across the client
 * boundary.
 */

const FIELD_SHADOW = "inset 0 0 0 1.5px var(--border-mid)";

export function TInput({
  value,
  onChange,
  placeholder,
  big,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  big?: boolean;
  style?: CSSProperties;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        height: big ? 52 : 42,
        borderRadius: 11,
        border: "none",
        outline: "none",
        background: "var(--dark)",
        boxShadow: FIELD_SHADOW,
        padding: "0 14px",
        fontFamily: "var(--font-body)",
        fontSize: big ? 16 : 13.5,
        fontWeight: big ? 700 : 600,
        color: "var(--text-primary)",
        ...style,
      }}
    />
  );
}

export function TArea({
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        borderRadius: 11,
        border: "none",
        outline: "none",
        resize: "none",
        background: "var(--dark)",
        boxShadow: FIELD_SHADOW,
        padding: "11px 14px",
        fontFamily: "var(--font-body)",
        fontSize: 13.5,
        lineHeight: 1.45,
        fontWeight: 500,
        color: "var(--text-primary)",
      }}
    />
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: "pointer",
        flexShrink: 0,
        background: on ? "var(--red)" : "var(--cream-3)",
        transition: "background 0.16s",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#fff",
          transition: "left 0.16s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      />
    </button>
  );
}

/** Segmented picker — the design's "Attempts allowed" control. */
export function Seg({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        background: "var(--dark)",
        padding: 4,
        borderRadius: 11,
        boxShadow: FIELD_SHADOW,
      }}
    >
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            type="button"
            key={o}
            onClick={() => onChange(o)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "7px 4px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              fontWeight: 700,
              background: on ? "var(--dark-2)" : "transparent",
              color: on ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: on ? "var(--sh-1)" : "none",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

/** A labelled settings row with its control on the right. */
export function RowSetting({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Transient confirmation pill, bottom-centre, as in the design's editor. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 22,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        background: "var(--ink)",
        color: "var(--paper)",
        padding: "11px 18px",
        borderRadius: 999,
        fontSize: 13.5,
        fontWeight: 600,
        boxShadow: "var(--sh-3)",
        display: "flex",
        alignItems: "center",
        gap: 9,
      }}
    >
      {message}
    </div>
  );
}
