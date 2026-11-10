"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, Copy, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";

export default function NewAgreement() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    id: string;
    url: string;
    token: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create agreement with Global Seller Identity Flow
      const createRes = await fetch("/api/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          original_text: body,
          counterparty_email: email
        })
      });

      const createJson = await createRes.json();
      if (!createJson.ok) {
        throw new Error(createJson.error?.message || "Failed to create agreement");
      }

      const agreementId = createJson.data.agreement.id;

      // 2. Trigger AI Analysis
      await fetch(`/api/agreements/${agreementId}/analyze`, {
        method: "POST"
      });

      setInvitationData({
        id: agreementId,
        url: window.location.origin + createJson.data.invitation_url,
        token: createJson.data.invitation_token
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating agreement");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    if (!invitationData) return;
    navigator.clipboard.writeText(invitationData.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppShell>
      <Link href="/agreements" className="inline-flex gap-2 items-center text-[13px] text-fg-muted transition hover:text-fg">
        <ArrowLeft size={15} /> Agreements
      </Link>

      <div className="max-w-3xl mt-6">
        <PageHeader
          kicker="NEW AGREEMENT · GLOBAL COUNTERPARTY FLOW"
          title="Define the deal."
          description="Invite the counterparty by verified email. A single-use cryptographic token binds their account upon confirmation."
        />

        {invitationData ? (
          <div className="card p-5 sm:p-6 mt-6 border-success/30 bg-success/[0.06] space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={24} className="text-success shrink-0 mt-0.5" />
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Agreement Created & AI Analyzed</h2>
                <p className="mt-1 text-[13px] text-fg-muted">
                  Status set to PENDING_CONFIRMATION. Both parties must confirm before execution.
                </p>
              </div>
            </div>

            <div className="well p-4 space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Counterparty invitation link</div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                  readOnly
                  className="field min-w-0 text-[13px] font-mono text-fg"
                  value={invitationData.url}
                />
                <button onClick={copyInvite} className="btn btn-secondary flex gap-2 items-center justify-center shrink-0">
                  <Copy size={16} /> {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-[12px] leading-relaxed text-fg-subtle">
                Sent to: <span className="text-fg font-medium break-all">{email}</span>. The counterparty must authenticate to bind their profile and confirm the version.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => router.push(`/agreements/${invitationData.id}`)}
                className="btn btn-primary flex gap-2 items-center"
              >
                View Agreement & Confirm <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-5 sm:p-6 mt-6 space-y-5">
            <h2 className="text-[15px] font-semibold text-fg">Agreement details</h2>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Agreement title</span>
              <input
                required
                className="field mt-2"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Website redesign — milestone 1"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Counterparty email (Seller identification)</span>
              <div className="relative mt-2">
                <Mail size={17} className="absolute left-3 top-3.5 text-fg-subtle" />
                <input
                  required
                  type="email"
                  className="field pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                />
              </div>
              <span className="text-[12px] leading-relaxed text-fg-subtle mt-1.5 block">
                Global Best Practice: Counterparty is identified via normalized email with a single-use expiring token. Identity is securely bound to seller_id upon verified authentication.
              </span>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Agreement text & deliverables</span>
              <textarea
                required
                rows={9}
                className="field mt-2 resize-y font-mono text-[13px] leading-relaxed"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe deliverables, payment amount ($250.00 USD), timeline, milestone acceptance criteria, and authorized payment categories..."
              />
            </label>

            {error && (
              <p className="text-[13px] text-danger bg-danger/[0.08] border border-danger/30 p-3 rounded-[12px]">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center pt-2">
              <div className="text-[12px] text-fg-subtle flex gap-2 items-center">
                <Sparkles size={14} className="text-accent" />
                Terms will be extracted and verified server-side
              </div>
              <button disabled={loading} className="btn btn-primary flex gap-2 items-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Analyzing agreement..." : "Create & Analyze Agreement"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
