"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { toast } from "@/components/toast";
import { cn } from "@/lib/cn";
import { ShieldAlert, Play, CheckCircle2, AlertOctagon, Loader2, ShieldCheck, XCircle, Cpu } from "lucide-react";

const scenarios = [
  [
    "A",
    "Amount exceeds policy",
    "BLOCKED",
    "Agent requests $600.00 USD, exceeding the $250.00 policy maximum limit."
  ],
  [
    "B",
    "Merchant not allowed",
    "BLOCKED",
    "Agent routes payment to 'Shadow Crypto Exchange Ltd', an unapproved vendor."
  ],
  [
    "C",
    "Replay / duplicate request",
    "BLOCKED",
    "Agent replays an existing idempotency key. Request is rejected to prevent duplicate debit."
  ],
  [
    "D",
    "Purpose mismatch",
    "BLOCKED + REVIEW",
    "Agent attempts to pay for 'Luxury casino resort travel'. User Policy: BOTH REVIEWED AND BLOCKED. Payment execution blocked; human escalation required."
  ],
  [
    "E",
    "Attempt to alter approved amount",
    "BLOCKED",
    "Approval was bound to $150.00, but payment execution requested $450.00. Approval binding violation."
  ]
] as const;

export default function Demo() {
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | "E">("D");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const item = scenarios.find(x => x[0] === selected)!;

  async function runScenario() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: selected })
      });
      const json = await res.json();
      if (json.ok) {
        setResult(json.data);
        toast(`Scenario ${selected} evaluated`, {
          tone: json.data?.decision === "BLOCKED" ? "success" : "info",
          description: json.data?.decision === "BLOCKED" ? "Attack stopped by the policy engine." : `Decision: ${json.data?.decision}`
        });
      } else {
        toast("Scenario failed to run", { tone: "error", description: json.error?.message });
      }
    } catch (err) {
      console.error(err);
      toast("Scenario failed to run", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  const checks: { code: string; passed: boolean; detail?: string }[] = result?.checks ?? [];
  const failed = checks.filter(c => !c.passed).length;
  const blocked = result?.decision === "BLOCKED";

  return (
    <AppShell>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">RED-TEAM PLAYGROUND · REAL-TIME ENFORCEMENT</div>
          <h1 className="mt-2 font-display text-[clamp(26px,3vw,34px)] font-semibold tracking-[-0.02em] text-fg">Attack simulator</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-fg-muted">
            Test how the deterministic authorization layer and policy engine resist unauthorized agent behavior.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-success/25 bg-success/[0.07] px-3 py-1.5 text-[12px] font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Policy engine online · 13 rules
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
        {/* Scenario list */}
        <div className="card p-3" data-no-tilt>
          <div className="px-2 pb-2 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Threat scenarios</div>
          <div className="space-y-1.5" role="group" aria-label="Choose a scenario">
            {scenarios.map(s => {
              const active = selected === s[0];
              return (
                <button
                  key={s[0]}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelected(s[0] as any);
                    setResult(null);
                  }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-[12px] border p-3 text-left transition-all duration-300",
                    active
                      ? "translate-x-1 border-accent/40 bg-[linear-gradient(90deg,rgb(52_150_255/.12),rgb(29_79_143/.04))] shadow-[inset_0_1px_0_rgb(255_255_255/.05),0_10px_24px_-14px_rgb(52_150_255/.5)]"
                      : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-[4px] font-display text-[15px] font-semibold transition-all duration-300",
                      active
                        ? "bg-[linear-gradient(145deg,#60D6FF,#3496FF_40%,#1D4F8F)] text-accent-fg shadow-[inset_0_1px_0_rgb(255_255_255/.5),0_6px_14px_-6px_rgb(52_150_255/.8)]"
                        : "border border-white/[0.08] bg-canvas/60 text-fg-muted group-hover:text-fg"
                    )}
                  >
                    {s[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13.5px] font-semibold", active ? "text-fg" : "text-fg-muted group-hover:text-fg")}>{s[1]}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-fg-subtle">
                      Expected: <span className="font-semibold text-danger">{s[2]}</span>
                      {s[0] === "D" && (
                        <span className="rounded bg-warning/15 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide text-warning">Policy updated</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Threat profile + run */}
        <div className="card overflow-hidden" data-no-tilt>
          <div className="relative border-b border-white/[0.06] p-6 sm:p-7">
            {/* Holographic shield */}
            <div className="pointer-events-none absolute -right-6 -top-6 hidden h-48 w-48 sm:block" aria-hidden>
              <svg viewBox="0 0 200 200" className="h-full w-full opacity-70">
                <defs>
                  <radialGradient id="holo-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0" stopColor="#3496FF" stopOpacity=".25" />
                    <stop offset="1" stopColor="#3496FF" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="90" fill="url(#holo-core)" />
                <g className="motion-safe:animate-[ps-orb-spin_24s_linear_infinite]" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <circle cx="100" cy="100" r="78" fill="none" stroke="#3496FF" strokeOpacity=".35" strokeDasharray="2 8" />
                </g>
                <g className="motion-safe:animate-[ps-orb-spin_14s_linear_infinite_reverse]" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <circle cx="100" cy="100" r="60" fill="none" stroke="#36D9F5" strokeOpacity=".4" strokeDasharray="40 14" />
                </g>
                <circle cx="100" cy="100" r="42" fill="none" stroke="#3496FF" strokeOpacity=".25" />
              </svg>
              <ShieldAlert className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-accent drop-shadow-[0_0_14px_rgb(52_150_255/.7)]" size={34} />
            </div>

            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Scenario {item[0]} threat profile</span>
            <h2 className="mt-1.5 font-display text-2xl font-semibold text-fg sm:max-w-[70%]">{item[1]}</h2>
            <p className="mt-3 text-[13.5px] leading-[1.65] text-fg-muted sm:max-w-[78%]">{item[3]}</p>

            <button disabled={loading} className="btn btn-primary mt-6" onClick={runScenario}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {loading ? "Evaluating Engine Rules..." : "Execute Scenario Against Policy Engine"}
            </button>
          </div>

          <div className="p-6 sm:p-7" aria-live="polite">
            {loading && (
              <div className="space-y-3" aria-busy="true">
                <div className="flex items-center gap-2 text-[12.5px] text-fg-muted"><Cpu size={14} className="animate-pulse text-accent" /> Running deterministic checks…</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-10 rounded-[4px]" />)}
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="flex items-center gap-3 text-[13px] text-fg-subtle">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-white/[0.08] bg-white/[0.03]"><ShieldCheck size={16} /></span>
                Run the scenario to see how each enforcement rule responds.
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5 [animation:ps-panel-in_.45s_cubic-bezier(.16,1,.3,1)]">
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-[12px] border p-4",
                    blocked ? "border-danger/30 bg-danger/[0.07]" : "border-success/30 bg-success/[0.07]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {blocked ? <AlertOctagon className="text-danger" size={22} /> : <CheckCircle2 className="text-success" size={22} />}
                    <div>
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Engine enforcement result</div>
                      <div className={cn("font-display text-lg font-semibold", blocked ? "text-danger" : "text-success")}>
                        {result.decision} {result.reviewRequired ? "(REVIEW REQUIRED)" : ""}
                      </div>
                    </div>
                  </div>
                  {checks.length > 0 && (
                    <div className="text-right text-[12px] tabular-nums text-fg-muted">
                      <span className="text-success">{checks.length - failed} passed</span> · <span className="text-danger">{failed} failed</span>
                    </div>
                  )}
                </div>

                <p className="text-[13.5px] font-medium leading-[1.65] text-fg">{result.explanation}</p>

                {checks.length > 0 && (
                  <div>
                    <div className="kicker mb-2.5">Check results (13 deterministic rules)</div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {checks.map((c, i) => (
                        <li
                          key={c.code}
                          className={cn(
                            "flex items-start gap-2.5 rounded-[4px] border p-2.5 text-[12px] [animation:ps-rise_.4s_cubic-bezier(.16,1,.3,1)_backwards]",
                            c.passed ? "border-white/[0.06] bg-canvas/50 text-fg-muted" : "border-danger/35 bg-danger/[0.08] font-medium text-fg"
                          )}
                          style={{ animationDelay: `${i * 35}ms` }}
                        >
                          {c.passed ? <ShieldCheck size={14} className="mt-px shrink-0 text-success" /> : <XCircle size={14} className="mt-px shrink-0 text-danger" />}
                          <span className="min-w-0">
                            <span className="block break-all font-mono text-[11px]">{c.code}</span>
                            {c.detail && <span className="block break-words text-fg-subtle">{c.detail}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
