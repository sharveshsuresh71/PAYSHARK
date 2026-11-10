import Link from "next/link";
import {
  ArrowUpRight, ArrowRight, FileCheck2, SlidersHorizontal, Fingerprint, CreditCard, Link2, Globe, Lock, ShieldCheck,
  Sparkles, Activity, BarChart3, Terminal, Database, Bot
} from "lucide-react";
import { LandingNav, Reveal, MagneticLink } from "@/components/landing/primitives";
import { LandingHero, StatementSection } from "@/components/landing/hero";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { SceneBackdrop } from "@/components/scene-backdrop";
import { BrandMark } from "@/components/sidebar";

/*
 * Public landing page — editorial direction.
 * All claims describe real product behaviour; no invented customer or volume metrics.
 */

const PIPELINE = [
  { icon: FileCheck2, title: "Agreement verified", body: "Both parties confirm the exact version. Terms are locked before any money can move." },
  { icon: SlidersHorizontal, title: "Policy enforced", body: "13 deterministic rules: ceilings, merchant allow-lists, currency precision, purpose match." },
  { icon: Fingerprint, title: "Human authorizes", body: "A single-use approval is cryptographically bound to amount, merchant and versions." },
  { icon: CreditCard, title: "PayPal captures", body: "Server-side order and capture. Approval consumed; event appended to the hash chain." }
];

