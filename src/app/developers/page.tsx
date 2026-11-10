"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Database, CreditCard, Sparkles, Webhook, Search, Terminal, KeyRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/components/toast";
import { cn } from "@/lib/cn";

type Method = "GET" | "POST" | "DELETE";
interface Endpoint { method: Method; path: string; desc: string; auth: "Session" | "Agent key or session" | "Public demo"; group: string }

/** Mirrors the route handlers in src/app/api — keep in sync when routes change. */
const ENDPOINTS: Endpoint[] = [
  { group: "Payments", method: "POST", path: "/api/payment-requests", desc: "Submit a payment request for deterministic policy evaluation. Idempotent per agent + idempotency_key.", auth: "Agent key or session" },
  { group: "Payments", method: "GET", path: "/api/payment-requests", desc: "List payment requests owned by the current user.", auth: "Session" },
  { group: "Payments", method: "POST", path: "/api/payment-requests/evaluate", desc: "Dry-run policy evaluation without persisting a request.", auth: "Session" },
  { group: "Payments", method: "POST", path: "/api/payment-requests/{id}/approve", desc: "Single-use human authorization bound to the exact amount, merchant and versions.", auth: "Session" },
  { group: "Payments", method: "POST", path: "/api/payments/paypal/create-order", desc: "Create a PayPal Sandbox order for an approved request.", auth: "Session" },
  { group: "Payments", method: "POST", path: "/api/payments/paypal/capture-order", desc: "Capture a PayPal order; consumes the approval and appends to the audit chain.", auth: "Session" },
  { group: "Agreements", method: "GET", path: "/api/agreements", desc: "List agreements where you are buyer or seller.", auth: "Session" },
  { group: "Agreements", method: "POST", path: "/api/agreements", desc: "Create an agreement and invite the counterparty.", auth: "Session" },
  { group: "Agreements", method: "GET", path: "/api/agreements/{id}", desc: "Fetch an agreement with versions and confirmations.", auth: "Session" },
  { group: "Agreements", method: "POST", path: "/api/agreements/{id}/confirm", desc: "Confirm or reject the active agreement version.", auth: "Session" },
  { group: "Agreements", method: "POST", path: "/api/agreements/{id}/analyze", desc: "AI extraction of terms from an existing agreement (Groq, with deterministic fallback).", auth: "Session" },
  { group: "Agreements", method: "POST", path: "/api/agreements/analyze", desc: "AI extraction of terms from raw agreement text.", auth: "Session" },
  { group: "Policies", method: "GET", path: "/api/policies", desc: "List spending policies.", auth: "Session" },
  { group: "Policies", method: "POST", path: "/api/policies", desc: "Create a spending policy bound to an agreement.", auth: "Session" },
  { group: "Policies", method: "GET", path: "/api/policies/{id}", desc: "Fetch a policy.", auth: "Session" },
  { group: "Policies", method: "POST", path: "/api/policies/{id}", desc: "Update policy status (e.g. revoke).", auth: "Session" },
  { group: "Agents", method: "GET", path: "/api/agents", desc: "List registered agents (credentials are never returned).", auth: "Session" },
  { group: "Agents", method: "POST", path: "/api/agents/register", desc: "Register an agent. The API key is returned once and stored only as a SHA-256 hash.", auth: "Session" },
  { group: "Platform", method: "GET", path: "/api/audit", desc: "Latest 100 audit events with hash-chain verification result.", auth: "Session" },
  { group: "Platform", method: "GET", path: "/api/auth/session", desc: "Current session user.", auth: "Session" },
  { group: "Platform", method: "POST", path: "/api/auth/session", desc: "Switch the demo session role (buyer / seller).", auth: "Session" },
  { group: "Platform", method: "DELETE", path: "/api/auth/session", desc: "End the current session.", auth: "Session" },
  { group: "Platform", method: "POST", path: "/api/demo/scenario", desc: "Run a red-team attack scenario (A–E) against the policy engine.", auth: "Session" }
];

const SAMPLE = `curl -X POST https://<your-host>/api/payment-requests \\
  -H "Authorization: Bearer $PAYSHARK_AGENT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "policy_id": "<policy uuid>",
    "agreement_id": "<agreement uuid>",
    "merchant": "Acme Design Studio",
    "merchant_id": "acme-design",
    "purpose": "Website redesign milestone 1",
    "amount": "150.00",
    "currency": "USD",
    "idempotency_key": "order-2024-0001"
  }'`;

const RESPONSE = `{
  "ok": true,
  "data": {
    "id": "…",
    "decision": "APPROVED_FOR_REVIEW",   // or REQUIRES_REVIEW | BLOCKED
    "reviewRequired": true,
    "reason_codes": [],
    "checks": [{ "code": "…", "passed": true, "detail": "…" }],
    "risk_score": 12
  }
}`;

const methodCls: Record<Method, string> = {
  GET: "text-cyan border-cyan/30 bg-cyan/10",
  POST: "text-accent border-accent/30 bg-accent/10",
  DELETE: "text-danger border-danger/30 bg-danger/10"
};

