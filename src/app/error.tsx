"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ShieldAlert } from "lucide-react";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-6">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_99_99/.12),transparent)]" aria-hidden />
      <div className="card relative w-full max-w-lg p-8 text-center" data-no-tilt>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border border-danger/30 bg-danger/10 text-danger">
          <ShieldAlert size={24} />
        </span>
        <div className="kicker mt-6 !text-danger">Something went wrong</div>
        <h1 className="mt-2 font-display text-2xl font-semibold text-fg">This view failed to load</h1>
        <p className="mt-3 text-[14px] leading-[1.65] text-fg-muted">
          No payment was executed. You can retry safely: all money-moving actions are idempotent and require explicit human approval.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[11px] text-fg-subtle">Reference: {error.digest}</p>}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary"><RotateCcw size={15} /> Try again</button>
          <Link href="/dashboard" className="btn btn-secondary">Go to command centre</Link>
        </div>
      </div>
    </main>
  );
}
