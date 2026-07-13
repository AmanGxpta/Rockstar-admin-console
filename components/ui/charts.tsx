/**
 * SVG chart primitives. These render on the server, so the gradient `id` is
 * passed in rather than generated — two Areas on one page must not collide.
 */

export function Bars({
  data,
  h = 150,
  c = "var(--clay)",
  labels,
}: {
  data: number[];
  h?: number;
  c?: string;
  labels?: string[];
}) {
  const max = Math.max(...data);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: h }}>
        {data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <div
              style={{
                height: `${(v / max) * 100}%`,
                background: i === data.length - 1 ? c : "var(--clay-tint)",
                borderRadius: "7px 7px 3px 3px",
                minHeight: 4,
              }}
            />
          </div>
        ))}
      </div>
      {labels && (
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          {labels.map((l, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 10.5,
                color: "var(--ink-3)",
                fontWeight: 600,
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Area({
  id,
  data,
  w = 520,
  h = 140,
  c = "#C75C3C",
}: {
  id: string;
  data: number[];
  w?: number;
  h?: number;
  c?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map<[number, number]>((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / (max - min || 1)) * (h - 16) - 8,
  ]);
  const line = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity="0.22" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={c}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill={c} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/** segs: [value, color][] */
export function Donut({
  segs,
  size = 132,
  sw = 18,
}: {
  segs: [number, string][];
  size?: number;
  sw?: number;
}) {
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s[0], 0);

  // Each arc starts where the previous ones ended, so carry a running offset.
  const arcs = segs.reduce<{ len: number; offset: number; color: string }[]>(
    (acc, [v, color]) => {
      const prev = acc[acc.length - 1];
      const offset = prev ? prev.offset + prev.len : 0;
      acc.push({ len: (v / total) * circumference, offset, color });
      return acc;
    },
    [],
  );

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {arcs.map(({ len, offset, color }, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${len} ${circumference - len}`}
          strokeDashoffset={-offset}
        />
      ))}
    </svg>
  );
}
