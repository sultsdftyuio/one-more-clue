import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { gameOpen, playCta } from "@/lib/game-open";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { case001 } from "@/data/case-001";
import { propArt } from "@/lib/art";

function RedactedNames({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i}>
          <span className="redacted px-1">██████</span>
          {i < count - 2 ? ", " : i === count - 2 ? " and " : "."}
        </span>
      ))}
    </>
  );
}

/** Case 001 shown as a taped-up case file with evidence scattered around it. */
export function CaseTeaser() {
  return (
    <section className="relative overflow-hidden bg-night px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="Now investigating" title="Your first case is waiting">
        A full investigation, written so the evidence supports exactly one answer.
      </SectionHeading>

      <div className="relative mx-auto mt-16 max-w-3xl">
        <Image
          src={propArt.clock}
          alt=""
          sizes="160px"
          className="absolute -top-16 -right-4 z-10 w-28 rotate-12 animate-float sm:-right-16 sm:w-40"
        />
        <Image
          src={propArt.polaroid}
          alt=""
          sizes="176px"
          className="absolute -right-6 -bottom-20 z-10 hidden w-44 rotate-6 sm:block lg:-right-24"
        />

        <article className="relative -rotate-1 rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-card sm:p-10">
          <span aria-hidden className="absolute -top-4 left-1/2 h-8 w-32 -translate-x-1/2 rotate-2 bg-white/70" />

          <p className="font-display text-xl text-coral">{case001.code}</p>
          <h3 className="font-display text-5xl leading-none sm:text-6xl">{case001.title}</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {case001.meta.map((m) => (
              <li key={m} className="rounded-full border-2 border-ink bg-mustard px-3 py-0.5 text-sm font-extrabold">
                {m}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-lg leading-relaxed font-semibold">
            {case001.premise} Their names: <RedactedNames count={case001.redactedNames} />
          </p>
          <p className="mt-4 text-lg leading-relaxed font-semibold">{case001.twist}</p>

          <h4 className="mt-8 font-display text-2xl">What you&apos;ll dig through</h4>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {case001.evidence.map((item) => (
              <li key={item.label} className="flex items-center gap-3 rounded-2xl border-2 border-ink/15 bg-white p-2 pr-4">
                <Image src={propArt[item.prop]} alt="" sizes="56px" className="size-14 shrink-0" />
                <span className="font-bold leading-snug">{item.label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <ButtonLink href={playCta().href} variant="coral">
              {gameOpen() ? "Host a game" : "Get notified when it opens"}
            </ButtonLink>
          </div>
        </article>
      </div>
    </section>
  );
}
