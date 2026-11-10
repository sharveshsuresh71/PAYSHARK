"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Bot, KeyRound, Copy, Check, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader, HeaderStat, EmptyState } from "@/components/page-header";

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/agents");
      const json = await res.json();
      if (json.ok) {
        setAgents(json.data);
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

  async function registerAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setRegistering(true);
    setError("");

    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: name.trim(),
          permissions: ["payment:request"]
        })
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Registration failed");

      setNewKey(json.data.api_key);
      setName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error registering agent");
    } finally {
      setRegistering(false);
    }
  }

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppShell>
      <PageHeader
        kicker="AGENT REGISTRY · REVOCABLE CREDENTIALS"
        title="AI agents"
        description="Issue high-entropy scoped API keys to autonomous agents. Only SHA-256 hashes are persisted."
        actions={!loading ? <HeaderStat label="Registered" value={agents.length} tone="text-accent" /> : undefined}
      />

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mt-8">
        <div className="card p-5 sm:p-6 h-fit min-w-0">
          <h2 className="text-[15px] font-semibold text-fg flex items-center gap-2">
            <Plus size={18} className="text-accent" /> Register New Agent
          </h2>
          <form onSubmit={registerAgent} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Agent name</span>
              <input
                required
                className="field mt-2"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Procurement Bot Alpha"
              />
            </label>

            {error && (
              <p className="text-[13px] text-danger bg-danger/[0.08] border border-danger/30 px-3 py-2.5 rounded-[10px] break-words">
                {error}
              </p>
            )}

            <button disabled={registering} className="btn btn-primary w-full flex items-center justify-center gap-2">
              {registering ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Generate Agent Credentials
            </button>
          </form>

          {newKey && (
            <div className="mt-5 p-4 rounded-[12px] border border-warning/30 bg-warning/[0.08] space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">SAVE YOUR AGENT API KEY NOW</div>
              <p className="text-[13px] text-fg-muted">
                This raw key is shown only once and cannot be retrieved again:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center mt-2">
                <input
                  readOnly
                  className="field min-w-0 text-xs font-mono text-success"
                  value={newKey}
                />
                <button onClick={copyKey} className="btn btn-secondary shrink-0 flex gap-1.5 items-center justify-center text-xs">
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <h2 className="text-[15px] font-semibold text-fg flex items-center gap-2">
            <Bot size={20} className="text-accent" /> Registered Agent Workspaces
          </h2>

          {loading ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="skeleton h-[76px] rounded-[14px]" />
              ))}
              <p className="sr-only">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <EmptyState
              icon={<Bot size={22} />}
              title="No registered agents found"
              description="Use the form to issue credentials."
            />
          ) : (
            <div className="card p-3 space-y-2">
              {agents.map(a => (
                <div key={a.id} className="well p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill text-success">{a.status}</span>
                      <span className="text-[14px] font-semibold text-fg break-words">{a.agent_name}</span>
                    </div>
                    <div className="font-mono text-[11px] text-fg-subtle break-all">ID: {a.id}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-fg-muted">
                    <span className="text-fg-subtle">Scoped:</span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-accent">
                      <ShieldCheck size={12} />
                      payment:request
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
