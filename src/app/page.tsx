import { Hero } from "@/components/hero/Hero";
import { HomeEffects } from "@/components/home/HomeEffects";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MiniCase } from "@/components/mini-case/MiniCase";
import { CaseShelf } from "@/components/sections/CaseShelf";
import { CaseTeaser } from "@/components/sections/CaseTeaser";
import { FinalCta } from "@/components/sections/FinalCta";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Roles } from "@/components/sections/Roles";
import { Scallop } from "@/components/ui/Scallop";
import { gameOpen, playCta } from "@/lib/game-open";

export default function Home() {
  // The warm-up's win screen sends you straight into a room, like every other play button.
  const play = { href: playCta().href, label: gameOpen() ? "Play Case 001 free" : playCta().label };
  return (
    <HomeEffects>
      <SiteHeader />
      <main data-home>
        <Hero />
        <MiniCase play={play} />
        <Scallop top="var(--color-ink)" bottom="var(--color-dusk)" />
        <Roles />
        <Scallop top="var(--color-dusk)" bottom="var(--color-cream)" />
        <HowItWorks />
        <Scallop top="var(--color-cream)" bottom="var(--color-night)" />
        <CaseTeaser />
        <CaseShelf />
        <Scallop top="var(--color-night)" bottom="var(--color-mustard)" />
        <FinalCta />
      </main>
      <SiteFooter />
    </HomeEffects>
  );
}
