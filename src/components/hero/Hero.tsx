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
    // On short laptop screens the hero runs a little past the fold, so the street clock and the lineup
    // (pinned to its bottom) never land on the buttons or the narrator button.
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden md:min-h-[max(100svh,53rem)]">
      <CityScene />

      <div className="relative mx-auto grid w-full max-w-6xl items-start gap-x-10 px-4 pt-24 sm:px-6 sm:pt-28 md:grid-cols-[minmax(0,1fr)_auto]">
        {/* Only the words drift away on scroll; on phones the film is still below them. */}
        <ScrollAway>
          <HeroTitle />

          <PopIn delay={1.0}>
            <p className="mt-5 max-w-xl font-display text-[clamp(1.5rem,3.2vw,2.5rem)] leading-[1.05] text-mustard [text-shadow:0_0.18rem_0_var(--color-ink)]">
              {hero.hook}
            </p>
          </PopIn>

          <PopIn delay={1.15}>
            <p className="mt-4 max-w-lg text-base leading-relaxed font-semibold text-cream/90 sm:text-lg [text-shadow:0_2px_8px_var(--color-night)]">
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

          {/* Phones: play, its note, then the warm-up, one under another. Wider: the two buttons side by side
              with the note on its own line below, so the note can't push the second button away. */}
          <PopIn delay={1.5} className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <Magnetic>
              <ButtonLink href={cta.href}>{gameOpen() ? "Play Case 001 free" : cta.label}</ButtonLink>
            </Magnetic>
            {gameOpen() && (
              <div className="max-sm:-mt-1 max-sm:mb-1 sm:order-last sm:basis-full">
                {/* Wider screens put the note over the street's clock and lit windows, so it gets a soft backdrop there. */}
                <p className="pl-2 text-sm font-bold text-cream/85 [text-shadow:0_2px_8px_var(--color-night)] sm:inline-block sm:rounded-full sm:bg-night/60 sm:px-3 sm:py-1 sm:backdrop-blur-sm">
                  {hero.ctaNote}
                </p>
              </div>
            )}
            <Magnetic>
              <ButtonLink href="#mini-case" variant="secondary">
                Try a 30-second case
              </ButtonLink>
            </Magnetic>
          </PopIn>
        </ScrollAway>

        {/* On laptops the phone is held to a quarter of the screen's height, so the narrator button under it
            stays clear of the lineup's speech bubbles on short screens. */}
        <HeroFilm {...hero.film} className="mx-auto mt-12 w-[min(62vw,16.5rem)] md:mt-2 md:w-[min(clamp(13rem,21vw,17rem),26svh)]" />
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
