"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/*
 * Page transition for every route — a slim progress bar along the top edge.
 *  - Clicking an internal link starts the bar immediately (navigation is not delayed).
 *  - When the new route mounts, the bar completes and fades; the page's own
 *    content then rises into place (see `.page-container > *` in globals.css).
 * Modifier-clicks, new tabs, downloads and same-page/hash links are ignored.
 */

type Phase = "idle" | "loading" | "done";

export function PageTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const firstPath = useRef(true);

  // Start: an internal link to another route was clicked
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      setPhase("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish: the new route has mounted (also covers back/forward)
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setPhase("done");
    const t = window.setTimeout(() => setPhase("idle"), 450);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // Never leave the bar hanging if a navigation is cancelled
  useEffect(() => {
    if (phase !== "loading") return;
    const t = window.setTimeout(() => setPhase("idle"), 8000);
    return () => window.clearTimeout(t);
  }, [phase]);

  return <div className="nav-progress" data-phase={phase} role="progressbar" aria-hidden={phase === "idle"} aria-label="Loading page" />;
}
