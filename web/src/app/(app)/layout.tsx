import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Gochi_Hand, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible is built to be easy to read; Instrument Serif is for the few large lines.
const sans = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });
// A hand-drawn face for "show me" explainers, so they read like a quick sketch from a tutor.
const hand = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400" });

const THEME_SCRIPT = `try{var t=localStorage.getItem("ayin.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: "Ayin",
  description: "A calm step-by-step coach for hands-on job tasks",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3EEE6" },
    { media: "(prefers-color-scheme: dark)", color: "#1D1B18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${serif.variable} ${hand.variable}`}
      style={{ ["--sans" as string]: "var(--font-atkinson)", ["--serif" as string]: "var(--font-instrument)" }}
    >
      <head>
        {/* Apply Day or Night before the page draws, so it never flashes the wrong colours. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
