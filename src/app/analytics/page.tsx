"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, HeaderStat, EmptyState } from "@/components/page-header";
import { VolumeChart, DistributionRing, SuccessGauge } from "@/components/dashboard/charts";
import { analyze, amountOf, categorize, formatMoney, type PaymentRequest } from "@/lib/client/payments";
import { cn } from "@/lib/cn";

/** Extruded 3D bar — front face + top + side planes built with CSS transforms. */
function Bar3D({ pct, label, value, tone }: { pct: number; label: string; value: number; tone: string }) {
  const h = Math.max(4, pct);
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div className="relative flex h-[170px] w-full max-w-[64px] items-end [perspective:600px]">
        <div className="chart-bar relative w-full" style={{ height: `${h}%` }} role="img" aria-label={`${label}: ${value} requests`}>
          <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(-8deg)_rotateY(-18deg)]">
            <div className="absolute inset-0 rounded-t-[4px]" style={{ background: `linear-gradient(180deg, ${tone}, ${tone}55)`, boxShadow: `0 0 24px -6px ${tone}` }} />
            <div className="absolute inset-y-0 right-0 w-[12px] origin-right [transform:rotateY(-90deg)]" style={{ background: `${tone}66` }} />
            <div className="absolute inset-x-0 top-0 h-[12px] origin-top [transform:rotateX(-90deg)]" style={{ background: tone, filter: "brightness(1.25)" }} />
          </div>
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-[15px] font-semibold tabular-nums text-fg">{value}</div>
        <div className="text-[11px] text-fg-subtle">{label}</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [rows, setRows] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<14 | 30>(30);

  useEffect(() => {
    fetch("/api/payment-requests")
      .then(r => r.json())
      .then(j => setRows(j.ok ? j.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const a = useMemo(() => analyze(rows, range), [rows, range]);

  const riskBuckets = useMemo(() => {
    const b = [
      { label: "0–25", min: 0, max: 25, tone: "#20C878", n: 0 },
      { label: "26–50", min: 26, max: 50, tone: "#B6F36A", n: 0 },
      { label: "51–75", min: 51, max: 75, tone: "#F5BE50", n: 0 },
      { label: "76–100", min: 76, max: 100, tone: "#FF6363", n: 0 }
    ];
    rows.forEach(r => {
      const s = r.risk_score;
      if (typeof s !== "number") return;
      const bucket = b.find(x => s >= x.min && s <= x.max);
      if (bucket) bucket.n++;
    });
    return b;
  }, [rows]);
  const maxRisk = Math.max(1, ...riskBuckets.map(b => b.n));

  const merchants = useMemo(() => {
    const m = new Map<string, { name: string; volume: number; count: number; captured: number }>();
    rows.filter(r => r.currency === a.currency).forEach(r => {
      const e = m.get(r.merchant) ?? { name: r.merchant, volume: 0, count: 0, captured: 0 };
      e.volume += amountOf(r);
      e.count++;
      if (categorize(r) === "captured") e.captured += amountOf(r);
      m.set(r.merchant, e);
    });
    return [...m.values()].sort((x, y) => y.volume - x.volume).slice(0, 6);
  }, [rows, a.currency]);
  const maxVol = Math.max(1, ...merchants.map(m => m.volume));

  return (
    <AppShell>
      <PageHeader
        kicker="Financial intelligence"
        title="Analytics"
        description="Volume, outcomes and risk across every payment request, computed live from your records."
        actions={
          <div role="group" aria-label="Date range" className="flex rounded-[10px] border border-white/[0.07] bg-canvas/50 p-0.5">
            {([14, 30] as const).map(d => (
              <button
                key={d}
                type="button"
                aria-pressed={range === d}
                onClick={() => setRange(d)}
                className={cn("rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-all", range === d ? "bg-surface text-fg shadow-[inset_0_1px_0_rgb(255_255_255/.06)]" : "text-fg-muted hover:text-fg")}
              >
                {d} days
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-6 flex flex-wrap gap-2.5">
        <HeaderStat label="Requested" value={loading ? "—" : formatMoney(a.requestedVolume, a.currency)} />
        <HeaderStat label="Captured" value={loading ? "—" : formatMoney(a.capturedVolume, a.currency)} tone="text-accent" />
        <HeaderStat label="Success rate" value={loading || a.successRate === null ? "—" : `${Math.round(a.successRate * 100)}%`} />
        <HeaderStat label="Avg. risk" value={loading || a.averageRisk === null ? "—" : Math.round(a.averageRisk)} />
      </div>

      {!loading && rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<BarChart3 size={22} />} title="No analytics yet" description="Analytics appear once agents submit payment requests. Run a scenario in the Attack Simulator to generate some." />
        </div>
      ) : (
        <>
          <section className="card mt-6 p-5" aria-labelledby="an-vol">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="an-vol" className="text-[15px] font-semibold text-fg">Transaction volume</h2>
                <p className="text-[12px] text-fg-subtle">Last {range} days · {a.currency}{a.otherCurrencies.length > 0 && ` · excludes ${a.otherCurrencies.join(", ")}`}</p>
              </div>
              <div className="flex items-center gap-3 text-[11.5px] text-fg-muted">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-accent" /> Requested</span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-cyan" /> Captured</span>
              </div>
            </div>
            {loading ? <div className="skeleton h-[240px] rounded-[12px]" /> : <VolumeChart data={a.daily} currency={a.currency} />}
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <section className="card p-5" aria-labelledby="an-dist">
              <h2 id="an-dist" className="text-[15px] font-semibold text-fg">Outcome distribution</h2>
              <p className="mb-5 text-[12px] text-fg-subtle">All currencies</p>
              {loading ? <div className="skeleton h-[150px] rounded-[12px]" /> : <DistributionRing counts={a.counts} />}
            </section>

            <section className="card p-5" aria-labelledby="an-risk">
              <h2 id="an-risk" className="text-[15px] font-semibold text-fg">Risk distribution</h2>
              <p className="mb-4 text-[12px] text-fg-subtle">Requests by risk-engine score</p>
              {loading ? <div className="skeleton h-[210px] rounded-[12px]" /> : (
                <div className="flex items-end gap-3 border-b border-white/[0.06] pb-1">
                  {riskBuckets.map(b => <Bar3D key={b.label} pct={(b.n / maxRisk) * 100} label={b.label} value={b.n} tone={b.tone} />)}
                </div>
              )}
            </section>

            <section className="card p-5" aria-labelledby="an-succ">
              <h2 id="an-succ" className="text-[15px] font-semibold text-fg">Payment success</h2>
              <p className="mb-4 text-[12px] text-fg-subtle">Captured vs. blocked</p>
              {loading ? <div className="skeleton h-[220px] rounded-[12px]" /> : (
                <SuccessGauge rate={a.successRate} captured={a.counts.captured} blocked={a.counts.blocked} reasons={a.topBlockReasons} />
              )}
            </section>
          </div>

          <section className="card mt-4 p-5" aria-labelledby="an-merch">
            <h2 id="an-merch" className="text-[15px] font-semibold text-fg">Top merchants by requested volume</h2>
            <p className="mb-5 text-[12px] text-fg-subtle">{a.currency} · captured portion highlighted</p>
            {loading ? <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-8" />)}</div> : (
              <ul className="space-y-3.5">
                {merchants.map(m => (
                  <li key={m.name}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                      <span className="min-w-0 truncate font-medium text-fg">{m.name}</span>
                      <span className="tabular-nums text-fg-muted">
                        {formatMoney(m.volume, a.currency)} <span className="text-fg-subtle">· {m.count} req</span>
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-forest" style={{ width: `${(m.volume / maxVol) * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent to-volt shadow-[0_0_12px_rgb(32_200_120/.5)] transition-[width] duration-1000" style={{ width: `${(m.captured / maxVol) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
