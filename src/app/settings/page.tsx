"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Repeat2, PanelLeftClose, Sparkles, UserRound, ShieldCheck, BellRing } from "lucide-react";
import { AppShell, useSidebarCollapsed, applyEffectsPreference } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { toast } from "@/components/toast";
import { useSessionUser, displayName, initials } from "@/lib/client/session-store";
import { cn } from "@/lib/cn";

function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300",
        checked ? "border-accent/50 bg-accent/80 shadow-[0_0_14px_-2px_rgb(52_150_255/.7)]" : "border-white/[0.1] bg-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/.4)] transition-transform duration-300 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}

function Row({ icon, title, description, control }: { icon: React.ReactNode; title: string; description: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-white/[0.07] bg-canvas/60 text-fg-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-fg">{title}</div>
        <div className="text-[12px] leading-[1.5] text-fg-subtle">{description}</div>
      </div>
      {control}
    </div>
  );
}

export default function SettingsPage() {
  const user = useSessionUser();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [reduced, setReduced] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setReduced(document.documentElement.dataset.effects === "reduced"); }, []);

  async function switchRole() {
    if (!user) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: user.role === "seller" ? "buyer" : "seller" })
      });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      toast("Couldn’t switch role", { tone: "error" });
      setBusy(false);
    }
  }

  async function endSession() {
    setBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      window.location.reload();
    } catch {
      toast("Couldn’t end session", { tone: "error" });
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHeader kicker="Account" title="Settings" description="Your profile, session and interface preferences." />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        {/* Profile */}
        <section className="card overflow-hidden" data-no-tilt aria-labelledby="profile-h">
          <div className="relative h-24 bg-[radial-gradient(120%_140%_at_0%_0%,rgb(52_150_255/.35),transparent_60%),linear-gradient(135deg,#1E2E48,#0F1726)]">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          </div>
          <div className="px-5 pb-5">
            <div className="-mt-9 flex items-end gap-4">
              <span className="rounded-full bg-[conic-gradient(from_200deg,#60D6FF,#3496FF,#36D9F5,#60D6FF)] p-[2px] shadow-[0_12px_24px_-10px_rgb(0_0_0/.9)]">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-sidebar font-display text-xl font-semibold text-fg">{user ? initials(user) : ""}</span>
              </span>
              <span className="pill mb-1 capitalize text-accent">{user?.role ?? "—"}</span>
            </div>
            <h2 id="profile-h" className="mt-3 font-display text-xl font-semibold text-fg">{user ? displayName(user) : <span className="skeleton inline-block h-6 w-40" />}</h2>
            <p className="text-[13px] text-fg-muted">{user?.email}</p>

            <dl className="mt-5 grid grid-cols-2 gap-2.5 text-[12px]">
              <div className="well p-3"><dt className="text-fg-subtle">Account ID</dt><dd className="mt-0.5 truncate font-mono text-[11px] text-fg">{user?.id ?? "—"}</dd></div>
              <div className="well p-3"><dt className="text-fg-subtle">Authentication</dt><dd className="mt-0.5 flex items-center gap-1 text-fg"><ShieldCheck size={12} className="text-success" /> Session cookie</dd></div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={switchRole} disabled={busy || !user} className="btn btn-secondary">
                <Repeat2 size={14} /> Switch to {user?.role === "seller" ? "buyer" : "seller"}
              </button>
              <button type="button" onClick={endSession} disabled={busy} className="btn btn-ghost text-danger">
                <LogOut size={14} /> End session
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {/* Interface */}
          <section className="card p-5" aria-labelledby="ui-h">
            <h2 id="ui-h" className="text-[15px] font-semibold text-fg">Interface</h2>
            <p className="mb-4 text-[12px] text-fg-subtle">Saved on this device</p>
            <div className="divide-y divide-white/[0.05]">
              <Row
                icon={<PanelLeftClose size={15} />}
                title="Compact sidebar"
                description="Collapse the main navigation to an icon rail (shortcut: Ctrl/⌘ + B)."
                control={<Toggle id="pref-collapsed" label="Compact sidebar" checked={collapsed} onChange={v => { setCollapsed(v); toast(v ? "Sidebar collapsed" : "Sidebar expanded", { tone: "success" }); }} />}
              />
              <Row
                icon={<Sparkles size={15} />}
                title="Reduce visual effects"
                description="Turn off 3D tilt, particles, ambient motion and background blur for a calmer, faster interface."
                control={<Toggle id="pref-effects" label="Reduce visual effects" checked={reduced} onChange={v => { setReduced(v); applyEffectsPreference(v ? "reduced" : "full"); toast(v ? "Visual effects reduced" : "Full visual effects on", { tone: "success" }); }} />}
              />
            </div>
          </section>

          {/* Notifications */}
          <section className="card p-5" aria-labelledby="notif-h">
            <h2 id="notif-h" className="text-[15px] font-semibold text-fg">Notifications</h2>
            <p className="mb-4 text-[12px] text-fg-subtle">Where PAYSHARK tells you about activity</p>
            <div className="divide-y divide-white/[0.05]">
              <Row icon={<BellRing size={15} />} title="In-app activity feed" description="Latest audit events appear in the bell menu in the top bar." control={<span className="pill text-success">On</span>} />
              <Row icon={<UserRound size={15} />} title="Email & push" description="Not supported by the backend yet." control={<span className="pill text-fg-subtle">Unavailable</span>} />
            </div>
          </section>

          <section className="card p-5" aria-labelledby="sec-link-h">
            <h2 id="sec-link-h" className="text-[15px] font-semibold text-fg">Security</h2>
            <p className="mt-1 text-[12.5px] text-fg-muted">Sessions, API credentials, audit integrity and two-factor status live in the Security Centre.</p>
            <Link href="/security" className="btn btn-secondary mt-4"><ShieldCheck size={14} /> Open Security Centre</Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
