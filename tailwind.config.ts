import type { Config } from "tailwindcss";

/**
 * PAYSHARK design tokens.
 * Raw values live as CSS variables in src/app/globals.css (:root) so they can be
 * shared by Tailwind utilities and the component classes (.card, .btn, .field…).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // legacy aliases (kept so existing markup keeps compiling)
        ink: "#0b1220",
        panel: "#111c2e",
        cyan: "#42d6d0",
        // design system
        canvas: "rgb(var(--ps-canvas) / <alpha-value>)",
        sidebar: "rgb(var(--ps-sidebar) / <alpha-value>)",
        surface: "rgb(var(--ps-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--ps-surface-2) / <alpha-value>)",
        line: "rgb(var(--ps-line) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--ps-accent) / <alpha-value>)",
          hover: "rgb(var(--ps-accent-hover) / <alpha-value>)",
          fg: "rgb(var(--ps-accent-fg) / <alpha-value>)"
        },
        fg: {
          DEFAULT: "rgb(var(--ps-fg) / <alpha-value>)",
          muted: "rgb(var(--ps-fg-muted) / <alpha-value>)",
          subtle: "rgb(var(--ps-fg-subtle) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ["var(--ps-font-sans)"],
        display: ["var(--ps-font-display)"],
        mono: ["var(--ps-font-mono)"]
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        lg: "12px",
        xl: "14px"
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(54 191 250 / .10), 0 8px 24px -12px rgb(0 0 0 / .6)",
        card: "0 1px 0 0 rgb(255 255 255 / .03) inset, 0 1px 2px 0 rgb(0 0 0 / .4)",
        pop: "0 0 0 1px rgb(148 163 184 / .10), 0 16px 40px -12px rgb(0 0 0 / .7)"
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.16,1,.3,1)"
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
        "page-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } }
      },
      animation: {
        "fade-in": "fade-in .18s ease-out",
        "pop-in": "pop-in .16s cubic-bezier(.16,1,.3,1)",
        "slide-in-left": "slide-in-left .26s cubic-bezier(.16,1,.3,1)",
        "page-in": "page-in .35s cubic-bezier(.16,1,.3,1)"
      }
    }
  },
  plugins: []
};
export default config;