function CodeBlock({ code, label }: { code: string; label: string }) {
  async function copy() {
    try { await navigator.clipboard.writeText(code); toast(`${label} copied`, { tone: "success" }); }
    catch { toast("Couldn’t copy", { tone: "error" }); }
  }
  return (
    <div className="overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#0B111C]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>{["#FF6363", "#F5BE50", "#3496FF"].map(c => <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, opacity: 0.7 }} />)}</span>
          <span className="text-[11px] font-medium text-fg-subtle">{label}</span>
        </div>
        <button type="button" onClick={copy} className="icon-btn h-7 w-7" aria-label={`Copy ${label}`}><Copy size={13} /></button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[11.5px] leading-[1.7] text-[#C9D3E0]"><code>{code}</code></pre>
    </div>
  );
}

export default function DevelopersPage() {
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const groups = ["All", ...Array.from(new Set(ENDPOINTS.map(e => e.group)))];
  const list = useMemo(
    () => ENDPOINTS.filter(e => (group === "All" || e.group === group) && (!q || `${e.method} ${e.path} ${e.desc}`.toLowerCase().includes(q.toLowerCase()))),
    [group, q]
  );

  const integrations = [
    { icon: CreditCard, name: "PayPal", role: "Order creation & capture", mode: "Sandbox", env: "PayPal credentials (server env)" },
    { icon: Database, name: "Neon Postgres", role: "Primary datastore", mode: "Serverless driver", env: "Database URL (server env)" },
    { icon: Sparkles, name: "Groq", role: "AI agreement analysis", mode: "Deterministic fallback when unset", env: "GROQ_API_KEY" },
    { icon: Webhook, name: "Security webhook", role: "HIGH / CRITICAL alert fan-out", mode: "Optional", env: "SECURITY_WEBHOOK_URL" }
  ];

  return (
    <AppShell>
      <PageHeader
        kicker="Developer platform"
        title="Build with PAYSHARK"
        description="Let autonomous agents request payments safely. Every request is evaluated by the deterministic policy engine and needs human authorization before money moves."
        actions={<Link href="/agents" className="btn btn-primary"><KeyRound size={15} /> Create agent key</Link>}
      />

      {/* Quickstart */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="card p-5" data-no-tilt aria-labelledby="qs-h">
          <div className="mb-4 flex items-center gap-2">
            <Terminal size={16} className="text-accent" />
            <h2 id="qs-h" className="text-[15px] font-semibold text-fg">Quickstart · submit a payment request</h2>
          </div>
          <ol className="mb-4 grid gap-2 text-[12.5px] text-fg-muted sm:grid-cols-3">
            {["Register an agent and store its key securely", "Create an agreement and an ACTIVE policy", "POST requests with a unique idempotency_key"].map((s, i) => (
              <li key={s} className="well flex gap-2.5 p-3">
                <span className="font-mono text-[11px] font-semibold text-accent">0{i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <CodeBlock code={SAMPLE} label="Request" />
        </section>
        <section className="card p-5" data-no-tilt aria-labelledby="resp-h">
          <h2 id="resp-h" className="mb-1 text-[15px] font-semibold text-fg">Response envelope</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">All endpoints return <code className="font-mono text-fg-muted">{"{ ok, data }"}</code> or <code className="font-mono text-fg-muted">{"{ ok: false, error: { code, message } }"}</code></p>
          <CodeBlock code={RESPONSE} label="201 Created" />
          <p className="mt-3 text-[11.5px] leading-[1.6] text-fg-subtle">Agents can never approve or capture payments; those endpoints require a human session.</p>
        </section>
      </div>

      {/* API reference */}
      <section className="card mt-4 overflow-hidden" data-no-tilt aria-labelledby="ref-h">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-4 sm:p-5">
          <div>
            <h2 id="ref-h" className="text-[15px] font-semibold text-fg">API reference</h2>
            <p className="text-[12px] text-fg-subtle">{ENDPOINTS.length} endpoints · rate-limited per IP</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div role="group" aria-label="Endpoint group" className="flex flex-wrap rounded-[4px] border border-white/[0.07] bg-canvas/50 p-0.5">
              {groups.map(g => (
                <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}
                  className={cn("rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium transition-all", group === g ? "bg-surface text-fg" : "text-fg-muted hover:text-fg")}>
                  {g}
                </button>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <label htmlFor="ep-q" className="sr-only">Search endpoints</label>
              <input id="ep-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Search endpoints…" className="field h-9 py-0 pl-8 text-[12.5px]" />
            </div>
          </div>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          {list.map(e => (
            <li key={`${e.method} ${e.path}`} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5 sm:w-[360px] sm:shrink-0">
                <span className={cn("inline-flex w-[54px] shrink-0 justify-center rounded-md border py-0.5 font-mono text-[10.5px] font-semibold", methodCls[e.method])}>{e.method}</span>
                <code className="truncate font-mono text-[12px] text-fg">{e.path}</code>
              </div>
              <p className="min-w-0 flex-1 text-[12.5px] text-fg-muted">{e.desc}</p>
              <span className="pill shrink-0 self-start text-fg-subtle sm:self-auto">{e.auth}</span>
            </li>
          ))}
          {list.length === 0 && <li className="px-5 py-8 text-center text-[13px] text-fg-muted">No endpoints match.</li>}
        </ul>
      </section>

      {/* Integrations */}
      <section className="mt-6" aria-labelledby="int-h">
        <h2 id="int-h" className="text-[15px] font-semibold text-fg">Integration ecosystem</h2>
        <p className="mb-4 text-[12px] text-fg-subtle">Configured on the server through environment variables. Values are never exposed to the browser.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {integrations.map(i => (
            <div key={i.name} className="card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-accent/20 bg-[linear-gradient(160deg,rgb(30_46_72/.8),rgb(19_29_46))] text-accent shadow-[inset_0_1px_0_rgb(255_255_255/.08)]">
                <i.icon size={18} />
              </span>
              <div className="mt-4 text-[14px] font-semibold text-fg">{i.name}</div>
              <div className="text-[12px] text-fg-muted">{i.role}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="pill text-accent">{i.mode}</span>
              </div>
              <div className="mt-3 font-mono text-[10.5px] text-fg-subtle">{i.env}</div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
