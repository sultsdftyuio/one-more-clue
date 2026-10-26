import Link from "next/link";
import { Reveal } from "@/components/fx/Reveal";
import { buttonClass } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { bundleSaving, bundles, paidCases } from "@/data/catalog";
import { caseById } from "@/data/cases";
import { gameOpen } from "@/lib/game-open";
import { posterArt, seasonArt } from "@/lib/art";
import { PosterCard, PosterFan, SeasonBanner, type ShelfCase } from "./ShelfMotion";

/** Each case's colour, matching its poster. */
const accents: Record<string, string> = { "case-002": "bg-coral", "case-003": "bg-teal", "case-004": "bg-lilac" };

/** The paid cases after Case 001: three posters, and the Season 1 bundle as one panorama across them. */
export function CaseShelf() {
  const open = gameOpen();
  // Buying happens on the host page; before launch the shelf points at early access.
  const href = open ? "/host" : "/play";
  const singles: ShelfCase[] = paidCases
    .filter((c) => !c.includes)
    .map((c) => ({
      id: c.id,
      number: c.id.replace("case-", ""),
      title: c.title,
      tagline: caseById(c.id)?.tagline ?? "",
      price: c.price,
      poster: posterArt[c.id],
      accent: accents[c.id] ?? "bg-mustard",
    }));
  const bundle = bundles[0];
  const inBundle = singles.filter((c) => bundle?.includes?.includes(c.id));
  const names = inBundle.map((c) => c.title);
  const together = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join("");
  const separately = inBundle.reduce((sum, c) => sum + Number(c.price.replace(/[^0-9.]/g, "")), 0);
  const saves = bundle ? bundleSaving(bundle) : null;

  return (
    <section className="relative overflow-hidden bg-night px-4 pt-8 pb-24 sm:px-6 sm:pb-28">
      <Reveal>
        <SectionHeading eyebrow="On the shelf" title="Solved it? Three more cases">
          Each one is a full night in. Only the host buys a case; everyone else joins free with the link.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-6xl gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {singles.map((item, i) => (
          <PosterCard
            key={item.id}
            item={item}
            index={i}
            href={href}
            cta={open ? `Unlock for ${item.price}` : "Get notified"}
            bundleNote={bundle?.includes?.includes(item.id) && saves ? `Or get all three and save ${saves}` : undefined}
          />
        ))}
      </div>

      {bundle && (
        <Reveal>
          <div id="season-1" className="mx-auto mt-24 max-w-6xl scroll-mt-24 overflow-hidden rounded-[2rem] border-[0.1875rem] border-ink bg-dusk shadow-card">
            <SeasonBanner art={seasonArt.season1} cases={inBundle} />
            <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[auto_1fr_auto]">
              <PosterFan cases={inBundle} />
              <div>
                <p className="inline-block -rotate-2 rounded-full border-[0.1875rem] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
                  Best value
                </p>
                <h3 className="mt-4 font-display text-5xl leading-none text-cream">{bundle.title}</h3>
                <p className="mt-3 text-lg font-semibold text-cream/85">
                  {together}: three nights in, one street{saves ? `. Save ${saves}` : ""}.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <p className="flex items-baseline gap-3">
                  {separately > 0 && <s className="font-display text-2xl text-cream/50">${separately.toFixed(2)}</s>}
                  <span className="font-display text-6xl text-mustard text-pop">{bundle.price}</span>
                </p>
                <Link href={href} className={buttonClass("primary")}>
                  {open ? "Get the bundle" : "Get notified"}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      )}
    </section>
  );
}
