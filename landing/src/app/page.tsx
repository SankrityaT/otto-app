import { Demo } from "@/components/Demo";
import { Device } from "@/components/Device";
import { Faq } from "@/components/Faq";
import { Features } from "@/components/Features";
import { FinalCta } from "@/components/FinalCta";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Nav } from "@/components/Nav";
import { OtterColour } from "@/components/OtterColour";
import { Parents } from "@/components/Parents";
import { Raft } from "@/components/Raft";
import { Stages } from "@/components/Stages";

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
