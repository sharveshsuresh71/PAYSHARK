"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bot, Database, Link2, Lock, ShieldCheck, Waypoints, ChevronRight } from "lucide-react";
import { amountOf, categorize, formatMoney, type PaymentRequest } from "@/lib/client/payments";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Payment network — abstract orbital graph built from real requests           */
/* (no location data exists, so this is intentionally not a geographic map)    */
/* -------------------------------------------------------------------------- */
interface AgentLite { id: string; agent_name: string; status?: string }

export function PaymentNetwork({ rows, agents, currency }: { rows: PaymentRequest[]; agents: AgentLite[]; currency: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  useEffect(() => setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);

  const { merchants, agentNodes } = useMemo(() => {
    const m = new Map<string, { name: string; count: number; volume: number; captured: number; blocked: number; pending: number }>();
    rows.forEach(r => {
      const e = m.get(r.merchant) ?? { name: r.merchant, count: 0, volume: 0, captured: 0, blocked: 0, pending: 0 };
      e.count++;
      if (r.currency === currency) e.volume += amountOf(r);
      e[categorize(r)]++;
      m.set(r.merchant, e);
    });
    const merchants = [...m.values()].sort((a, b) => b.count - a.count).slice(0, 8);
    const usage = new Map<string, number>();
    rows.forEach(r => r.agent_id && usage.set(r.agent_id, (usage.get(r.agent_id) ?? 0) + 1));
    const agentNodes = agents.slice(0, 5).map(a => ({ ...a, count: usage.get(a.id) ?? 0 }));
    return { merchants, agentNodes };
  }, [rows, agents, currency]);

  const W = 560, H = 300, CX = W / 2, CY = H / 2;
  const orbit = (i: number, n: number, rx: number, ry: number, phase = -Math.PI / 2) => {
    const t = phase + (i / Math.max(1, n)) * Math.PI * 2;
    return { x: CX + Math.cos(t) * rx, y: CY + Math.sin(t) * ry, depth: (Math.sin(t) + 1) / 2 };
  };
  const tone = (e: { captured: number; blocked: number; pending: number }) =>
    e.blocked >= e.captured && e.blocked >= e.pending ? "#FF6363" : e.captured >= e.pending ? "#3496FF" : "#F5BE50";
  const maxCount = Math.max(1, ...merchants.map(m => m.count));
  const hovered = merchants.find(m => m.name === hover);

  if (!merchants.length && !agentNodes.length) {
    return (
      <div className="grid h-[260px] place-items-center text-center">
        <div>
          <Waypoints className="mx-auto text-fg-subtle" size={22} />
          <p className="mt-2 text-[13px] text-fg">No network activity yet</p>
          <p className="mt-1 text-[12px] text-fg-muted">Agents and merchants appear here as payment requests arrive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Payment network: ${agentNodes.length} agents and ${merchants.length} merchants connected through PAYSHARK.`}>
        <defs>
          <radialGradient id="net-core" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="#E6F1FF" />
            <stop offset=".45" stopColor="#3496FF" />
            <stop offset="1" stopColor="#1E2E48" />
          </radialGradient>
          <radialGradient id="net-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#3496FF" stopOpacity=".28" />
            <stop offset="1" stopColor="#3496FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Orbital rings (perspective ellipses) */}
        {[{ rx: 240, ry: 112 }, { rx: 140, ry: 64 }].map((o, i) => (
          <ellipse key={i} cx={CX} cy={CY} rx={o.rx} ry={o.ry} fill="none" stroke="rgb(170 196 232 / .12)" strokeDasharray={i ? "2 6" : "0"} />
        ))}
        <circle cx={CX} cy={CY} r="70" fill="url(#net-halo)" />

        {/* Agent → core edges */}
        {agentNodes.map((a, i) => {
          const p = orbit(i, agentNodes.length, 140, 64, Math.PI / 5);
          return <line key={a.id} x1={p.x} y1={p.y} x2={CX} y2={CY} stroke="#36D9F5" strokeOpacity=".35" strokeWidth="1" />;
        })}

        {/* Core → merchant edges with flowing pulses */}
        {merchants.map((m, i) => {
          const p = orbit(i, merchants.length, 240, 112);
          const id = `edge-${i}`;
          const active = !hover || hover === m.name;
          return (
            <g key={m.name} opacity={active ? 1 : 0.25} className="transition-opacity duration-300">
              <path id={id} d={`M${CX},${CY} Q${(CX + p.x) / 2},${Math.min(CY, p.y) - 30} ${p.x},${p.y}`} fill="none" stroke={tone(m)} strokeOpacity=".45" strokeWidth={1 + (m.count / maxCount) * 2} />
              {animate && (
                <circle r="2.4" fill={tone(m)}>
                  <animateMotion dur={`${2.6 + i * 0.35}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          );
        })}

        {/* Agents */}
        {agentNodes.map((a, i) => {
          const p = orbit(i, agentNodes.length, 140, 64, Math.PI / 5);
          return (
            <g key={a.id}>
              <circle cx={p.x} cy={p.y} r={7 + p.depth * 2} fill="#0B1F18" stroke="#36D9F5" strokeWidth="1.5" />
              <text x={p.x} y={p.y + 20} textAnchor="middle" fontSize="10" fill="rgb(145 164 154)">{a.agent_name.length > 14 ? a.agent_name.slice(0, 13) + "…" : a.agent_name}</text>
            </g>
          );
        })}

        {/* Core */}
        <g>
          <ellipse cx={CX} cy={CY + 26} rx="30" ry="6" fill="#000" opacity=".45" />
          <circle cx={CX} cy={CY} r="22" fill="url(#net-core)" stroke="rgb(255 255 255 / .35)" strokeWidth="1" />
          <ellipse cx={CX - 6} cy={CY - 9} rx="9" ry="4.5" fill="#fff" opacity=".35" />
          <text x={CX} y={CY + 42} textAnchor="middle" fontSize="10.5" fontWeight="600" letterSpacing="2" fill="#F5F8F5">PAYSHARK</text>
        </g>

        {/* Merchants */}
        {merchants.map((m, i) => {
          const p = orbit(i, merchants.length, 240, 112);
          const r = 6 + (m.count / maxCount) * 6 + p.depth * 2;
          return (
            <g
              key={m.name}
              tabIndex={0}
              role="button"
              aria-label={`${m.name}: ${m.count} requests, ${m.captured} captured, ${m.pending} pending, ${m.blocked} blocked`}
              onMouseEnter={() => setHover(m.name)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.name)}
              onBlur={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              <circle cx={p.x} cy={p.y} r={r + 6} fill={tone(m)} opacity={hover === m.name ? 0.18 : 0.08} />
              <circle cx={p.x} cy={p.y} r={r} fill="#0E1712" stroke={tone(m)} strokeWidth="2" />
              <text x={p.x} y={p.y + r + 13} textAnchor="middle" fontSize="10" fill={hover === m.name ? "#F5F8F5" : "rgb(145 164 154)"}>
                {m.name.length > 16 ? m.name.slice(0, 15) + "…" : m.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Readout */}
      <div className="pointer-events-none absolute left-0 top-0 min-h-[54px] text-[11.5px]" aria-hidden>
        {hovered ? (
          <div className="popover px-3 py-2">
            <div className="font-semibold text-fg">{hovered.name}</div>
            <div className="tabular-nums text-fg-muted">{hovered.count} req · {formatMoney(hovered.volume, currency)}</div>
            <div className="tabular-nums"><span className="text-success">{hovered.captured} ✓</span> · <span className="text-warning">{hovered.pending} ◷</span> · <span className="text-danger">{hovered.blocked} ✕</span></div>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-cyan" /> Agents</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Mostly captured</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Mostly pending</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> Mostly blocked</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* System status — derived from live API responses                             */
/* -------------------------------------------------------------------------- */
export function SystemStatus({
  apiOk, chainValid, auditCount, agentCount, loading
}: { apiOk: boolean; chainValid: boolean | null; auditCount: number; agentCount: number; loading: boolean }) {
  const items = [
    { icon: Database, label: "Data API", detail: apiOk ? "All endpoints responding" : "Some endpoints failed", state: apiOk ? "ok" : "error" },
    { icon: ShieldCheck, label: "Policy engine", detail: "Deterministic · 13 rules", state: "ok" },
    {
      icon: Link2, label: "Audit hash chain",
      detail: chainValid === null ? "Not verified" : chainValid ? `Integrity verified · ${auditCount} events` : "Integrity check FAILED",
      state: chainValid === null ? "idle" : chainValid ? "ok" : "error"
    },
    { icon: Lock, label: "PayPal", detail: "Sandbox mode · no real funds", state: "warn" },
    { icon: Bot, label: "Agent gateway", detail: `${agentCount} registered credential${agentCount === 1 ? "" : "s"}`, state: agentCount ? "ok" : "idle" }
  ] as const;
  const dot = { ok: "bg-success", warn: "bg-warning", error: "bg-danger", idle: "bg-fg-subtle" } as const;

  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map(i => (
        <li key={i.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.07] bg-canvas/60 text-fg-muted">
            <i.icon size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-medium text-fg">{i.label}</div>
            <div className="truncate text-[11.5px] text-fg-subtle">{loading ? "Checking…" : i.detail}</div>
          </div>
          <span className="relative flex h-2 w-2" aria-label={loading ? "checking" : i.state}>
            {!loading && i.state === "ok" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50 [animation-duration:2.6s]" />}
            <span className={cn("relative inline-flex h-2 w-2 rounded-full", loading ? "bg-fg-subtle" : dot[i.state])} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent activity — latest audit events                                        */
/* -------------------------------------------------------------------------- */
export interface AuditLite { id: string; action: string; entity_type: string; created_at: string }

export function RecentActivity({ logs, loading }: { logs: AuditLite[]; loading: boolean }) {
  const ago = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`;
  };
  if (loading) return <div className="space-y-3">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-9" />)}</div>;
  if (!logs.length) return <p className="text-[12.5px] text-fg-muted">No audit events recorded yet.</p>;
  return (
    <div>
      <ol className="relative space-y-3.5 before:absolute before:bottom-1 before:left-[7px] before:top-1 before:w-px before:bg-gradient-to-b before:from-accent/40 before:to-transparent">
        {logs.slice(0, 6).map((l, i) => (
          <li key={l.id} className="relative flex gap-3 pl-0">
            <span className={cn("relative z-[1] mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-canvas", i === 0 ? "bg-accent shadow-[0_0_10px_rgb(52_150_255/.8)]" : "bg-slate-700")} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-fg">{l.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}</div>
              <div className="text-[11px] text-fg-subtle">{l.entity_type}</div>
            </div>
            <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{ago(l.created_at)}</span>
          </li>
        ))}
      </ol>
      <Link href="/audit" className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-hover">
        Full audit trail <ChevronRight size={13} />
      </Link>
    </div>
  );
}
