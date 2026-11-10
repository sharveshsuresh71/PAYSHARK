"use client";

import { useId, useState } from "react";
import { formatMoney, humanizeCode, categoryMeta, type PaymentAnalytics, type PaymentCategory } from "@/lib/client/payments";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Transaction volume — area chart with reflection + hover readout             */
/* -------------------------------------------------------------------------- */
export function VolumeChart({ data, currency }: { data: PaymentAnalytics["daily"]; currency: string }) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 200, PAD_X = 8, PAD_T = 16, PAD_B = 24;
  const max = Math.max(1, ...data.map(d => d.volume));
  const x = (i: number) => PAD_X + (i * (W - PAD_X * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const base = H - PAD_B;

  const smooth = (vals: number[]) =>
    vals.reduce((acc, v, i) => {
      if (i === 0) return `M${x(0)},${y(v)}`;
      const cx = (x(i - 1) + x(i)) / 2;
      return `${acc} C${cx},${y(vals[i - 1])} ${cx},${y(v)} ${x(i)},${y(v)}`;
    }, "");

  const volumePath = smooth(data.map(d => d.volume));
  const capturedPath = smooth(data.map(d => d.captured));
  const area = `${volumePath} L${x(data.length - 1)},${base} L${x(0)},${base} Z`;
  const total = data.reduce((s, d) => s + d.volume, 0);
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="relative">
      <figcaption className="sr-only">
        Requested payment volume for the last {data.length} days: {formatMoney(total, currency)} total.
      </figcaption>

      {/* Hover readout */}
      <div className="pointer-events-none absolute right-0 top-0 z-[1] text-right text-[11.5px] tabular-nums" aria-hidden>
        {h ? (
          <>
            <div className="text-fg-subtle">{fmtDay(h.date)}</div>
            <div className="font-semibold text-fg">{formatMoney(h.volume, currency)} <span className="font-normal text-fg-subtle">· {h.count} req</span></div>
            <div className="text-success">{formatMoney(h.captured, currency)} captured</div>
          </>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${W} ${H + 40}`} className="h-auto w-full" role="presentation">
        <defs>
          <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#20C878" stopOpacity=".32" />
            <stop offset="1" stopColor="#0E7A4A" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${gid}-stroke`} x1="0" x2="1">
            <stop offset="0" stopColor="#0E7A4A" />
            <stop offset=".6" stopColor="#20C878" />
            <stop offset="1" stopColor="#B6F36A" />
          </linearGradient>
          <linearGradient id={`${gid}-reflect`} x1="0" x2="0" y1="0" y2="1">
            <stop offset=".55" stopColor="#20C878" stopOpacity="0" />
            <stop offset="1" stopColor="#20C878" stopOpacity=".14" />
          </linearGradient>
          <filter id={`${gid}-glow`} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={PAD_X} x2={W - PAD_X} y1={PAD_T + t * (base - PAD_T)} y2={PAD_T + t * (base - PAD_T)} stroke="rgb(145 164 194 / .08)" strokeDasharray={t === 1 ? "0" : "3 5"} />
        ))}

        {/* Reflection below the baseline */}
        <path d={area} fill={`url(#${gid}-reflect)`} transform={`translate(0 ${base * 2}) scale(1 -1)`} />

        <path d={area} fill={`url(#${gid}-fill)`} className="animate-fade-in" />
        <path d={capturedPath} fill="none" stroke="#36D9F5" strokeOpacity=".75" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={volumePath} pathLength={1} fill="none" stroke={`url(#${gid}-stroke)`} strokeWidth="2.25" strokeLinecap="round" filter={`url(#${gid}-glow)`} className="chart-line" />

        {/* Hover columns */}
        {data.map((d, i) => (
          <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={base} fill="transparent" />
            {hover === i && (
              <>
                <line x1={x(i)} x2={x(i)} y1={PAD_T} y2={base} stroke="rgb(32 200 120 / .35)" />
                <circle cx={x(i)} cy={y(d.volume)} r="4.5" fill="#080C0B" stroke="#20C878" strokeWidth="2" />
              </>
            )}
          </g>
        ))}

        {/* X labels */}
        {data.map((d, i) =>
          i % Math.ceil(data.length / 7) === 0 || i === data.length - 1 ? (
            <text key={d.date} x={x(i)} y={H - 4} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fill="rgb(145 164 194 / .7)" fontSize="10.5">
              {fmtDay(d.date)}
            </text>
          ) : null
        )}
      </svg>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment distribution — extruded 3D ring                                     */
