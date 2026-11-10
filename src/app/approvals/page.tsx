"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ClipboardCheck, AlertOctagon, CheckCircle2, ShieldAlert, ArrowRight, Loader2, DollarSign } from "lucide-react";

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
      <div className="flex justify-between items-center">
        <div>
          <div className="kicker">HUMAN AUTHORITY · SINGLE-USE BINDING</div>
          <h1 className="text-3xl font-semibold mt-2">Review center</h1>
          <p className="muted mt-2">
            No AI agent can authorize its own payment. Human authorizations are cryptographically bound to exact values.
          </p>
        </div>
      </div>

      <div className="card mt-8 p-6 border-amber-500/30 bg-amber-950/10 flex items-start gap-4">
        <AlertOctagon className="text-amber-400 shrink-0 mt-0.5" size={24} />
        <div>
          <h2 className="font-semibold text-amber-200">Enforcement Policy: Purpose Mismatches (Scenario D)</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            When a requested payment purpose does not match the agreement or spending policy, PAYSHARK AI enforces:{" "}
            <strong className="text-amber-300">BLOCKED + HUMAN REVIEW REQUIRED</strong>.
            The payment is strictly blocked from auto-approval or PayPal dispatch. Review does not silently convert a blocked request into an approval; an updated agreement or clarified policy is required.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="mt-5 p-4 rounded-xl border border-accent/40 bg-accent/10 text-accent text-sm">
          {feedback}
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardCheck size={20} className="text-accent" /> Payment Requests
        </h2>

        {loading ? (
          <div className="card p-10 text-center">
            <Loader2 className="mx-auto animate-spin text-accent" size={28} />
            <p className="muted text-sm mt-2">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="card p-10 text-center text-slate-500">
            No payment requests received yet. Run an attack scenario in the Demo or submit an agent request.
          </div>
        ) : (
          requests.map(r => (
            <div key={r.id} className="card p-6 flex flex-wrap justify-between items-start gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      r.decision === "BLOCKED"
                        ? "bg-rose-400/10 text-rose-300 border border-rose-400/30"
                        : r.status === "COMPLETED"
                        ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                        : "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                    }`}
                  >
                    {r.status === "COMPLETED" ? "CAPTURED" : r.decision}
                  </span>

                  {r.policy_result?.reviewRequired && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase tracking-wider">
                      Review Required
                    </span>
                  )}

                  <span className="text-xs text-slate-500 font-mono">ID: {r.id.slice(0, 8)}...</span>
                </div>

                <div className="font-semibold text-lg text-white">
                  {r.requested_amount} {r.currency} → {r.merchant}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-400">Purpose:</strong> {r.purpose}
                </p>

                {r.policy_result?.checks && (
                  <div className="text-xs text-slate-400 flex flex-wrap gap-2 pt-1">
                    {r.policy_result.checks.map((c: any) => (
                      <span
                        key={c.code}
                        className={`px-2 py-0.5 rounded ${
                          c.passed ? "bg-slate-800 text-slate-400" : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                        }`}
                      >
                        {c.code}: {c.passed ? "PASS" : "FAIL"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-xs muted">RISK SCORE</div>
                  <div className={`text-xl font-bold ${r.risk_score > 50 ? "text-rose-400" : "text-emerald-400"}`}>
                    {r.risk_score ?? 15} / 100
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
