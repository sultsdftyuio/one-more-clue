import { Hero } from "@/components/hero/Hero";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MiniCase } from "@/components/mini-case/MiniCase";
import { CaseTeaser } from "@/components/sections/CaseTeaser";
import { FinalCta } from "@/components/sections/FinalCta";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Scallop } from "@/components/ui/Scallop";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <MiniCase />
        <Scallop top="var(--color-ink)" bottom="var(--color-cream)" />
        <HowItWorks />
        <Scallop top="var(--color-cream)" bottom="var(--color-night)" />
        <CaseTeaser />
        <Scallop top="var(--color-night)" bottom="var(--color-mustard)" />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
