"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowUp, ShieldCheck, Sparkles, X } from "lucide-react";
import { analyze, formatMoney, humanizeCode, statusLabel, amountOf, type PaymentRequest, type PaymentAnalytics } from "@/lib/client/payments";
import { cn } from "@/lib/cn";

/*
 * PAYSHARK Assistant.
 * The app has no general-purpose chat model endpoint, so every answer here is
 * computed deterministically from verified records (GET /api/payment-requests)
 * and labelled "Verified data". The app's real generative-AI feature
 * (agreement analysis) is linked and labelled separately as "AI".
 */

interface Message {
  id: number;
  from: "user" | "assistant";
  text: string;
  source?: "verified" | "info";
  action?: { href: string; label: string };
}

const SUGGESTIONS = [
  "What needs my review?",
  "Any anomalies?",
  "Why were payments blocked?",
  "What's my success rate?",
  "What's my largest payment?"
];

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function answer(q: string, a: PaymentAnalytics, rows: PaymentRequest[]): Omit<Message, "id" | "from"> {
  const t = q.toLowerCase();
  const n = a.total;
  if (!n) return { text: "There are no payment requests yet. Run a scenario in the Attack Simulator or submit one from an agent to populate analytics.", source: "info", action: { href: "/demo", label: "Open Attack Simulator" } };

  // Anomaly detection: high risk scores or amounts far above the typical request
  if (/anomal|unusual|suspicious|outlier|fraud|weird/.test(t)) {
    const med = median(rows.filter(r => r.currency === a.currency).map(amountOf));
    const flagged = rows.filter(r => (r.risk_score ?? 0) > 50 || (med > 0 && r.currency === a.currency && amountOf(r) > med * 3));
    if (!flagged.length) return { text: `No anomalies found. No request scored above 50 risk or exceeded 3× the typical amount (${formatMoney(med, a.currency)}).`, source: "verified" };
    const list = flagged.slice(0, 4).map(r => {
      const why = [(r.risk_score ?? 0) > 50 ? `risk ${r.risk_score}` : null, med > 0 && amountOf(r) > med * 3 ? `${(amountOf(r) / med).toFixed(1)}× typical amount` : null].filter(Boolean).join(", ");
      return `• ${r.merchant}: ${formatMoney(amountOf(r), r.currency)} (${why}) · ${statusLabel(r)}`;
    }).join("\n");
    return { text: `${flagged.length} request${flagged.length === 1 ? "" : "s"} flagged:\n${list}`, source: "verified", action: { href: "/transactions", label: "Inspect in Transactions" } };
  }

  // Natural-language merchant search: "payments to Acme", "show blocked payments for X"
  const merchantHit = [...new Set(rows.map(r => r.merchant))].find(m => t.includes(m.toLowerCase()));
  if (merchantHit) {
    const mr = rows.filter(r => r.merchant === merchantHit);
    const vol = mr.filter(r => r.currency === a.currency).reduce((s, r) => s + amountOf(r), 0);
    const by = (s: string) => mr.filter(r => statusLabel(r) === s).length;
    return {
      text: `${merchantHit}: ${mr.length} request${mr.length === 1 ? "" : "s"}, ${formatMoney(vol, a.currency)} requested. Blocked: ${mr.filter(r => r.decision === "BLOCKED").length} · Captured: ${by("Captured")}.`,
      source: "verified",
      action: { href: "/transactions", label: "Open Transactions" }
    };
  }

  if (/review|pending|approv|attention|queue/.test(t)) {
    if (!a.needsAttention.length) return { text: "Nothing is waiting on you. Every payment request has been captured or blocked.", source: "verified" };
    const list = a.needsAttention.slice(0, 3).map(r => `• ${r.merchant} — ${formatMoney(amountOf(r), r.currency)} (${statusLabel(r)})`).join("\n");
    return { text: `${a.needsAttention.length} request${a.needsAttention.length === 1 ? "" : "s"} pending:\n${list}${a.needsAttention.length > 3 ? "\n…and more." : ""}`, source: "verified", action: { href: "/approvals", label: "Open Review Center" } };
  }
  if (/block|fail|reject|why|reason/.test(t)) {
    if (!a.counts.blocked) return { text: "No payments have been blocked.", source: "verified" };
    const reasons = a.topBlockReasons.length
      ? a.topBlockReasons.map(r => `• ${humanizeCode(r.code)} — ${r.count}×`).join("\n")
      : "• No reason codes were recorded.";
    return { text: `${a.counts.blocked} of ${n} requests were blocked by the policy engine. Most common reasons:\n${reasons}`, source: "verified" };
  }
  if (/success|rate|capture|complete/.test(t)) {
    if (a.successRate === null) return { text: `None of the ${n} requests have been resolved yet (captured or blocked), so there's no success rate.`, source: "verified" };
    return { text: `${Math.round(a.successRate * 100)}% success rate: ${a.counts.captured} captured vs ${a.counts.blocked} blocked. ${formatMoney(a.capturedVolume, a.currency)} captured in total.`, source: "verified" };
  }
  if (/large|big|max|highest/.test(t)) {
    if (!a.largest) return { text: "No payments recorded in your primary currency yet.", source: "verified" };
    const l = a.largest;
    return { text: `Largest request: ${formatMoney(amountOf(l), l.currency)} to ${l.merchant} for “${l.purpose}”. Status: ${statusLabel(l)}.`, source: "verified" };
  }
  if (/risk/.test(t)) {
    const high = rows.filter(r => (r.risk_score ?? 0) > 50).length;
    return { text: `Average risk score is ${a.averageRisk?.toFixed(0) ?? "—"}/100. ${high} request${high === 1 ? "" : "s"} scored above 50.`, source: "verified" };
  }
  if (/volume|total|spend|how much/.test(t)) {
    return { text: `${formatMoney(a.requestedVolume, a.currency)} requested across ${n} payment requests, ${formatMoney(a.capturedVolume, a.currency)} captured.${a.otherCurrencies.length ? ` (Other currencies not included: ${a.otherCurrencies.join(", ")}.)` : ""}`, source: "verified" };
  }
  return {
    text: "I can answer questions about your review queue, anomalies, blocked payments, success rate, risk, volume, the largest payment, or a specific merchant by name. Try one of the suggestions below.",
    source: "info"
  };
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PaymentRequest[] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const idRef = useRef(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/payment-requests");
      const json = await res.json();
      setRows(json.ok ? json.data : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (open) {
      load();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  function ask(q: string) {
    const text = q.trim();
    if (!text || !rows) return;
    setMessages(m => [...m, { id: idRef.current++, from: "user", text }]);
    setInput("");
    setThinking(true);
    const result = answer(text, analyze(rows), rows);
    setTimeout(() => {
      setMessages(m => [...m, { id: idRef.current++, from: "assistant", ...result }]);
      setThinking(false);
    }, 450);
  }

  const a = rows ? analyze(rows) : null;

  return (
    <>
      {/* Launcher orb */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? "Close PAYSHARK assistant" : "Open PAYSHARK assistant"}
        className="group fixed bottom-4 right-4 z-[60] grid h-14 w-14 place-items-center rounded-full transition-transform duration-300 hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <span className="absolute inset-0 rounded-full bg-accent/20 blur-xl transition-opacity group-hover:opacity-100 sm:opacity-60" aria-hidden />
        <span className="ai-orb h-12 w-12" aria-hidden />
        {open && <X size={18} className="absolute text-white drop-shadow" aria-hidden />}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          className="popover fixed bottom-[88px] right-3 z-[60] flex max-h-[min(640px,calc(100dvh-120px))] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden [animation:ps-panel-in_.4s_cubic-bezier(.16,1,.3,1)] sm:bottom-[100px] sm:right-6"
          style={{ transformOrigin: "bottom right" }}
        >
          {/* Header */}
          <div className="relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_100%_at_0%_0%,rgb(32_200_120/.12),transparent_70%)]" aria-hidden />
            <span className="ai-orb h-9 w-9 shrink-0" aria-hidden />
            <div className="relative min-w-0 flex-1">
              <h2 id={titleId} className="text-[14px] font-semibold text-fg">PAYSHARK Assistant</h2>
              <p className="text-[11.5px] text-fg-muted">Answers from your verified payment records</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="icon-btn relative h-8 w-8" aria-label="Close assistant">
              <X size={15} />
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {/* Insight cards */}
            <div className="grid grid-cols-3 gap-2">
              {a ? (
                [
                  { label: "Pending", value: a.counts.pending, cls: "text-warning" },
                  { label: "Blocked", value: a.counts.blocked, cls: "text-danger" },
                  { label: "Success", value: a.successRate === null ? "—" : `${Math.round(a.successRate * 100)}%`, cls: "text-success" }
                ].map(i => (
                  <div key={i.label} className="well px-3 py-2.5">
                    <div className="text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">{i.label}</div>
                    <div className={cn("mt-0.5 font-display text-lg font-semibold tabular-nums", i.cls)}>{i.value}</div>
                  </div>
                ))
              ) : (
                [0, 1, 2].map(i => <div key={i} className="skeleton h-[58px] rounded-[12px]" />)
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
              <ShieldCheck size={12} className="text-success" /> Verified data · {a ? `${a.total} payment requests` : "loading…"}
            </div>

            {messages.length === 0 && (
              <div className="rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-3 text-[13px] leading-[1.55] text-fg-muted">
                Hi! Ask about your review queue, blocked payments or payment performance. Every answer is calculated from your own records. Nothing is generated.
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={cn("flex animate-pop-in", m.from === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] whitespace-pre-line rounded-[14px] px-3.5 py-2.5 text-[13px] leading-[1.55]",
                    m.from === "user"
                      ? "rounded-br-[4px] bg-[linear-gradient(135deg,#B6F36A,#20C878)] text-accent-fg shadow-[0_8px_20px_-12px_rgb(32_200_120/.8)]"
                      : "rounded-bl-[4px] border border-white/[0.08] bg-surface-2/60 text-fg"
                  )}
                >
                  {m.text}
                  {m.action && (
                    <Link
                      href={m.action.href}
                      onClick={() => setOpen(false)}
                      className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent/20"
                    >
                      {m.action.label} →
                    </Link>
                  )}
                  {m.source === "verified" && (
                    <div className="mt-2 flex items-center gap-1 border-t border-white/[0.06] pt-1.5 text-[10.5px] font-medium text-success/90">
                      <ShieldCheck size={11} /> Verified data · computed, not AI-generated
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-center gap-2 text-[12px] text-fg-subtle" aria-live="polite">
                <span className="ai-orb h-4 w-4" aria-hidden /> Calculating…
              </div>
            )}
          </div>

          {/* Suggestions + input */}
          <div className="border-t border-white/[0.07] p-3">
            <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  disabled={!rows || thinking}
                  onClick={() => ask(s)}
                  className="shrink-0 rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-accent/40 hover:text-fg disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); ask(input); }} className="relative">
              <label htmlFor={`${titleId}-q`} className="sr-only">Ask the assistant</label>
              <input
                ref={inputRef}
                id={`${titleId}-q`}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your payments…"
                className="field h-10 pr-11 text-[13px]"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!input.trim() || !rows || thinking}
                className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-accent text-accent-fg transition-opacity disabled:opacity-30"
                aria-label="Send"
              >
                <ArrowUp size={15} />
              </button>
            </form>
            <Link
              href="/agreements/new"
              onClick={() => setOpen(false)}
              className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-iris/25 bg-iris/[0.08] px-3 py-2 text-[12px] text-fg-muted transition-colors hover:border-iris/45 hover:text-fg"
            >
              <span className="inline-flex items-center gap-1 rounded-md bg-iris/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9FEBF8]">
                <Sparkles size={10} /> AI
              </span>
              Analyze an agreement with generative AI →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
