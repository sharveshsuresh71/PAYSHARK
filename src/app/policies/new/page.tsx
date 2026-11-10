"use client";

import { useState, useEffect, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";

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
    <div className="max-w-2xl mt-7">
      <div className="kicker">DETERMINISTIC GUARDRAILS</div>
      <h1 className="text-3xl font-semibold mt-2">Set spending boundaries.</h1>
      <p className="muted text-sm mt-1">
        Policies set the hard limits that no AI agent can bypass. Pure mathematical rules; no probabilistic leeway.
      </p>

      <form onSubmit={submit} className="card p-7 mt-7 space-y-5">
        <label className="block text-sm">
          Linked agreement
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

        <label className="block text-sm">
          Policy name
          <input
            required
            className="field mt-2"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm">
            Per-transaction limit
            <input
              required
              className="field mt-2"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Currency
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

        <label className="block text-sm">
          Allowed merchants (comma separated)
          <input
            className="field mt-2"
            value={merchants}
            onChange={e => setMerchants(e.target.value)}
            placeholder="e.g. Elena Rostova, seller@example.com"
          />
        </label>

        <label className="block text-sm">
          Allowed categories (comma separated keywords)
          <input
            className="field mt-2"
            value={categories}
            onChange={e => setCategories(e.target.value)}
            placeholder="e.g. software, engineering, cloud services"
          />
        </label>

        <label className="block text-sm">
          Maximum transaction allowance
          <input
            type="number"
            min="1"
            max="1000"
            className="field mt-2"
            value={max}
            onChange={e => setMax(e.target.value)}
          />
        </label>

        <label className="flex gap-3 items-center text-sm p-3 rounded-lg bg-canvas/60 border border-slate-800">
          <input
            type="checkbox"
            checked={human}
            onChange={e => setHuman(e.target.checked)}
          />
          <div>
            <div className="font-medium text-slate-200">Require human authorization before PayPal execution</div>
            <div className="text-xs muted">Recommended: Enforces human-in-the-loop single-use authorization binding.</div>
          </div>
        </label>

        {error && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
            {error}
          </p>
        )}

        <button disabled={loading} className="btn btn-primary w-full flex justify-center items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {loading ? "Saving policy..." : "Activate Spending Policy"}
        </button>
      </form>
    </div>
  );
}

export default function NewPolicy() {
  return (
    <AppShell>
      <Link href="/policies" className="text-sm muted flex gap-2 items-center">
        <ArrowLeft size={15} /> Policies
      </Link>
      <Suspense fallback={<div className="py-20 text-center text-sm muted">Loading policy editor...</div>}>
        <NewPolicyForm />
      </Suspense>
    </AppShell>
  );
}
