import type { Metadata, Viewport } from "next";
import { Gloock, Gochi_Hand, Lexend } from "next/font/google";
import "./globals.css";

// Lexend was designed to make reading easier; Gloock is for the few large lines.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
const gloock = Gloock({ variable: "--font-gloock", subsets: ["latin"], weight: "400" });
// A hand-drawn face for "show me" explainers, so they read like a quick sketch from a tutor.
const hand = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Ayin",
  description: "A calm step-by-step coach for hands-on job tasks",
};

export const viewport: Viewport = { themeColor: "#f3eee6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} ${gloock.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
