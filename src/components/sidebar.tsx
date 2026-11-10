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
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "brand-mark relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[10px] text-accent-fg",
        "bg-[linear-gradient(145deg,#8DEBFF_0%,#35D9FF_38%,#1677FF_100%)]",
        "shadow-[inset_0_1px_0_rgb(255_255_255/.55),inset_0_-3px_6px_rgb(4_20_60/.35),0_8px_18px_-8px_rgb(53_217_255/.75)]",
        className
      )}
    >
      {/* glossy reflection */}
      <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent" />
      {/* Fin mark */}
      <svg viewBox="0 0 24 24" className="relative h-[18px] w-[18px] drop-shadow-[0_1px_0_rgb(255_255_255/.35)]" fill="currentColor">
        <path d="M3 17.5c3.2-.4 6-1.9 8.3-4.6C13.4 10.4 14.6 7 14.9 3c2.9 3.2 4.6 7.5 4.6 11.6 0 1.1-.1 2-.3 2.9H3Z" />
        <path d="M3 19.5h18v1.5H3z" opacity=".55" />
      </svg>
    </span>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="brand-3d flex min-w-0 items-center gap-2.5 rounded-[10px]" aria-label="PAYSHARK — go to overview">
      <BrandMark />
      <span className={cn("min-w-0 animate-fade-in", collapsed && "sr-only")}>
        <span className="block bg-gradient-to-r from-white via-white to-accent/80 bg-clip-text font-display text-[15px] font-semibold leading-5 tracking-[0.1em] text-transparent">
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
              "pointer-events-none absolute left-3 right-3 rounded-[10px]",
              "bg-[linear-gradient(90deg,rgb(53_217_255/.16),rgb(22_119_255/.06))]",
              "shadow-[inset_0_0_0_1px_rgb(53_217_255/.18),inset_0_1px_0_rgb(255_255_255/.06),0_8px_20px_-12px_rgb(53_217_255/.55)]",
              animateIndicator && "transition-[transform,height] duration-500 ease-out"
            )}
            style={{ top: 0, height: indicator.height, transform: `translateY(${indicator.top}px)` }}
          >
            <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_rgb(53_217_255/.9)]" />
          </span>
        )}

        {navGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-6")}>
            {isCollapsed ? (
              gi > 0 && <div className="mx-2 mb-3 h-px bg-white/[0.06]" aria-hidden />
            ) : (
              <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
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
                        "relative flex h-10 items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors duration-200",
                        isCollapsed ? "justify-center px-0" : "px-3",
                        active ? "text-fg" : "text-fg-muted hover:bg-white/[0.035] hover:text-fg"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all duration-300",
                          active
                            ? "bg-accent/15 text-accent shadow-[0_0_14px_-2px_rgb(53_217_255/.55)]"
                            : "text-fg-subtle group-hover/item:text-fg-muted group-hover/item:[transform:perspective(200px)_rotateY(-14deg)_translateY(-1px)]"
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
          <div className="flex items-center gap-2 rounded-[10px] border border-warning/15 bg-warning/[0.05] px-3 py-2 text-[11.5px] text-warning">
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
            "relative flex items-center gap-2.5 rounded-[12px] border border-white/[0.07] bg-[linear-gradient(180deg,rgb(24_43_70/.55),rgb(16_26_45/.6))] shadow-[inset_0_1px_0_rgb(255_255_255/.05)]",
            isCollapsed ? "justify-center p-1.5" : "p-2.5"
          )}
          title={isCollapsed && user ? `${displayName(user)} · ${user.role}` : undefined}
        >
          <span className="relative shrink-0 rounded-full bg-[conic-gradient(from_200deg,#35D9FF,#1677FF,#795CFF,#35D9FF)] p-[1.5px]">
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
              "flex h-9 w-full items-center gap-3 rounded-[10px] text-[12.5px] font-medium text-fg-subtle transition-colors hover:bg-white/[0.04] hover:text-fg",
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
