"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Plus, FileText, ArrowRight, ShieldCheck, Clock, Loader2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-header";

export default function Agreements() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/agreements");
      const json = await res.json();
      if (json.ok) {
        setAgreements(json.data);
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

  return (
    <AppShell>
      <PageHeader
        kicker="CONTRACT LAYER · MUTUAL TRUST"
        title="Agreements"
        description="Turn written commitments into machine-checkable boundaries."
        actions={
          <Link href="/agreements/new" className="btn btn-primary flex gap-2 items-center">
            <Plus size={16} /> Create agreement
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-4 mt-8">
          <span className="sr-only">Loading agreements...</span>
          <div className="skeleton h-[104px] rounded-[18px]" />
          <div className="skeleton h-[104px] rounded-[18px]" />
          <div className="skeleton h-[104px] rounded-[18px]" />
        </div>
      ) : agreements.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<FileText size={22} />}
            title="No agreements yet"
            description="Create an agreement and invite the counterparty by email."
          />
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {agreements.map(a => (
            <Link
              key={a.id}
              href={`/agreements/${a.id}`}
              className="card group p-5 sm:p-6 transition hover:border-accent/30 flex flex-wrap justify-between items-center gap-4"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`pill ${a.status === "ACTIVE" ? "text-success" : "text-warning"}`}>
                    {a.status}
                  </span>
                  <span className="text-[11px] text-fg-subtle font-mono tabular-nums">v{a.current_version}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-fg break-words">{a.title}</h3>
                <p className="text-[13px] text-fg-muted break-all">
                  Counterparty: <span className="text-fg">{a.counterparty_email}</span>
                </p>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Authorized ceiling</div>
                  <div className="mt-0.5 font-display text-xl font-semibold tabular-nums text-accent">
                    {a.amount || "—"} {a.currency || "USD"}
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full border border-white/[0.07] bg-surface grid place-items-center text-fg-muted transition group-hover:text-accent group-hover:border-accent/30">
                  <ArrowRight size={17} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
