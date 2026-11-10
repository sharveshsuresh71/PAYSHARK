"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, Plus, AlertCircle, Loader2 } from "lucide-react";

export default function Policies() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/policies");
      const json = await res.json();
      if (json.ok) {
        setPolicies(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(id: string) {
    if (!confirm("Are you sure you want to revoke this policy? Pending approvals will be invalidated.")) return;
    try {
      const res = await fetch(`/api/policies/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        load();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <AppShell>
      <div className="flex justify-between items-center">
        <div>
          <div className="kicker">DETERMINISTIC GUARDRAILS</div>
          <h1 className="text-3xl font-semibold mt-2">Spending policies</h1>
          <p className="muted mt-2">Set the exact limits and categories an agent cannot exceed.</p>
        </div>
        <Link href="/policies/new" className="btn btn-primary flex gap-2 items-center">
          <Plus size={16} /> New policy
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto animate-spin text-accent" size={32} />
          <p className="muted mt-3">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <ShieldCheck className="mx-auto text-slate-500" size={30} />
          <h2 className="font-semibold mt-4">No policies configured</h2>
          <p className="muted text-sm mt-2">Create an active agreement, then attach a spending policy.</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {policies.map(p => (
            <div key={p.id} className="card p-6 flex flex-wrap justify-between items-center gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                        : "bg-rose-400/10 text-rose-300 border border-rose-400/30"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">v{p.version}</span>
                </div>
                <h3 className="font-semibold text-lg text-white">{p.policy_name}</h3>
                <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Allowance: <span className="text-slate-200">{p.used_transactions} / {p.maximum_transactions} used</span>
                  </span>
                  <span>
                    Categories: <span className="text-slate-200">{(p.allowed_categories || []).join(", ") || "All"}</span>
                  </span>
                  <span>
                    Merchants: <span className="text-slate-200">{(p.allowed_merchants || []).join(", ") || "All"}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs muted">TRANSACTION LIMIT</div>
                  <div className="text-2xl font-bold text-accent">
                    {p.maximum_amount} {p.currency}
                  </div>
                </div>

                {p.status === "ACTIVE" && (
                  <button
                    onClick={() => revoke(p.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 border border-rose-400/30 hover:bg-rose-400/10 rounded-lg px-3 py-2 transition"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
