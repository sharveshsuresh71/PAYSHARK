"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Fingerprint, ShieldCheck, AlertTriangle, Loader2, Hash, Clock } from "lucide-react";

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
      <div className="flex justify-between items-center">
        <div>
          <div className="kicker">TAMPER-EVIDENT HISTORY · SHA-256 HASH CHAIN</div>
          <h1 className="text-3xl font-semibold mt-2">Audit trail</h1>
          <p className="muted mt-2">
            Append-only ledger. Every security-sensitive transition is chained to the previous block's SHA-256 hash.
          </p>
        </div>

        {valid !== null && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${
              valid
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                : "bg-rose-400/10 text-rose-300 border border-rose-400/30"
            }`}
          >
            {valid ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            {valid ? "CHAIN INTEGRITY: VERIFIED" : "CHAIN INTEGRITY COMPROMISED"}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="mx-auto animate-spin text-accent" size={32} />
          <p className="muted mt-3">Verifying hash chain...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <Fingerprint className="mx-auto text-slate-500" size={32} />
          <h2 className="font-semibold mt-4">No audit logs recorded yet</h2>
          <p className="muted text-sm mt-2">Create an agreement or evaluate a payment to generate events.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {logs.map((log, idx) => (
            <div key={log.id} className="card p-5 space-y-2 hover:border-slate-700 transition">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-white text-sm">{log.action}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                    [{log.entity_type}]
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock size={13} />
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>

              <div className="bg-canvas/70 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 font-mono overflow-x-auto">
                {JSON.stringify(log.event_data, null, 2)}
              </div>

              <div className="flex flex-wrap justify-between items-center text-[11px] text-slate-500 font-mono pt-1 gap-2">
                <div className="flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-600" />
                  <span>Prev: {log.previous_event_hash ? log.previous_event_hash.slice(0, 16) + "..." : "GENESIS_BLOCK"}</span>
                </div>
                <div className="text-accent/80">
                  Hash: {log.event_hash ? log.event_hash.slice(0, 24) + "..." : "N/A"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
