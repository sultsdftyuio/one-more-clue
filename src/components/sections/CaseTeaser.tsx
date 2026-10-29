import Image from "next/image";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/TiltCard";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { case001 } from "@/data/case-001";
import { suspects } from "@/data/suspects";
import { gameOpen, playCta } from "@/lib/game-open";
import { posterArt, propArt, suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { FlyIn, FolderCover, PinIn, Redacted } from "./CaseFileMotion";

/** Height-chart lines behind each mugshot. */
const heightChart = "repeating-linear-gradient(180deg, rgba(27,31,59,0.14) 0 2px, transparent 2px 18px)";

/** Case 001 as a taped-up case file that opens on its poster, the four suspects and the evidence you'll get. */
export function CaseTeaser() {
  const open = gameOpen();
  return (
    <section className="relative overflow-hidden bg-night px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Now investigating" title="Your first case is waiting">
          A full investigation, written so the evidence supports exactly one answer. And it&apos;s on us.
        </SectionHeading>
      </Reveal>

      <div className="relative mx-auto mt-20 max-w-5xl">
        <FlyIn from="right" delay={1.1} className="absolute -top-16 -right-4 z-10 w-28 sm:-right-12 sm:w-36">
          <Image src={propArt.clock} alt="" sizes="144px" className="w-full rotate-12 animate-float" />
        </FlyIn>
        <FlyIn from="top" delay={1.45} className="absolute -bottom-12 -left-6 z-10 hidden w-24 sm:block lg:-left-16">
          <Image src={propArt.fingerprint} alt="" sizes="96px" className="w-full -rotate-12" />
        </FlyIn>

        <FolderCover code={case001.code}>
          <article className="relative grid gap-8 sm:-rotate-1 rounded-3xl border-[0.1875rem] border-ink bg-cream p-6 text-ink shadow-card sm:p-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
            <span aria-hidden className="absolute -top-4 left-1/2 h-8 w-32 -translate-x-1/2 rotate-2 bg-white/70" />

            {/* The poster, taped into the file, with a FREE stamp. */}
            <div className="relative mx-auto w-full max-w-[17rem] lg:sticky lg:top-24 lg:self-start">
              <TiltCard className="rounded-2xl" max={12}>
                <div className="relative rotate-2 overflow-hidden rounded-2xl border-[0.1875rem] border-ink bg-night shadow-pop">
                  <Image src={posterArt["case-001"]} alt={`${case001.title} poster`} sizes="272px" className="aspect-[2/3] w-full object-cover" />
                  <div className="absolute inset-x-0 top-0 bg-[linear-gradient(180deg,rgba(18,21,43,0.9),rgba(18,21,43,0))] px-4 pt-4 pb-10">
                    <p className="text-[0.7rem] font-extrabold tracking-widest text-mustard uppercase">{case001.code}</p>
                    <p className="font-display text-3xl leading-none text-cream text-pop">{case001.title}</p>
                  </div>
                </div>
              </TiltCard>
              <span className="absolute -right-3 bottom-10 z-10 -rotate-12 rounded-lg border-[0.3125rem] border-coral bg-cream/90 px-3 font-display text-3xl tracking-widest text-coral uppercase shadow-pop-sm">
                Free
              </span>
              <span aria-hidden className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 -rotate-3 bg-white/70" />
            </div>

            <div className="min-w-0">
              <p className="font-display text-xl text-coral">{case001.code}</p>
              <h3 className="font-display text-5xl leading-none sm:text-6xl">{case001.title}</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {case001.meta.map((meta) => (
                  <li key={meta} className="rounded-full border-2 border-ink bg-mustard px-3 py-0.5 text-sm font-extrabold">
                    {meta}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-lg leading-relaxed font-semibold">{case001.premise}</p>

              {/* The four people in the building, names blacked out. */}
              <ul className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
                {suspects.map((s, i) => (
                  <li key={s.id} className="text-center">
                    <div
                      className={cx("overflow-hidden rounded-xl border-[0.1875rem] border-ink", i % 2 ? "rotate-1" : "-rotate-1")}
                      style={{ backgroundImage: heightChart, backgroundColor: "#f4e6c8" }}
                    >
                      <Image src={suspectArt[s.id].idle} alt="" sizes="110px" className="mx-auto -mb-2 w-[88%]" />
                    </div>
                    <Redacted className="mt-2 text-xs sm:text-sm" />
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-lg leading-relaxed font-semibold">{case001.twist}</p>

              <h4 className="mt-8 font-display text-2xl">What you&apos;ll dig through</h4>
              <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                {case001.evidence.map((item, i) => (
                  <PinIn key={item.label} index={i} className={i === case001.evidence.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
                    <Image src={propArt.pushpin} alt="" sizes="40px" className="absolute -top-4 left-1/2 z-10 w-9 -translate-x-1/2" />
                    <div className="flex h-full flex-col items-center gap-2 rounded-xl border-[0.1875rem] border-ink bg-white px-3 pt-4 pb-3 text-center shadow-pop-sm">
                      <Image src={propArt[item.prop]} alt="" sizes="72px" className="size-16" />
                      <span className="text-sm leading-snug font-bold">{item.label}</span>
                    </div>
                  </PinIn>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Magnetic>
                  <ButtonLink href={playCta().href} variant="coral">
                    {open ? "Play Case 001 free" : "Get notified when it opens"}
                  </ButtonLink>
                </Magnetic>
                <p className="text-sm font-extrabold text-ink/60">{open ? "No sign-up · 15–20 min · friends join with a link" : "One email when the doors open. That's it."}</p>
              </div>
            </div>
          </article>
        </FolderCover>
      </div>
    </section>
  );
}
