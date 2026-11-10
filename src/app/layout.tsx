import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "PAYSHARK AI — Trust Every Agreement", description: "Agreement-aware payment control for AI agents." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
