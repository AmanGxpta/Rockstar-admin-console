import type { CSSProperties } from "react";

const PATHS = {
  home: "M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z",
  play: "M7 5l12 7-12 7V5Z",
  message: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  bell: "M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7ZM10.5 20a2 2 0 0 0 3 0",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4",
  check: "M5 12.5l4.5 4.5L19 7",
  chevR: "M9 5l7 7-7 7",
  chevL: "M15 5l-7 7 7 7",
  chevD: "M5 9l7 7 7-7",
  spark: "M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5L12 3Z",
  award: "M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM8.5 13l-1.5 8 5-2.5 5 2.5-1.5-8",
  upload: "M12 16V4m0 0L8 8m4-4 4 4M5 20h14",
  download: "M12 4v12m0 0 4-4m-4 4-4-4M5 20h14",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5v-9Z",
  heart: "M12 20S4 14.5 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11Z",
  bookmark: "M6 4h12v16l-6-4-6 4V4Z",
  plus: "M12 5v14M5 12h14",
  filter: "M3 5h18l-7 8v6l-4-2v-4L3 5Z",
  x: "M6 6l12 12M18 6 6 18",
  zap: "M13 3 4 14h7l-1 7 9-11h-7l1-7Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4V8ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  send: "M21 3 3 10.5l7 2.5 2.5 7L21 3Z",
  dots: "M6 12h.01M12 12h.01M18 12h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L16 1H8l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 3 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L8 23h8l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  card: "M3 7h18v11H3V7ZM3 10h18",
  grid: "M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z",
  book: "M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4ZM19 7v16",
  users: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 20a7 7 0 0 1 14 0M17 5a4 4 0 0 1 0 7m5 8a7 7 0 0 0-5-6.7",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  calendar: "M4 6h16v15H4V6ZM4 10h16M8 3v4M16 3v4",
  pencil: "M16 4l4 4L8 20H4v-4L16 4Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  flame: "M12 21a6 6 0 0 0 6-6c0-4-3-5-3-9 0 0-4 1.5-4 6 0-2-2-3-2-3-1 2-3 3-3 6a6 6 0 0 0 6 6Z",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0V4ZM5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3M9 17h6M9 21h6M12 13v4",
  file: "M6 3h8l4 4v14H6V3ZM14 3v4h4",
  image: "M4 5h16v14H4V5ZM4 16l4-4 4 4 3-3 5 5M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  video: "M4 6h11v12H4V6ZM15 10l5-3v10l-5-3",
  share: "M16 6l-4-4-4 4M12 2v13M5 12v8h14v-8",
  arrowUR: "M7 17 17 7M9 7h8v8",
  arrowL: "M19 12H5m0 0 6-6m-6 6 6 6",
  logout: "M9 4H5v16h4M16 12H9m7 0-3-3m3 3-3 3",
  layers: "M12 3 2 8l10 5 10-5-10-5ZM2 13l10 5 10-5M2 17l10 5 10-5",
  mail: "M3 6h18v12H3V6ZM3 7l9 6 9-6",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3C9.5 5.5 9.5 18 12 21",
  refresh: "M20 11a8 8 0 0 0-14-4l-2 2m0-4v4h4M4 13a8 8 0 0 0 14 4l2-2m0 4v-4h-4",
  star: "M12 3 14.7 9 21 9.7l-4.5 4.3 1.2 6L12 17.3 6.3 20l1.2-6L3 9.7 9.3 9 12 3Z",
  trash: "M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14",
  check2: "M5 12.5l4.5 4.5L19 7",
  mic: "M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3ZM6 11a6 6 0 0 0 12 0M12 17v4",
} as const;

type BaseName = keyof typeof PATHS;
/** `-f` suffix renders the filled variant (spark, heart, star only). */
export type IconName = BaseName | "spark-f" | "heart-f" | "star-f";

export function Icon({
  name,
  size = 22,
  c = "currentColor",
  sw = 1.8,
  style,
}: {
  name: IconName;
  size?: number;
  c?: string;
  sw?: number;
  style?: CSSProperties;
}) {
  const filled = name.endsWith("-f");
  const key = (filled ? name.slice(0, -2) : name) as BaseName;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      fill={filled ? c : "none"}
      stroke={filled ? "none" : c}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[key]} />
    </svg>
  );
}
