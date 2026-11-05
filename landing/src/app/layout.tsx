import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Gochi_Hand, Instrument_Serif } from "next/font/google";
import "./globals.css";

// The same faces as the app: Atkinson Hyperlegible is built to be easy to read,
// Instrument Serif is for the big lines, and Gochi Hand is the otter's handwriting.
const sans = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });
const hand = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Ayin: big tasks, one small step at a time",
  description:
    "Ayin is a friendly otter coach that helps neurodivergent teens and young adults learn real job skills, one step at a time, until they can do them on their own.",
  openGraph: {
    title: "Ayin: big tasks, one small step at a time",
    description: "A friendly otter coach for neurodivergent teens and young adults. Help that fades as you grow.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3EEE6" },
    { media: "(prefers-color-scheme: dark)", color: "#1D1B18" },
  ],
};

// Runs before the page paints, so it never flashes the wrong colours: a saved choice wins,
// otherwise follow the device. Light is Ayin's home look and the fallback without JavaScript.
const THEME_SCRIPT = `try{var t=localStorage.getItem("ayin-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
