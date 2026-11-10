"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, Copy, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      <Link href="/agreements" className="text-sm muted flex gap-2 items-center">
        <ArrowLeft size={15} /> Agreements
      </Link>

      <div className="max-w-3xl mt-7">
        <div className="kicker">NEW AGREEMENT · GLOBAL COUNTERPARTY FLOW</div>
        <h1 className="text-3xl font-semibold mt-2">Define the deal.</h1>
        <p className="muted mt-2">
          Invite the counterparty by verified email. A single-use cryptographic token binds their account upon confirmation.
        </p>

        {invitationData ? (
          <div className="card p-8 mt-7 border-emerald-500/40 bg-emerald-950/20 space-y-6">
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 size={28} />
              <div>
                <h2 className="text-xl font-semibold text-white">Agreement Created & AI Analyzed</h2>
                <p className="text-sm text-emerald-300/80">
                  Status set to PENDING_CONFIRMATION. Both parties must confirm before execution.
                </p>
              </div>
            </div>

            <div className="bg-[#0a1423] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs kicker">COUNTERPARTY INVITATION LINK</div>
              <div className="flex gap-2 items-center">
                <input
                  readOnly
                  className="field text-sm font-mono text-slate-300"
                  value={invitationData.url}
                />
                <button onClick={copyInvite} className="btn btn-secondary flex gap-2 items-center shrink-0">
                  <Copy size={16} /> {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Sent to: <span className="text-slate-300 font-medium">{email}</span>. The counterparty must authenticate to bind their profile and confirm the version.
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
          <form onSubmit={submit} className="card p-6 md:p-8 mt-7 space-y-5">
            <label className="block text-sm">
              Agreement title
              <input
                required
                className="field mt-2"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Website redesign — milestone 1"
              />
            </label>

            <label className="block text-sm">
              Counterparty email (Seller identification)
              <div className="relative mt-2">
                <Mail size={17} className="absolute left-3 top-3.5 text-slate-500" />
                <input
                  required
                  type="email"
                  className="field pl-10"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seller@example.com"
                />
              </div>
              <span className="text-xs muted mt-1.5 block">
                Global Best Practice: Counterparty is identified via normalized email with a single-use expiring token. Identity is securely bound to seller_id upon verified authentication.
              </span>
            </label>

            <label className="block text-sm">
              Agreement text & deliverables
              <textarea
                required
                rows={9}
                className="field mt-2 resize-y font-mono text-sm leading-relaxed"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe deliverables, payment amount ($250.00 USD), timeline, milestone acceptance criteria, and authorized payment categories..."
              />
            </label>

            {error && (
              <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-500 flex gap-2 items-center">
                <Sparkles size={14} className="text-[#42d6d0]" />
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
