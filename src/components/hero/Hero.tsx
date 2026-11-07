import { Magnetic } from "@/components/fx/Magnetic";
import { ButtonLink } from "@/components/ui/Button";
import { hero } from "@/data/hero";
import { gameOpen, playCta } from "@/lib/game-open";
import { BlackoutClock } from "./BlackoutClock";
import { CityScene } from "./CityScene";
import { PopIn, ScrollAway } from "./HeroMotion";
import { HeroFilm } from "./HeroFilm";
import { HeroTitle } from "./HeroTitle";
import { SuspectLineup } from "./SuspectLineup";

export function Hero() {
  const cta = playCta();
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <CityScene />

      <div className="relative mx-auto grid w-full max-w-6xl items-start gap-x-10 px-4 pt-24 sm:px-6 sm:pt-28 md:grid-cols-[minmax(0,1fr)_auto]">
        {/* Only the words drift away on scroll; on phones the film is still below them. */}
        <ScrollAway>
          <HeroTitle />

          <PopIn delay={1.0}>
            <p className="mt-5 max-w-xl font-display text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.05] text-mustard [text-shadow:0_0.18rem_0_var(--color-ink)]">
              {hero.hook}
            </p>
          </PopIn>

          <PopIn delay={1.15}>
            <p className="mt-4 max-w-lg text-lg leading-relaxed font-semibold text-cream/90 [text-shadow:0_2px_8px_var(--color-night)]">
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

          <PopIn delay={1.5} className="mt-7 flex flex-wrap items-start gap-4">
            {/* The note sits under the play button itself, so on phones it can't read as the warm-up's. */}
            <div className="flex flex-col items-start gap-2">
              <Magnetic>
                <ButtonLink href={cta.href}>{gameOpen() ? "Play Case 001 free" : cta.label}</ButtonLink>
              </Magnetic>
              {gameOpen() && <p className="pl-2 text-sm font-bold text-cream/75 [text-shadow:0_2px_8px_var(--color-night)]">{hero.ctaNote}</p>}
            </div>
            <Magnetic>
              <ButtonLink href="#mini-case" variant="secondary">
                Try a 30-second case
              </ButtonLink>
            </Magnetic>
          </PopIn>
        </ScrollAway>

        <HeroFilm {...hero.film} className="mx-auto mt-12 w-[min(62vw,16.5rem)] md:mt-2 md:w-[clamp(13rem,21vw,17rem)]" />
      </div>

      {/* On phones the clock sits between the copy and the lineup; wider, on the street left of the lineup. */}
      <BlackoutClock className="relative z-10 mx-auto mt-14 md:absolute md:bottom-10 md:left-[max(1.5rem,calc(50%-34rem))] md:mx-0 md:mt-0" />

      <div className="relative mt-auto px-4 pt-24 md:absolute md:right-0 md:bottom-0 md:w-1/2 md:pt-0 md:pr-10">
        <SuspectLineup bubble={hero.lineupBubble} />
        {/* height of the street strip at the bottom of city-front */}
        <div className="h-[clamp(10px,1.4vw,22px)]" />
      </div>
    </section>
  );
}
