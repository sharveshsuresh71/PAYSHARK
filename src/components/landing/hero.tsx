import Link from "next/link";
import { ArrowRight, CreditCard, Database, Globe, Nfc, Play, Sparkles } from "lucide-react";
import { MagneticLink, Reveal } from "./primitives";
import { cn } from "@/lib/cn";

/*
 * Landing hero — dark stage with a light beam, a giant faded wordmark,
 * a floating 3D stack of agent payment cards with callouts, and a
 * highlights + "built on" panel underneath.
 * Card numbers/limits are illustrative sample data.
 */

type CardTone = "emerald" | "frost" | "ink";

const CARD_TONES: Record<CardTone, string> = {
  emerald: "bg-[linear-gradient(135deg,#FAFAFA_0%,#A1A1AA_45%,#3F3F46_100%)] text-[#09090B] shadow-[0_40px_60px_-20px_rgb(0_0_0/.8)]",
  frost: "bg-[linear-gradient(135deg,rgb(255_255_255/.95),rgb(214_224_236/.85))] text-[#0E182A] shadow-[0_30px_50px_-20px_rgb(20_32_54/.45)]",
  ink: "bg-[linear-gradient(135deg,#1E2E48,#0B111C)] text-white ring-1 ring-white/10 shadow-[0_30px_50px_-20px_rgb(10_20_40/.7)]"
};

function PayCard({ tone, agent, number, limit }: { tone: CardTone; agent: string; number: string; limit: string }) {
  return (
    <div className={cn("grain relative flex aspect-[1.586] w-[clamp(220px,25vw,320px)] flex-col justify-between overflow-hidden rounded-[18px] p-5", CARD_TONES[tone])}>
      <div className="flex items-center justify-between">
        <span className="font-display text-[13px] font-bold tracking-[0.18em]">PAYSHARK</span>
        <Nfc size={20} className="opacity-80" />
      </div>
      <div>
        <span className="block h-7 w-9 rounded-[16px] bg-[linear-gradient(135deg,#F1F8D8,#A9BC86)] shadow-[inset_0_0_0_1px_rgb(0_0_0/.15)]" />
        <div className="mt-3 font-mono text-[clamp(13px,1.35vw,17px)] tracking-[0.14em]">{number}</div>
      </div>
      <div className="flex items-end justify-between text-[10.5px] font-semibold uppercase tracking-[0.08em]">
        <span>
          <span className="block opacity-60">Agent</span>
          {agent}
        </span>
        <span>
          <span className="block opacity-60">Limit</span>
          {limit}
        </span>
        <span className="flex" aria-hidden>
          <span className="h-6 w-6 rounded-full bg-current opacity-70" />
          <span className="-ml-2.5 h-6 w-6 rounded-full bg-current opacity-35" />
        </span>
      </div>
    </div>
  );
}

function CardStack() {
  return (
    <div className="relative h-[clamp(340px,38vw,480px)] w-full" aria-hidden>
      {/* 3D card stack */}
      <div className="absolute inset-0 [perspective:1400px]">
        <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(18deg)_rotateY(-24deg)_rotateZ(-4deg)]">
          <div className="hero-card absolute left-[2%] top-[46%] [transform:translateZ(0px)_rotateZ(-7deg)]" style={{ "--d": "-2s" } as React.CSSProperties}>
            <PayCard tone="ink" agent="Ops-bot" number="5021 •••• •••• 7730" limit="$250/day" />
          </div>
          <div className="hero-card absolute left-[9%] top-[25%] [transform:translateZ(70px)_rotateZ(-7deg)]" style={{ "--d": "-4s" } as React.CSSProperties}>
            <PayCard tone="frost" agent="Travel-bot" number="4417 •••• •••• 0093" limit="$1,200/trip" />
          </div>
          <div className="hero-card absolute left-[16%] top-[4%] [transform:translateZ(140px)_rotateZ(-7deg)]" style={{ "--d": "0s" } as React.CSSProperties}>
            <PayCard tone="emerald" agent="Procure-bot" number="4821 •••• •••• 1950" limit="$500/day" />
          </div>
        </div>
      </div>

      {/* sparkle badge */}
      <span className="absolute left-0 top-[2%] grid h-14 w-14 place-items-center rounded-full bg-white/[0.06] text-accent ring-1 ring-white/10 backdrop-blur">
        <Sparkles size={22} />
      </span>

      {/* callouts */}
      <div className="absolute right-0 top-[4%] hidden sm:block">
        <div className="flex items-center gap-3">
          <span className="h-12 w-px bg-gradient-to-b from-transparent to-white/50" />
          <span className="font-display text-[34px] font-light leading-none text-fg">13</span>
          <span className="text-[11.5px] leading-tight text-fg-muted">policy<br />rules</span>
        </div>
        <div className="ml-[-3px] mt-6 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-danger shadow-[0_0_12px_3px_rgb(232_57_75/.4)]" />
          <span className="text-[13px] text-fg">Secure system</span>
        </div>
      </div>

      {/* glass stat card */}
      <div className="absolute bottom-[2%] right-0 hidden w-[210px] rounded-[18px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_30px_60px_-30px_rgb(0_0_0/.9)] backdrop-blur-xl sm:block">
        <div className="flex items-center gap-2.5 text-[13px] text-fg">
          <span className="h-4 w-4 rounded-full bg-accent shadow-[0_0_10px_rgb(52_150_255/.6)]" />
          Policy checks
        </div>
        <svg viewBox="0 0 180 54" className="mt-3 h-12 w-full" fill="none">
          <path d="M2 46 C26 46 30 14 54 18 S84 50 104 38 S136 6 152 10 S172 26 178 20" stroke="#3496FF" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="mt-1 text-right">
          <span className="font-display text-[20px] font-semibold text-fg">13/13</span>
          <span className="block text-[10.5px] text-fg-subtle">passed per request</span>
        </div>
      </div>

      {/* NEW badge */}
      <span className="absolute bottom-[8%] left-[30%] -rotate-6 rounded-[50%] border border-accent/60 bg-[#0B111C] px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
        New · agent limits
      </span>
    </div>
  );
}

