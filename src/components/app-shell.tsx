"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { allNavItems, isActivePath } from "./nav-config";
import { Topbar } from "./topbar";
import { useCardTilt } from "./use-card-tilt";
import { Toaster } from "./toast";
import { AiAssistant } from "./ai-assistant";
import { SceneBackdrop } from "./scene-backdrop";
import { NextPageGuide, SwipeNavigator } from "./swipe-nav";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Sidebar collapse preference — module-level store persisted to localStorage. */
/* Each page renders its own <AppShell>, so the store keeps the value stable   */
/* across client-side navigations without a flash.                             */
/* -------------------------------------------------------------------------- */
const COLLAPSE_KEY = "payshark:sidebar-collapsed";
let collapsedState: boolean | null = null;
const listeners = new Set<() => void>();

function readCollapsed() {
  if (collapsedState === null) {
    try { collapsedState = localStorage.getItem(COLLAPSE_KEY) === "1"; } catch { collapsedState = false; }
  }
  return collapsedState;
}
function setCollapsed(next: boolean) {
  collapsedState = next;
  try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch {}
  listeners.forEach(l => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Sidebar collapse preference, shared with Settings. */
export function useSidebarCollapsed() {
  const value = useSyncExternalStore(subscribe, readCollapsed, () => false);
  return [value, setCollapsed] as const;
}

/* Visual effects preference ("full" | "reduced"), applied as <html data-effects>. */
const EFFECTS_KEY = "payshark:effects";
export function applyEffectsPreference(mode?: "full" | "reduced") {
  try {
    const value = mode ?? (localStorage.getItem(EFFECTS_KEY) === "reduced" ? "reduced" : "full");
    if (mode) localStorage.setItem(EFFECTS_KEY, mode);
    document.documentElement.dataset.effects = value;
    return value;
  } catch {
    return "full";
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggleCollapsed = useCallback(() => setCollapsed(!readCollapsed()), []);

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useCardTilt(mainRef);
  const lastFocus = useRef<HTMLElement | null>(null);

  const openMobile = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement;
    setMobileOpen(true);
  }, []);
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    lastFocus.current?.focus();
  }, []);

  // Close the drawer on navigation
  useEffect(() => setMobileOpen(false), [pathname]);

  // Give each workspace page its own calm ambient palette. The palette changes
  // are intentionally subtle so the dashboard remains readable.
  useEffect(() => {
    const moods = ["morning", "noon", "dusk", "snowy", "night"] as const;
    const pageIndex = allNavItems.findIndex(item => isActivePath(pathname, item.href));
    const mood = moods[(Math.max(0, pageIndex)) % moods.length];
    document.documentElement.dataset.atmosphere = mood;
  }, [pathname]);

  // Restore the visual-effects preference
  useEffect(() => { applyEffectsPreference(); }, []);

  // Ctrl/⌘ + B toggles the desktop sidebar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  // Mobile drawer: lock scroll, trap focus, close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); closeMobile(); return; }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, closeMobile]);

  // Close drawer if the viewport grows to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMobileOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="shell">
      <a href="#main-content" className="skip-link">Skip to content</a>

      {/* Ambient 3D scene */}
      <SceneBackdrop />

      {/* Desktop sidebar — main pages (Overview, Transactions, Analytics, Review Center) */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "glass fixed bottom-0 left-0 top-0 z-40 hidden border-r border-white/[0.06] transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[var(--ps-sidebar-w-collapsed)]" : "w-[var(--ps-sidebar-w)]"
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={closeMobile} aria-hidden />
          <div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-[min(288px,86vw)] animate-slide-in-left border-r border-white/[0.08] bg-sidebar shadow-pop"
          >
            <Sidebar variant="mobile" onClose={closeMobile} />
          </div>
        </div>
      )}

      {/* Content column */}
      <div
        className={cn(
          "relative z-[1] flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[var(--ps-sidebar-w-collapsed)]" : "lg:pl-[var(--ps-sidebar-w)]"
        )}
      >
        <Topbar onOpenMobileNav={openMobile} mobileNavOpen={mobileOpen} />
        <main ref={mainRef} id="main-content" tabIndex={-1} className="page-container flex-1 focus-visible:shadow-none">
          {children}
          <NextPageGuide />
        </main>
      </div>

      <AiAssistant />
      <Toaster />
      <SwipeNavigator />
    </div>
  );
}
