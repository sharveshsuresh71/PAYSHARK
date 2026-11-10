import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { ink: "#0b1220", panel: "#111c2e", cyan: "#42d6d0" }, boxShadow: { glow: "0 0 40px rgba(66,214,208,.12)" } } },
  plugins: []
};
export default config;
