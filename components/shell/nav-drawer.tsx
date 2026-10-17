"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * Whether the sidebar is out, on the screens where it is a drawer.
 *
 * Above 900px none of this does anything: the sidebar is in the flow, the
 * toggle is display:none and the scrim never renders open. Below it, the
 * sidebar (layout.tsx) and the button that opens it (WebShell's header, inside
 * the page) are in different parts of the tree, so they share the state
 * through this context.
 *
 * The drawer is open *for a path*, not just open: following a link inside it
 * changes the path, and the drawer is shut on the next screen without an
 * effect having to notice the navigation and close it.
 */
const DrawerContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <DrawerContext.Provider
      value={{ open, setOpen: (next) => setOpenAt(next ? pathname : null) }}
    >
      {children}
      {open && (
        <div
          className="rs-drawer-scrim"
          aria-hidden
          onClick={() => setOpenAt(null)}
        />
      )}
    </DrawerContext.Provider>
  );
}

export function useNavDrawer() {
  return useContext(DrawerContext);
}

/** The header's menu button. Hidden by CSS above 900px. */
export function NavToggle() {
  const { open, setOpen } = useNavDrawer();
  return (
    <button
      type="button"
      className="rs-nav-toggle rs-iconbtn"
      aria-label="Menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      style={{
        width: 38,
        height: 38,
        borderRadius: "var(--r-sm)",
        flexShrink: 0,
        border: "none",
        cursor: "pointer",
        background: "var(--dark)",
        boxShadow: "inset 0 0 0 1px var(--border-mid)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name="menu" size={19} c="var(--text-secondary)" />
    </button>
  );
}
