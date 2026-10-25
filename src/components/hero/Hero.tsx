import { Magnetic } from "@/components/fx/Magnetic";
import { ButtonLink } from "@/components/ui/Button";
import { hero } from "@/data/hero";
import { playCta } from "@/lib/game-open";
import { CityScene } from "./CityScene";
import { PopIn, ScrollAway, ScrollCue } from "./HeroMotion";
import { HeroTitle } from "./HeroTitle";
import { IncomingMessage } from "./IncomingMessage";
import { SuspectLineup } from "./SuspectLineup";

export function Hero() {
  const cta = playCta();
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <CityScene />

      <ScrollAway className="relative mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-28">
        <IncomingMessage {...hero.message} />

        <HeroTitle />

        <PopIn delay={1.1}>
          <p className="mt-5 max-w-lg text-lg leading-relaxed font-semibold text-cream/90 [text-shadow:0_2px_8px_var(--color-night)]">
            {hero.intro}
          </p>
        </PopIn>

        <ul className="mt-5 flex flex-wrap gap-2">
          {hero.facts.map((fact, i) => (
            <PopIn
              key={fact}
              as="li"
              delay={1.25 + i * 0.08}
              className="rounded-full border-2 border-cream/25 bg-night/60 px-3 py-1 text-sm font-bold text-cream backdrop-blur-sm"
            >
              {fact}
            </PopIn>
          ))}
        </ul>

        <PopIn delay={1.5} className="mt-7 flex flex-wrap gap-4">
          <Magnetic>
            <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
          </Magnetic>
          <Magnetic>
            <ButtonLink href="#mini-case" variant="secondary">
              Try a 30-second case
            </ButtonLink>
          </Magnetic>
        </PopIn>
      </ScrollAway>

      <div className="relative mt-auto px-4 pt-24 md:absolute md:right-0 md:bottom-0 md:w-1/2 md:pt-0 md:pr-10">
        <SuspectLineup bubble={hero.lineupBubble} />
        {/* height of the street strip at the bottom of city-front */}
        <div className="h-[clamp(10px,1.4vw,22px)]" />
      </div>

      <ScrollCue />
    </section>
  );
}
