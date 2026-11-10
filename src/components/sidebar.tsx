"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, X, BadgeCheck } from "lucide-react";
import { navGroups, isActivePath } from "./nav-config";
import { useSessionUser, displayName, initials } from "@/lib/client/session-store";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Brand                                                                        */
/* -------------------------------------------------------------------------- */
/** Z offsets (px) of the stacked discs that give the coin its visible thickness. */
const COIN_EDGE_LAYERS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];

/**
 * 3D spinning coin: "$" on the front, the PAYSHARK fin on the back.
 * Motion is defined in globals.css (.brand-coin) and respects reduced-motion settings.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("brand-mark relative grid h-8 w-8 shrink-0 place-items-center", className)}>
      {/* soft glow under the coin */}
      <span className="brand-coin-glow absolute inset-[8%] rounded-full" />
      <span className="brand-coin relative h-full w-full">
        {/* coin edge (reeded rim) */}
        {COIN_EDGE_LAYERS.map((z) => (
          <span key={z} className="brand-coin-edge absolute inset-0 rounded-full" style={{ transform: `translateZ(${z}px)` }} />
        ))}
        {/* front face: dollar */}
        <span className="brand-coin-face absolute inset-0 grid place-items-center rounded-full" style={{ transform: "translateZ(2px)" }}>
          <svg viewBox="0 0 24 24" className="relative h-[58%] w-[58%]" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5v19" />
            <path d="M16.5 6H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H7" />
          </svg>
        </span>
        {/* back face: fin */}
        <span className="brand-coin-face absolute inset-0 grid place-items-center rounded-full" style={{ transform: "rotateY(180deg) translateZ(2px)" }}>
          <svg viewBox="0 0 24 24" className="relative h-[56%] w-[56%]" fill="currentColor">
            <path d="M3 17.5c3.2-.4 6-1.9 8.3-4.6C13.4 10.4 14.6 7 14.9 3c2.9 3.2 4.6 7.5 4.6 11.6 0 1.1-.1 2-.3 2.9H3Z" />
            <path d="M3 19.5h18v1.5H3z" opacity=".55" />
          </svg>
        </span>
      </span>
    </span>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="brand-3d flex min-w-0 items-center gap-2.5 rounded-[4px]" aria-label="PAYSHARK — go to overview">
      <BrandMark />
      <span className={cn("min-w-0 animate-fade-in", collapsed && "sr-only")}>
        <span className="block font-display text-[15px] font-semibold leading-5 tracking-[0.08em] text-fg">
          PAYSHARK
        </span>
        <span className="block whitespace-nowrap text-[10px] font-medium uppercase leading-3 tracking-[0.16em] text-fg-subtle">
          Payment control
        </span>
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                      */
/* -------------------------------------------------------------------------- */
interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Rendered inside the mobile drawer: always expanded, shows a close button. */
  variant?: "desktop" | "mobile";
  onClose?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapsed, variant = "desktop", onClose }: SidebarProps) {
  const pathname = usePathname();
  const isCollapsed = variant === "desktop" && collapsed;
  const user = useSessionUser();
  // Desktop sidebar holds the main pages only (Operations); the other pages are
  // tabs in the top bar. The mobile drawer lists everything.
  const groups = variant === "desktop" ? navGroups.slice(0, 1) : navGroups;

  /* Floating active indicator: one pill that glides to the active item */
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);
  const [animateIndicator, setAnimateIndicator] = useState(false);

  const measure = useCallback(() => {
    const nav = navRef.current;
    const activeHref = [...linkRefs.current.keys()].find(h => isActivePath(pathname, h));
    const el = activeHref ? linkRefs.current.get(activeHref) : undefined;
    if (!nav || !el) return setIndicator(null);
    const navBox = nav.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setIndicator({ top: box.top - navBox.top + nav.scrollTop, height: box.height });
  }, [pathname]);

  useLayoutEffect(() => { measure(); }, [measure, isCollapsed]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimateIndicator(true));
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", measure); };
  }, [measure]);

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div className={cn("flex h-[64px] shrink-0 items-center", isCollapsed ? "justify-center px-3" : "justify-between px-4")}>
        <Brand collapsed={isCollapsed} />
        {variant === "mobile" && (
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close navigation">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.09] to-transparent" aria-hidden />

      {/* Navigation */}
      <nav
        ref={navRef}
        aria-label="Primary"
        className={cn("relative flex-1 px-3 py-4", isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden")}
      >
        {/* Floating indicator */}
        {indicator && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 right-3 rounded-[12px] border border-white/[0.08] bg-white/[0.07]",
              "shadow-[inset_0_1px_0_rgb(255_255_255/.06)]",
              animateIndicator && "transition-[transform,height] duration-500 ease-out"
            )}
            style={{ top: 0, height: indicator.height, transform: `translateY(${indicator.top}px)` }}
          />
        )}

        {groups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && (isCollapsed ? "mt-3" : "mt-5"))}>
            {isCollapsed ? (
              gi > 0 && <div className="mx-2 mb-3 h-px bg-white/[0.06]" aria-hidden />
            ) : (
              <div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
                {variant === "desktop" ? "Main" : group.label}
              </div>
            )}
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <li key={href} className="group/item relative">
                    <Link
                      ref={el => { if (el) linkRefs.current.set(href, el); else linkRefs.current.delete(href); }}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-label={isCollapsed ? label : undefined}
                      onClick={variant === "mobile" ? onClose : undefined}
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-[12px] text-[14px] font-medium transition-colors duration-200",
                        isCollapsed ? "justify-center px-0" : "px-3",
                        active ? "text-fg" : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-[8px] transition-colors duration-300",
                          active ? "bg-accent text-white shadow-[0_6px_16px_-6px_rgb(59_130_246/.8)]" : "text-fg-subtle group-hover/item:text-fg-muted"
                        )}
                      >
                        <Icon size={16} strokeWidth={1.9} />
                      </span>
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                    {/* Tooltip for collapsed rail (hover + keyboard focus) */}
                    {isCollapsed && (
                      <span
                        role="presentation"
                        className="popover pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap px-2.5 py-1.5 text-xs font-medium text-fg opacity-0 transition-all duration-150 group-focus-within/item:translate-x-0 group-focus-within/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                      >
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: environment, profile, collapse */}
      <div className="shrink-0 space-y-2 p-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 rounded-[4px] border border-warning/15 bg-warning/[0.05] px-3 py-2 text-[11.5px] text-warning">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning/50 [animation-duration:2.4s]" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-warning" />
            </span>
            <span className="truncate">Sandbox · no real funds move</span>
          </div>
        )}

        {/* Profile */}
        <div
          className={cn(
            "relative flex items-center gap-2.5 rounded-[14px] border border-white/[0.07] bg-white/[0.03] shadow-[inset_0_1px_0_rgb(255_255_255/.05)]",
            isCollapsed ? "justify-center p-1.5" : "p-2.5"
          )}
          title={isCollapsed && user ? `${displayName(user)} · ${user.role}` : undefined}
        >
          <span className="relative shrink-0 rounded-full bg-[conic-gradient(from_200deg,#FFFFFF,#71717A,#D4D4D8,#FFFFFF)] p-[1.5px]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-sidebar text-[11px] font-semibold text-fg">
              {user ? initials(user) : <span className="skeleton h-4 w-4 rounded-full" />}
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success" aria-hidden />
          </span>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              {user ? (
                <>
                  <div className="flex items-center gap-1 truncate text-[12.5px] font-semibold text-fg">
                    <span className="truncate">{displayName(user)}</span>
                    <BadgeCheck size={13} className="shrink-0 text-accent" aria-label="Verified session" />
                  </div>
                  <div className="truncate text-[11px] capitalize text-fg-subtle">{user.role} · {user.email}</div>
                </>
              ) : (
                <div className="space-y-1.5" aria-busy="true">
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-2.5 w-32" />
                </div>
              )}
            </div>
          )}
        </div>

        {variant === "desktop" && onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={`${isCollapsed ? "Expand" : "Collapse"} sidebar (Ctrl/⌘ B)`}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-[4px] text-[12.5px] font-medium text-fg-subtle transition-colors hover:bg-white/[0.04] hover:text-fg",
              isCollapsed ? "justify-center" : "px-3"
            )}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!isCollapsed && <span>Collapse sidebar</span>}
            {!isCollapsed && <kbd className="kbd ml-auto">⌘B</kbd>}
          </button>
        )}
      </div>
    </div>
  );
}
