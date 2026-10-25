import Link from "next/link";
import { Reveal } from "@/components/fx/Reveal";
import { buttonClass } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { bundles, paidCases } from "@/data/catalog";
import { caseById } from "@/data/cases";
import { gameOpen } from "@/lib/game-open";
import { EvidenceBox, SealedFolder, type ShelfCase } from "./ShelfMotion";

/** Folder tab colour per case. */
const tabs: Record<string, string> = { "case-002": "bg-coral", "case-003": "bg-teal", "case-004": "bg-lilac" };

/** The paid cases after Case 001: three sealed folders and the Season 1 evidence box. */
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
      tab: tabs[c.id] ?? "bg-mustard",
    }));
  const bundle = bundles[0];
  const inBundle = paidCases.filter((c) => bundle?.includes?.includes(c.id));
  const names = inBundle.map((c) => c.title);
  const together = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names.join("");
  const separate = inBundle.reduce((sum, c) => sum + Number(c.price.replace("$", "")), 0);
  const saves = bundle ? (separate - Number(bundle.price.replace("$", ""))).toFixed(2) : null;

  return (
    <section className="relative overflow-hidden bg-night px-4 pt-8 pb-24 sm:px-6 sm:pb-28">
      <Reveal>
        <SectionHeading eyebrow="On the shelf" title="Solved it? Three more cases">
          Each one is a full night in. Only the host buys a case; everyone else joins free with the link.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-6xl gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {singles.map((item, i) => (
          <SealedFolder key={item.id} item={item} index={i} href={href} cta={open ? `Unlock for ${item.price}` : "Get notified"} />
        ))}
      </div>

      {bundle && (
        <div className="mx-auto mt-20 grid max-w-4xl items-center gap-8 rounded-[2rem] border-[3px] border-ink bg-dusk p-6 shadow-card sm:p-10 md:grid-cols-[18rem_1fr]">
          <EvidenceBox />
          <Reveal>
            <p className="inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
              Best value
            </p>
            <h3 className="mt-4 font-display text-5xl leading-none text-cream">{bundle.title}</h3>
            <p className="mt-3 text-lg font-semibold text-cream/85">
              {together}, together{saves ? `. Save $${saves}` : ""}.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="font-display text-5xl text-mustard">{bundle.price}</span>
              <Link href={href} className={buttonClass("primary")}>
                {open ? "Get the bundle" : "Get notified"}
              </Link>
            </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}
