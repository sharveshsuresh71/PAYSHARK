"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, Link2, Fingerprint } from "lucide-react";

/**
 * Hero sculpture: an extruded metallic PAYSHARK coin built from stacked CSS 3D
 * slices, with orbiting rings and floating verification chips.
 * Pointer and scroll drive a damped parallax; reduced-motion users get a still pose.
 */
const SLICES = 16;

export function HeroSculpture({ chips = true }: { chips?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, sy = 0, raf = 0, visible = true;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => { sy = Math.min(window.scrollY, 1000); };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", cx.toFixed(4));
      el.style.setProperty("--py", cy.toFixed(4));
      el.style.setProperty("--sy", sy.toFixed(0));
      if (visible) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    });
    io.observe(el);
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="sculpture-stage relative mx-auto aspect-square w-[min(480px,86vw)]" aria-hidden>
      {/* Volumetric light + reflective floor */}
      <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(52_150_255/.32),rgb(30_46_72/.18)_55%,transparent)] blur-2xl" />
      <div className="absolute -bottom-[6%] left-1/2 h-[14%] w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(52_150_255/.45),transparent)] blur-xl" />

      <div className="sculpture absolute inset-[12%]">
        <div className="sculpture-sway absolute inset-0">
          {/* Orbit rings */}
          {[
            { inset: "-22%", tilt: "rotateX(74deg) rotateY(8deg)", dur: "16s", color: "rgb(52 150 255 / .45)", dot: "#60D6FF" },
            { inset: "-34%", tilt: "rotateX(68deg) rotateY(-22deg)", dur: "26s", color: "rgb(54 217 245 / .28)", dot: "#36D9F5" }
          ].map((o, i) => (
            <div key={i} className="preserve-3d absolute" style={{ inset: o.inset, transform: o.tilt }}>
              <div
                className="absolute inset-0 rounded-full border motion-safe:animate-[ps-orb-spin_var(--d)_linear_infinite]"
                style={{ borderColor: o.color, ["--d" as string]: o.dur, boxShadow: `0 0 30px -10px ${o.color}` } as React.CSSProperties}
              >
                <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: o.dot, boxShadow: `0 0 14px ${o.dot}` }} />
              </div>
            </div>
          ))}

          {/* Extruded edge slices */}
          {Array.from({ length: SLICES }, (_, i) => {
            const z = (i - (SLICES - 1) / 2) * 2.2;
            return (
              <div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  transform: `translateZ(${z}px)`,
                  background: "linear-gradient(90deg,#0B111C 0%,#2A6FC0 30%,#DCEBFF 50%,#2A6FC0 70%,#0B111C 100%)",
                  filter: `brightness(${0.55 + (i / SLICES) * 0.35})`
                }}
              />
            );
          })}

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-full"
            style={{ transform: `translateZ(${-SLICES * 1.1 - 1}px) rotateY(180deg)`, background: "radial-gradient(circle at 60% 35%,#4F8FD8,#1E2E48 55%,#0B111C)" }}
          />

          {/* Front face */}
          <div className="absolute inset-0 overflow-hidden rounded-full" style={{ transform: `translateZ(${SLICES * 1.1 + 1}px)` }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 34% 28%,#F4F9FF 0%,#A9D2FF 10%,#3496FF 30%,#1D4F8F 62%,#0B111C 100%)" }} />
            {/* chrome sheen */}
            <div className="absolute inset-0 opacity-50 mix-blend-overlay" style={{ background: "conic-gradient(from 210deg,transparent 0deg,#fff 40deg,transparent 90deg,transparent 200deg,#fff 240deg,transparent 290deg)" }} />
            {/* recessed inner ring */}
            <div className="absolute inset-[9%] rounded-full shadow-[inset_0_6px_14px_rgb(0_0_0/.55),inset_0_-2px_6px_rgb(255_255_255/.25)]" />
            <div className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_40%_30%,#6FB4FF,#1E2E48_70%)] shadow-[inset_0_2px_0_rgb(255_255_255/.35),inset_0_-10px_20px_rgb(0_0_0/.5),0_10px_24px_rgb(0_0_0/.45)]" />

            {/* engraved text + emblem */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
              <defs>
                <path id="coin-text" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
                <linearGradient id="fin-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F4F9FF" />
                  <stop offset=".55" stopColor="#60D6FF" />
                  <stop offset="1" stopColor="#3496FF" />
                </linearGradient>
              </defs>
              <text fontSize="8.2" letterSpacing="3.2" fill="rgb(3 25 14 / .7)" fontWeight="700" fontFamily="var(--ps-font-display)">
                <textPath href="#coin-text">PAYSHARK · AGREEMENT-AWARE · POLICY-ENFORCED · HUMAN-AUTHORIZED ·</textPath>
              </text>
              <g transform="translate(62 58) scale(3.1)" filter="drop-shadow(0 1.2px 0.6px rgb(0 0 0 / .55))">
                <path d="M3 17.5c3.2-.4 6-1.9 8.3-4.6C13.4 10.4 14.6 7 14.9 3c2.9 3.2 4.6 7.5 4.6 11.6 0 1.1-.1 2-.3 2.9H3Z" fill="url(#fin-g)" />
                <path d="M3 19.5h18v1.5H3z" fill="#60D6FF" opacity=".7" />
              </g>
            </svg>
            <div className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1.5px_rgb(255_255_255/.35),inset_0_-18px_40px_rgb(0_0_0/.45)]" />
          </div>

          {/* Floating verification chips (depth layers) */}
          {chips && [
            { icon: ShieldCheck, text: "Policy · 13/13 checks", pos: "left-[-26%] top-[8%]", z: 110, tone: "text-accent" },
            { icon: Fingerprint, text: "Human approval bound", pos: "right-[-30%] top-[42%]", z: 150, tone: "text-volt" },
            { icon: Link2, text: "SHA-256 chain intact", pos: "left-[-12%] bottom-[2%]", z: 90, tone: "text-cyan" }
          ].map(c => (
            <div
              key={c.text}
              className={`popover absolute flex items-center gap-2 whitespace-nowrap px-3 py-2 text-[11.5px] font-medium text-fg ${c.pos}`}
              style={{ transform: `translateZ(${c.z}px)` }}
            >
              <c.icon size={14} className={c.tone} /> {c.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
