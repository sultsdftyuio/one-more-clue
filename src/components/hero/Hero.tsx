import { ButtonLink } from "@/components/ui/Button";
import { hero } from "@/data/hero";
import { CityScene } from "./CityScene";
import { IncomingMessage } from "./IncomingMessage";
import { SuspectLineup } from "./SuspectLineup";

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <CityScene />

      <div className="relative mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-28">
        <IncomingMessage {...hero.message} />

        <h1 className="mt-6 font-display text-[clamp(3.5rem,11vw,7.5rem)] leading-[0.88] text-cream text-pop">
          One More <span className="text-mustard">Clue</span>
        </h1>

        <p className="mt-5 max-w-lg text-lg leading-relaxed font-semibold text-cream/90 [text-shadow:0_2px_8px_var(--color-night)]">
          {hero.intro}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {hero.facts.map((fact) => (
            <li
              key={fact}
              className="rounded-full border-2 border-cream/25 bg-night/60 px-3 py-1 text-sm font-bold text-cream backdrop-blur-sm"
            >
              {fact}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-wrap gap-4">
          <ButtonLink href="/play">Play now</ButtonLink>
          <ButtonLink href="#mini-case" variant="secondary">
            Try a 30-second case
          </ButtonLink>
        </div>
      </div>

      <div className="relative mt-auto px-4 pt-24 md:absolute md:right-0 md:bottom-0 md:w-1/2 md:pt-0 md:pr-10">
        <SuspectLineup bubble={hero.lineupBubble} />
        {/* height of the street strip at the bottom of city-front */}
        <div className="h-[clamp(10px,1.4vw,22px)]" />
      </div>
    </section>
  );
}
