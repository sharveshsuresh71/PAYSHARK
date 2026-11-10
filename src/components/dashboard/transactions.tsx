"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownUp, ChevronDown, ChevronUp, Copy, ExternalLink, Eye, MoreHorizontal, Search, X, ShieldCheck, ShieldAlert, Inbox } from "lucide-react";
import {
  amountOf, categorize, categoryMeta, formatMoney, humanizeCode, statusLabel,
  type PaymentCategory, type PaymentRequest
} from "@/lib/client/payments";
import { toast } from "@/components/toast";
import { cn } from "@/lib/cn";

type Filter = "all" | PaymentCategory;
type SortKey = "created_at" | "amount" | "risk";

function StatusPill({ r }: { r: PaymentRequest }) {
  return <span className={cn("pill", categoryMeta[categorize(r)].text)}>{statusLabel(r)}</span>;
}

function RiskMeter({ score }: { score: number | null }) {
  const s = score ?? 0;
  const tone = s > 50 ? "bg-danger" : s > 25 ? "bg-warning" : "bg-success";
  return (
    <span className="flex items-center gap-2" aria-label={`Risk score ${score ?? "unknown"} of 100`}>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/[0.06]">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.min(100, s)}%` }} />
      </span>
      <span className="tabular-nums text-fg-muted">{score ?? "—"}</span>
    </span>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast("Request ID copied", { tone: "success", description: id });
  } catch {
    toast("Couldn’t copy to clipboard", { tone: "error" });
  }
}

