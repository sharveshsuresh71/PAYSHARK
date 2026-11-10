"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, Plus, AlertCircle, Loader2 } from "lucide-react";
import { PageHeader, HeaderStat, EmptyState } from "@/components/page-header";

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
      <PageHeader
        kicker="DETERMINISTIC GUARDRAILS"
        title="Spending policies"
        description="Set the exact limits and categories an agent cannot exceed."
        actions={
          <>
            {!loading && (
              <>
                <HeaderStat label="Total" value={policies.length} />
                <HeaderStat
                  label="Active"
                  value={policies.filter(p => p.status === "ACTIVE").length}
                  tone="text-success"
                />
              </>
            )}
            <Link href="/policies/new" className="btn btn-primary flex gap-2 items-center">
              <Plus size={16} /> New policy
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-4 mt-8" aria-busy="true" aria-label="Loading policies...">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton h-[132px] rounded-[16px]" />
          ))}
          <p className="sr-only">Loading policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="No policies configured"
            description="Create an active agreement, then attach a spending policy."
          />
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {policies.map(p => (
            <div key={p.id} className="card p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`pill ${p.status === "ACTIVE" ? "text-success" : "text-danger"}`}>{p.status}</span>
                  <span className="font-mono text-[11px] text-fg-subtle">v{p.version}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-fg break-words">{p.policy_name}</h3>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="well min-w-0 px-3 py-2.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Allowance</dt>
                    <dd className="mt-1 text-[13px] text-fg tabular-nums">
                      {p.used_transactions} / {p.maximum_transactions} used
                    </dd>
                  </div>
                  <div className="well min-w-0 px-3 py-2.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Categories</dt>
                    <dd className="mt-1 text-[13px] text-fg break-words">{(p.allowed_categories || []).join(", ") || "All"}</dd>
                  </div>
                  <div className="well min-w-0 px-3 py-2.5">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Merchants</dt>
                    <dd className="mt-1 text-[13px] text-fg break-words">{(p.allowed_merchants || []).join(", ") || "All"}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end lg:gap-6">
                <div className="lg:text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Transaction limit</div>
                  <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-accent">
                    {p.maximum_amount} {p.currency}
                  </div>
                </div>

                {p.status === "ACTIVE" && (
                  <button
                    onClick={() => revoke(p.id)}
                    className="btn btn-ghost text-xs text-danger border border-danger/30 hover:bg-danger/[0.08]"
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
