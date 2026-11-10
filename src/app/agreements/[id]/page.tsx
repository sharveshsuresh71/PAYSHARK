"use client";

import { useEffect, useState, use, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ArrowLeft, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AgreementDetailsContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agreements/${id}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function confirmVersion() {
    if (!data?.latestVersion) return;
    setConfirming(true);
    setMsg("");
    try {
      const res = await fetch(`/api/agreements/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_number: data.latestVersion.version_number,
          action: "confirm",
          invitation_token: inviteToken || undefined
        })
      });
      const json = await res.json();
      if (json.ok) {
        setMsg(
          json.data.bothConfirmed
            ? "Both parties confirmed! Agreement is now ACTIVE and ready for policy binding."
            : "Confirmation recorded. Waiting for the other party to confirm."
        );
        load();
      } else {
        setMsg(`Error: ${json.error?.message}`);
      }
    } catch (err) {
      setMsg("Failed to confirm version");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto animate-spin text-[#42d6d0]" size={32} />
        <p className="muted mt-3">Loading agreement...</p>
      </div>
    );
  }

  if (!data?.agreement) {
    return (
      <div className="card p-10 text-center">
        <AlertTriangle className="mx-auto text-amber-400" size={32} />
        <h2 className="text-xl font-semibold mt-3">Agreement not found</h2>
        <Link href="/agreements" className="btn btn-secondary mt-5 inline-block">
          Back to Agreements
        </Link>
      </div>
    );
  }

  const { agreement, latestVersion } = data;
  const terms = latestVersion?.structured_terms || agreement.extracted_terms || {};

  return (
    <>
      <div className="flex flex-wrap justify-between items-start gap-4 mt-6">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                agreement.status === "ACTIVE"
                  ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/30"
                  : agreement.status === "PENDING_CONFIRMATION"
                  ? "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {agreement.status}
            </span>
            <span className="text-xs text-slate-500 font-mono">v{agreement.current_version}</span>
          </div>
          <h1 className="text-3xl font-semibold mt-2">{agreement.title}</h1>
          <p className="muted text-sm mt-1">
            Buyer: <span className="text-slate-300">{agreement.buyer_id}</span> · Seller:{" "}
            <span className="text-slate-300">
              {agreement.seller_id ? agreement.seller_id : `Invited (${agreement.counterparty_email})`}
            </span>
          </p>
        </div>

        {agreement.status === "PENDING_CONFIRMATION" && (
          <button
            onClick={confirmVersion}
            disabled={confirming}
            className="btn btn-primary flex gap-2 items-center"
          >
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Confirm Version {latestVersion?.version_number || 1}
          </button>
        )}
      </div>

      {msg && (
        <div className="mt-5 p-4 rounded-xl border border-[#42d6d0]/40 bg-[#42d6d0]/10 text-[#42d6d0] text-sm">
          {msg}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6 mt-8">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <ShieldCheck className="text-[#42d6d0]" size={20} />
              Machine-Verified Terms
            </h2>

            <div className="grid sm:grid-cols-3 gap-4 mt-5">
              <div className="bg-[#0a1423] p-4 rounded-xl border border-slate-800">
                <div className="text-xs muted">AUTHORIZED AMOUNT</div>
                <div className="text-xl font-bold mt-1 text-[#42d6d0]">
                  {terms.amount || agreement.amount || "—"} {terms.currency || agreement.currency || "USD"}
                </div>
              </div>
              <div className="bg-[#0a1423] p-4 rounded-xl border border-slate-800">
                <div className="text-xs muted">DEADLINE</div>
                <div className="text-xl font-bold mt-1 text-slate-200">
                  {terms.deadline || agreement.deadline || "Open"}
                </div>
              </div>
              <div className="bg-[#0a1423] p-4 rounded-xl border border-slate-800">
                <div className="text-xs muted">COMPLETENESS</div>
                <div className="text-xl font-bold mt-1 text-emerald-400">
                  {terms.completeness_percent || 100}%
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs kicker">PERMITTED PURPOSE</div>
              <p className="mt-2 text-slate-300 text-sm bg-[#0a1423] p-3 rounded-lg border border-slate-800/80">
                {terms.transaction_purpose || "Core deliverables specified in agreement"}
              </p>
            </div>

            {terms.deliverables && terms.deliverables.length > 0 && (
              <div className="mt-6">
                <div className="text-xs kicker">DELIVERABLES</div>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                  {terms.deliverables.map((d: string, i: number) => (
                    <li key={i} className="flex gap-2 items-center">
                      <span className="text-[#42d6d0]">•</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold text-lg">Original Agreement Text</h2>
            <pre className="mt-4 p-4 rounded-xl bg-[#070d18] text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
              {agreement.original_text}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <UserCheck size={20} className="text-[#42d6d0]" /> Mutual Confirmation
            </h2>
            <p className="text-xs muted mt-2 leading-relaxed">
              Both parties must independently sign off on the active version before policies can be attached or payments initiated.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1423] border border-slate-800">
                <div>
                  <div className="text-sm font-medium">Buyer (Alex Mercer)</div>
                  <div className="text-xs muted">Creator</div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-emerald-400/10 text-emerald-300 font-semibold">
                  CONFIRMED
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a1423] border border-slate-800">
                <div>
                  <div className="text-sm font-medium">Seller ({agreement.counterparty_email})</div>
                  <div className="text-xs muted">
                    {agreement.seller_id ? "Account Bound" : "Invitation Pending"}
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded font-semibold ${
                    agreement.status === "ACTIVE"
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {agreement.status === "ACTIVE" ? "CONFIRMED" : "PENDING"}
                </span>
              </div>
            </div>

            {agreement.status === "ACTIVE" && (
              <div className="mt-6 pt-5 border-t border-slate-800">
                <Link
                  href={`/policies/new?agreement_id=${agreement.id}`}
                  className="btn btn-primary w-full text-center block text-sm"
                >
                  Create Spending Policy for this Deal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AgreementDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AppShell>
      <Link href="/agreements" className="text-sm muted flex gap-2 items-center">
        <ArrowLeft size={15} /> Agreements
      </Link>
      <Suspense fallback={<div className="py-20 text-center text-sm muted">Loading agreement view...</div>}>
        <AgreementDetailsContent id={id} />
      </Suspense>
    </AppShell>
  );
}
