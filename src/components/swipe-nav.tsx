"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { allNavItems, isActivePath } from "./nav-config";
import { cn } from "@/lib/cn";

/*
 * Swipe navigation between the app's pages (order = nav-config).
 *  - Trackpad: two-finger horizontal swipe. Touch: one-finger horizontal swipe.
 *  - While swiping, a pill at the screen edge previews the destination and fills
 *    up; past the threshold the current page slides out and the next slides in.
 *  - Gestures that start inside something that can itself scroll sideways
 *    (tables, code blocks), or inside form fields, are left alone.
 *  - The ends wrap around (Settings → Overview).
 * <PagePager> in the top bar shows where you are (title + position dots) and
 * offers previous/next buttons as a fallback for mouse users.
 */

const PAGES = allNavItems;
const WHEEL_THRESHOLD = 140; // px of accumulated horizontal trackpad delta
const TOUCH_THRESHOLD = 70;  // px of finger travel
const COOLDOWN_MS = 900;

type Dir = "next" | "prev";

function currentIndex(pathname: string | null) {
  return Math.max(0, PAGES.findIndex(p => isActivePath(pathname, p.href)));
}
function neighbour(index: number, dir: Dir) {
  return PAGES[(index + (dir === "next" ? 1 : -1) + PAGES.length) % PAGES.length];
}

/** Slide the current page out, then navigate; the new page slides in (CSS keyed off html[data-swipe]).
 *  "down" is used by the scroll guide: the page lifts away and the next one rises in. */
export function useSwipeNavigate() {
  const router = useRouter();
  return useCallback((href: string, dir: Dir | "down") => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || root.dataset.effects === "reduced";
    if (reduced) { router.push(href); return; }
    root.dataset.swipe = dir;
    root.dataset.swipeExit = dir;
    window.setTimeout(() => router.push(href), 170);
  }, [router]);
}

/** Can `el` (or an ancestor) scroll horizontally in the direction of `dx`? */
function canScrollX(start: EventTarget | null, dx: number) {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1) {
      const max = el.scrollWidth - el.clientWidth;
      if ((dx > 0 && el.scrollLeft < max - 1) || (dx < 0 && el.scrollLeft > 1)) return true;
    }
    el = el.parentElement;
  }
  return false;
}
const isFormField = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest("input, textarea, select, [contenteditable='true'], [data-no-swipe]");

