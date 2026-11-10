"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, HeaderStat } from "@/components/page-header";
import { TransactionsPanel } from "@/components/dashboard/transactions";
import { toast } from "@/components/toast";
import { analyze, formatMoney, type PaymentRequest } from "@/lib/client/payments";

export default function TransactionsPage() {
  const [rows, setRows] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(manual = false) {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/payment-requests");
      const json = await res.json();
      if (json.ok) {
        setRows(json.data);
        if (manual) toast("Transactions refreshed", { tone: "success" });
      } else {
        toast("Couldn’t load transactions", { tone: "error", description: json.error?.message });
      }
    } catch {
      toast("Couldn’t load transactions", { tone: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);
  const a = useMemo(() => analyze(rows), [rows]);

  return (
    <AppShell>
      <PageHeader
        kicker="Payment operations"
        title="Transactions"
        description="Every agent payment request, evaluated by the deterministic policy engine. Open a row for its full lifecycle, policy checks and risk profile."
        actions={
          <>
            <button type="button" onClick={() => load(true)} disabled={refreshing} className="btn btn-secondary">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/approvals" className="btn btn-primary">
              <ClipboardCheck size={15} /> Review queue
            </Link>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap gap-2.5">
        <HeaderStat label="Requests" value={loading ? "—" : a.total} />
        <HeaderStat label="Captured volume" value={loading ? "—" : formatMoney(a.capturedVolume, a.currency)} tone="text-accent" />
        <HeaderStat label="Pending" value={loading ? "—" : a.counts.pending} tone="text-warning" />
        <HeaderStat label="Blocked" value={loading ? "—" : a.counts.blocked} tone="text-danger" />
        <HeaderStat label="Avg. risk" value={loading || a.averageRisk === null ? "—" : `${Math.round(a.averageRisk)}/100`} />
      </div>

      <div className="mt-6">
        <TransactionsPanel rows={rows} loading={loading} pageSize={15} />
      </div>
    </AppShell>
  );
}
