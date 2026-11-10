import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WelcomeIntro } from "@/components/welcome-intro";
import { PageTransition } from "@/components/page-transition";
export const metadata: Metadata = { title: "PAYSHARK AI — Trust Every Agreement", description: "Agreement-aware payment control for AI agents." };
export const viewport: Viewport = { themeColor: "#0F1726", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WelcomeIntro />
        {children}
        <PageTransition />
      </body>
    </html>
  );
}
