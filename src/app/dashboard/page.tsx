"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ArrowUpRight, ShieldCheck, FileCheck2, Bot, CircleDollarSign, AlertTriangle, UserCheck, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [session, setSession] = useState<{ id: string; email: string; full_name: string; role: string } | null>(null);
  const [counts, setCounts] = useState({ agreements: 0, policies: 0, agents: 0, audit: 0 });
  const [switching, setSwitching] = useState(false);

  async function loadData() {
    try {
      const [sessRes, agrRes, polRes, agtRes, audRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/agreements"),
        fetch("/api/policies"),
        fetch("/api/agents"),
        fetch("/api/audit")
      ]);

      const [sess, agr, pol, agt, aud] = await Promise.all([
        sessRes.json(),
        agrRes.json(),
        polRes.json(),
        agtRes.json(),
        audRes.json()
      ]);

      if (sess.ok) setSession(sess.data);
      setCounts({
        agreements: agr.ok ? agr.data.length : 0,
        policies: pol.ok ? pol.data.length : 0,
        agents: agt.ok ? agt.data.length : 0,
        audit: aud.ok ? aud.data.logs.length : 0
      });
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
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
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  }

  const metrics = [
    ["Agreements", counts.agreements.toString(), "/agreements", FileCheck2],
    ["Active policies", counts.policies.toString(), "/policies", ShieldCheck],
    ["Registered agents", counts.agents.toString(), "/agents", Bot],
    ["Audit events", counts.audit.toString(), "/audit", CircleDollarSign]
  ] as const;

  return (
    <AppShell>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="kicker">CONTROL ROOM · NEON POSTGRES CONNECTED</div>
          <h1 className="text-3xl font-semibold mt-2" style={{ fontFamily: "Space Grotesk" }}>
            Workspace overview
          </h1>
          <p className="muted mt-2">
            Agreement-aware payment authorization layer for autonomous agent transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="card px-3 py-2 flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Current Role:</span>
            <span className="font-bold text-white uppercase">{session?.role || "buyer"}</span>
            <button
              disabled={switching}
              onClick={() => switchRole(session?.role === "buyer" ? "seller" : "buyer")}
              className="ml-2 text-[#42d6d0] hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw size={12} className={switching ? "animate-spin" : ""} />
              Switch to {session?.role === "buyer" ? "Seller" : "Buyer"}
            </button>
          </div>

          <Link href="/agreements/new" className="btn btn-primary inline-flex gap-2 items-center">
            New agreement <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-8">
        {metrics.map(([name, value, href, Icon]) => (
          <Link
            href={href}
            key={name}
            className="card p-5 hover:border-[#42d6d0]/40 transition group"
          >
            <div className="flex justify-between text-slate-400">
              <span className="text-sm">{name}</span>
              <Icon size={18} className="group-hover:text-[#42d6d0] transition" />
            </div>
            <div className="text-3xl font-semibold mt-4 text-white">{value}</div>
            <div className="text-xs muted mt-2 flex items-center gap-1.5 text-emerald-400/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Neon DB Live
            </div>
          </Link>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.4fr_.8fr] gap-6 mt-6">
        <section className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg">Active Enforcement Pipeline</h2>
            <Link href="/audit" className="text-xs text-[#42d6d0] hover:underline">
              View Audit Trail →
            </Link>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0a1423] border border-slate-800 flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-[#42d6d0]/10 text-[#42d6d0] grid place-items-center shrink-0 font-bold font-mono text-sm">
                01
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">Agreement & Global Counterparty Binding</h3>
                <p className="text-xs muted mt-1 leading-relaxed">
                  Agreements identify counterparties by normalized email. Single-use invitation tokens bind verified accounts atomically before activation.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a1423] border border-slate-800 flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-[#42d6d0]/10 text-[#42d6d0] grid place-items-center shrink-0 font-bold font-mono text-sm">
                02
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">Deterministic Policy Engine (13 Rules)</h3>
                <p className="text-xs muted mt-1 leading-relaxed">
                  Evaluates per-transaction ceilings, merchant allowlists, and currency precision. Purpose mismatches (Scenario D) are strictly BLOCKED and routed to human review.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a1423] border border-slate-800 flex items-start gap-4">
              <div className="h-8 w-8 rounded-lg bg-[#42d6d0]/10 text-[#42d6d0] grid place-items-center shrink-0 font-bold font-mono text-sm">
                03
              </div>
              <div>
                <h3 className="font-medium text-white text-sm">Single-Use Human Authorization & PayPal Sandbox</h3>
                <p className="text-xs muted mt-1 leading-relaxed">
                  Server validates binding before creating PayPal Orders. Capture atomically consumes the approval and appends to the SHA-256 audit chain.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#42d6d0]" size={20} />
            <h2 className="font-semibold">Security Posture</h2>
          </div>

          <div className="space-y-3 text-sm">
            {[
              "AI has no direct payment execution tools",
              "Policy engine is pure and deterministic",
              "Scenario D: Purpose mismatch BLOCKED + REVIEW",
              "Neon PostgreSQL schema active",
              "Audit logs protected by SHA-256 hash chain",
              "Single-use cryptographic human approval binding"
            ].map(x => (
              <div key={x} className="flex gap-2.5 items-start text-xs text-slate-300">
                <span className="text-emerald-400 font-bold shrink-0">✓</span>
                <span>{x}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link href="/demo" className="btn btn-secondary w-full text-center block text-xs">
              Open Red-Team Attack Simulator →
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
