"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClipboardCheck, AlertOctagon, CheckCircle2, ShieldAlert, ArrowRight, Loader2, DollarSign } from "lucide-react";
import { PageHeader, HeaderStat, EmptyState } from "@/components/page-header";

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/payment-requests");
      const json = await res.json();
      if (json.ok) {
        setRequests(json.data);
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

  async function approve(id: string) {
    setActing(id);
    setFeedback(null);
    try {
      // 1. Authorize payment request
      const res = await fetch(`/api/payment-requests/${id}/approve`, {
        method: "POST"
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Approval failed");

      // 2. Trigger PayPal Sandbox Order
      const ppRes = await fetch("/api/payments/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_request_id: id })
      });
      const ppJson = await ppRes.json();

      if (ppJson.ok) {
        // 3. Trigger Sandbox Capture
        const capRes = await fetch("/api/payments/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paypal_order_id: ppJson.data.paypal_order_id })
        });
        const capJson = await capRes.json();
        setFeedback(`Approved & Captured! PayPal Sandbox Order: ${ppJson.data.paypal_order_id} (Captured: ${capJson.data.capture_id})`);
      } else {
        setFeedback("Payment authorized. Order pending PayPal completion.");
      }

      load();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Error processing approval");
    } finally {
      setActing(null);
    }
  }

  return (
    <AppShell>
      <PageHeader
        kicker="HUMAN AUTHORITY · SINGLE-USE BINDING"
        title="Review center"
        description="No AI agent can authorize its own payment. Human authorizations are cryptographically bound to exact values."
        actions={
          !loading ? (
            <>
              <HeaderStat label="Requests" value={requests.length} />
              <HeaderStat
                label="Blocked"
                value={requests.filter(r => r.decision === "BLOCKED").length}
                tone="text-danger"
              />
              <HeaderStat
                label="Captured"
                value={requests.filter(r => r.status === "COMPLETED").length}
                tone="text-success"
              />
            </>
          ) : undefined
        }
      />

      <div className="card mt-8 p-5 sm:p-6 border-warning/30 flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-warning/30 bg-warning/[0.08] text-warning">
          <AlertOctagon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-fg">Enforcement Policy: Purpose Mismatches (Scenario D)</h2>
          <p className="text-[13px] text-fg-muted mt-1.5 leading-relaxed">
            When a requested payment purpose does not match the agreement or spending policy, PAYSHARK AI enforces:{" "}
            <strong className="text-warning">BLOCKED + HUMAN REVIEW REQUIRED</strong>.
            The payment is strictly blocked from auto-approval or PayPal dispatch. Review does not silently convert a blocked request into an approval; an updated agreement or clarified policy is required.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="mt-5 flex items-start gap-3 p-4 rounded-[12px] border border-accent/30 bg-accent/10 text-accent text-[13px]">
          <CheckCircle2 size={18} className="shrink-0 mt-px" />
          <span className="min-w-0 break-words">{feedback}</span>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="text-[15px] font-semibold text-fg flex items-center gap-2">
          <ClipboardCheck size={20} className="text-accent" /> Payment Requests
        </h2>

        {loading ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton h-[150px] rounded-[18px]" />
            ))}
            <p className="sr-only">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={22} />}
            title="No payment requests received yet"
            description="Run an attack scenario in the Demo or submit an agent request."
          />
        ) : (
          requests.map(r => (
            <div
              key={r.id}
              className={`card relative p-5 pl-6 sm:p-6 sm:pl-7 flex flex-col gap-5 md:flex-row md:items-start md:justify-between ${
                r.decision === "BLOCKED" ? "border-danger/30" : ""
              }`}
            >
              <span
                aria-hidden
                className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${
                  r.decision === "BLOCKED" ? "bg-danger" : r.status === "COMPLETED" ? "bg-success" : "bg-warning"
                }`}
              />
              <div className="min-w-0 flex-1 space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`pill ${
                      r.decision === "BLOCKED"
                        ? "text-danger"
                        : r.status === "COMPLETED"
                        ? "text-success"
                        : "text-warning"
                    }`}
                  >
                    {r.status === "COMPLETED" ? "CAPTURED" : r.decision}
                  </span>

                  {r.policy_result?.reviewRequired && (
                    <span className="pill text-warning">
                      Review Required
                    </span>
                  )}

                  <span className="font-mono text-[11px] text-fg-subtle">ID: {r.id.slice(0, 8)}...</span>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
                  <span className="font-display text-xl font-semibold tabular-nums text-fg">
                    {r.requested_amount} {r.currency}
                  </span>
                  <span className="text-fg-subtle">→</span>
                  <span className="text-[15px] font-semibold text-fg break-words min-w-0">{r.merchant}</span>
                </div>

                <p className="text-[13px] text-fg-muted leading-relaxed break-words">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle mr-1.5">Purpose:</span>
                  {r.purpose}
                </p>

                {r.policy_result?.checks && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.policy_result.checks.map((c: any) => (
                      <span
                        key={c.code}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10.5px] ${
                          c.passed
                            ? "border-white/[0.07] bg-surface/60 text-fg-muted"
                            : "border-danger/30 bg-danger/[0.08] text-danger"
                        }`}
                      >
                        {c.code}: {c.passed ? "PASS" : "FAIL"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 md:flex-col md:items-end md:shrink-0">
                <div className="well px-3.5 py-2.5 w-[180px] max-w-full">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Risk score</span>
                    <span className={`font-display text-base font-semibold tabular-nums ${r.risk_score > 50 ? "text-danger" : "text-success"}`}>
                      {r.risk_score ?? 15} / 100
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${r.risk_score > 50 ? "bg-danger" : "bg-success"}`}
                      style={{ width: `${Math.min(100, Math.max(0, Number(r.risk_score ?? 15)))}%` }}
                    />
                  </div>
                </div>

                {r.decision === "APPROVED_FOR_REVIEW" && r.status !== "COMPLETED" && (
                  <button
                    disabled={acting === r.id}
                    onClick={() => approve(r.id)}
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                  >
                    {acting === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Authorize & Execute PayPal
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
