"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Fingerprint, ShieldCheck, AlertTriangle, Loader2, Hash, Clock } from "lucide-react";
import { PageHeader, HeaderStat, EmptyState } from "@/components/page-header";

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [valid, setValid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/audit");
      const json = await res.json();
      if (json.ok) {
        setLogs(json.data.logs);
        setValid(json.data.chainIntegrityValid);
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
        kicker="TAMPER-EVIDENT HISTORY · SHA-256 HASH CHAIN"
        title="Audit trail"
        description="Append-only ledger. Every security-sensitive transition is chained to the previous block's SHA-256 hash."
        actions={!loading ? <HeaderStat label="Events" value={logs.length} tone="text-accent" /> : undefined}
      />

      {valid !== null && (
        <div
          role="status"
          className={`mt-6 flex items-center gap-4 rounded-[14px] border p-4 sm:p-5 ${
            valid ? "border-success/30 bg-success/[0.08] text-success" : "border-danger/30 bg-danger/[0.08] text-danger"
          }`}
        >
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border ${
              valid ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10"
            }`}
          >
            {valid ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold uppercase tracking-[0.12em]">
              {valid ? "CHAIN INTEGRITY: VERIFIED" : "CHAIN INTEGRITY COMPROMISED"}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton h-[140px] rounded-[18px]" />
          ))}
          <p className="sr-only">Verifying hash chain...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Fingerprint size={22} />}
            title="No audit logs recorded yet"
            description="Create an agreement or evaluate a payment to generate events."
          />
        </div>
      ) : (
        <ol className="relative mt-8 space-y-4 pl-7 sm:pl-9">
          <span aria-hidden className="absolute left-[9px] sm:left-[13px] top-2 bottom-2 w-px bg-white/[0.08]" />
          {logs.map((log, idx) => (
            <li key={log.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-7 sm:-left-9 top-6 grid h-[19px] w-[19px] sm:h-[27px] sm:w-[27px] place-items-center rounded-full border border-accent/30 bg-canvas"
              >
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgb(32_200_120/.6)]" />
              </span>
              <div className="card p-4 sm:p-5 space-y-3 min-w-0">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[11px] text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-md tabular-nums">
                      #{idx + 1}
                    </span>
                    <span className="text-[14px] font-semibold text-fg break-words">{log.action}</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
                      [{log.entity_type}]
                    </span>
                  </div>
                  <div className="text-[12px] text-fg-subtle flex items-center gap-1.5 tabular-nums">
                    <Clock size={13} />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>

                <pre className="well p-3 font-mono text-[11px] text-fg-muted overflow-x-auto">
                  {JSON.stringify(log.event_data, null, 2)}
                </pre>

                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center font-mono text-[11px] text-fg-subtle">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Hash size={13} className="shrink-0 text-fg-subtle" />
                    <span className="break-all">Prev: {log.previous_event_hash ? log.previous_event_hash.slice(0, 16) + "..." : "GENESIS_BLOCK"}</span>
                  </div>
                  <div className="text-accent/80 break-all">
                    Hash: {log.event_hash ? log.event_hash.slice(0, 24) + "..." : "N/A"}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
