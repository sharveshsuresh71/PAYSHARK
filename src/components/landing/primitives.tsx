"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { BrandMark } from "@/components/sidebar";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Reveal — fades/rises content in when it scrolls into view                   */
/* -------------------------------------------------------------------------- */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div"
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-shown={shown}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/* Magnetic link — gently follows the pointer (fine pointers only)             */
/* -------------------------------------------------------------------------- */
export function MagneticLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  function onMove(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
    const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
  function onLeave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <Link ref={ref} href={href} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("transition-transform duration-300 ease-out will-change-transform", className)}>
      {children}
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Landing navigation                                                           */
/* -------------------------------------------------------------------------- */
const GROUPS: { label: string; items: [href: string, title: string, note: string][] }[] = [
  {
    label: "Platform",
    items: [
      ["#platform", "Overview", "One control layer for agent payments"],
      ["#infrastructure", "Infrastructure", "Four authorization gates"],
      ["#intelligence", "Intelligence", "AI-assisted agreement reading"]
    ]
  },
  {
    label: "Product",
    items: [
      ["/dashboard", "Command centre", "Live overview of every payment"],
      ["/transactions", "Transactions", "Captured, pending and blocked"],
      ["/analytics", "Analytics", "Volume, success and risk"]
    ]
  },
  {
    label: "Security",
    items: [
      ["#security", "Architecture", "Five independent defence layers"],
      ["/security", "Security centre", "Sessions, lockdown and alerts"],
      ["/demo", "Attack simulator", "Try to break the guardrails"]
    ]
  },
  {
    label: "Developers",
    items: [
      ["/developers", "API reference", "One governed request"],
      ["/agents", "AI agents", "Register scoped agent keys"]
    ]
  }
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "glass fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] transition-all duration-500",
        scrolled && "shadow-[0_20px_40px_-24px_rgb(10_20_40/.7)]"
      )}
    >
      <nav aria-label="Main" className="mx-auto grid h-[72px] max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
        <Link href="/" className="brand-3d flex items-center gap-2.5 justify-self-start rounded-[4px]" aria-label="PAYSHARK home">
          <BrandMark className="h-9 w-9" />
          <span className="font-display text-[15px] font-bold tracking-[0.16em] text-white">PAYSHARK</span>
        </Link>

        <ul className="hidden items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgb(255_255_255/.06)] backdrop-blur-md lg:flex">
          {GROUPS.map(g => (
            <li key={g.label} className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13.5px] font-medium text-white/80 transition-colors hover:bg-accent hover:text-accent-fg group-focus-within:bg-accent group-focus-within:text-accent-fg"
              >
                {g.label}
                <ChevronDown size={14} className="transition-transform duration-300 group-focus-within:rotate-180 group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-1/2 top-full -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <ul className="popover w-[260px] p-1.5">
                  {g.items.map(([href, title, note]) => (
                    <li key={href}>
                      <Link href={href} className="block rounded-[4px] px-3 py-2.5 transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06]">
                        <span className="block text-[13.5px] font-semibold text-fg">{title}</span>
                        <span className="block text-[12px] text-fg-subtle">{note}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 justify-self-end sm:gap-3">
          <Link href="/transactions" aria-label="Search transactions" className="hidden h-9 w-9 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:grid">
            <Search size={18} />
          </Link>
          <Link href="/dashboard" className="hidden text-[13.5px] font-medium text-white/80 transition-colors hover:text-white sm:block">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="hidden h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-accent-fg shadow-[0_8px_24px_-8px_rgb(52_150_255/.8)] transition-colors hover:bg-accent-hover sm:inline-flex"
          >
            Get started <ArrowUpRight size={15} />
          </Link>
          <button type="button" className="icon-btn text-white lg:hidden" aria-expanded={open} aria-controls="landing-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(o => !o)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="landing-menu" className="popover mx-3 mb-3 animate-pop-in p-2 sm:mx-5 lg:hidden">
          {GROUPS.map(g => (
            <div key={g.label} className="py-1">
              <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{g.label}</div>
              <ul>
                {g.items.map(([href, title]) => (
                  <li key={href}>
                    <Link href={href} onClick={() => setOpen(false)} className="menu-item py-2.5 text-[15px]">{title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href="/dashboard" className="btn btn-primary mt-2 w-full">Get started <ArrowUpRight size={15} /></Link>
        </div>
      )}
    </header>
  );
}
