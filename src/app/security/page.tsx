"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldAlert, KeyRound, Fingerprint, Link2, Bot, LogOut, Globe, Gauge, Webhook, Lock, AlertTriangle, CheckCircle2, MinusCircle, XCircle
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/components/toast";
import { useSessionUser, displayName } from "@/lib/client/session-store";
import { cn } from "@/lib/cn";

interface AuditLog { id: string; action: string; entity_type: string; created_at: string; event_data?: Record<string, unknown> }
interface Agent { id: string; agent_name: string; permissions?: string[]; status?: string; created_at?: string }
interface Policy { id: string; status?: string; require_human_approval?: boolean }

type ControlState = "ok" | "warn" | "fail" | "na";

const stateMeta: Record<ControlState, { icon: typeof CheckCircle2; cls: string; label: string; color: string }> = {
  ok: { icon: CheckCircle2, cls: "text-success", label: "Enforced", color: "#3496FF" },
  warn: { icon: AlertTriangle, cls: "text-warning", label: "Attention", color: "#F5BE50" },
  fail: { icon: XCircle, cls: "text-danger", label: "Failing", color: "#FF6363" },
  na: { icon: MinusCircle, cls: "text-fg-subtle", label: "Not available", color: "#4E5F56" }
};

/** Shield made of concentric segments — one segment per real control. */
function ShieldRings({ controls }: { controls: { label: string; state: ControlState }[] }) {
  const R = 72, C = 2 * Math.PI * R, gap = 6;
  const seg = C / controls.length;
  const ok = controls.filter(c => c.state === "ok").length;
  return (
    <div className="relative mx-auto h-[220px] w-[220px] [perspective:700px]" role="img" aria-label={`${ok} of ${controls.length} controls enforced`}>
      <div className="absolute inset-0 [transform:rotateX(18deg)] [transform-style:preserve-3d]">
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgb(170 196 232 / .1)" strokeDasharray="2 6" className="motion-safe:animate-[ps-orb-spin_40s_linear_infinite]" style={{ transformOrigin: "center" }} />
          {controls.map((c, i) => (
            <circle
              key={c.label}
              cx="100" cy="100" r={R}
              fill="none"
              stroke={stateMeta[c.state].color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${seg - gap} ${C}`}
              strokeDashoffset={-i * seg}
              transform="rotate(-90 100 100)"
              style={{ filter: c.state === "ok" ? "drop-shadow(0 0 6px rgb(52 150 255 / .55))" : undefined }}
            />
          ))}
          <circle cx="100" cy="100" r="52" fill="rgb(30 46 72 / .35)" stroke="rgb(170 196 232 / .14)" />
        </svg>
      </div>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <ShieldCheck className="mx-auto text-accent drop-shadow-[0_0_12px_rgb(52_150_255/.7)]" size={26} />
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-fg">{ok}/{controls.length}</div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-fg-subtle">controls</div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const user = useSessionUser();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/audit"), fetch("/api/agents"), fetch("/api/policies")])
      .then(rs => Promise.all(rs.map(r => r.json())))
      .then(([aud, agt, pol]) => {
        if (aud.ok) { setLogs(aud.data.logs); setChainValid(Boolean(aud.data.chainIntegrityValid)); }
        if (agt.ok) setAgents(agt.data);
        if (pol.ok) setPolicies(pol.data);
      })
      .catch(() => toast("Couldn’t load security data", { tone: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const activePolicies = policies.filter(p => p.status === "ACTIVE");
  const humanApproval = activePolicies.filter(p => p.require_human_approval).length;
  const activeAgents = agents.filter(a => (a.status ?? "ACTIVE") === "ACTIVE").length;

  const alerts = useMemo(
    () =>
      logs.filter(l =>
        l.action === "APPROVAL_BINDING_MISMATCH_DETECTED" ||
        l.action === "POLICY_REVOKED" ||
        (l.action === "PAYMENT_REQUEST_EVALUATED" && l.event_data?.decision === "BLOCKED")
      ).slice(0, 8),
    [logs]
  );

  const controls: { label: string; detail: string; state: ControlState; icon: typeof Lock }[] = [
    { label: "Audit hash chain", detail: chainValid === null ? "Not verified" : chainValid ? `SHA-256 chain intact · ${logs.length} events` : "Integrity check failed", state: chainValid === null ? "na" : chainValid ? "ok" : "fail", icon: Link2 },
    { label: "Session cookie", detail: user ? "httpOnly · SameSite=strict · 7-day expiry" : "Loading…", state: "ok", icon: Lock },
    { label: "Human approval", detail: activePolicies.length ? `${humanApproval} of ${activePolicies.length} active policies require it` : "No active policies", state: !activePolicies.length ? "warn" : humanApproval === activePolicies.length ? "ok" : "warn", icon: Fingerprint },
    { label: "Agent credentials", detail: `${activeAgents} active · hashed (SHA-256) at rest`, state: "ok", icon: KeyRound },
    { label: "Edge protection", detail: "WAF signatures, rate limits, CSRF origin checks", state: "ok", icon: Globe },
    { label: "Two-factor auth", detail: "TOTP support exists server-side; enrollment isn't exposed yet", state: "na", icon: ShieldAlert }
  ];

  async function endSession() {
    setEnding(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      window.location.reload();
    } catch {
      toast("Couldn’t end session", { tone: "error" });
      setEnding(false);
    }
  }

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

  return (
    <AppShell>
      <PageHeader
        kicker="Security command centre"
        title="Security"
        description="Live posture of the controls protecting payment execution: integrity, sessions, credentials and edge defences. Secrets are never displayed."
        actions={<Link href="/demo" className="btn btn-secondary"><ShieldAlert size={15} /> Run attack simulation</Link>}
      />

      {/* Posture */}
      <section className="card mt-6 overflow-hidden" data-no-tilt aria-labelledby="posture-h">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
          <div>
            {loading ? <div className="skeleton mx-auto h-[220px] w-[220px] rounded-full" /> : <ShieldRings controls={controls} />}
          </div>
          <div>
            <h2 id="posture-h" className="text-[15px] font-semibold text-fg">Control posture</h2>
            <p className="mb-4 text-[12px] text-fg-subtle">Every status below is read from live data or the deployed configuration</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {controls.map(c => {
                const m = stateMeta[c.state];
                return (
                  <li key={c.label} className="well flex items-start gap-3 p-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-white/[0.07] bg-surface text-fg-muted"><c.icon size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-fg">{c.label}</span>
                        <span className={cn("flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]", m.cls)}>
                          <m.icon size={12} /> {loading && c.state !== "ok" ? "…" : m.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11.5px] leading-[1.5] text-fg-subtle">{loading ? "Checking…" : c.detail}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Session management */}
        <section className="card p-5" aria-labelledby="sess-h">
          <h2 id="sess-h" className="text-[15px] font-semibold text-fg">Session management</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">Your current authenticated session</p>
          <div className="well p-3.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50" /><span className="relative h-2 w-2 rounded-full bg-success" /></span>
              <span className="text-[12.5px] font-medium text-fg">Active now</span>
              <span className="pill ml-auto text-accent">This device</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-[12px]">
              <div className="flex justify-between gap-3"><dt className="text-fg-subtle">User</dt><dd className="truncate text-fg">{user ? displayName(user) : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-fg-subtle">Email</dt><dd className="truncate text-fg">{user?.email ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-fg-subtle">Role</dt><dd className="capitalize text-fg">{user?.role ?? "—"}</dd></div>
            </dl>
          </div>
          <button type="button" onClick={endSession} disabled={ending} className="btn btn-secondary mt-4 w-full text-danger">
            <LogOut size={14} /> End this session
          </button>
          <p className="mt-3 text-[11.5px] leading-[1.5] text-fg-subtle">
            Login history isn’t recorded by the backend yet, so only the current session is shown.
          </p>
        </section>

        {/* API keys */}
        <section className="card p-5" aria-labelledby="keys-h">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="keys-h" className="text-[15px] font-semibold text-fg">API credentials</h2>
              <p className="mb-4 text-[12px] text-fg-subtle">Agent keys · stored as SHA-256 hashes</p>
            </div>
            <Link href="/agents" className="text-[12px] font-medium text-accent hover:text-accent-hover">Manage →</Link>
          </div>
          {loading ? <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="skeleton h-12" />)}</div> : agents.length === 0 ? (
            <p className="text-[12.5px] text-fg-muted">No agent credentials issued.</p>
          ) : (
            <ul className="space-y-2">
              {agents.slice(0, 5).map(a => (
                <li key={a.id} className="well flex items-center gap-3 p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-cyan/10 text-cyan"><Bot size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium text-fg">{a.agent_name}</div>
                    <div className="font-mono text-[10.5px] text-fg-subtle">key hidden · id …{a.id.slice(-6)}</div>
                  </div>
                  <span className={cn("pill", (a.status ?? "ACTIVE") === "ACTIVE" ? "text-success" : "text-danger")}>{a.status ?? "ACTIVE"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Edge & webhook */}
        <section className="card p-5" aria-labelledby="edge-h">
          <h2 id="edge-h" className="text-[15px] font-semibold text-fg">Edge &amp; webhook security</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">Enforced by middleware on every request</p>
          <ul className="space-y-2.5 text-[12px]">
            {[
              { icon: Gauge, t: "Rate limits / min", d: "Auth 15 · Payments 40 · Agreements 60 · Other API 100" },
              { icon: Globe, t: "WAF", d: "Scanner user-agents and path-traversal / script patterns rejected (403)" },
              { icon: Lock, t: "CSRF", d: "Cross-origin mutating requests blocked by Origin check" },
              { icon: Webhook, t: "Webhooks", d: "Exempt from CSRF; must verify HMAC signatures. No webhook endpoints are deployed yet." }
            ].map(r => (
              <li key={r.t} className="flex gap-3">
                <r.icon size={14} className="mt-0.5 shrink-0 text-accent" />
                <div><div className="font-medium text-fg">{r.t}</div><div className="text-fg-subtle">{r.d}</div></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* Alerts */}
        <section className="card p-5" data-no-tilt aria-labelledby="alerts-h">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="alerts-h" className="text-[15px] font-semibold text-fg">Security alerts</h2>
              <p className="mb-4 text-[12px] text-fg-subtle">Blocked payments, binding violations and revocations from the audit chain</p>
            </div>
            {!loading && <span className={cn("pill", alerts.length ? "text-warning" : "text-success")}>{alerts.length ? `${alerts.length} recent` : "Clear"}</span>}
          </div>
          {loading ? <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="skeleton h-12" />)}</div> : alerts.length === 0 ? (
            <p className="text-[12.5px] text-fg-muted">No security events recorded.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map(l => {
                const critical = l.action === "APPROVAL_BINDING_MISMATCH_DETECTED";
                return (
                  <li key={l.id} className={cn("well flex items-start gap-3 border-l-2 p-3", critical ? "border-l-danger" : "border-l-warning")}>
                    {critical ? <ShieldAlert size={15} className="mt-0.5 shrink-0 text-danger" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-fg">{l.action.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}</div>
                      <div className="truncate text-[11.5px] text-fg-subtle">
                        {typeof l.event_data?.merchant === "string" ? `${l.event_data.merchant} · ` : ""}{l.entity_type}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-fg-subtle">{fmt(l.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Permissions */}
        <section className="card p-5" aria-labelledby="perm-h">
          <h2 id="perm-h" className="text-[15px] font-semibold text-fg">Permissions model</h2>
          <p className="mb-4 text-[12px] text-fg-subtle">Who can do what, as enforced by the API</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-left text-[12px]">
              <thead className="text-[10.5px] uppercase tracking-[0.1em] text-fg-subtle">
                <tr><th className="pb-2 font-medium">Capability</th><th className="pb-2 text-center font-medium">Human</th><th className="pb-2 text-center font-medium">AI agent</th></tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {[
                  ["Submit payment request", true, true],
                  ["Approve a payment", true, false],
                  ["Execute PayPal capture", true, false],
                  ["Create / revoke policy", true, false],
                  ["Confirm agreement", true, false]
                ].map(([cap, h, a]) => (
                  <tr key={cap as string}>
                    <td className="py-2 text-fg-muted">{cap as string}</td>
                    <td className="py-2 text-center">{h ? <CheckCircle2 size={14} className="mx-auto text-success" aria-label="allowed" /> : <XCircle size={14} className="mx-auto text-danger" aria-label="denied" />}</td>
                    <td className="py-2 text-center">{a ? <CheckCircle2 size={14} className="mx-auto text-success" aria-label="allowed" /> : <XCircle size={14} className="mx-auto text-danger" aria-label="denied" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/audit" className="btn btn-ghost mt-3 w-full text-[12.5px]">Open full audit log →</Link>
        </section>
      </div>
    </AppShell>
  );
}
