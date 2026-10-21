import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { facts, steps } from "@/data/how-it-works";
import { propArt } from "@/lib/art";

const tilts = ["-rotate-2", "rotate-1", "-rotate-1"];

export function HowItWorks() {
  return (
    <section className="bg-cream px-4 py-20 text-ink sm:px-6 sm:py-24">
      <SectionHeading eyebrow="How it works" title="The internet is the crime scene" surface="light">
        Every case is a pile of digital evidence and a group of friends who think they know better.
      </SectionHeading>

      <ol className="mx-auto mt-20 grid max-w-6xl gap-x-8 gap-y-24 md:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={`relative rounded-3xl border-[3px] border-ink bg-white px-6 pt-24 pb-8 shadow-card ${tilts[i]}`}
          >
            <Image
              src={propArt[step.prop]}
              alt=""
              sizes="176px"
              className="absolute -top-20 left-1/2 w-44 -translate-x-1/2 transition-transform duration-300 hover:-rotate-6"
            />
            <span className="absolute top-4 left-4 grid size-10 place-items-center rounded-full border-[3px] border-ink bg-mustard font-display text-xl">
              {i + 1}
            </span>
            <h3 className="font-display text-3xl">{step.title}</h3>
            <p className="mt-3 text-lg leading-relaxed font-semibold text-ink/75">{step.text}</p>
          </li>
        ))}
      </ol>

      <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border-[3px] border-ink bg-ink px-4 py-4 text-center text-cream">
            <dt className="sr-only">{fact.label}</dt>
            <dd>
              <span className="block font-display text-4xl text-mustard">{fact.value}</span>
              <span className="text-sm font-bold text-cream/80">{fact.label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
