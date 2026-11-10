"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
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
const LINKS = [
  ["#platform", "Platform"],
  ["#infrastructure", "Infrastructure"],
  ["#intelligence", "Intelligence"],
  ["#security", "Security"],
  ["#developers", "Developers"]
] as const;

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
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex h-14 max-w-[1320px] items-center justify-between rounded-[16px] border px-3 transition-all duration-500 sm:px-4",
          scrolled ? "glass border-white/[0.08] shadow-[0_20px_40px_-24px_rgb(0_0_0/.9)]" : "border-transparent"
        )}
      >
        <Link href="/" className="brand-3d flex items-center gap-2.5 rounded-[10px]" aria-label="PAYSHARK home">
          <BrandMark />
          <span className="font-display text-[15px] font-semibold tracking-[0.14em] text-fg">PAYSHARK</span>
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="rounded-[10px] px-3 py-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg">{label}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden rounded-[10px] px-3 py-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg sm:block">Sign in</Link>
          <Link href="/dashboard" className="btn btn-primary hidden h-9 py-0 text-[13px] sm:inline-flex">Get started <ArrowUpRight size={15} /></Link>
          <button type="button" className="icon-btn lg:hidden" aria-expanded={open} aria-controls="landing-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(o => !o)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="landing-menu" className="popover mx-auto mt-2 max-w-[1320px] animate-pop-in p-2 lg:hidden">
          <ul>
            {LINKS.map(([href, label]) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)} className="menu-item py-3 text-[15px]">{label}</a>
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn btn-primary mt-2 w-full">Get started <ArrowUpRight size={15} /></Link>
        </div>
      )}
    </header>
  );
}
