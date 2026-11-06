import { Demo } from "@/landing/components/Demo";
import { Device } from "@/landing/components/Device";
import { Faq } from "@/landing/components/Faq";
import { Features } from "@/landing/components/Features";
import { FinalCta } from "@/landing/components/FinalCta";
import { Footer } from "@/landing/components/Footer";
import { Hero } from "@/landing/components/Hero";
import { HowItWorks } from "@/landing/components/HowItWorks";
import { Nav } from "@/landing/components/Nav";
import { OtterColour } from "@/landing/components/OtterColour";
import { Parents } from "@/landing/components/Parents";
import { Raft } from "@/landing/components/Raft";
import { Stages } from "@/landing/components/Stages";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Demo />
        <HowItWorks />
        <Stages />
        <Features />
        <OtterColour />
        <Raft />
        <Device />
        <Parents />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