/** Global gesture listener + edge preview. Mounted once per page by AppShell. */
export function SwipeNavigator() {
  const pathname = usePathname();
  const navigate = useSwipeNavigate();
  const [progress, setProgress] = useState(0); // -1 (prev) … 1 (next)
  const index = currentIndex(pathname);
  const indexRef = useRef(index);
  indexRef.current = index;

  // New page mounted: drop the exit state before paint; keep the entrance animation briefly
  useLayoutEffect(() => {
    const root = document.documentElement;
    delete root.dataset.swipeExit;
    const t = window.setTimeout(() => { delete root.dataset.swipe; }, 700);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    let acc = 0;
    let locked = false;
    let resetTimer = 0;
    let touch: { x: number; y: number; target: EventTarget | null } | null = null;

    const go = (dir: Dir) => {
      locked = true;
      setProgress(0);
      navigate(neighbour(indexRef.current, dir).href, dir);
      window.setTimeout(() => { locked = false; }, COOLDOWN_MS);
    };

    const onWheel = (e: WheelEvent) => {
      if (locked || e.ctrlKey) return;
      if (Math.abs(e.deltaX) < 2 || Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return;
      if (isFormField(e.target) || canScrollX(e.target, e.deltaX)) return;
      acc += e.deltaX;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { acc = 0; setProgress(0); }, 240);
      if (Math.abs(acc) >= WHEEL_THRESHOLD) {
        const dir: Dir = acc > 0 ? "next" : "prev";
        acc = 0;
        go(dir);
      } else {
        setProgress(Math.max(-1, Math.min(1, acc / WHEEL_THRESHOLD)));
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (locked || e.touches.length !== 1 || isFormField(e.target)) { touch = null; return; }
      touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, target: e.target };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touch) return;
      const dx = touch.x - e.touches[0].clientX;
      const dy = touch.y - e.touches[0].clientY;
      if (Math.abs(dx) < Math.abs(dy) * 1.5 || canScrollX(touch.target, dx)) { setProgress(0); return; }
      setProgress(Math.max(-1, Math.min(1, dx / TOUCH_THRESHOLD)));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touch) return;
      const t = e.changedTouches[0];
      const dx = touch.x - t.clientX;
      const dy = touch.y - t.clientY;
      const target = touch.target;
      touch = null;
      setProgress(0);
      if (Math.abs(dx) >= TOUCH_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5 && !canScrollX(target, dx)) {
        go(dx > 0 ? "next" : "prev");
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(resetTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);

  const dir: Dir = progress >= 0 ? "next" : "prev";
  const amount = Math.abs(progress);
  const target = neighbour(index, dir);

  return (
    <div
      className="swipe-hint"
      data-side={dir === "next" ? "right" : "left"}
      style={{ opacity: amount < 0.05 ? 0 : 0.35 + amount * 0.65, "--swipe": amount } as React.CSSProperties}
      aria-hidden
    >
      {dir === "prev" && <ChevronLeft size={16} />}
      <span>{target.label}</span>
      {dir === "next" && <ChevronRight size={16} />}
      <i />
    </div>
  );
}

/** Top-bar pager: previous · current page + position dots · next. */
export function PagePager({ className }: { className?: string }) {
  const pathname = usePathname();
  const navigate = useSwipeNavigate();
  const index = currentIndex(pathname);
  const prev = neighbour(index, "prev");
  const next = neighbour(index, "next");
  const current = PAGES[index];

  return (
    <nav aria-label="Pages" className={cn("pager", className)}>
      <button type="button" className="pager-side" onClick={() => navigate(prev.href, "prev")} aria-label={`Previous page: ${prev.label}`}>
        <ChevronLeft size={16} />
        <span className="pager-side-label">{prev.label}</span>
      </button>

      <div className="pager-center">
        <span className="pager-title">{current.label}</span>
        <span className="pager-dots">
          {PAGES.map((p, i) => (
            <button
              key={p.href}
              type="button"
              className="pager-dot"
              data-active={i === index}
              title={p.label}
              aria-label={`Go to ${p.label}`}
              aria-current={i === index ? "page" : undefined}
              onClick={() => i !== index && navigate(p.href, i > index ? "next" : "prev")}
            />
          ))}
        </span>
      </div>

      <button type="button" className="pager-side" onClick={() => navigate(next.href, "next")} aria-label={`Next page: ${next.label}`}>
        <span className="pager-side-label">{next.label}</span>
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Scroll guide: at the end of every page, "Up next" leads to the next page.    */
/* Keep scrolling past the bottom and the line fills; when full, the page lifts */
/* away and the next one rises in. The 3D backdrop reads `guideState.pull` to   */
/* pull its subject into the portal at the same time.                           */
/* -------------------------------------------------------------------------- */
export const guideState = { pull: 0 };
const PULL_DISTANCE = 150; // lower threshold: page hand-off should feel effortless

/** Can `el` (or an ancestor below the page) scroll further vertically in the direction of `dy`? */
function canScrollY(start: EventTarget | null, dy: number) {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el);
    if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      const max = el.scrollHeight - el.clientHeight;
      if ((dy > 0 && el.scrollTop < max - 1) || (dy < 0 && el.scrollTop > 1)) return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function NextPageGuide() {
  const pathname = usePathname();
  const navigate = useSwipeNavigate();
  const index = currentIndex(pathname);
  const nextIndex = (index + 1) % PAGES.length;
  const next = PAGES[nextIndex];
  const [pull, setPull] = useState(0);

  useEffect(() => {
    let acc = 0;
    let locked = false;
    let releaseTimer = 0;
    let raf = 0;
    let lastWheel = 0;
    let gestureAtBottom = false;
    let touchStartY: number | null = null;

    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const blocked = (t: EventTarget | null, dy: number) =>
      document.body.style.overflow === "hidden" || isFormField(t) || canScrollY(t, dy);

    const set = (value: number) => {
      acc = Math.max(0, Math.min(PULL_DISTANCE, value));
      const p = acc / PULL_DISTANCE;
      guideState.pull = p;
      setPull(p);
      if (p >= 1 && !locked) {
        locked = true;
        navigate(next.href, "down");
      }
    };
    // let go → the line drains back
    const release = () => {
      cancelAnimationFrame(raf);
      const step = () => {
        if (locked) return;
        set(acc < 4 ? 0 : acc * 0.82);
        if (acc > 0) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (locked || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const now = performance.now();
      // A new gesture only counts if it starts at the bottom, so momentum from
      // scrolling down the page doesn't carry straight into the next page.
      if (now - lastWheel > 180) gestureAtBottom = atBottom();
      lastWheel = now;
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      if (blocked(e.target, dy)) return;
      if (dy < 0) { if (acc > 0) { cancelAnimationFrame(raf); set(acc + dy * 2); } return; }
      if (!gestureAtBottom || !atBottom()) return;
      cancelAnimationFrame(raf);
      set(acc + Math.min(dy, 80));
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, 260);
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = !locked && e.touches.length === 1 && atBottom() && !blocked(e.target, 1) ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY === null) return;
      const dy = touchStartY - e.touches[0].clientY;
      if (dy > 0) { cancelAnimationFrame(raf); set(dy * 1.1); }
    };
    const onTouchEnd = () => {
      if (touchStartY === null) return;
      touchStartY = null;
      if (!locked) release();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(releaseTimer);
      guideState.pull = 0;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate, next.href]);

  const Icon = next.icon;
  return (
    <section
      className="next-guide"
      aria-label="Next page"
      data-pulling={pull > 0.02 ? "true" : undefined}
      style={{ "--pull": pull } as React.CSSProperties}
    >
      <span className="next-guide-line" aria-hidden><i /></span>
      <span className="next-guide-kicker">
        Up next · {String(nextIndex + 1).padStart(2, "0")} / {String(PAGES.length).padStart(2, "0")}
      </span>
      <button type="button" className="next-guide-title" onClick={() => navigate(next.href, "down")}>
        <Icon size={24} strokeWidth={1.5} aria-hidden />
        <span>{next.label}</span>
        <ArrowRight size={20} strokeWidth={1.75} aria-hidden className="next-guide-arrow" />
      </button>
      <p className="next-guide-desc">{next.description}</p>
      <span className="next-guide-hint" aria-hidden>
        <ChevronDown size={14} />
        {pull > 0.02 ? "Keep scrolling" : "Scroll to continue"}
      </span>
    </section>
  );
}
