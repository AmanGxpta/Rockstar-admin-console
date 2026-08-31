import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icon";

/**
 * Main's brand has no supplied logo asset, so the mark is drawn rather than
 * imported — unlike the white-label build's RSLogo, which renders
 * public/logo.svg. Keep this function's body branch-specific when merging;
 * every call site only ever passes `size`, so the two implementations can
 * diverge freely without touching call sites.
 */
export function RSLogo({
  size = 22,
  color = "var(--ink)",
  mark = "var(--clay)",
  wordmark = true,
  style,
}: {
  size?: number;
  color?: string;
  mark?: string;
  wordmark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.36, ...style }}>
      <svg
        width={size * 1.04}
        height={size * 1.04}
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M12 1.5l2.3 6.9 7.2.3-5.7 4.4 2 6.9L12 16.1 6.2 20l2-6.9L2.5 8.7l7.2-.3L12 1.5Z"
          fill={mark}
        />
        <circle cx="12" cy="11.6" r="2.1" fill="#fff" fillOpacity="0.92" />
      </svg>
      {wordmark && (
        <span
          style={{
            fontFamily: "var(--font-head)",
            fontWeight: 800,
            fontSize: size,
            color,
            letterSpacing: "-.03em",
          }}
        >
          Rockstar
        </span>
      )}
    </div>
  );
}

const AVATAR_TONES = ["var(--dark-3)", "var(--dark-4)", "var(--red-faint)"];

export function Avatar({
  name,
  size = 40,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tone = AVATAR_TONES[(name.charCodeAt(0) || 0) % AVATAR_TONES.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: tone,
        border: "0.5px solid var(--border-mid)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-primary)",
        fontFamily: "var(--font-word)",
        fontWeight: 300,
        fontSize: size * 0.36,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export type BadgeTone = "active" | "complete" | "locked" | "warn" | "neutral";

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string; dot?: string }> = {
  active: { bg: "var(--danger-bg)", fg: "#E06060", dot: "#E06060" },
  complete: { bg: "var(--success-bg)", fg: "var(--success)", dot: "var(--success)" },
  locked: { bg: "rgba(240,237,232,0.07)", fg: "var(--text-muted)", dot: "var(--text-muted)" },
  warn: { bg: "var(--warn-bg)", fg: "var(--warn)", dot: "var(--warn)" },
  neutral: { bg: "var(--dark-3)", fg: "var(--text-secondary)" },
};

export function Badge({
  children,
  tone = "neutral",
  dot = true,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  const t = BADGE_TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        fontFamily: "var(--font-word)",
        fontWeight: 300,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "4px 12px",
        background: t.bg,
        color: t.fg,
        border: tone === "neutral" ? "0.5px solid var(--border-mid)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {dot && t.dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: t.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export function ProgressBar({
  value = 50,
  h = 3,
  c = "var(--red)",
  track = "var(--dark-3)",
}: {
  value?: number;
  h?: number;
  c?: string;
  track?: string;
}) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 999,
        background: track,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          borderRadius: 999,
          background: c,
        }}
      />
    </div>
  );
}

const BTN_KINDS = {
  primary: { background: "var(--red)", color: "var(--cream)" },
  ghost: {
    background: "transparent",
    color: "var(--text-primary)",
    border: "0.5px solid var(--border-strong)",
  },
  text: { background: "transparent", color: "var(--red)", padding: "12px 2px" },
} as const;

const BTN_CLASS = {
  primary: "rs-btn-primary",
  ghost: "rs-btn-ghost",
  text: "",
} as const;

export function WBtn({
  children,
  kind = "primary",
  icon,
  sm,
  type = "button",
  style,
  onClick,
  disabled,
}: {
  children: ReactNode;
  kind?: keyof typeof BTN_KINDS;
  icon?: IconName;
  sm?: boolean;
  type?: "button" | "submit";
  style?: CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={BTN_CLASS[kind]}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderRadius: "var(--r-sm)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-word)",
        fontWeight: 200,
        fontSize: sm ? 10 : 11,
        letterSpacing: sm ? "0.14em" : "0.16em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        padding: sm ? "9px 18px" : "13px 28px",
        transition: "background 0.18s, border-color 0.18s, opacity 0.18s",
        opacity: disabled ? 0.5 : 1,
        ...BTN_KINDS[kind],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={sm ? 14 : 15} />}
      {children}
    </button>
  );
}