const LAYERS = [
  { icon: Globe, name: "Edge WAF", note: "Scanner signatures · traversal & script patterns" },
  { icon: Lock, name: "CSRF & rate limits", note: "Origin verification · tiered per-route limits" },
  { icon: SlidersHorizontal, name: "Policy engine", note: "Pure, deterministic, side-effect free" },
  { icon: Fingerprint, name: "Approval binding", note: "Single-use · tamper-evident" },
  { icon: Link2, name: "Audit hash chain", note: "SHA-256 linked events · verifiable" }
];

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-x-clip text-fg">
      <SceneBackdrop className="-z-10" />
      <a href="#hero-title" className="skip-link">Skip to content</a>
      <LandingNav />

      {/* ================================================================== */}
      {/* HERO                                                                 */}
      {/* ================================================================== */}
      <LandingHero />

      {/* Marquee transition */}
      <div className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.05] py-4" aria-hidden>
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-display text-[clamp(18px,2.4vw,28px)] font-semibold uppercase tracking-[-0.01em]">
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10">
              {["Agreement-aware", "Policy-enforced", "Human-authorized", "Hash-chained", "Agent-ready", "Sandbox-safe"].map(w => (
                <span key={w} className="flex items-center gap-10 text-fg-subtle">
                  {w} <span className="h-2 w-2 rotate-45 bg-accent" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <main>
        {/* ================================================================ */}
        {/* PLATFORM OVERVIEW — editorial split                              */}
        {/* ================================================================ */}
        <section id="platform" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:gap-20">
            <Reveal>
              <div className="kicker">01 — Platform</div>
              <h2 className="mt-5 font-display text-[clamp(34px,4.8vw,72px)] font-semibold leading-[1] tracking-[-0.035em]">
                One control layer between <span className="text-accent">autonomous agents</span> and money.
              </h2>
            </Reveal>
            <div className="space-y-8 lg:pt-16">
              {[
                ["Agreements define intent", "Every payment traces back to a mutually confirmed, version-locked agreement."],
                ["Rules enforce limits", "Spending policies are evaluated by a pure engine, never by a language model."],
                ["Humans authorize", "No agent can approve its own payment. Ever."]
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 90}>
                  <div className="group flex gap-5 border-t border-white/[0.08] pt-6">
                    <span className="font-mono text-[12px] text-accent">0{i + 1}</span>
                    <div>
                      <h3 className="text-[19px] font-semibold text-fg transition-colors group-hover:text-accent">{t}</h3>
                      <p className="mt-2 text-[15px] leading-[1.65] text-fg-muted">{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* PAYMENT INFRASTRUCTURE — flowing pipeline                         */}
        {/* ================================================================ */}
        <section id="infrastructure" className="relative scroll-mt-24 overflow-hidden border-y border-white/[0.06] bg-white/[0.05] py-20 lg:py-28">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(52_150_255/.12),transparent_70%)]" aria-hidden />
          <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
            <Reveal className="mx-auto max-w-3xl text-center">
              <div className="kicker">02 — Payment infrastructure</div>
              <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">
                Four gates. Zero shortcuts.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.65] text-fg-muted">
                Every request travels the same authorization path. If any gate fails, the payment stops and the reason is recorded.
              </p>
            </Reveal>

            <div className="relative mt-16">
              {/* flowing connector (desktop) */}
              <svg className="absolute left-0 right-0 top-[38px] hidden h-2 w-full lg:block" preserveAspectRatio="none" viewBox="0 0 100 2" aria-hidden>
                <line x1="12" y1="1" x2="88" y2="1" stroke="rgb(52 150 255 / .25)" strokeWidth=".3" />
                <line x1="12" y1="1" x2="88" y2="1" stroke="#3496FF" strokeWidth=".35" className="flow-line" vectorEffect="non-scaling-stroke" />
              </svg>
              <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {PIPELINE.map((s, i) => (
                  <Reveal as="li" key={s.title} delay={i * 110} className="text-center">
                    <div className="relative mx-auto grid h-[76px] w-[76px] place-items-center [perspective:400px]">
                      <span className="absolute inset-0 rounded-[16px] bg-accent/20 blur-xl" aria-hidden />
                      <span className="relative grid h-[76px] w-[76px] place-items-center rounded-[16px] border border-accent/30 bg-[linear-gradient(160deg,#1E2E48,#0B111C)] text-volt shadow-[inset_0_1px_0_rgb(255_255_255/.15),0_20px_40px_-18px_rgb(0_0_0/.9)] [transform:rotateX(14deg)]">
                        <s.icon size={28} strokeWidth={1.6} />
                      </span>
                    </div>
                    <div className="mt-6 font-mono text-[11px] text-accent">STEP 0{i + 1}</div>
                    <h3 className="mt-2 text-[18px] font-semibold text-fg">{s.title}</h3>
                    <p className="mx-auto mt-2 max-w-[260px] text-[14px] leading-[1.6] text-fg-muted">{s.body}</p>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* AI INTELLIGENCE — orb + example extraction                        */}
        {/* ================================================================ */}
        <section id="intelligence" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal className="relative order-2 lg:order-1">
              <div className="relative mx-auto max-w-[520px]">
                <div className="absolute -left-6 -top-10 h-40 w-40" aria-hidden>
                  <span className="ai-orb absolute inset-6" />
                </div>
                <div className="card relative ml-auto w-[88%] p-5 [transform:perspective(900px)_rotateY(-10deg)_rotateX(4deg)]" data-no-tilt>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-cyan/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cyan"><Sparkles size={11} /> AI extraction</span>
                    <span className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">Example</span>
                  </div>
                  <div className="mt-4 space-y-2.5 text-[13px]">
                    {[["Purpose", "Website redesign · milestone 1"], ["Amount", "USD 1,500.00"], ["Deadline", "2026-12-31"], ["Completeness", "95%"]].map(([k, v]) => (
                      <div key={k} className="well flex justify-between gap-4 px-3 py-2.5"><span className="text-fg-subtle">{k}</span><span className="text-right font-medium text-fg">{v}</span></div>
                    ))}
                  </div>
                </div>
                <div className="card relative -mt-6 w-[70%] p-4 [transform:perspective(900px)_rotateY(-10deg)_translateZ(40px)]" data-no-tilt>
                  <div className="flex items-center gap-2 text-[12.5px] font-medium text-fg"><ShieldCheck size={15} className="text-accent" /> Verified by policy engine</div>
                  <p className="mt-1 text-[12px] text-fg-muted">AI output is advisory. Enforcement is deterministic.</p>
                </div>
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <div className="kicker">03 — Financial intelligence</div>
              <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">
                AI reads the fine print. <span className="text-fg-subtle">It never holds the pen.</span>
              </h2>
              <p className="mt-6 max-w-lg text-[16px] leading-[1.7] text-fg-muted">
                PAYSHARK uses AI to extract amounts, deadlines and purpose from agreements, then hands everything to deterministic rules. AI insights are always labelled, and verified data always comes from the ledger.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Agreement term extraction", "Missing-information detection", "Purpose-mismatch blocking", "Verified, explainable answers"].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-[14px] text-fg"><span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgb(52_150_255)]" />{f}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* REAL-TIME MONITORING — tilted product stage                        */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,rgb(52_150_255/.16),transparent_70%)]" aria-hidden />
          <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
            <Reveal className="max-w-2xl">
              <div className="kicker">04 — Real-time monitoring</div>
              <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">A command centre for every agent payment.</h2>
            </Reveal>
            <Reveal delay={120} className="mt-28">
              <DashboardPreview />
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECURITY ARCHITECTURE — stacked isometric layers                   */}
        {/* ================================================================ */}
        <section id="security" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
            <Reveal>
              <div className="kicker">05 — Security architecture</div>
              <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">Defence in depth, by design.</h2>
              <p className="mt-6 max-w-md text-[16px] leading-[1.7] text-fg-muted">
                Five independent layers stand between a compromised agent and your funds. Each one is enforced on the server, and every outcome is written to a tamper-evident chain.
              </p>
              <Link href="/demo" className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-accent transition-colors hover:text-accent-hover">
                Try the attack simulator <ArrowRight size={15} />
              </Link>
            </Reveal>
            <div className="[perspective:1400px]">
              <ul className="mx-auto max-w-[520px] [transform-style:preserve-3d] [transform:rotateX(52deg)_rotateZ(-30deg)] max-sm:[transform:none]">
                {LAYERS.map((l, i) => (
                  <Reveal as="li" key={l.name} delay={i * 90} className="preserve-3d group relative -mt-6 first:mt-0 max-sm:mt-2">
                    <div
                      className="flex items-center gap-4 rounded-[16px] border border-accent/25 bg-[linear-gradient(135deg,rgb(30_46_72/.95),rgb(15_23_38/.97))] p-5 shadow-[0_24px_40px_-20px_rgb(0_0_0/.95),inset_0_1px_0_rgb(255_255_255/.08)] transition-transform duration-500 group-hover:[transform:translateZ(36px)] max-sm:group-hover:[transform:none]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-accent/15 text-volt"><l.icon size={18} /></span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-fg">{l.name}</div>
                        <div className="text-[12.5px] text-fg-muted">{l.note}</div>
                      </div>
                      <span className="ml-auto font-mono text-[11px] text-accent">L{i + 1}</span>
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* ANALYTICS & INSIGHTS — asymmetric bento                            */}
        {/* ================================================================ */}
        <section className="border-y border-white/[0.06] bg-white/[0.05] py-20 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="kicker">06 — Analytics & insights</div>
                <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">See every outcome. Explain every decision.</h2>
              </div>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-6">
              <Reveal className="md:col-span-4">
                <div className="card h-full p-7">
                  <Activity className="text-accent" size={22} />
                  <h3 className="mt-5 text-[20px] font-semibold">Volume & success analytics</h3>
                  <p className="mt-2 max-w-md text-[14.5px] leading-[1.65] text-fg-muted">Daily volume, captured vs. blocked, success rate and top block reasons, calculated straight from the ledger.</p>
                  <div className="mt-8 flex h-24 items-end gap-2" aria-hidden>
                    {[30, 52, 41, 68, 57, 80, 64, 92, 76, 88, 70, 96].map((h, i) => (
                      <span key={i} className="flex-1 rounded-t-[4px] bg-gradient-to-t from-forest to-accent" style={{ height: `${h}%`, opacity: 0.35 + i * 0.05 }} />
                    ))}
                  </div>
                </div>
              </Reveal>
              <Reveal delay={100} className="md:col-span-2">
                <div className="card flex h-full flex-col justify-between p-7">
                  <BarChart3 className="text-cyan" size={22} />
                  <div>
                    <h3 className="mt-5 text-[20px] font-semibold">Risk distribution</h3>
                    <p className="mt-2 text-[14.5px] leading-[1.65] text-fg-muted">Every request scored 0–100 with explainable reasons.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={60} className="md:col-span-3">
                <div className="card h-full p-7">
                  <ShieldCheck className="text-volt" size={22} />
                  <h3 className="mt-5 text-[20px] font-semibold">Policy check transparency</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.65] text-fg-muted">Each decision lists every rule it passed or failed, with no black boxes.</p>
                </div>
              </Reveal>
              <Reveal delay={140} className="md:col-span-3">
                <div className="card h-full p-7">
                  <Link2 className="text-accent" size={22} />
                  <h3 className="mt-5 text-[20px] font-semibold">Verifiable audit trail</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.65] text-fg-muted">Hash-linked events with an integrity check you can run anytime.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* DEVELOPER EXPERIENCE — code-forward                                */}
        {/* ================================================================ */}
        <section id="developers" className="mx-auto max-w-[1320px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <Reveal>
              <div className="kicker">07 — Developer experience</div>
              <h2 className="mt-5 font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">One request. Fully governed.</h2>
              <p className="mt-6 max-w-md text-[16px] leading-[1.7] text-fg-muted">Give your agent a scoped key. It submits a payment request and gets an explainable decision back. Approval and capture stay with humans.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/developers" className="btn btn-primary"><Terminal size={15} /> API reference</Link>
                <Link href="/agents" className="btn btn-secondary"><Bot size={15} /> Register an agent</Link>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#0B111C] shadow-[0_40px_80px_-40px_rgb(0_0_0/1)]">
                <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3" aria-hidden>{["#FF6363", "#F5BE50", "#3496FF"].map(c => <span key={c} className="h-2.5 w-2.5 rounded-full opacity-70" style={{ background: c }} />)}<span className="ml-3 font-mono text-[11px] text-fg-subtle">agent.ts</span></div>
                <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-[1.8] text-[#C9D3E0]"><code>{`const res = await fetch("/api/payment-requests", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.PAYSHARK_AGENT_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ policy_id, agreement_id, merchant,
    merchant_id, purpose, amount: "150.00",
    currency: "USD", idempotency_key }),
});

