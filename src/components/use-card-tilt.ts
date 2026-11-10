"use client";

import { useEffect, type RefObject } from "react";

/**
 * Global 3D tilt + cursor spotlight for every `.card` inside `rootRef`.
 * One delegated pointer listener — pages don't need to opt in.
 *
 * - Tilt strength scales down with card size, so large sections barely move.
 * - Cards containing form controls, or marked `data-no-tilt`, get the spotlight only.
 * - Disabled for touch devices and users who prefer reduced motion.
 */
export function useCardTilt(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reducedMotion) return;

    let active: HTMLElement | null = null;
    let frame = 0;

    function reset(card: HTMLElement) {
      card.removeAttribute("data-tilt");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    }

    function onMove(e: PointerEvent) {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".card");
      if (card !== active) {
        if (active) reset(active);
        active = card && root!.contains(card) ? card : null;
      }
      if (!active) return;
      const el = active;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const flat = el.hasAttribute("data-no-tilt") || !!el.querySelector("input, textarea, select");
        const maxDeg = flat ? 0 : Math.max(0.8, Math.min(7, 1600 / Math.max(r.width, r.height)));
        el.setAttribute("data-tilt", "on");
        el.style.setProperty("--rx", `${((0.5 - py) * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((px - 0.5) * maxDeg).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      });
    }

    function onLeave() {
      cancelAnimationFrame(frame);
      if (active) reset(active);
      active = null;
    }

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (active) reset(active);
    };
  }, [rootRef]);
}
