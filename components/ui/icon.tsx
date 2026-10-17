"use client";

import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuAward,
  LuBell,
  LuBookOpen,
  LuBookmark,
  LuCalendar,
  LuCamera,
  LuChartColumn,
  LuCheck,
  LuCheckCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuCompass,
  LuCreditCard,
  LuDownload,
  LuEllipsis,
  LuEye,
  LuFileText,
  LuFilter,
  LuFlame,
  LuGlobe,
  LuGripVertical,
  LuMenu,
  LuHeart,
  LuHouse,
  LuImage,
  LuLayers,
  LuLayoutGrid,
  LuLock,
  LuLogOut,
  LuMail,
  LuMessageCircle,
  LuMic,
  LuPencil,
  LuPlay,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuSend,
  LuSettings,
  LuShare2,
  LuSparkles,
  LuStar,
  LuTrash2,
  LuTrophy,
  LuUpload,
  LuUser,
  LuUsers,
  LuVideo,
  LuX,
  LuZap,
} from "react-icons/lu";
import { RiHeartFill, RiSparklingFill, RiStarFill } from "react-icons/ri";

/**
 * Lucide by way of react-icons. The names are ours — every call site says
 * `name="gear"`, not `<LuSettings/>` — so the drawing can be swapped without
 * touching a single screen, which is how this file stopped being hand-drawn
 * paths.
 */
const OUTLINE = {
  home: LuHouse,
  compass: LuCompass,
  play: LuPlay,
  message: LuMessageCircle,
  user: LuUser,
  bell: LuBell,
  search: LuSearch,
  check: LuCheck,
  chevR: LuChevronRight,
  chevL: LuChevronLeft,
  chevD: LuChevronDown,
  spark: LuSparkles,
  award: LuAward,
  upload: LuUpload,
  download: LuDownload,
  lock: LuLock,
  heart: LuHeart,
  bookmark: LuBookmark,
  plus: LuPlus,
  filter: LuFilter,
  x: LuX,
  zap: LuZap,
  clock: LuClock,
  camera: LuCamera,
  send: LuSend,
  dots: LuEllipsis,
  gear: LuSettings,
  card: LuCreditCard,
  grid: LuLayoutGrid,
  book: LuBookOpen,
  users: LuUsers,
  chart: LuChartColumn,
  calendar: LuCalendar,
  pencil: LuPencil,
  eye: LuEye,
  flame: LuFlame,
  trophy: LuTrophy,
  file: LuFileText,
  image: LuImage,
  video: LuVideo,
  share: LuShare2,
  arrowUR: LuArrowUpRight,
  arrowL: LuArrowLeft,
  logout: LuLogOut,
  layers: LuLayers,
  mail: LuMail,
  globe: LuGlobe,
  refresh: LuRefreshCw,
  star: LuStar,
  trash: LuTrash2,
  check2: LuCheckCheck,
  mic: LuMic,
  grip: LuGripVertical,
  menu: LuMenu,
} as const;

/** `-f` names render a solid glyph; stroke width means nothing to them. */
const FILLED = {
  "spark-f": RiSparklingFill,
  "heart-f": RiHeartFill,
  "star-f": RiStarFill,
} as const;

export type IconName = keyof typeof OUTLINE | keyof typeof FILLED;

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
  const filled = name in FILLED;
  const Glyph: IconType = filled
    ? FILLED[name as keyof typeof FILLED]
    : OUTLINE[name as keyof typeof OUTLINE];
  return (
    <Glyph
      size={size}
      color={c}
      style={style}
      {...(filled ? {} : { strokeWidth: sw })}
    />
  );
}
