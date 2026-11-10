import { ArrowLeftRight, BarChart3, CheckCheck, ChevronDown, Download, LayoutDashboard, Link2, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/sidebar";

/*
 * Decorative command-centre preview for the landing page.
 * All figures are illustrative sample data (labelled as such in the frame).
 */

const NAV = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: ArrowLeftRight, label: "Transactions" },
  { icon: BarChart3, label: "Analytics" },
  { icon: CheckCheck, label: "Approvals" },
  { icon: ShieldCheck, label: "Security" },
  { icon: Link2, label: "Audit trail" }
];

const BARS = [42, 58, 36, 64, 48, 72, 94];
const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

export function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-[1100px]" aria-hidden>
      {/* beam landing on the frame */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-40 w-[3px] -translate-x-1/2 bg-gradient-to-b from-transparent via-volt to-white" />
      <div className="pointer-events-none absolute -top-20 left-1/2 h-[200px] w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(52_150_255/.55),transparent)] blur-2xl" />

      <div className="relative rounded-[16px] border border-white/[0.09] bg-[#0B111C] p-3 shadow-[0_-20px_80px_-30px_rgb(52_150_255/.7),0_60px_120px_-50px_rgb(0_0_0/1)] sm:p-4">
        <div className="grid gap-3 md:grid-cols-[190px_minmax(0,1fr)]">
          {/* sidebar */}
          <div className="hidden rounded-[14px] bg-[#131D2E] p-3 md:block">
            <div className="flex items-center gap-2 px-1 pb-4">
              <BrandMark className="h-7 w-7" />
              <div>
                <div className="text-[12.5px] font-bold tracking-[0.12em] text-white">PAYSHARK</div>
                <div className="text-[9.5px] text-fg-subtle">Payment control</div>
              </div>
            </div>
            <div className="space-y-1">
              {NAV.map(n => (
                <div key={n.label} className={`flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[11.5px] ${n.active ? "bg-accent font-semibold text-accent-fg" : "text-fg-subtle"}`}>
                  <n.icon size={13} /> {n.label}
                </div>
              ))}
            </div>
          </div>

          {/* main */}
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="text-[15px] font-semibold text-white">Command centre</div>
              <div className="flex items-center gap-2 text-[11px] text-fg-muted">
                <span className="hidden rounded-[7px] border border-white/10 px-2 py-1 sm:inline">Sample data</span>
                <span className="flex items-center gap-1 rounded-[7px] border border-white/10 px-2 py-1">Last 30 days <ChevronDown size={11} /></span>
                <span className="flex items-center gap-1 rounded-[7px] border border-white/10 px-2 py-1"><Download size={11} /> Export</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* total captured */}
              <div className="rounded-[14px] bg-[linear-gradient(150deg,#6FB4FF,#1D4F8F)] p-4 text-accent-fg">
                <div className="text-[11px] font-semibold opacity-80">Total captured</div>
                <div className="mt-1 font-display text-[22px] font-bold">$12,480.00 <span className="text-[11px] font-semibold opacity-70">USD</span></div>
                <div className="mt-3 flex gap-2 text-[10.5px] font-semibold">
                  <span className="rounded-[7px] bg-[#0B111C] px-2.5 py-1.5 text-accent">Approve</span>
                  <span className="rounded-[7px] bg-white/25 px-2.5 py-1.5">Review</span>
                </div>
                <div className="mt-3 rounded-[8px] bg-black/15 px-2.5 py-1.5 text-[10.5px] font-semibold">3 agents active</div>
              </div>

              {/* agent requests */}
              <div className="rounded-[14px] border border-white/[0.06] bg-[#111915] p-4">
                <div className="flex items-center justify-between text-[11px] text-fg-subtle">Agent requests <span className="rounded-[12px] bg-accent/15 px-1.5 text-[10px] font-semibold text-accent">+12%</span></div>
                <div className="mt-1 font-display text-[20px] font-bold text-white">$5,540.10</div>
                <div className="mt-3 flex h-[60px] items-end gap-1.5">
                  {BARS.map((h, i) => (
                    <span key={i} className={`flex-1 rounded-t-[3px] ${i === BARS.length - 1 ? "bg-accent shadow-[0_0_14px_rgb(52_150_255/.7)]" : "bg-accent/30"}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[8.5px] text-fg-subtle">{MONTHS.map(m => <span key={m}>{m}</span>)}</div>
              </div>

              {/* blocked */}
              <div className="rounded-[14px] border border-white/[0.06] bg-[#111915] p-4">
                <div className="flex items-center justify-between text-[11px] text-fg-subtle">Blocked by policy <span className="rounded-[12px] bg-danger/15 px-1.5 text-[10px] font-semibold text-danger">-4%</span></div>
                <div className="mt-1 font-display text-[20px] font-bold text-white">$2,450.50</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-fg-subtle">
                  <div>Purpose mismatch<div className="text-[12px] font-semibold text-white">$1,220.00</div></div>
                  <div>Over limit<div className="text-[12px] font-semibold text-white">$1,230.50</div></div>
                </div>
                <div className="mt-3 flex h-6 gap-1">
                  <span className="w-1/2 rounded-[4px] bg-accent" />
                  <span className="w-1/2 rounded-[4px] [background:repeating-linear-gradient(90deg,rgb(255_255_255/.18)_0_2px,transparent_2px_5px)]" />
                </div>
              </div>
            </div>

            {/* cashflow */}
            <div className="rounded-[14px] border border-white/[0.06] bg-[#111915] p-4">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold text-white">Cashflow</span>
                <span className="text-[10.5px] text-fg-subtle">Updated just now</span>
              </div>
              <div className="relative mt-3">
                <svg viewBox="0 0 600 140" preserveAspectRatio="none" className="h-32 w-full">
                  <defs>
                    <linearGradient id="dp-area" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#20C878" stopOpacity=".65" />
                      <stop offset="1" stopColor="#20C878" stopOpacity=".05" />
                    </linearGradient>
                  </defs>
                  {[28, 56, 84, 112].map(y => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="rgb(255 255 255 / .05)" />)}
                  <path d="M0,96 L30,84 L55,100 L85,76 L110,90 L140,70 L165,82 L190,60 L220,74 L250,58 L275,66 L305,52 L330,62 L360,46 L390,56 L420,42 L450,50 L480,36 L510,44 L545,30 L575,38 L600,26 L600,140 L0,140Z" fill="url(#dp-area)" />
                  <path d="M0,96 L30,84 L55,100 L85,76 L110,90 L140,70 L165,82 L190,60 L220,74 L250,58 L275,66 L305,52 L330,62 L360,46 L390,56 L420,42 L450,50 L480,36 L510,44 L545,30 L575,38 L600,26" fill="none" stroke="#5BE3A2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <line x1="190" x2="190" y1="0" y2="140" stroke="rgb(255 255 255 / .25)" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute left-[31.6%] top-[34%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0B111C] bg-volt" />
                <div className="absolute left-[33%] top-0 rounded-[8px] border border-white/10 bg-[#0B111C]/95 px-2.5 py-1.5 text-[10px] text-fg-muted shadow-pop">
                  <div className="font-semibold text-white">Apr 2026</div>
                  <div><span className="text-accent">▍</span>Captured $5,540</div>
                  <div><span className="text-danger">▍</span>Blocked $2,450</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
