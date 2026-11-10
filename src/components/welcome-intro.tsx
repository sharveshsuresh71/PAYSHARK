"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { BrandMark } from "./sidebar";

/*
 * Opening intro — quiet, editorial, money-themed:
 *  - backdrop: three engraved monochrome banknotes (champagne ink on black paper)
 *    fanned in 3D, settling slowly into place while a soft light glides across them
 *  - foreground: "Welcome" rises letter by letter out of a mask, a hairline rule
 *    draws beneath it, then "to PAYSHARK" fades in; everything lifts away and the
 *    screen fades out (~3.8s)
 *
 * The overlay is server-rendered and driven purely by CSS (it closes itself even
 * without JavaScript). On hydration it is removed immediately for visitors who
 * already saw it this session or chose "Reduce visual effects"; reduced-motion
 * users never see it (CSS). No inline <script> is rendered, so scripts injected
 * by analytics/tools/extensions can't cause hydration mismatches.
 */

export const INTRO_SEEN_KEY = "payshark:intro-seen";
const WORD = "Welcome".split("");
const INTRO_MS = 3800;
const SERIALS = ["PS 04821950 A", "PS 17730462 B", "PS 30918574 C"];

/** Guilloché band: interlaced sine curves, the fine engraving found on banknotes. */
function guilloche(y0: number, amp: number, count: number) {
  return Array.from({ length: count }, (_, k) => {
    const phase = (k / count) * Math.PI * 2;
    let d = "";
    for (let x = 16; x <= 584; x += 6) {
      const y = y0 + amp * Math.sin(x * 0.035 + phase) * Math.cos(x * 0.011 - phase * 0.5);
      d += `${x === 16 ? "M" : "L"}${x} ${y.toFixed(1)}`;
    }
    return d;
  });
}
const BAND_TOP = guilloche(52, 16, 14);
const BAND_BOTTOM = guilloche(204, 12, 12);
const SERIF = "'Bodoni 72', Didot, 'Playfair Display', Georgia, 'Times New Roman', serif";

/** One engraved banknote; colour comes from `currentColor`. */
function Note({ serial }: { serial: string }) {
  return (
    <svg viewBox="0 0 600 260" className="block h-full w-full" aria-hidden>
      <g fill="none" stroke="currentColor">
        <rect x="8" y="8" width="584" height="244" rx="6" strokeWidth="1.4" />
        <rect x="16" y="16" width="568" height="228" rx="3" strokeWidth=".5" strokeOpacity=".6" />
        {BAND_TOP.map((d, i) => (
          <path key={`t${i}`} d={d} strokeWidth=".45" strokeOpacity=".5" suppressHydrationWarning />
        ))}
        {BAND_BOTTOM.map((d, i) => (
          <path key={`b${i}`} d={d} strokeWidth=".45" strokeOpacity=".45" suppressHydrationWarning />
        ))}
        <rect x="470" y="92" width="86" height="76" rx="3" strokeWidth=".8" />
        <rect x="475" y="97" width="76" height="66" rx="2" strokeWidth=".4" strokeOpacity=".6" />
      </g>
      <rect x="438" y="8" width="6" height="244" fill="currentColor" fillOpacity=".18" />
      <text x="40" y="160" fontSize="96" fontFamily={SERIF} fill="none" stroke="currentColor" strokeWidth="1">100</text>
      <text x="300" y="132" textAnchor="middle" fontSize="22" letterSpacing="10" fontFamily={SERIF} fill="currentColor">PAYSHARK</text>
      <text x="300" y="152" textAnchor="middle" fontSize="8" letterSpacing="6" fill="currentColor" fillOpacity=".7">RESERVE NOTE · SERIES 2025</text>
      <g transform="translate(497 112) scale(1.4)" fill="currentColor" fillOpacity=".85">
        <path d="M3 17.5c3.2-.4 6-1.9 8.3-4.6C13.4 10.4 14.6 7 14.9 3c2.9 3.2 4.6 7.5 4.6 11.6 0 1.1-.1 2-.3 2.9H3Z" />
        <path d="M3 19.5h18v1.5H3z" opacity=".55" />
      </g>
      <text x="40" y="238" fontSize="10" letterSpacing="2" fontFamily="monospace" fill="currentColor" fillOpacity=".8">{serial}</text>
      <text x="560" y="40" textAnchor="end" fontSize="10" letterSpacing="2" fontFamily="monospace" fill="currentColor" fillOpacity=".8">{serial}</text>
      <text x="560" y="238" textAnchor="end" fontSize="20" fontFamily={SERIF} fill="currentColor">100</text>
    </svg>
  );
}

export function WelcomeIntro() {
  const [done, setDone] = useState(false);

  const finish = useCallback(() => {
    try { sessionStorage.setItem(INTRO_SEEN_KEY, "1"); } catch {}
    setDone(true);
  }, []);

  // Layout effect: decide before the browser paints the hydrated page.
  useLayoutEffect(() => {
    if (done) return;
    let skip = false;
    try {
      skip =
        sessionStorage.getItem(INTRO_SEEN_KEY) === "1" ||
        localStorage.getItem("payshark:effects") === "reduced" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {}
    if (skip) {
      setDone(true);
      return;
    }
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const timer = window.setTimeout(finish, INTRO_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = prevOverflow;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [done, finish]);

  if (done) return null;

  return (
    <div className="intro" role="dialog" aria-label="Welcome to PAYSHARK">
      {/* engraved banknotes fanned in 3D */}
      <div className="intro-scene" aria-hidden>
        <div className="intro-notes">
          {SERIALS.map((serial, n) => (
            <div key={serial} className="intro-note" style={{ "--n": n } as React.CSSProperties}>
              <Note serial={serial} />
            </div>
          ))}
        </div>
      </div>
      <div className="intro-veil" aria-hidden />

      <div className="intro-stage">
        <span className="intro-eyebrow" aria-hidden>Private payment infrastructure</span>
        <div className="intro-word" aria-hidden>
          {WORD.map((c, i) => (
            <span key={i} className="intro-mask">
              <span className="intro-char" style={{ "--i": i } as React.CSSProperties}>{c}</span>
            </span>
          ))}
        </div>
        <span className="intro-rule" aria-hidden />
        <div className="intro-sub" aria-hidden>
          <BrandMark className="h-7 w-7" />
          <span>
            to <strong className="font-semibold text-[#F3EBD8]">PAYSHARK</strong>
          </span>
          <span className="intro-dot" />
          <span>Payments · Policies · Proof</span>
        </div>
        <p className="sr-only">Welcome to PAYSHARK</p>
      </div>

      <div className="intro-progress" aria-hidden />
      <button type="button" onClick={finish} className="intro-skip">
        Skip
      </button>
    </div>
  );
}