const HIGHLIGHTS = [
  { n: "01", title: "Agreement-aware", body: "Payments trace back to a version-locked agreement.", tone: "text-accent" },
  { n: "02", title: "Policy-enforced", body: "Deterministic rules, never a language model.", tone: "text-cyan" },
  { n: "03", title: "Human-authorized", body: "No agent can approve its own payment.", tone: "text-volt" }
];

const BUILT_ON = [
  { name: "PayPal", sub: "Payments", icon: CreditCard },
  { name: "Neon", sub: "Postgres", icon: Database },
  { name: "Groq", sub: "AI analysis", icon: Sparkles },
  { name: "Next.js", sub: "Platform", icon: Globe }
];

export function LandingHero() {
  return (
    <section className="relative isolate overflow-hidden pt-[112px]">
      {/* grid */}
      <div className="pointer-events-none absolute inset-0 -z-20 [background-image:linear-gradient(rgb(255_255_255/.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.04)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_60%_55%_at_68%_30%,#000,transparent)]" aria-hidden />

      {/* light beam */}
      <div className="pointer-events-none absolute left-[66%] top-0 -z-10 h-[64%] w-0" aria-hidden>
        <div className="hero-beam absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-accent to-white" />
        <div className="absolute left-1/2 top-0 h-full w-[90px] -translate-x-1/2 bg-gradient-to-b from-transparent via-accent/20 to-accent/40 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 h-[260px] w-[640px] -translate-x-1/2 translate-y-1/2 rounded-[50%] blur-xl" style={{ background: "radial-gradient(closest-side, rgb(52 150 255 / .35), rgb(52 150 255 / .08) 60%, transparent)" }} />
      </div>
      <div className="pointer-events-none absolute -left-40 top-1/3 -z-10 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" aria-hidden />

      {/* giant faded wordmark */}
      <div className="pointer-events-none absolute inset-x-0 top-[64px] -z-10 select-none text-center font-display text-[clamp(110px,19vw,300px)] font-bold leading-none tracking-[-0.06em] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/.06)]" aria-hidden>
        PAYSHARK
      </div>

      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 sm:px-8 lg:min-h-[calc(100svh-260px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* copy */}
        <div className="relative z-10">
          <Reveal>
            <Link href="#platform" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-4 text-[12.5px] text-fg-muted backdrop-blur transition-colors hover:text-fg">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">New</span>
              All-in-one payment control for AI agents
              <ArrowRight size={13} />
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <h1 id="hero-title" className="mt-7 text-[clamp(42px,5.2vw,76px)] font-medium leading-[1.04] tracking-[-0.035em] text-fg">
              Let agents{" "}
              <span className="serif-accent relative inline-block px-1 text-[1.08em] text-accent">
                spend.
              </span>
              <br />
              Keep humans
              <br />
              <span className="text-fg-subtle">in control.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-[480px] text-[17px] leading-[1.65] text-fg-muted">
              PAYSHARK turns verified agreements into enforceable spending rules, so autonomous agents can pay vendors while every dollar stays policy-checked, human-approved and audit-chained.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticLink
                href="/dashboard"
                className="group inline-flex h-[48px] items-center gap-3 rounded-full bg-accent pl-6 pr-1.5 text-[14px] font-medium text-accent-fg shadow-[0_18px_40px_-14px_rgb(59_130_246/.8)] hover:bg-accent-hover"
              >
                Get started
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition-transform duration-300 group-hover:-rotate-45">
                  <ArrowRight size={17} />
                </span>
              </MagneticLink>
              <MagneticLink
                href="/demo"
                className="inline-flex h-[48px] items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-6 text-[14px] font-medium text-fg backdrop-blur hover:border-white/30"
              >
                <Play size={14} fill="currentColor" /> Watch live demo
              </MagneticLink>
            </div>
          </Reveal>
        </div>

        {/* visual */}
        <Reveal delay={160} className="relative">
          <CardStack />
        </Reveal>
      </div>

      {/* highlights + built on */}
      <div className="mx-auto mt-14 max-w-[1320px] px-5 pb-16 sm:px-8">
        <Reveal>
          <div className="card grid overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
              {HIGHLIGHTS.map(h => (
                <div key={h.n}>
                  <div className={cn("font-display text-[42px] font-bold leading-none", h.tone)}>{h.n}</div>
                  <div className="mt-3 text-[15px] font-semibold text-fg">{h.title}</div>
                  <p className="mt-1 text-[13px] leading-[1.55] text-fg-muted">{h.body}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/[0.07] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-fg-subtle">Built on infrastructure you trust</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {BUILT_ON.map(b => (
                  <div key={b.name} className="flex items-center gap-3 rounded-[4px] border border-white/[0.06] bg-black/30 px-4 py-3">
                    <b.icon size={18} className="text-accent" />
                    <div>
                      <div className="text-[11px] text-fg-subtle">{b.sub}</div>
                      <div className="text-[14px] font-semibold text-fg">{b.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Statement — starfield with crosshair lines and glass pills                  */
/* -------------------------------------------------------------------------- */
const STARS: [number, number, number, number][] = [
  [8, 18, 2, 0], [16, 72, 1.5, 1.2], [24, 34, 1, 2.4], [33, 86, 2, .6], [41, 12, 1.5, 1.8], [52, 90, 1, 3],
  [61, 22, 2, .9], [70, 78, 1.5, 2.1], [79, 10, 1, 1.4], [86, 60, 2, 2.8], [93, 28, 1.5, .3], [4, 52, 1, 2.6],
  [47, 64, 1, 1.1], [66, 48, 1.5, 3.3], [12, 92, 1.5, .8], [96, 84, 1, 1.9]
];

export function StatementSection() {
  return (
    <section className="relative isolate overflow-hidden py-24 lg:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse 70% 80% at 50% 110%, rgb(52 150 255 / .16), transparent 70%)" }} aria-hidden />
      {STARS.map(([x, y, s, d]) => (
        <span
          key={`${x}-${y}`}
          className="star absolute -z-10 rotate-45 bg-accent"
          style={{ left: `${x}%`, top: `${y}%`, width: s * 2, height: s * 2, animationDelay: `${d}s` }}
          aria-hidden
        />
      ))}
      {/* crosshair lines */}
      <div className="pointer-events-none absolute inset-x-[12%] top-[30%] -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-[12%] bottom-[30%] -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-[14%] left-[22%] -z-10 w-px bg-gradient-to-b from-transparent via-white/[0.1] to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-[14%] right-[22%] -z-10 w-px bg-gradient-to-b from-transparent via-white/[0.1] to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-[1100px] px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="mx-auto max-w-3xl text-[clamp(30px,4vw,56px)] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
            Secure <span className="text-fg-subtle">agent payments</span>
            <br />
            <span className="text-fg-subtle">made simple for</span> modern teams.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[16px] leading-[1.65] text-fg-muted">
            Built for fast agent transactions and reliable financial control.
          </p>
        </Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-3 lg:mt-0">
          <Link href="#platform" className="glass-pill lg:absolute lg:-bottom-6 lg:left-8">
            <span className="h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_10px_rgb(232_57_75/.6)]" /> Key features
          </Link>
          <Link href="/security" className="glass-pill lg:absolute lg:-top-12 lg:right-8">
            <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_rgb(52_150_255/.9)]" /> Secure system
          </Link>
        </div>
      </div>
    </section>
  );
}
