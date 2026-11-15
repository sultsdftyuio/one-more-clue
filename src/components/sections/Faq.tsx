import { Reveal } from "@/components/fx/Reveal";
import { Icon } from "@/components/game/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { faq } from "@/data/faq";

/** The answers are short, so they're all open: nothing to tap through. The same words go to search engines. */
export function Faq() {
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-8 bg-night px-4 pt-4 pb-24 sm:px-6 sm:pb-28">
      <Reveal>
        <SectionHeading eyebrow="Before you play" title={<span id="questions-title">Good questions</span>} />
      </Reveal>
      <ul className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {faq.map(({ icon, q, a }, i) => (
          <li key={q}>
            <Reveal delay={(i % 3) * 0.06} y={24} className="h-full">
              <article className="h-full rounded-3xl border-[0.1875rem] border-ink bg-dusk p-5 shadow-card sm:p-6">
                <h3 className="flex items-start gap-3 font-display text-xl leading-tight text-cream sm:text-2xl">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl border-[0.1875rem] border-ink bg-mustard text-ink">
                    <Icon name={icon} className="size-5" />
                  </span>
                  <span className="pt-1.5">{q}</span>
                </h3>
                <p className="mt-3 leading-relaxed font-semibold text-cream/75">{a}</p>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
    </section>
  );
}
