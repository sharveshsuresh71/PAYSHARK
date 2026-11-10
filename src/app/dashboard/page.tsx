"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PaymentCard } from "@/components/dashboard/payment-card";
import { VolumeChart, DistributionRing, SuccessGauge } from "@/components/dashboard/charts";
import { TransactionsPanel } from "@/components/dashboard/transactions";
import { toast } from "@/components/toast";
import { refreshSession } from "@/lib/client/session-store";
import { analyze, formatMoney, type PaymentRequest } from "@/lib/client/payments";
import { cn } from "@/lib/cn";
import {
  ArrowUpRight, ShieldCheck, FileCheck2, Bot, Activity, RefreshCw, Plus, ClipboardCheck,
  ShieldAlert, CheckCircle2, Clock3, XOctagon, Gauge, Database, BadgeCheck, SlidersHorizontal
} from "lucide-react";

type Session = { id: string; email: string; full_name: string; role: string };

function greetingFor(date: Date) {
  const h = date.getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Small sparkline accent drawn from real daily values. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-10 w-full", className)} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#35D9FF" stopOpacity=".28" />
          <stop offset="1" stopColor="#35D9FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${pts} 100,30`} fill="url(#spark-fill)" />
      <polyline points={pts} pathLength={1} fill="none" stroke="#35D9FF" strokeWidth="1.6" className="chart-line" />
    </svg>
  );
}

