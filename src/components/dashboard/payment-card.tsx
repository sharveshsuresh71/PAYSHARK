"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Signature PAYSHARK card — a decorative, pointer-reactive 3D surface.
 * It never shows real credentials: the number is permanently masked.
 */
export function PaymentCard({
  holder,
  role,
  activePolicies,
  className
}: {
  holder: string;
  role: string;
  activePolicies: number | null;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--crx", `${((0.5 - py) * 14).toFixed(2)}deg`);
    el.style.setProperty("--cry", `${((px - 0.5) * 18).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    el.dataset.active = "true";
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--crx");
    el.style.removeProperty("--cry");
    el.dataset.active = "false";
  }

  return (
    <div className={cn("relative [perspective:1200px]", className)} onPointerMove={onMove} onPointerLeave={onLeave}>
      {/* Idle float wrapper */}
      <div className="motion-safe:animate-[ps-float_7s_ease-in-out_infinite]">
        <div
          ref={ref}
          role="img"
          aria-label={`PAYSHARK policy-controlled virtual card for ${holder || "your workspace"}. Card credentials are never displayed.`}
          className="group/card relative aspect-[1.586/1] w-full rounded-[18px] p-px transition-transform duration-500 ease-out [transform-style:preserve-3d] data-[active=true]:duration-100"
          style={{
            transform: "rotateX(var(--crx, 6deg)) rotateY(var(--cry, -10deg))",
            background: "linear-gradient(135deg,#9BEFFF 0%,#2B6CC4 22%,#0B1630 46%,#35D9FF 72%,#795CFF 100%)",
            boxShadow: "0 40px 70px -30px rgba(0,0,0,.95), 0 20px 40px -24px rgba(22,119,255,.55)"
          }}
        >
          {/* Card body */}
          <div className="relative h-full w-full overflow-hidden rounded-[17px] bg-[radial-gradient(120%_90%_at_100%_0%,#16325F_0%,#0B1630_45%,#060914_100%)] [transform-style:preserve-3d]">
            {/* Contour lines */}
            <svg className="absolute inset-0 h-full w-full opacity-[.35]" viewBox="0 0 400 252" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="ps-card-line" x1="0" x2="1">
                  <stop offset="0" stopColor="#35D9FF" stopOpacity="0" />
                  <stop offset=".5" stopColor="#35D9FF" stopOpacity=".7" />
                  <stop offset="1" stopColor="#795CFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              {Array.from({ length: 7 }, (_, i) => (
                <path
                  key={i}
                  d={`M-20 ${190 - i * 14} C 90 ${150 - i * 18}, 210 ${250 - i * 10}, 420 ${120 - i * 16}`}
                  fill="none"
                  stroke="url(#ps-card-line)"
                  strokeWidth=".8"
                />
              ))}
            </svg>

            {/* Pointer-following glare (controlled reflection) */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-data-[active=true]/card:opacity-100"
              style={{ background: "radial-gradient(260px circle at var(--gx,30%) var(--gy,0%), rgba(255,255,255,.16), transparent 60%)" }}
              aria-hidden
            />
            {/* Static top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.07] to-transparent" aria-hidden />

            <div className="relative flex h-full flex-col justify-between p-[7%] [transform:translateZ(30px)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="bg-gradient-to-r from-white to-[#9BEFFF] bg-clip-text font-display text-[clamp(13px,1.4vw,17px)] font-semibold tracking-[0.22em] text-transparent">
                    PAYSHARK
                  </div>
                  <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.2em] text-[#91A4C2]">Agent spend · Virtual</div>
                </div>
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-warning">
                  Sandbox
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Chip */}
                <span className="relative h-[30px] w-[40px] overflow-hidden rounded-[6px] bg-[linear-gradient(135deg,#E6F7FF,#7FA9D6_40%,#C9E7FF_60%,#5B7FAD)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.35),0_2px_4px_rgba(0,0,0,.4)]" aria-hidden>
                  <span className="absolute inset-y-[6px] left-1/2 w-px bg-[#2A4A78]/60" />
                  <span className="absolute inset-x-[5px] top-1/2 h-px bg-[#2A4A78]/60" />
                  <span className="absolute inset-[9px] rounded-[3px] border border-[#2A4A78]/50" />
                </span>
                {/* Contactless */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9BEFFF" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="opacity-80">
                  <path d="M8.5 8.5a5 5 0 0 1 0 7" /><path d="M12 6a8.5 8.5 0 0 1 0 12" /><path d="M15.5 3.5a12 12 0 0 1 0 17" />
                </svg>
              </div>

              <div className="font-mono text-[clamp(13px,1.5vw,17px)] tracking-[0.18em] text-[#DDE8FA]/90" aria-hidden>
                •••• •••• •••• ••••
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[8.5px] uppercase tracking-[0.18em] text-[#91A4C2]">Card holder</div>
                  <div className="truncate text-[12.5px] font-medium uppercase tracking-[0.08em] text-[#F5F8FF]">
                    {holder || "—"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[8.5px] uppercase tracking-[0.18em] text-[#91A4C2]">{role || "role"}</div>
                  <div className="text-[12.5px] font-medium text-[#35D9FF]">
                    {activePolicies === null ? "—" : `${activePolicies} ${activePolicies === 1 ? "policy" : "policies"}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Ground shadow */}
      <div className="mx-auto mt-4 h-4 w-[78%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(22,119,255,.35),transparent)] blur-md" aria-hidden />
    </div>
  );
}
