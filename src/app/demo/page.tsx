"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ShieldAlert, Play, CheckCircle2, AlertOctagon, Loader2 } from "lucide-react";

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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="kicker">RED-TEAM PLAYGROUND · REAL-TIME ENFORCEMENT</div>
      <h1 className="text-3xl font-semibold mt-2">Attack simulator</h1>
      <p className="muted mt-2">
        Test how the deterministic authorization layer and policy engine resist unauthorized agent behavior.
      </p>

      <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-6 mt-8">
        <div className="card p-5 space-y-2">
          {scenarios.map(s => (
            <button
              key={s[0]}
              onClick={() => {
                setSelected(s[0] as any);
                setResult(null);
              }}
              className={`w-full text-left rounded-xl p-4 border transition ${
                selected === s[0]
                  ? "border-[#42d6d0]/60 bg-[#42d6d0]/10 text-white"
                  : "border-slate-800/80 hover:bg-slate-800/40 text-slate-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs kicker">SCENARIO {s[0]}</span>
                {s[0] === "D" && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                    POLICY UPDATED
                  </span>
                )}
              </div>
              <div className="font-semibold mt-1">{s[1]}</div>
            </button>
          ))}
        </div>

        <div className="card p-7 space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#42d6d0]" size={28} />
              <div>
                <span className="text-xs kicker font-mono">SCENARIO {item[0]} THREAT PROFILE</span>
                <h2 className="text-2xl font-semibold mt-0.5">{item[1]}</h2>
              </div>
            </div>
            <p className="muted mt-4 leading-relaxed text-sm">{item[3]}</p>
          </div>

          <button
            disabled={loading}
            className="btn btn-primary flex gap-2 items-center"
            onClick={runScenario}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {loading ? "Evaluating Engine Rules..." : "Execute Scenario Against Policy Engine"}
          </button>

          {result && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-950/20 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-rose-300 font-bold tracking-widest uppercase">
                  Engine Enforcement Result
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-bold ${
                    result.decision === "BLOCKED"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {result.decision} {result.reviewRequired ? "(REVIEW REQUIRED)" : ""}
                </span>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {result.explanation}
              </p>

              {result.checks && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs kicker">CHECK RESULTS (13 DETERMINISTIC RULES)</div>
                  <div className="grid gap-2">
                    {result.checks.map((c: any) => (
                      <div
                        key={c.code}
                        className={`text-xs p-2.5 rounded-lg border flex items-center justify-between ${
                          c.passed
                            ? "bg-slate-900/60 border-slate-800 text-slate-400"
                            : "bg-rose-900/30 border-rose-500/40 text-rose-200 font-medium"
                        }`}
                      >
                        <span>{c.code}: {c.detail}</span>
                        <span className="shrink-0 ml-2 font-bold font-mono">
                          {c.passed ? "✓ PASS" : "✗ FAIL"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
