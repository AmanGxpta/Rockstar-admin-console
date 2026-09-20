"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { Ph } from "@/components/ui/primitives";
import type { LessonBlockKind } from "@/lib/course-tree";
import { useSignedMediaUrl } from "@/lib/media-upload";

/**
 * The box beside the clip fields, showing the file that is actually attached.
 *
 * It used to be a `Ph` — a dark rectangle with a play button drawn on it,
 * which never changed whatever you uploaded. An author filling in a new clip
 * had nothing telling them the file that went up is the file they meant, and
 * the one control that looks like a player did nothing when clicked.
 *
 * It renders whatever `kind` says will be saved, not what the file sniffs as:
 * if Format is set to Image while an MP4 is attached, the broken preview is
 * the honest answer, because that is what the student would get.
 */

const BOX: React.CSSProperties = {
  height: 300,
  aspectRatio: "9/16",
  borderRadius: 14,
  overflow: "hidden",
  background: "var(--ink, #14110f)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
};

const FILL: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#000",
  display: "block",
};

function Frame({ children }: { children: ReactNode }) {
  return <div style={BOX}>{children}</div>;
}

/** The empty and the broken states, which look alike and read differently. */
function Placeholder({
  icon,
  label,
  note,
  tone,
}: {
  icon: "video" | "image" | "file" | "globe" | "upload" | "x";
  label: string;
  note?: string;
  tone?: "danger";
}) {
  return (
    <Ph dark icon={icon} style={{ ...BOX, padding: 14 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 14,
          padding: "0 14px",
          textAlign: "center",
          fontFamily: "var(--font-body)",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: tone === "danger" ? "var(--danger)" : "rgba(255,255,255,0.9)",
          }}
        >
          {label}
        </div>
        {note && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.4,
              marginTop: 3,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {note}
          </div>
        )}
      </div>
    </Ph>
  );
}

export function ClipPreview({
  path,
  kind,
  fileName,
}: {
  /** The object path held on the block, or an absolute URL for an embed. */
  path: string | null;
  kind: LessonBlockKind | string;
  /** Known only for a file chosen this session; the path names it otherwise. */
  fileName: string | null;
}) {
  const { url, loading, error } = useSignedMediaUrl(path);
  // A source the element itself could not decode — a MOV Safari will not play,
  // a Format set to something the file is not. Remembered *by* source rather
  // than as a flag to clear, so a new upload or a changed format gets its own
  // try without an effect reaching in to reset it.
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = `${kind}|${url ?? ""}`;
  const failed = failedSource === source;

  const name = fileName ?? (path ? decodeURIComponent(path.split("/").pop() ?? "") : null);

  let body: ReactNode;

  if (!path) {
    body = (
      <Placeholder
        icon="upload"
        label="No media yet"
        note="Drop a file below and it appears here."
      />
    );
  } else if (loading) {
    body = <Placeholder icon="video" label="Loading preview…" />;
  } else if (error || !url) {
    body = (
      <Placeholder
        icon="x"
        label="Can't preview this"
        note={error ?? "No readable URL for the attached file."}
        tone="danger"
      />
    );
  } else if (failed) {
    body = (
      <Placeholder
        icon="x"
        label="Preview unavailable"
        note={`The browser couldn't play this as ${kind}. It may still work on the student's device — open it to check.`}
        tone="danger"
      />
    );
  } else if (kind === "video") {
    body = (
      <Frame>
        <video
          key={url}
          src={url}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailedSource(source)}
          style={FILL}
        />
      </Frame>
    );
  } else if (kind === "image") {
    body = (
      <Frame>
        {/* A plain <img>: the source is a short-lived signed URL, which
            next/image would try to proxy and cache past its expiry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={url}
          src={url}
          alt={name ?? "Attached image"}
          onError={() => setFailedSource(source)}
          style={FILL}
        />
      </Frame>
    );
  } else if (kind === "pdf") {
    body = (
      <Frame>
        <iframe
          key={url}
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          title={name ?? "Attached PDF"}
          style={{ ...FILL, background: "#fff", border: "none" }}
        />
      </Frame>
    );
  } else {
    // `embed`, and anything a future kind adds: there is a URL but nothing
    // this box can safely render inline, so it offers the trip out instead.
    body = (
      <Placeholder
        icon="globe"
        label="Linked media"
        note="Open it below to check the link."
      />
    );
  }

  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      {body}
      <div
        style={{
          marginTop: 8,
          fontFamily: "var(--font-body)",
          fontSize: 11.5,
          lineHeight: 1.45,
          color: "var(--text-muted)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={name ?? undefined}
        >
          {name ?? "Nothing attached"}
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              marginTop: 4,
              color: "var(--red)",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Icon name="eye" size={12} c="var(--red)" />
            Open full size
          </a>
        )}
      </div>
    </div>
  );
}