export function Card({
  children,
  pad = 20,
  style,
}: {
  children: ReactNode;
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--dark-2)",
        border: "0.5px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function KPI({
  icon,
  label,
  value,
  delta,
  up = true,
}: {
  icon: IconName;
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--r-sm)",
            background: "var(--dark-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={17} c="var(--red)" />
        </div>
        {delta && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: up ? "var(--success)" : "var(--danger)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Icon
              name="arrowUR"
              size={12}
              c={up ? "var(--success)" : "var(--danger)"}
              style={{ transform: up ? "none" : "rotate(90deg)" }}
            />
            {delta}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-head)",
          fontWeight: 700,
          fontSize: 26,
          marginTop: 14,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
        {label}
      </div>
    </Card>
  );
}

export function SectionH({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      <h3
        className="rs-head"
        style={{ margin: 0, fontSize: 17 }}
      >
        {children}
      </h3>
      {action}
    </div>
  );
}

/** Column: [heading, flex, align?] */
export type Col = [string, number?, CSSProperties["textAlign"]?];

export function Table({ cols, rows }: { cols: Col[]; rows: ReactNode[][] }) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          padding: "0 16px 12px",
          borderBottom: "0.5px solid var(--border-mid)",
        }}
      >
        {cols.map(([label, flex, align], i) => (
          <div
            key={i}
            className="rs-word"
            style={{
              flex: flex ?? 1,
              fontSize: 10,
              fontWeight: 200,
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textAlign: align ?? "left",
            }}
          >
            {label}
          </div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className="rs-row"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom:
              i < rows.length - 1 ? "0.5px solid var(--border)" : "none",
          }}
        >
          {row.map((cell, j) => (
            <div
              key={j}
              style={{
                flex: cols[j][1] ?? 1,
                fontSize: 13.5,
                color: "var(--text-secondary)",
                textAlign: cols[j][2] ?? "left",
                minWidth: 0,
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Module-card pattern from the style guide, reused for any list of
 * course-like items (a course, a module, a submission). */
export function ItemCard({
  eyebrow,
  title,
  description,
  footer,
  tone = "default",
  href,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "active" | "locked";
  href?: string;
}) {
  const style: CSSProperties = {
    display: "block",
    background: tone === "active" ? "rgba(140,26,26,0.06)" : "var(--dark-2)",
    border: `0.5px solid ${tone === "active" ? "var(--red-muted)" : "var(--border)"}`,
    borderRadius: "var(--r-card)",
    padding: "22px 26px",
    marginBottom: 10,
    opacity: tone === "locked" ? 0.5 : 1,
    textDecoration: "none",
    color: "inherit",
  };

  const content = (
    <>
      {eyebrow && (
        <div className="rs-label" style={{ marginBottom: 6 }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div className="rs-head" style={{ fontSize: 17, lineHeight: 1.25 }}>
          {title}
        </div>
      </div>
      {description && (
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            marginTop: 6,
          }}
        >
          {description}
        </div>
      )}
      {footer && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
          {footer}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} style={style} className="rs-row">
        {content}
      </Link>
    );
  }
  return <div style={style}>{content}</div>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <div className="rs-label" style={{ marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

export function TextInput({
  name,
  type = "text",
  placeholder,
  defaultValue,
}: {
  name?: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      style={{
        width: "100%",
        background: "var(--dark-2)",
        border: "0.5px solid var(--border-mid)",
        borderRadius: "var(--r-sm)",
        padding: "13px 16px",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        outline: "none",
      }}
      className="rs-input"
    />
  );
}

export function Textarea({
  name,
  placeholder,
  rows = 4,
}: {
  name?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        background: "var(--dark-2)",
        border: "0.5px solid var(--border-mid)",
        borderRadius: "var(--r-sm)",
        padding: "13px 16px",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        outline: "none",
        resize: "vertical",
      }}
      className="rs-input"
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--dark-2)",
          border: "0.5px solid var(--border-mid)",
          borderRadius: "var(--r-card)",
          padding: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <h3 className="rs-head" style={{ margin: 0, fontSize: 19 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <Icon name="x" size={18} c="var(--text-muted)" />
          </button>
        </div>
        {children}
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 24,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Select({
  name,
  options,
  defaultValue,
  placeholder,
}: {
  name?: string;
  options: readonly { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      style={{
        width: "100%",
        background: "var(--dark-2)",
        border: "0.5px solid var(--border-mid)",
        borderRadius: "var(--r-sm)",
        padding: "13px 16px",
        color: "var(--text-primary)",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        outline: "none",
        appearance: "none",
      }}
      className="rs-input"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
