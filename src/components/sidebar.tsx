"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { navGroups, isActivePath } from "./nav-config";
import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "brand-mark grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-b from-accent-hover to-accent text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.4),inset_0_-2px_0_rgb(0_0_0/.15),0_6px_14px_-8px_rgb(54_191_250/.8)]",
        className
      )}
    >
      {/* Fin mark */}
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
        <path d="M3 17.5c3.2-.4 6-1.9 8.3-4.6C13.4 10.4 14.6 7 14.9 3c2.9 3.2 4.6 7.5 4.6 11.6 0 1.1-.1 2-.3 2.9H3Z" />
        <path d="M3 19.5h18v1.5H3z" opacity=".55" />
      </svg>
    </span>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="brand-3d flex min-w-0 items-center gap-2.5 rounded-[10px]"
      aria-label="PAYSHARK — go to overview"
    >
      <BrandMark />
      <span className={cn("min-w-0 animate-fade-in", collapsed && "sr-only")}>
        <span className="block font-display text-[15px] font-semibold leading-5 tracking-[0.08em] text-fg">
          PAYSHARK
        </span>
        <span className="block whitespace-nowrap text-[10px] font-medium uppercase leading-3 tracking-[0.14em] text-fg-subtle">
          Payment control
        </span>
      </span>
    </Link>
  );
}

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

  return (
    <div className="flex h-full flex-col">
      {/* Brand row */}
      <div className={cn("flex h-[60px] shrink-0 items-center border-b border-white/[0.06]", isCollapsed ? "justify-center px-3" : "justify-between px-4")}>
        <Brand collapsed={isCollapsed} />
        {variant === "mobile" && (
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close navigation">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className={cn("flex-1 px-3 py-4", isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden")}>
        {navGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-6")}>
            {isCollapsed ? (
              gi > 0 && <div className="mx-2 mb-3 h-px bg-white/[0.06]" aria-hidden />
            ) : (
              <div className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <li key={href} className="group/item relative">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-label={isCollapsed ? label : undefined}
                      onClick={variant === "mobile" ? onClose : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors duration-150",
                        isCollapsed ? "justify-center px-0" : "px-2.5",
                        active
                          ? "bg-accent/10 text-fg shadow-[inset_0_1px_0_rgb(255_255_255/.04),inset_0_0_0_1px_rgb(54_191_250/.12)]"
                          : "text-fg-muted hover:bg-white/[0.04] hover:text-fg"
                      )}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent [animation:ps-bar-in_.35s_cubic-bezier(.16,1,.3,1)_both]"
                        />
                      )}
                      <Icon
                        size={17}
                        strokeWidth={1.9}
                        className={cn(
                          "shrink-0 transition-[color,transform] duration-200",
                          active ? "text-accent" : "text-fg-subtle group-hover/item:text-fg-muted",
                          !isCollapsed && "group-hover/item:translate-x-0.5"
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                    {/* Tooltip for collapsed rail (hover + keyboard focus) */}
                    {isCollapsed && (
                      <span
                        role="presentation"
                        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg border border-white/10 bg-surface px-2.5 py-1.5 text-xs font-medium text-fg opacity-0 shadow-pop transition-all duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-100 group-focus-within/item:translate-x-0 group-focus-within/item:opacity-100"
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

      {/* Footer: environment + collapse */}
      <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3">
        {!isCollapsed ? (
          <div className="rounded-[12px] border border-white/[0.07] bg-surface/60 p-3">
            <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/50 [animation-duration:2.4s]" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              Sandbox environment
            </div>
            <p className="mt-1.5 text-[11.5px] leading-[1.5] text-fg-muted">
              Payments route to PayPal Sandbox. No real funds move.
            </p>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="Sandbox environment">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="Sandbox environment" />
          </div>
        )}

        {variant === "desktop" && onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            title={`${isCollapsed ? "Expand" : "Collapse"} sidebar (Ctrl/⌘ B)`}
            className={cn(
              "flex h-9 w-full items-center gap-3 rounded-[10px] text-[13px] font-medium text-fg-subtle transition-colors hover:bg-white/[0.04] hover:text-fg",
              isCollapsed ? "justify-center" : "px-2.5"
            )}
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
