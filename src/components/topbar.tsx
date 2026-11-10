"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, Repeat2, Search, Activity, CornerDownLeft } from "lucide-react";
import { allNavItems, quickActions, findActiveItem, type NavItem } from "./nav-config";
import { BrandMark } from "./sidebar";
import { toast } from "./toast";
import { useSessionUser, displayName, initials } from "@/lib/client/session-store";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Shared: close a popover on outside click / Escape and restore focus         */
/* -------------------------------------------------------------------------- */
function useDismiss(open: boolean, close: () => void, rootRef: React.RefObject<HTMLElement | null>, triggerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, rootRef, triggerRef]);
}

/* -------------------------------------------------------------------------- */
/* Global search (⌘K) — searches app destinations and quick actions            */
/* -------------------------------------------------------------------------- */
function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool: (NavItem & { group: string })[] = [
      ...allNavItems.map(i => ({ ...i, group: "Pages" })),
      ...quickActions.map(i => ({ ...i, group: "Actions" }))
    ];
    if (!q) return pool;
    return pool.filter(i => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }, [query]);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, rootRef, inputRef);

  // ⌘K / Ctrl+K and "/" focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable='true']");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setActiveIndex(0), [query]);

  function go(item: NavItem) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter" && open && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={rootRef} className="relative w-full max-w-[420px]">
      <label htmlFor={`${listId}-input`} className="sr-only">Search PAYSHARK</label>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[activeIndex] ? optionId(activeIndex) : undefined}
        placeholder="Search pages and actions…"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-[10px] border border-white/[0.08] bg-white/[0.03] pl-9 pr-14 text-[13px] text-fg placeholder:text-fg-subtle transition-colors hover:border-white/[0.14] focus:border-accent/70 focus:bg-canvas focus:shadow-[0_0_0_3px_rgb(54_191_250/.15)] focus-visible:shadow-[0_0_0_3px_rgb(54_191_250/.15)]"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex" aria-hidden>
        <kbd className="kbd">⌘K</kbd>
      </span>

      {open && (
        <div className="popover absolute left-0 right-0 top-[calc(100%+6px)] z-50 animate-pop-in overflow-hidden p-1.5">
          <ul id={listId} role="listbox" aria-label="Search results" className="max-h-[340px] overflow-y-auto">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-[13px] text-fg-muted">No results for “{query}”</li>
            )}
            {results.map((item, i) => {
              const showHeader = i === 0 || results[i - 1].group !== item.group;
              const Icon = item.icon;
              return (
                <li key={item.href} role="none">
                  {showHeader && (
                    <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-fg-subtle" aria-hidden>
                      {item.group}
                    </div>
                  )}
                  <div
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-active={i === activeIndex}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => go(item)}
                    className="menu-item cursor-pointer"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-canvas">
                      <Icon size={14} className={i === activeIndex ? "text-accent" : "text-fg-muted"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{item.label}</span>
                      <span className="block truncate text-[12px] text-fg-subtle">{item.description}</span>
                    </span>
                    {i === activeIndex && <CornerDownLeft size={13} className="shrink-0 text-fg-subtle" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Notifications — latest events from the existing /api/audit feed             */
/* -------------------------------------------------------------------------- */
interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
}

const SEEN_KEY = "payshark:notifications-seen-at";

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function humanize(action: string) {
  return action.replace(/[_.]+/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, rootRef, triggerRef);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const json = await res.json();
      if (json.ok) {
        setEvents((json.data.logs as AuditEvent[]).slice(0, 6));
        setError(false);
      } else setError(true);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    setSeenAt(Number(localStorage.getItem(SEEN_KEY) || 0));
    load();
  }, [load]);

  const unread = (events ?? []).filter(e => new Date(e.created_at).getTime() > seenAt).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      load();
      const now = Date.now();
      localStorage.setItem(SEEN_KEY, String(now));
      // keep current highlight while panel is open; clear badge
      setTimeout(() => setSeenAt(now), 400);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="icon-btn"
        aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
      >
        <Bell size={17} strokeWidth={1.9} />
        {unread > 0 && (
          <span aria-hidden className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-accent ring-2 ring-sidebar" />
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="popover absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-24px))] animate-pop-in overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <span className="text-[13px] font-semibold text-fg">Notifications</span>
            <span className="text-[11.5px] text-fg-subtle">Latest activity</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-1.5">
            {events === null && !error && (
              <div className="space-y-2 p-2" aria-busy="true">
                {[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.04]" />)}
              </div>
            )}
            {error && <p className="px-3 py-6 text-center text-[13px] text-fg-muted">Couldn’t load activity.</p>}
            {events && events.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-fg-muted">You’re all caught up.</p>
            )}
            {events?.map(ev => {
              const isNew = new Date(ev.created_at).getTime() > seenAt;
              return (
                <Link key={ev.id} href="/audit" onClick={close} className="menu-item items-start">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-canvas">
                    <Activity size={13} className="text-accent" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{humanize(ev.action)}</span>
                    <span className="block truncate text-[12px] text-fg-subtle">
                      {ev.entity_type} · {timeAgo(ev.created_at)}
                    </span>
                  </span>
                  {isNew && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="New" />}
                </Link>
              );
            })}
          </div>
          <Link
            href="/audit"
            onClick={close}
            className="flex items-center justify-center gap-1 border-t border-white/[0.07] px-4 py-2.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.03] hover:text-fg"
          >
            View audit trail <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile menu — wired to the existing /api/auth/session endpoint              */
/* -------------------------------------------------------------------------- */
function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const user = useSessionUser();
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, rootRef, triggerRef);

  // Move focus into the menu when it opens
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])") ?? []);
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    if (e.key === "Home") { e.preventDefault(); items[0]?.focus(); }
    if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus(); }
    if (e.key === "Tab") setOpen(false);
  }

  async function switchRole() {
    if (!user) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: user.role === "seller" ? "buyer" : "seller" })
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      toast("Couldn’t switch role", { tone: "error", description: "The session service did not respond. Try again." });
      setBusy(false);
    }
  }

  async function endSession() {
    setBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      window.location.reload();
    } catch {
      toast("Couldn’t end session", { tone: "error" });
      setBusy(false);
    }
  }

  const name = user ? displayName(user) : "Loading…";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Account menu"
        className="flex h-9 items-center gap-2 rounded-[10px] border border-transparent pl-1 pr-1.5 transition-colors hover:bg-white/[0.05] aria-expanded:border-white/[0.08] aria-expanded:bg-white/[0.06] md:pr-2"
      >
        <span className="rounded-full bg-[conic-gradient(from_200deg,#35D9FF,#1677FF,#795CFF,#35D9FF)] p-[1.5px]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-sidebar text-[11px] font-semibold text-fg">
            {user ? initials(user) : ""}
          </span>
        </span>
        <span className="hidden min-w-0 text-left md:block">
          <span className="block max-w-[140px] truncate text-[12.5px] font-medium leading-4 text-fg">{name}</span>
          <span className="block text-[11px] capitalize leading-4 text-fg-subtle">{user?.role ?? "—"}</span>
        </span>
        <ChevronDown size={14} className={cn("hidden text-fg-subtle transition-transform duration-200 md:block", open && "rotate-180")} />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="popover absolute right-0 top-[calc(100%+8px)] z-50 w-64 animate-pop-in p-1.5"
        >
          <div className="px-2.5 pb-2.5 pt-2">
            <div className="truncate text-[13px] font-semibold text-fg">{name}</div>
            <div className="truncate text-[12px] text-fg-muted">{user?.email}</div>
            <span className="mt-2 inline-flex items-center rounded-md border border-accent/25 bg-accent/10 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent">
              {user?.role ?? "—"}
            </span>
          </div>
          <div className="my-1 h-px bg-white/[0.07]" role="separator" />
          <button type="button" role="menuitem" disabled={busy || !user} onClick={switchRole} className="menu-item focus-visible:bg-white/[0.06] focus-visible:text-fg disabled:opacity-50">
            <Repeat2 size={15} /> Switch to {user?.role === "seller" ? "buyer" : "seller"}
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={endSession} className="menu-item focus-visible:bg-white/[0.06] focus-visible:text-fg disabled:opacity-50">
            <LogOut size={15} /> End session
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Top navigation bar                                                           */
/* -------------------------------------------------------------------------- */
export function Topbar({ onOpenMobileNav, mobileNavOpen }: { onOpenMobileNav: () => void; mobileNavOpen: boolean }) {
  const pathname = usePathname();
  const current = findActiveItem(pathname);
  const isNested = current && pathname !== current.href;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b px-3 backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 sm:px-6 lg:px-8",
        scrolled
          ? "glass border-white/[0.07] shadow-[0_12px_32px_-20px_rgb(0_0_0/.9)]"
          : "border-transparent bg-canvas/40"
      )}
    >
      {/* Mobile: menu + brand */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="icon-btn lg:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileNavOpen}
        aria-controls="mobile-nav"
      >
        <Menu size={19} />
      </button>
      <Link href="/dashboard" className="rounded-[10px] lg:hidden" aria-label="PAYSHARK — go to overview">
        <BrandMark className="h-7 w-7" />
      </Link>

      {/* Desktop: breadcrumb */}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink-0 items-center gap-1.5 text-[13px] lg:flex">
        <span className="text-fg-subtle">PAYSHARK</span>
        {current && (
          <>
            <ChevronRight size={14} className="text-fg-subtle/70" aria-hidden />
            {isNested ? (
              <Link href={current.href} className="rounded px-0.5 text-fg-muted transition-colors hover:text-fg">{current.label}</Link>
            ) : (
              <span className="font-medium text-fg" aria-current="page">{current.label}</span>
            )}
          </>
        )}
        {isNested && (
          <>
            <ChevronRight size={14} className="text-fg-subtle/70" aria-hidden />
            <span className="max-w-[180px] truncate font-medium text-fg" aria-current="page">
              {pathname?.endsWith("/new") ? "New" : "Details"}
            </span>
          </>
        )}
      </nav>

      <div className="flex min-w-0 flex-1 justify-center px-1 lg:px-6">
        <GlobalSearch />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-amber-300 xl:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
          Sandbox
        </span>
        <Notifications />
        <div className="mx-1.5 hidden h-5 w-px bg-white/[0.08] sm:block" aria-hidden />
        <ProfileMenu />
      </div>
    </header>
  );
}