/* -------------------------------------------------------------------------- */
/* Floating contextual action menu (fixed-positioned so tables never clip it)  */
/* -------------------------------------------------------------------------- */
function RowActions({ r, onView }: { r: PaymentRequest; onView: () => void }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const close = useCallback((focus = true) => {
    setPos(null);
    if (focus) btnRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) close(false);
    };
    const onScroll = () => close(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) return close();
    const b = btnRef.current!.getBoundingClientRect();
    setPos({ top: b.bottom + 6, right: window.innerWidth - b.right });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    if (e.key === "Tab") close(false);
  }

  const pending = categorize(r) === "pending";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="icon-btn h-8 w-8"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${r.merchant} payment`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={onKeyDown}
          onClick={e => e.stopPropagation()}
          className="popover fixed z-[65] w-52 animate-pop-in p-1.5"
          style={{ top: pos.top, right: pos.right, transformOrigin: "top right" }}
        >
          <button role="menuitem" type="button" className="menu-item focus-visible:bg-white/[0.06] focus-visible:text-fg" onClick={() => { close(false); onView(); }}>
            <Eye size={14} /> View details
          </button>
          <button role="menuitem" type="button" className="menu-item focus-visible:bg-white/[0.06] focus-visible:text-fg" onClick={() => { close(); copyId(r.id); }}>
            <Copy size={14} /> Copy request ID
          </button>
          {pending && (
            <Link role="menuitem" href="/approvals" className="menu-item focus-visible:bg-white/[0.06] focus-visible:text-fg">
              <ExternalLink size={14} /> Open in Review Center
            </Link>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Detail drawer                                                               */
/* -------------------------------------------------------------------------- */
function DetailDrawer({ r, onClose }: { r: PaymentRequest; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cat = categorize(r);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const els = [...panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus();
    };
  }, [onClose]);

  const checks = r.policy_result?.checks ?? [];
  const reasons = r.policy_result?.reasonCodes ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[66]">
      <div className="absolute inset-0 animate-fade-in bg-[#020409]/70 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Payment request to ${r.merchant}`}
        className="popover absolute inset-y-0 right-0 flex w-[min(460px,100vw)] flex-col rounded-none rounded-l-[16px] [animation:ps-drawer-in_.4s_cubic-bezier(.16,1,.3,1)]"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="text-[13px] font-semibold text-fg">Payment request</div>
          <button type="button" onClick={onClose} className="icon-btn h-8 w-8" aria-label="Close details">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Hero amount */}
          <div className="relative overflow-hidden rounded-[14px] border border-white/[0.08] bg-[radial-gradient(120%_120%_at_100%_0%,rgb(22_119_255/.22),transparent_60%)] p-5">
            <StatusPill r={r} />
            <div className="mt-3 font-display text-[32px] font-semibold leading-none tracking-tight tabular-nums text-fg">
              {formatMoney(amountOf(r), r.currency)}
            </div>
            <div className="mt-2 text-[13px] text-fg-muted">to <span className="font-medium text-fg">{r.merchant}</span></div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
            {[
              ["Purpose", r.purpose, true],
              ["Policy decision", humanizeCode(r.decision)],
              ["Status", statusLabel(r)],
              ["Created", fmtDate(r.created_at)],
              ["Merchant ID", r.merchant_id],
              ["Agreement version", r.agreement_version != null ? `v${r.agreement_version}` : "—"],
              ["Policy version", r.policy_version != null ? `v${r.policy_version}` : "—"]
            ].map(([k, v, wide]) => (
              <div key={k as string} className={cn(wide && "col-span-2")}>
                <dt className="text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">{k}</dt>
                <dd className="mt-0.5 break-words text-fg">{v as string}</dd>
              </div>
            ))}
          </dl>

          <div className="well p-3.5">
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="text-fg-muted">Risk score</span>
              <RiskMeter score={r.risk_score} />
            </div>
            {r.risk_reasons && r.risk_reasons.length > 0 && (
              <ul className="space-y-1 text-[12px] text-fg-muted">
                {r.risk_reasons.map(x => <li key={x}>• {x}</li>)}
              </ul>
            )}
          </div>

          {r.policy_result?.explanation && (
            <p className="text-[12.5px] leading-[1.6] text-fg-muted">{r.policy_result.explanation}</p>
          )}

          {checks.length > 0 && (
            <div>
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Policy checks</div>
              <ul className="space-y-1.5">
                {checks.map(c => (
                  <li key={c.code} className="flex items-start gap-2 text-[12px]">
                    {c.passed ? <ShieldCheck size={14} className="mt-px shrink-0 text-success" /> : <ShieldAlert size={14} className="mt-px shrink-0 text-danger" />}
                    <span className={c.passed ? "text-fg-muted" : "text-fg"}>
                      <span className="font-mono text-[11px]">{c.code}</span>
                      {(c.detail ?? c.message) && <span className="block text-fg-subtle">{c.detail ?? c.message}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {reasons.map(c => <span key={c} className="pill text-danger">{humanizeCode(c)}</span>)}
            </div>
          )}

          <div className="text-[11px] text-fg-subtle">
            Request ID <span className="font-mono text-fg-muted">{r.id}</span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/[0.07] p-4">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => copyId(r.id)}>
            <Copy size={14} /> Copy ID
          </button>
          {cat === "pending" && (
            <Link href="/approvals" className="btn btn-primary flex-1">
              Review <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* -------------------------------------------------------------------------- */
/* Transactions panel                                                          */
/* -------------------------------------------------------------------------- */
export function TransactionsPanel({ rows, loading }: { rows: PaymentRequest[]; loading: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "created_at", dir: "desc" });
  const [limit, setLimit] = useState(8);
  const [selected, setSelected] = useState<PaymentRequest | null>(null);
  const closeDrawer = useCallback(() => setSelected(null), []);

  const counts = useMemo(() => {
    const c = { all: rows.length, captured: 0, pending: 0, blocked: 0 } as Record<Filter, number>;
    rows.forEach(r => c[categorize(r)]++);
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(r =>
      (filter === "all" || categorize(r) === filter) &&
      (!q || r.merchant.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q) || r.id.startsWith(q))
    );
    const val = (r: PaymentRequest) =>
      sort.key === "amount" ? amountOf(r) : sort.key === "risk" ? r.risk_score ?? 0 : new Date(r.created_at).getTime();
    return list.sort((a, b) => (sort.dir === "asc" ? val(a) - val(b) : val(b) - val(a)));
  }, [rows, filter, query, sort]);

  function toggleSort(key: SortKey) {
    setSort(s => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const sortHeader = (k: SortKey, label: string, className?: string) => {
    const active = sort.key === k;
    const Icon = !active ? ArrowDownUp : sort.dir === "asc" ? ChevronUp : ChevronDown;
    return (
      <th scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5 font-medium", className)}>
        <button type="button" onClick={() => toggleSort(k)} className={cn("inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-fg", active && "text-fg")}>
          {label} <Icon size={12} className={active ? "text-accent" : "opacity-50"} />
        </button>
      </th>
    );
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "captured", label: "Captured" },
    { key: "pending", label: "Pending" },
    { key: "blocked", label: "Blocked" }
  ];

  return (
    <section className="card overflow-hidden" data-no-tilt aria-labelledby="tx-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4 sm:p-5">
        <div>
          <h2 id="tx-heading" className="text-[15px] font-semibold text-fg">Transactions</h2>
          <p className="text-[12px] text-fg-subtle">Agent payment requests evaluated by the policy engine</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div role="group" aria-label="Filter by status" className="flex rounded-[10px] border border-white/[0.07] bg-canvas/50 p-0.5">
            {filters.map(f => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => { setFilter(f.key); setLimit(8); }}
                className={cn(
                  "flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium transition-all duration-200",
                  filter === f.key
                    ? "bg-surface-2 text-fg shadow-[inset_0_1px_0_rgb(255_255_255/.06),0_4px_12px_-6px_rgb(0_0_0/.8)]"
                    : "text-fg-muted hover:text-fg"
                )}
              >
                {f.label}
                <span className={cn("rounded px-1 text-[10.5px] tabular-nums", filter === f.key ? "bg-accent/15 text-accent" : "text-fg-subtle")}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 sm:w-52 sm:flex-none">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <label htmlFor="tx-search" className="sr-only">Search transactions</label>
            <input id="tx-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Merchant, purpose, ID…" className="field h-9 py-0 pl-8 text-[12.5px]" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
            <tr className="border-b border-white/[0.05]">
              <th scope="col" className="px-3 py-2.5 pl-5 font-medium">Merchant</th>
              {sortHeader("amount", "Amount", "text-right")}
              <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
              {sortHeader("risk", "Risk")}
              {sortHeader("created_at", "Created")}
              <th scope="col" className="px-3 py-2.5 pr-5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="px-3 py-3.5 pl-5"><div className="skeleton h-3.5 w-40" /><div className="skeleton mt-1.5 h-2.5 w-56" /></td>
                  <td className="px-3"><div className="skeleton ml-auto h-3.5 w-16" /></td>
                  <td className="px-3"><div className="skeleton h-5 w-20 rounded-full" /></td>
                  <td className="px-3"><div className="skeleton h-2 w-14" /></td>
                  <td className="px-3"><div className="skeleton h-3 w-24" /></td>
                  <td className="px-3 pr-5" />
                </tr>
              ))}
            {!loading && visible.slice(0, limit).map(r => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="group cursor-pointer border-b border-white/[0.04] transition-colors last:border-0 hover:bg-[linear-gradient(90deg,rgb(53_217_255/.05),transparent_70%)]"
              >
                <td className="max-w-[320px] px-3 py-3 pl-5">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setSelected(r); }}
                    className="block max-w-full truncate rounded text-left font-medium text-fg transition-colors group-hover:text-accent"
                  >
                    {r.merchant}
                  </button>
                  <div className="truncate text-[11.5px] text-fg-subtle">{r.purpose}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-fg">{formatMoney(amountOf(r), r.currency)}</td>
                <td className="px-3 py-3"><StatusPill r={r} /></td>
                <td className="px-3 py-3 text-[12px]"><RiskMeter score={r.risk_score} /></td>
                <td className="whitespace-nowrap px-3 py-3 text-[12px] text-fg-muted">{fmtDate(r.created_at)}</td>
                <td className="px-3 py-3 pr-5 text-right" onClick={e => e.stopPropagation()}>
                  <RowActions r={r} onView={() => setSelected(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-fg-subtle"><Inbox size={18} /></span>
            <p className="mt-3 text-[13px] font-medium text-fg">{rows.length ? "No transactions match your filters" : "No payment requests yet"}</p>
            <p className="mt-1 max-w-sm text-[12px] text-fg-muted">
              {rows.length ? "Try a different status or search term." : "Run an attack scenario in the Security Demo or submit a request from a registered agent."}
            </p>
            {!rows.length && <Link href="/demo" className="btn btn-secondary mt-4 text-[12.5px]">Open Security Demo</Link>}
          </div>
        )}
      </div>

      {!loading && visible.length > limit && (
        <div className="border-t border-white/[0.05] p-3 text-center">
          <button type="button" onClick={() => setLimit(l => l + 8)} className="btn btn-ghost text-[12.5px]">
            Show more · {visible.length - limit} remaining
          </button>
        </div>
      )}

      {selected && <DetailDrawer r={selected} onClose={closeDrawer} />}
    </section>
  );
}