const { data } = await res.json();
// data.decision → "APPROVED_FOR_REVIEW" | "REQUIRES_REVIEW" | "BLOCKED"`}</code></pre>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* INTEGRATION ECOSYSTEM — orbital                                    */}
        {/* ================================================================ */}
        <section className="relative overflow-hidden border-t border-white/[0.06] py-20 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 text-center sm:px-8">
            <Reveal>
              <div className="kicker">08 — Integrations</div>
              <h2 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(32px,4.2vw,60px)] font-semibold leading-[1.02] tracking-[-0.03em]">Built on infrastructure you already trust.</h2>
            </Reveal>
            <Reveal delay={120} className="relative mx-auto mt-16 aspect-square w-[min(520px,90vw)]">
              <div className="absolute inset-0 rounded-full border border-white/[0.07]" aria-hidden />
              <div className="absolute inset-[18%] rounded-full border border-dashed border-accent/20" aria-hidden />
              <div className="absolute inset-[38%] grid place-items-center rounded-full bg-[radial-gradient(circle_at_40%_30%,#6FB4FF,#1D4F8F_70%)] shadow-[0_0_80px_-10px_rgb(52_150_255/.6),inset_0_2px_0_rgb(255_255_255/.3)]">
                <BrandMark className="h-10 w-10 rounded-[12px]" />
              </div>
              {[
                { name: "PayPal", sub: "Payments", icon: CreditCard, pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
                { name: "Neon", sub: "Postgres", icon: Database, pos: "right-0 top-1/2 translate-x-1/3 -translate-y-1/2" },
                { name: "Groq", sub: "AI analysis", icon: Sparkles, pos: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" },
                { name: "Next.js", sub: "Platform", icon: Globe, pos: "left-0 top-1/2 -translate-x-1/3 -translate-y-1/2" }
              ].map(i => (
                <div key={i.name} className={`popover absolute flex items-center gap-2.5 px-3.5 py-2.5 text-left ${i.pos}`}>
                  <i.icon size={16} className="text-accent" />
                  <div><div className="text-[13px] font-semibold text-fg">{i.name}</div><div className="text-[11px] text-fg-subtle">{i.sub}</div></div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ================================================================ */}
        {/* STATEMENT — starfield                                              */}
        {/* ================================================================ */}
        <StatementSection />

        {/* ================================================================ */}
        {/* FINAL CONVERSION                                                   */}
        {/* ================================================================ */}
        <section className="px-3 pb-6 sm:px-5">
          <Reveal className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[16px] border border-accent/20 bg-[radial-gradient(ellipse_80%_120%_at_80%_0%,rgb(52_150_255/.4),transparent_60%),linear-gradient(135deg,#1E2E48,#0B111C_70%)] px-6 py-16 text-center sm:px-12 lg:py-20">
            <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(96_214_255/.15)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000,transparent)]" aria-hidden />
            <h2 className="relative mx-auto max-w-4xl font-display text-[clamp(38px,6vw,88px)] font-semibold uppercase leading-[0.95] tracking-[-0.04em]">
              Let agents spend.<br /><span className="text-volt">Keep humans in charge.</span>
            </h2>
            <p className="relative mx-auto mt-6 max-w-lg text-[16px] leading-[1.65] text-fg-muted">Launch the workspace in sandbox mode. No real funds move until you say so.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <MagneticLink href="/dashboard" className="btn btn-primary h-12 px-7 text-[15px]">Get started <ArrowUpRight size={17} /></MagneticLink>
              <MagneticLink href="/demo" className="btn btn-secondary h-12 px-7 text-[15px]">Run a live attack demo</MagneticLink>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ================================================================== */}
      {/* FOOTER                                                               */}
      {/* ================================================================== */}
      <footer className="mx-auto max-w-[1320px] px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-12 border-b border-white/[0.06] pb-14 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" className="flex items-center gap-2.5"><BrandMark /><span className="font-display text-[15px] font-semibold tracking-[0.14em]">PAYSHARK</span></Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.65] text-fg-muted">Agreement-aware payment control for autonomous AI agents.</p>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-warning/25 bg-warning/[0.06] px-3 py-1 text-[11.5px] text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Private beta · PayPal Sandbox</span>
          </div>
          {[
            ["Product", [["Command centre", "/dashboard"], ["Transactions", "/transactions"], ["Analytics", "/analytics"], ["Review center", "/approvals"]]],
            ["Governance", [["Agreements", "/agreements"], ["Policies", "/policies"], ["AI agents", "/agents"], ["Audit trail", "/audit"]]],
            ["Platform", [["Security centre", "/security"], ["Attack simulator", "/demo"], ["Developers", "/developers"], ["Settings", "/settings"]]]
          ].map(([title, links]) => (
            <div key={title as string}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{title as string}</div>
              <ul className="mt-4 space-y-2.5">
                {(links as string[][]).map(([l, h]) => (
                  <li key={h}><Link href={h} className="text-[13.5px] text-fg-muted transition-colors hover:text-fg">{l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 text-[12px] text-fg-subtle">
          <span>© {new Date().getFullYear()} PAYSHARK. AI interprets. Rules enforce. Humans authorize. PayPal processes.</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> All systems sandboxed</span>
        </div>
      </footer>
    </div>
  );
}
