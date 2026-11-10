"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";
interface ToastItem { id: number; title: string; description?: string; tone: ToastTone; }

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const EMPTY: ToastItem[] = [];

export function dismissToast(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

/** Show a premium notification toast from anywhere in the client. */
export function toast(title: string, opts: { description?: string; tone?: ToastTone; duration?: number } = {}) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, title, description: opts.description, tone: opts.tone ?? "info" }];
  emit();
  setTimeout(() => dismissToast(id), opts.duration ?? 4200);
  return id;
}

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "text-success" },
  error: { icon: AlertTriangle, className: "text-danger" },
  info: { icon: Info, className: "text-accent" }
};

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed left-1/2 top-[72px] z-[70] flex w-[min(380px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0"
    >
      {items.map(t => {
        const { icon: Icon, className } = toneStyles[t.tone];
        return (
          <div key={t.id} role="status" className="toast popover pointer-events-auto flex items-start gap-3 p-3.5 pr-2.5">
            <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04]", className)}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-fg">{t.title}</p>
              {t.description && <p className="mt-0.5 break-words text-[12px] leading-[1.5] text-fg-muted">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismissToast(t.id)} className="icon-btn h-7 w-7" aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