function MetricSkeleton() {
  return <div className="skeleton mt-3 h-8 w-24" />;
}

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [counts, setCounts] = useState({ agreements: 0, policies: 0, activePolicies: 0, agents: 0, audit: 0 });
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");

  async function loadData() {
    try {
      const [sessRes, agrRes, polRes, agtRes, audRes, payRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/agreements"),
        fetch("/api/policies"),
        fetch("/api/agents"),
        fetch("/api/audit"),
        fetch("/api/payment-requests")
      ]);

      const [sess, agr, pol, agt, aud, pay] = await Promise.all([
        sessRes.json(),
        agrRes.json(),
        polRes.json(),
        agtRes.json(),
        audRes.json(),
        payRes.json()
      ]);

      if (sess.ok) setSession(sess.data);
      setCounts({
        agreements: agr.ok ? agr.data.length : 0,
        policies: pol.ok ? pol.data.length : 0,
        activePolicies: pol.ok ? pol.data.filter((p: { status?: string }) => p.status === "ACTIVE").length : 0,
        agents: agt.ok ? agt.data.length : 0,
        audit: aud.ok ? aud.data.logs.length : 0
      });
      setPayments(pay.ok ? pay.data : []);
    } catch (err) {
      console.error(err);
      toast("Couldn’t refresh workspace data", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setGreeting(greetingFor(new Date()));
    loadData();
  }, []);

  async function switchRole(role: "buyer" | "seller") {
    setSwitching(true);
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      await Promise.all([loadData(), refreshSession()]);
      toast(`Switched to ${role}`, { tone: "success", description: "Workspace data reloaded for the new session." });
    } catch (err) {
      console.error(err);
      toast("Role switch failed", { tone: "error" });
    } finally {
      setSwitching(false);
    }
  }

  const a = useMemo(() => analyze(payments), [payments]);
  const firstName = session?.full_name.replace(/\s*\(.*?\)\s*/g, "").split(" ")[0];
  const pct = (n: number) => (a.total ? Math.round((n / a.total) * 100) : 0);

  const statusCards = [
    { label: "Successful", value: a.counts.captured, icon: CheckCircle2, tone: "text-success", bar: "bg-success", note: `${pct(a.counts.captured)}% of requests` },
    { label: "Pending", value: a.counts.pending, icon: Clock3, tone: "text-warning", bar: "bg-warning", note: a.counts.pending ? "Awaiting review or capture" : "Queue clear" },
    { label: "Blocked", value: a.counts.blocked, icon: XOctagon, tone: "text-danger", bar: "bg-danger", note: `${pct(a.counts.blocked)}% stopped by policy` },
    { label: "Success rate", value: a.successRate === null ? "—" : `${Math.round(a.successRate * 100)}%`, icon: Gauge, tone: "text-accent", bar: "bg-accent", note: "Captured ÷ resolved", ratio: a.successRate ?? 0 }
  ];

  const workspace = [
    ["Agreements", counts.agreements, "/agreements", FileCheck2],
    ["Policies", counts.policies, "/policies", SlidersHorizontal],
    ["Agents", counts.agents, "/agents", Bot],
    ["Audit events", counts.audit, "/audit", Activity]
  ] as const;

  return (
    <AppShell>
      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[linear-gradient(135deg,rgb(24_43_70/.55),rgb(10_16_32/.75))] shadow-[inset_0_1px_0_rgb(255_255_255/.06),0_40px_80px_-40px_rgb(0_0_0/.9)]">
        {/* Atmosphere */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(22_119_255/.35),transparent)] motion-safe:animate-[ps-float_9s_ease-in-out_infinite]" />
          <div className="absolute -bottom-40 left-1/3 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgb(121_92_255/.16),transparent)]" />
          <svg className="absolute inset-0 h-full w-full opacity-[.18]" aria-hidden>
            <defs>
              <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#91A4C2" />
              </pattern>
              <radialGradient id="hero-dots-mask-g" cx="80%" cy="20%" r="70%">
                <stop offset="0" stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="hero-dots-mask"><rect width="100%" height="100%" fill="url(#hero-dots-mask-g)" /></mask>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-dots)" mask="url(#hero-dots-mask)" />
          </svg>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        </div>

        <div className="relative grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:gap-10 lg:p-10">
          <div className="min-w-0">
            <div className="kicker">Control room · Neon Postgres connected</div>
            <h1 className="mt-3 font-display text-[clamp(28px,3.6vw,42px)] font-semibold leading-[1.08] tracking-[-0.02em]">
              <span className="text-fg">{greeting}{firstName ? "," : ""}</span>{" "}
              {firstName ? (
                <span className="bg-gradient-to-r from-[#9BEFFF] via-accent to-ocean bg-clip-text text-transparent">{firstName}</span>
              ) : (
                <span className="skeleton inline-block h-8 w-32 align-middle" />
              )}
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-[1.65] text-fg-muted">
              Agreement-aware payment authorization layer for autonomous agent transactions.
            </p>

            {/* Account status */}
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/[0.08] px-2.5 py-1 font-medium text-success">
                <BadgeCheck size={13} /> Session verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] px-2.5 py-1 text-fg-muted">
                <Database size={12} className="text-accent" /> Neon DB live
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] py-0.5 pl-2.5 pr-1 text-fg-muted">
                Role <span className="font-semibold uppercase text-fg">{session?.role || "buyer"}</span>
                <button
                  type="button"
                  disabled={switching}
                  onClick={() => switchRole(session?.role === "buyer" ? "seller" : "buyer")}
                  className="ml-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
                >
                  <RefreshCw size={11} className={switching ? "animate-spin" : ""} />
                  Switch to {session?.role === "buyer" ? "Seller" : "Buyer"}
                </button>
              </span>
            </div>

            {/* Quick actions */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/agreements/new" className="btn btn-primary">
                New agreement <ArrowUpRight size={16} />
              </Link>
              <Link href="/policies/new" className="btn btn-secondary">
                <Plus size={15} /> New policy
              </Link>
              <Link href="/approvals" className="btn btn-secondary">
                <ClipboardCheck size={15} /> Review queue
                {a.counts.pending > 0 && (
                  <span className="rounded-md bg-warning/15 px-1.5 text-[11px] font-semibold tabular-nums text-warning">{a.counts.pending}</span>
                )}
              </Link>
              <Link href="/demo" className="btn btn-ghost">
                <ShieldAlert size={15} /> Security demo
              </Link>
            </div>
          </div>

          <PaymentCard
            className="mx-auto w-full max-w-[340px]"
            holder={session ? session.full_name.replace(/\s*\(.*?\)\s*/g, "") : ""}
            role={session?.role ?? ""}
            activePolicies={loading ? null : counts.activePolicies}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Financial metrics (bento)                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex flex-col p-5 sm:col-span-2 lg:row-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12.5px] font-medium text-fg-muted">Total payment volume</div>
              <div className="text-[11px] text-fg-subtle">Captured · {a.currency}</div>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-[10px] border border-accent/20 bg-accent/10 text-accent shadow-[0_0_20px_-6px_rgb(53_217_255/.6)]">
              <Activity size={17} />
            </span>
          </div>
          {loading ? (
            <MetricSkeleton />
          ) : (
            <div className="mt-4 font-display text-[clamp(30px,3.4vw,40px)] font-semibold leading-none tracking-[-0.02em] tabular-nums text-fg">
              {formatMoney(a.capturedVolume, a.currency)}
            </div>
          )}
          <div className="mt-2 text-[12px] text-fg-muted">
            {formatMoney(a.requestedVolume, a.currency)} requested across {a.total} {a.total === 1 ? "request" : "requests"}
            {a.otherCurrencies.length > 0 && <span className="text-fg-subtle"> · excludes {a.otherCurrencies.join(", ")}</span>}
          </div>
          <div className="mt-auto pt-5">
            <Sparkline values={a.daily.map(d => d.volume)} />
            <div className="mt-1 flex justify-between text-[10.5px] text-fg-subtle">
              <span>14 days ago</span><span>Today</span>
            </div>
          </div>
        </div>

        {statusCards.map(c => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-fg-muted">{c.label}</span>
              <c.icon size={16} className={c.tone} />
            </div>
            {loading ? (
              <MetricSkeleton />
            ) : (
              <div className="mt-3 font-display text-[28px] font-semibold leading-none tabular-nums text-fg">{c.value}</div>
            )}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", c.bar)}
                style={{ width: `${loading ? 0 : c.ratio !== undefined ? c.ratio * 100 : a.total ? (Number(c.value) / a.total) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 text-[11.5px] text-fg-subtle">{c.note}</div>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Analytics                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2" aria-labelledby="vol-h">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="vol-h" className="text-[15px] font-semibold text-fg">Transaction volume</h2>
              <p className="text-[12px] text-fg-subtle">Last 14 days · {a.currency}</p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-fg-muted">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-accent" /> Requested</span>
              <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-success" /> Captured</span>
            </div>
          </div>
          {loading ? <div className="skeleton h-[200px] w-full rounded-[12px]" /> : <VolumeChart data={a.daily} currency={a.currency} />}
        </section>

        <section className="card p-5" aria-labelledby="succ-h">
          <h2 id="succ-h" className="text-[15px] font-semibold text-fg">Payment success</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">Captured vs. blocked by policy</p>
          {loading ? <div className="skeleton h-[220px] w-full rounded-[12px]" /> : (
            <SuccessGauge rate={a.successRate} captured={a.counts.captured} blocked={a.counts.blocked} reasons={a.topBlockReasons} />
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section className="card p-5" aria-labelledby="dist-h">
          <h2 id="dist-h" className="text-[15px] font-semibold text-fg">Payment distribution</h2>
          <p className="mb-5 text-[12px] text-fg-subtle">By outcome, all currencies</p>
          {loading ? <div className="skeleton h-[150px] w-full rounded-[12px]" /> : <DistributionRing counts={a.counts} />}
        </section>

        <section className="card p-5" aria-labelledby="ws-h">
          <h2 id="ws-h" className="text-[15px] font-semibold text-fg">Workspace</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">Live records in Neon Postgres</p>
          <div className="grid grid-cols-2 gap-2.5">
            {workspace.map(([name, value, href, Icon]) => (
              <Link key={name} href={href} className="well group p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent/[0.04]">
                <Icon size={15} className="text-fg-subtle transition-colors group-hover:text-accent" />
                <div className="mt-2 font-display text-xl font-semibold tabular-nums text-fg">{loading ? "—" : value}</div>
                <div className="flex items-center justify-between text-[11.5px] text-fg-muted">
                  {name} <ArrowUpRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-5 md:col-span-2 lg:col-span-1" aria-labelledby="sec-h">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-success/25 bg-success/10 text-success">
              <ShieldCheck size={16} />
            </span>
            <h2 id="sec-h" className="text-[15px] font-semibold text-fg">Security posture</h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {[
              "AI has no direct payment execution tools",
              "Policy engine is pure and deterministic",
              "Scenario D: Purpose mismatch BLOCKED + REVIEW",
              "Neon PostgreSQL schema active",
              "Audit logs protected by SHA-256 hash chain",
              "Single-use cryptographic human approval binding"
            ].map(x => (
              <li key={x} className="flex items-start gap-2.5 text-[12.5px] text-fg-muted">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
          <Link href="/demo" className="btn btn-secondary mt-5 w-full text-[12.5px]">
            Open Red-Team Attack Simulator →
          </Link>
        </section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Transactions                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-6">
        <TransactionsPanel rows={payments} loading={loading} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Enforcement pipeline                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-6" aria-labelledby="pipe-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="pipe-h" className="text-[15px] font-semibold text-fg">Active enforcement pipeline</h2>
          <Link href="/audit" className="text-[12px] font-medium text-accent transition-colors hover:text-accent-hover">
            View Audit Trail →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["01", "Agreement & Global Counterparty Binding", "Agreements identify counterparties by normalized email. Single-use invitation tokens bind verified accounts atomically before activation."],
            ["02", "Deterministic Policy Engine (13 Rules)", "Evaluates per-transaction ceilings, merchant allowlists, and currency precision. Purpose mismatches (Scenario D) are strictly BLOCKED and routed to human review."],
            ["03", "Single-Use Human Authorization & PayPal Sandbox", "Server validates binding before creating PayPal Orders. Capture atomically consumes the approval and appends to the SHA-256 audit chain."]
          ].map(([n, t, d]) => (
            <div key={n} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-accent/20 bg-accent/10 font-mono text-[12px] font-semibold text-accent">{n}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-accent/30 to-transparent" aria-hidden />
              </div>
              <h3 className="mt-4 text-[13.5px] font-semibold text-fg">{t}</h3>
              <p className="mt-1.5 text-[12px] leading-[1.6] text-fg-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
