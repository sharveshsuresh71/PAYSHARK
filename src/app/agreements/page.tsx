"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Plus, FileText, ArrowRight, ShieldCheck, Clock, Loader2 } from "lucide-react";

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
      <div className="flex justify-between items-center">
        <div>
          <div className="kicker">CONTRACT LAYER · MUTUAL TRUST</div>
          <h1 className="text-3xl font-semibold mt-2">Agreements</h1>
          <p className="muted mt-2">Turn written commitments into machine-checkable boundaries.</p>
        </div>
        <Link href="/agreements/new" className="btn btn-primary flex gap-2 items-center">
          <Plus size={16} /> Create agreement
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto animate-spin text-[#42d6d0]" size={32} />
          <p className="muted mt-3">Loading agreements...</p>
        </div>
      ) : agreements.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <FileText className="mx-auto text-slate-500" size={30} />
          <h2 className="font-semibold mt-4">No agreements yet</h2>
          <p className="muted text-sm mt-2">Create an agreement and invite the counterparty by email.</p>
        </div>
      ) : (
        <div className="grid gap-4 mt-8">
          {agreements.map(a => (
            <Link
              key={a.id}
              href={`/agreements/${a.id}`}
              className="card p-6 hover:border-[#42d6d0]/50 transition flex flex-wrap justify-between items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      a.status === "ACTIVE"
                        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                        : "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                    }`}
                  >
                    {a.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">v{a.current_version}</span>
                </div>
                <h3 className="font-semibold text-lg text-white">{a.title}</h3>
                <p className="text-xs text-slate-400">
                  Counterparty: <span className="text-slate-300">{a.counterparty_email}</span>
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs muted">AUTHORIZED CEILING</div>
                  <div className="text-xl font-bold text-[#42d6d0]">
                    {a.amount || "—"} {a.currency || "USD"}
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-slate-800 grid place-items-center text-slate-400">
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
