import Image from "next/image";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/TiltCard";
import { ButtonLink } from "@/components/ui/Button";
import { case001 } from "@/data/case-001";
import { posterArt, propArt } from "@/lib/art";
import { castArt } from "@/lib/cast-art";
import { cx } from "@/lib/cx";
import { gameOpen, playCta } from "@/lib/game-open";
import { FlyIn, Redacted } from "./CaseFileMotion";

/** Height-chart lines behind each mugshot. */
const heightChart = "repeating-linear-gradient(180deg, rgba(27,31,59,0.14) 0 2px, transparent 2px 18px)";

/**
 * Case 001, sold like a film: its poster with a FREE stamp, the hook from the
 * game, the four suspects by job with their names classified, and one button.
 */
export function CaseTeaser() {
  const open = gameOpen();
  return (
    <section
      className="relative overflow-hidden bg-night px-4 py-16 sm:px-6 sm:py-24"
      // A spotlight from above, painted on the section itself.
      style={{ backgroundImage: "radial-gradient(ellipse 64rem 44rem at 50% 0%, rgba(244,180,61,0.2), rgba(244,180,61,0) 70%)" }}
    >

      <div className="mx-auto grid max-w-5xl items-center gap-x-16 gap-y-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* The poster, taped up with a FREE stamp. */}
        <Reveal className="relative mx-auto w-[min(60vw,15rem)] sm:w-[17rem] lg:w-full">
          <FlyIn from="right" delay={0.9} className="absolute -top-10 -right-8 z-20 w-20 sm:-right-12 sm:w-28">
            <Image src={propArt.clock} alt="" sizes="112px" className="w-full rotate-12 animate-float" />
          </FlyIn>
          <TiltCard className="rounded-2xl" max={12}>
            <div className="relative -rotate-2 overflow-hidden rounded-2xl border-[0.1875rem] border-ink bg-night shadow-card">
              <Image
                src={posterArt["case-001"]}
                alt={`${case001.title} poster`}
                sizes="(min-width: 1024px) 320px, (min-width: 640px) 272px, 60vw"
                className="aspect-[2/3] w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 bg-[linear-gradient(180deg,rgba(18,21,43,0.9),rgba(18,21,43,0))] px-4 pt-4 pb-10">
                <p className="text-[0.7rem] font-extrabold tracking-widest text-mustard uppercase">{case001.code}</p>
                <p className="font-display text-2xl leading-none text-cream text-pop sm:text-3xl">{case001.title}</p>
              </div>
            </div>
          </TiltCard>
          <span className="absolute -right-4 bottom-8 z-10 -rotate-12 rounded-lg border-[0.3125rem] border-coral bg-cream/95 px-3 font-display text-2xl tracking-widest text-coral-dk uppercase shadow-pop-sm sm:text-3xl">
            Free
          </span>
          <span aria-hidden className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 -rotate-3 bg-white/70" />
        </Reveal>

        <Reveal delay={0.1} className="min-w-0 text-center lg:text-left">
          <p className="inline-block -rotate-2 rounded-full border-[0.1875rem] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
            Your first case
          </p>
          <h2 className="mt-4 font-display text-5xl leading-none text-cream text-pop sm:text-6xl lg:text-7xl">{case001.title}</h2>
          <p className="mx-auto mt-4 max-w-xl font-display text-2xl leading-tight text-mustard [text-shadow:0_0.15rem_0_var(--color-ink)] sm:text-3xl lg:mx-0">
            {case001.tagline}
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
            {case001.meta.map((meta) => (
              <li key={meta} className="rounded-full border-2 border-cream/25 bg-night/60 px-3 py-1 text-sm font-bold text-cream">
                {meta}
              </li>
            ))}
          </ul>

          {/* The four people in the building: their jobs, not their names. */}
          <ul className="mx-auto mt-7 grid max-w-md grid-cols-4 gap-2 sm:gap-3 lg:mx-0">
            {case001.suspects.map((s, i) => (
              <li key={s.look} className="flex flex-col items-center text-center">
                <div
                  className={cx("w-full overflow-hidden rounded-xl border-[0.1875rem] border-ink", i % 2 ? "rotate-1" : "-rotate-1")}
                  style={{ backgroundImage: heightChart, backgroundColor: "#f4e6c8" }}
                >
                  <Image src={castArt[s.look].idle} alt="" sizes="100px" className="mx-auto -mb-2 w-[88%]" />
                </div>
                {/* A light bar: the usual ink bar disappears on the night background. */}
                <Redacted className="mt-2 bg-cream/80! text-xs sm:text-sm" />
                <span className="mt-0.5 text-[0.7rem] leading-tight font-bold text-cream/60 sm:text-xs">{s.role}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
            <Magnetic>
              <ButtonLink href={playCta().href} variant="coral">
                {open ? "Play Case 001 free" : "Get notified when it opens"}
              </ButtonLink>
            </Magnetic>
            <p className="text-sm font-extrabold text-cream/60">{open ? "No sign-up · no app · friends join with a link" : "One email when the doors open. That's it."}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
