import { cn } from "@/lib/cn";

/**
 * Standard page header for every operations page.
 * Kicker → large display title → description, with an optional actions slot.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  className
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("relative flex flex-wrap items-end justify-between gap-x-5 gap-y-3 pb-1", className)}>
      <div className="min-w-0 max-w-3xl">
        {kicker && (
          <div className="kicker flex items-center gap-2">
            {kicker}
          </div>
        )}
        <h1 className="mt-3 text-[clamp(26px,2.8vw,36px)] font-medium leading-[1.12] tracking-[-0.03em] text-fg">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-[14px] leading-[1.65] text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Compact stat used in page header strips. */
export function HeaderStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-[110px] border-l border-white/[0.08] pl-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-subtle">{label}</div>
      <div className={cn("mt-0.5 text-xl font-medium tabular-nums text-fg", tone)}>{value}</div>
    </div>
  );
}

/** Empty state used across pages. */
export function EmptyState({
  icon,
  title,
  description,
  action
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center" data-no-tilt>
      <div className="relative">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-accent/10 blur-2xl" aria-hidden />
        <span className="grid h-14 w-14 place-items-center rounded-[16px] border border-white/[0.09] bg-[linear-gradient(160deg,rgb(30_46_72/.6),rgb(19_29_46/.9))] text-accent shadow-[inset_0_1px_0_rgb(255_255_255/.08),0_16px_32px_-16px_rgb(0_0_0/.9)] [transform:perspective(300px)_rotateX(12deg)]">
          {icon}
        </span>
      </div>
      <h2 className="mt-5 text-[15px] font-semibold text-fg">{title}</h2>
      {description && <p className="mt-1.5 max-w-md text-[13px] leading-[1.6] text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
