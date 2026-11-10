"use client";

import { useState, useEffect, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

function NewPolicyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAgreementId = searchParams.get("agreement_id") || "";

  const [agreements, setAgreements] = useState<any[]>([]);
  const [agreementId, setAgreementId] = useState(initialAgreementId);
  const [name, setName] = useState("Engineering Discretionary Policy");
  const [amount, setAmount] = useState("250.00");
  const [currency, setCurrency] = useState("USD");
  const [merchants, setMerchants] = useState("Elena Rostova, seller@example.com, Acme Cloud");
  const [categories, setCategories] = useState("software, engineering, deliverables, cloud services");
  const [max, setMax] = useState("5");
  const [human, setHuman] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAgreements() {
      try {
        const res = await fetch("/api/agreements");
        const json = await res.json();
        if (json.ok) {
          setAgreements(json.data);
          if (!agreementId && json.data.length > 0) {
            setAgreementId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchAgreements();
  }, [agreementId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreementId) {
      setError("Please select an agreement to govern");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const allowedMerchants = merchants
        .split(",")
        .map(m => m.trim())
        .filter(Boolean);
      const allowedCategories = categories
        .split(",")
        .map(c => c.trim())
        .filter(Boolean);

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy_name: name,
          agreement_id: agreementId,
          maximum_amount: amount,
          currency,
          allowed_merchants: allowedMerchants,
          allowed_categories: allowedCategories,
          maximum_transactions: Number(max),
          require_human_approval: human
        })
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message || "Failed to create policy");
      }

      router.push("/policies");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating policy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mt-6">
      <PageHeader
        kicker="DETERMINISTIC GUARDRAILS"
        title="Set spending boundaries."
        description="Policies set the hard limits that no AI agent can bypass. Pure mathematical rules; no probabilistic leeway."
      />

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="card p-5 sm:p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-fg">Policy scope</h2>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Linked agreement</span>
            <select
              required
              className="field mt-2"
              value={agreementId}
              onChange={e => setAgreementId(e.target.value)}
            >
              {agreements.length === 0 ? (
                <option value="">No agreements found (Create an agreement first)</option>
              ) : (
                agreements.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.status}) — max {a.amount || "0.00"} {a.currency || "USD"}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Policy name</span>
            <input
              required
              className="field mt-2"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>
        </section>

        <section className="card p-5 sm:p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-fg">Limits & allow-lists</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Per-transaction limit</span>
              <input
                required
                className="field mt-2 tabular-nums"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Currency</span>
              <select
                className="field mt-2"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>INR</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Allowed merchants (comma separated)</span>
            <input
              className="field mt-2"
              value={merchants}
              onChange={e => setMerchants(e.target.value)}
              placeholder="e.g. Elena Rostova, seller@example.com"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Allowed categories (comma separated keywords)</span>
            <input
              className="field mt-2"
              value={categories}
              onChange={e => setCategories(e.target.value)}
              placeholder="e.g. software, engineering, cloud services"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Maximum transaction allowance</span>
            <input
              type="number"
              min="1"
              max="1000"
              className="field mt-2 tabular-nums"
              value={max}
              onChange={e => setMax(e.target.value)}
            />
          </label>
        </section>

        <section className="card p-5 sm:p-6 space-y-5">
          <h2 className="text-[15px] font-semibold text-fg">Authorization</h2>

          <label className="well flex gap-3 items-start p-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={human}
              onChange={e => setHuman(e.target.checked)}
            />
            <div>
              <div className="text-[13px] font-medium text-fg">Require human authorization before PayPal execution</div>
              <div className="text-[12px] text-fg-subtle">Recommended: Enforces human-in-the-loop single-use authorization binding.</div>
            </div>
          </label>

          {error && (
            <p className="text-[13px] text-danger bg-danger/[0.08] border border-danger/30 p-3 rounded-[12px]">
              {error}
            </p>
          )}

          <button disabled={loading} className="btn btn-primary w-full flex justify-center items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? "Saving policy..." : "Activate Spending Policy"}
          </button>
        </section>
      </form>
    </div>
  );
}

export default function NewPolicy() {
  return (
    <AppShell>
      <Link href="/policies" className="inline-flex gap-2 items-center text-[13px] text-fg-muted transition hover:text-fg">
        <ArrowLeft size={15} /> Policies
      </Link>
      <Suspense fallback={<div className="py-20 text-center text-[13px] text-fg-muted">Loading policy editor...</div>}>
        <NewPolicyForm />
      </Suspense>
    </AppShell>
  );
}
