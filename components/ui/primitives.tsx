import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function RSLogo({
  size = 22,
  color = "var(--ink)",
  mark = "var(--clay)",
  wordmark = true,
}: {
  size?: number;
  color?: string;
  mark?: string;
  wordmark?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.36 }}>
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
            fontFamily: "var(--display)",
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

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#E2858A,#C75C3C)",
  "linear-gradient(135deg,#CF9A47,#C75C3C)",
  "linear-gradient(135deg,#9A5B7A,#E2858A)",
  "linear-gradient(135deg,#5E8C6A,#CF9A47)",
];

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
    .slice(0, 2)
    .join("");
  const gradient =
    AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: gradient,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.38,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export type Tone = "clay" | "gold" | "leaf" | "rose" | "berry" | "ink";

const TONES: Record<Tone, [string, string]> = {
  clay: ["var(--clay-tint)", "var(--clay-deep)"],
  gold: ["var(--gold-tint)", "#9A6E22"],
  leaf: ["var(--leaf-tint)", "#3E6B4A"],
  rose: ["var(--rose-tint)", "#B45561"],
  berry: ["var(--berry-tint)", "#7A4460"],
  ink: ["var(--paper-2)", "var(--ink-2)"],
};

export function Tag({
  children,
  tone = "clay",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const [bg, fg] = TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 10.5,
        letterSpacing: ".01em",
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value = 50,
  h = 8,
  c = "var(--clay)",
  track = "var(--paper-2)",
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
  primary: { background: "var(--clay)", color: "#fff" },
  ghost: {
    background: "var(--surface)",
    color: "var(--ink)",
    boxShadow: "inset 0 0 0 1.5px var(--line-2)",
  },
  soft: { background: "var(--clay-tint)", color: "var(--clay-deep)" },
} as const;

export function WBtn({
  children,
  kind = "primary",
  icon,
  sm,
  style,
}: {
  children: ReactNode;
  kind?: keyof typeof BTN_KINDS;
  icon?: IconName;
  sm?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      style={{
        height: sm ? 34 : 40,
        padding: `0 ${sm ? 14 : 18}px`,
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--ui)",
        fontWeight: 700,
        fontSize: sm ? 13 : 14,
        whiteSpace: "nowrap",
        ...BTN_KINDS[kind],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={sm ? 15 : 17} />}
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
        background: "var(--surface)",
        borderRadius: 18,
        boxShadow: "var(--sh-1)",
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
  tone = "clay",
}: {
  icon: IconName;
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  tone?: Exclude<Tone, "ink">;
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
            width: 38,
            height: 38,
            borderRadius: 11,
            background: `var(--${tone}-tint)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} size={19} c={`var(--${tone})`} />
        </div>
        {delta && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: up ? "var(--leaf)" : "var(--clay)",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Icon
              name="arrowUR"
              size={13}
              c={up ? "var(--leaf)" : "var(--clay)"}
              style={{ transform: up ? "none" : "rotate(90deg)" }}
            />
            {delta}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--display)",
          fontWeight: 800,
          fontSize: 28,
          marginTop: 14,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
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
        marginBottom: 14,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: "var(--display)",
          fontWeight: 700,
          fontSize: 16.5,
          letterSpacing: "-.01em",
        }}
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
          borderBottom: "1px solid var(--line)",
        }}
      >
        {cols.map(([label, flex, align], i) => (
          <div
            key={i}
            style={{
              flex: flex ?? 1,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
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
          style={{
            display: "flex",
            alignItems: "center",
            padding: "13px 16px",
            borderBottom:
              i < rows.length - 1 ? "1px solid var(--line)" : "none",
          }}
        >
          {row.map((cell, j) => (
            <div
              key={j}
              style={{
                flex: cols[j][1] ?? 1,
                fontSize: 13.5,
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