/* -------------------------------------------------------------------------- */
export function DistributionRing({ counts }: { counts: Record<PaymentCategory, number> }) {
  const total = counts.captured + counts.pending + counts.blocked;
  const R = 54, C = 2 * Math.PI * R;
  const order: PaymentCategory[] = ["captured", "pending", "blocked"];
  let offset = 0;
  const segments = order.map(k => {
    const len = total ? (counts[k] / total) * C : 0;
    const seg = { k, len, offset };
    offset += len;
    return seg;
  });

  const ring = (depth: number) => (
    <g transform={`translate(0 ${depth})`} opacity={depth ? 0.35 - depth * 0.04 : 1}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="rgb(145 164 194 / .1)" strokeWidth="14" />
      {segments.map(s =>
        s.len > 0 ? (
          <circle
            key={s.k}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={depth ? "#0A2418" : categoryMeta[s.k].color}
            strokeWidth="14"
            strokeDasharray={`${Math.max(0, s.len - (total > 1 ? 2 : 0))} ${C}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 70 70)"
            className="transition-[stroke-dasharray] duration-700"
          />
        ) : null
      )}
    </g>
  );

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-[150px] w-[150px] shrink-0" role="img" aria-label={`Payment distribution: ${counts.captured} captured, ${counts.pending} pending, ${counts.blocked} blocked.`}>
        <svg viewBox="0 0 140 150" className="h-full w-full overflow-visible [transform:perspective(500px)_rotateX(24deg)]">
          {[8, 6, 4, 2].map(d => <g key={d}>{ring(d)}</g>)}
          {ring(0)}
        </svg>
        <div className="absolute inset-0 grid place-items-center pb-2 text-center">
          <div>
            <div className="font-display text-2xl font-semibold tabular-nums text-fg">{total}</div>
            <div className="text-[10.5px] uppercase tracking-[0.12em] text-fg-subtle">requests</div>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {order.map(k => {
          const pct = total ? Math.round((counts[k] / total) * 100) : 0;
          return (
            <li key={k} className="text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-fg-muted">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: categoryMeta[k].color, boxShadow: `0 0 10px ${categoryMeta[k].color}` }} />
                  {categoryMeta[k].label}
                </span>
                <span className="tabular-nums text-fg">{counts[k]} <span className="text-fg-subtle">· {pct}%</span></span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: categoryMeta[k].color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Success analytics — arc gauge + top block reasons                           */
/* -------------------------------------------------------------------------- */
export function SuccessGauge({ rate, captured, blocked, reasons }: { rate: number | null; captured: number; blocked: number; reasons: PaymentAnalytics["topBlockReasons"] }) {
  const gid = useId().replace(/:/g, "");
  const R = 64;
  const arc = Math.PI * R;
  const value = rate ?? 0;
  const maxReason = Math.max(1, ...reasons.map(r => r.count));

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[220px]" role="img" aria-label={rate === null ? "Success rate unavailable: no resolved payments yet." : `Success rate ${Math.round(value * 100)} percent.`}>
        <svg viewBox="0 0 160 92" className="w-full overflow-visible">
          <defs>
            <linearGradient id={`${gid}-g`} x1="0" x2="1">
              <stop offset="0" stopColor="#0E7A4A" />
              <stop offset=".6" stopColor="#20C878" />
              <stop offset="1" stopColor="#36D9F5" />
            </linearGradient>
          </defs>
          <path d={`M16 80 A${R} ${R} 0 0 1 144 80`} fill="none" stroke="rgb(145 164 194 / .1)" strokeWidth="10" strokeLinecap="round" />
          <path
            d={`M16 80 A${R} ${R} 0 0 1 144 80`}
            fill="none"
            stroke={`url(#${gid}-g)`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${arc * value} ${arc}`}
            className="transition-[stroke-dasharray] duration-1000 ease-out"
            style={{ filter: "drop-shadow(0 0 6px rgb(32 200 120 / .45))" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="font-display text-3xl font-semibold tabular-nums text-fg">{rate === null ? "—" : `${Math.round(value * 100)}%`}</div>
          <div className="text-[11px] text-fg-subtle">{captured} captured · {blocked} blocked</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">Top block reasons</div>
        {reasons.length === 0 ? (
          <p className="text-[12px] text-fg-muted">No blocked payments recorded.</p>
        ) : (
          <ul className="space-y-2">
            {reasons.map(r => (
              <li key={r.code} className="text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="truncate text-fg-muted" title={r.code}>{humanizeCode(r.code)}</span>
                  <span className="tabular-nums text-fg">{r.count}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className={cn("h-full rounded-full bg-gradient-to-r from-danger/70 to-danger")} style={{ width: `${(r.count / maxReason) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
