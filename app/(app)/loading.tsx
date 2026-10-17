/**
 * Shown in the content column the moment a link is clicked, while the next
 * screen's server render is still running.
 *
 * Every route in the console is dynamic — each reads the session and live
 * rows — and without a loading boundary Next.js neither prefetches a dynamic
 * route nor shows anything until the whole render has come back, so a click
 * looked like nothing had happened for a second or more. With this file the
 * sidebar (layout.tsx) stays put, this skeleton is prefetched alongside the
 * link, and the click answers immediately.
 *
 * Its shape follows WebShell — a 68px header over a padded scroll column — so
 * the swap to the real screen does not jump.
 */
export default function Loading() {
  return (
    <>
      <div
        style={{
          height: 68,
          flexShrink: 0,
          borderBottom: "0.5px solid var(--border)",
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 18,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="rs-skeleton" style={{ width: 180, height: 18 }} />
          <div className="rs-skeleton" style={{ width: 260, height: 11 }} />
        </div>
        <div className="rs-skeleton" style={{ width: 220, height: 38 }} />
      </div>

      <div
        role="status"
        aria-label="Loading"
        style={{ flex: 1, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "flex", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rs-skeleton" style={{ flex: 1, height: 92, borderRadius: 14 }} />
          ))}
        </div>
        <div className="rs-skeleton" style={{ height: 240, borderRadius: 14 }} />
        <div className="rs-skeleton" style={{ height: 140, borderRadius: 14 }} />
      </div>
    </>
  );
}
