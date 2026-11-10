"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Bot, KeyRound, Copy, Check, Plus, ShieldCheck, Loader2 } from "lucide-react";

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
      <div className="flex justify-between items-center">
        <div>
          <div className="kicker">AGENT REGISTRY · REVOCABLE CREDENTIALS</div>
          <h1 className="text-3xl font-semibold mt-2">AI agents</h1>
          <p className="muted mt-2">
            Issue high-entropy scoped API keys to autonomous agents. Only SHA-256 hashes are persisted.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mt-8">
        <div className="card p-6 h-fit">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus size={18} className="text-[#42d6d0]" /> Register New Agent
          </h2>
          <form onSubmit={registerAgent} className="mt-4 space-y-4">
            <label className="block text-sm">
              Agent name
              <input
                required
                className="field mt-2"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Procurement Bot Alpha"
              />
            </label>

            {error && (
              <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg">
                {error}
              </p>
            )}

            <button disabled={registering} className="btn btn-primary w-full flex items-center justify-center gap-2">
              {registering ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Generate Agent Credentials
            </button>
          </form>

          {newKey && (
            <div className="mt-5 p-4 rounded-xl border border-amber-400/40 bg-amber-400/10 space-y-2">
              <div className="text-xs text-amber-300 font-bold tracking-wider">SAVE YOUR AGENT API KEY NOW</div>
              <p className="text-xs text-slate-300">
                This raw key is shown only once and cannot be retrieved again:
              </p>
              <div className="flex gap-2 items-center mt-2">
                <input
                  readOnly
                  className="field text-xs font-mono text-emerald-300 bg-[#080e19]"
                  value={newKey}
                />
                <button onClick={copyKey} className="btn btn-secondary shrink-0 flex gap-1.5 items-center text-xs">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot size={20} className="text-[#42d6d0]" /> Registered Agent Workspaces
          </h2>

          {loading ? (
            <div className="card p-10 text-center">
              <Loader2 className="mx-auto animate-spin text-[#42d6d0]" size={28} />
              <p className="muted text-sm mt-2">Loading agents...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              No registered agents found. Use the form to issue credentials.
            </div>
          ) : (
            agents.map(a => (
              <div key={a.id} className="card p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                      {a.status}
                    </span>
                    <span className="font-semibold text-slate-200">{a.agent_name}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500">ID: {a.id}</div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#42d6d0]" />
                  Scoped: payment:request
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
