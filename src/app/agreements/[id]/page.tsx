"use client";

import { useEffect, useState, use, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ArrowLeft, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/page-header";

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
      <div className="mt-6">
        <span className="sr-only">Loading agreement...</span>
        <div className="skeleton h-4 w-40 rounded-md" />
        <div className="skeleton mt-3 h-9 w-2/3 max-w-md rounded-lg" />
        <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6 mt-8">
          <div className="skeleton h-72 rounded-[18px]" />
          <div className="skeleton h-56 rounded-[18px]" />
        </div>
      </div>
    );
  }

  if (!data?.agreement) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<AlertTriangle size={22} />}
          title="Agreement not found"
          action={
            <Link href="/agreements" className="btn btn-secondary inline-block">
              Back to Agreements
            </Link>
          }
        />
      </div>
    );
  }

  const { agreement, latestVersion } = data;
  const terms = latestVersion?.structured_terms || agreement.extracted_terms || {};

  return (
    <>
      <PageHeader
        className="mt-6"
        kicker={
          <span className="flex items-center gap-2">
            <span
              className={`pill ${
                agreement.status === "ACTIVE"
                  ? "text-success"
                  : agreement.status === "PENDING_CONFIRMATION"
                  ? "text-warning"
                  : "text-fg-muted"
              }`}
            >
              {agreement.status}
            </span>
            <span className="font-mono tabular-nums normal-case tracking-normal text-fg-subtle">v{agreement.current_version}</span>
          </span>
        }
        title={<span className="break-words">{agreement.title}</span>}
        description={
          <span className="text-[13px] break-all sm:break-normal">
            Buyer: <span className="text-fg">{agreement.buyer_id}</span> · Seller:{" "}
            <span className="text-fg">
              {agreement.seller_id ? agreement.seller_id : `Invited (${agreement.counterparty_email})`}
            </span>
          </span>
        }
        actions={
          agreement.status === "PENDING_CONFIRMATION" && (
            <button
              onClick={confirmVersion}
              disabled={confirming}
              className="btn btn-primary flex gap-2 items-center"
            >
              {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm Version {latestVersion?.version_number || 1}
            </button>
          )
        }
      />

      {msg && (
        <div className="mt-5 p-4 rounded-[12px] border border-accent/30 bg-accent/10 text-accent text-[13px]">
          {msg}
        </div>
      )}

      <div className="grid lg:grid-cols-[1.3fr_.7fr] gap-6 mt-8">
        <div className="min-w-0 space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg flex items-center gap-2">
              <ShieldCheck className="text-accent" size={18} />
              Machine-Verified Terms
            </h2>

            <div className="grid sm:grid-cols-3 gap-4 mt-5">
              <div className="well p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Authorized amount</div>
                <div className="font-display text-xl font-semibold tabular-nums mt-1 text-accent">
                  {terms.amount || agreement.amount || "—"} {terms.currency || agreement.currency || "USD"}
                </div>
              </div>
              <div className="well p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Deadline</div>
                <div className="font-display text-xl font-semibold tabular-nums mt-1 text-fg">
                  {terms.deadline || agreement.deadline || "Open"}
                </div>
              </div>
              <div className="well p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Completeness</div>
                <div className="font-display text-xl font-semibold tabular-nums mt-1 text-success">
                  {terms.completeness_percent || 100}%
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Permitted purpose</div>
              <p className="well mt-2 p-3 text-[13px] text-fg-muted">
                {terms.transaction_purpose || "Core deliverables specified in agreement"}
              </p>
            </div>

            {terms.deliverables && terms.deliverables.length > 0 && (
              <div className="mt-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Deliverables</div>
                <ul className="mt-2 space-y-1.5 text-[13px] text-fg-muted">
                  {terms.deliverables.map((d: string, i: number) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="text-accent">•</span> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg">Original Agreement Text</h2>
            <pre className="well mt-4 p-4 overflow-x-auto text-fg-muted text-[12px] font-mono whitespace-pre-wrap break-words leading-relaxed">
              {agreement.original_text}
            </pre>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="card p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-fg flex items-center gap-2">
              <UserCheck size={18} className="text-accent" /> Mutual Confirmation
            </h2>
            <p className="text-[13px] text-fg-muted mt-2 leading-relaxed">
              Both parties must independently sign off on the active version before policies can be attached or payments initiated.
            </p>

            <div className="mt-5 space-y-3">
              <div className="well flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-fg">Buyer (Alex Mercer)</div>
                  <div className="text-[12px] text-fg-subtle">Creator</div>
                </div>
                <span className="pill text-success shrink-0">CONFIRMED</span>
              </div>

              <div className="well flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-fg break-all">Seller ({agreement.counterparty_email})</div>
                  <div className="text-[12px] text-fg-subtle">
                    {agreement.seller_id ? "Account Bound" : "Invitation Pending"}
                  </div>
                </div>
                <span className={`pill shrink-0 ${agreement.status === "ACTIVE" ? "text-success" : "text-warning"}`}>
                  {agreement.status === "ACTIVE" ? "CONFIRMED" : "PENDING"}
                </span>
              </div>
            </div>

            {agreement.status === "ACTIVE" && (
              <div className="mt-6 pt-5 border-t border-white/[0.07]">
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
      <Link href="/agreements" className="inline-flex gap-2 items-center text-[13px] text-fg-muted transition hover:text-fg">
        <ArrowLeft size={15} /> Agreements
      </Link>
      <Suspense fallback={<div className="py-20 text-center text-[13px] text-fg-muted">Loading agreement view...</div>}>
        <AgreementDetailsContent id={id} />
      </Suspense>
    </AppShell>
  );
}
