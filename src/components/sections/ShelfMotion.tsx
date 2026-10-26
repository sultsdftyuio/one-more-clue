"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { m } from "motion/react";
import { TiltCard } from "@/components/fx/TiltCard";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";

export type ShelfCase = {
  id: string;
  number: string;
  title: string;
  tagline: string;
  price: string;
  poster: StaticImageData;
  /** Case colour, a bg-* class: the chip on the card and the label on the triptych. */
  accent: string;
};

/**
 * A paid case as its poster. It tilts under the mouse, the art pushes in, the
 * price tag swings and the wax seal pops loose.
 */
export function PosterCard({ item, index, href, cta, bundleNote }: { item: ShelfCase; index: number; href: string; cta: string; bundleNote?: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 70, rotate: index % 2 ? 6 : -6 }}
      whileInView={{ opacity: 1, y: 0, rotate: [-1.5, 1, -1][index % 3] }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: "spring", stiffness: 80, damping: 13, delay: index * 0.12 }}
      whileHover="hover"
      className="relative pt-3"
    >
      <TiltCard className="rounded-3xl" max={10}>
        <article className="relative overflow-hidden rounded-3xl border-[0.1875rem] border-ink bg-cream text-ink shadow-card">
          <div className="relative aspect-[2/3] overflow-hidden border-b-[0.1875rem] border-ink bg-night">
            <m.div className="absolute inset-0" variants={{ hover: { scale: 1.06, transition: { type: "spring", stiffness: 120, damping: 16 } } }}>
              <Image src={item.poster} alt={`${item.title} poster`} fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw" className="object-cover" />
            </m.div>
            <div className="absolute inset-x-0 top-0 bg-[linear-gradient(180deg,rgba(18,21,43,0.9),rgba(18,21,43,0.55)_55%,rgba(18,21,43,0))] px-5 pt-5 pb-14">
              <span className={cx("inline-block rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold tracking-widest text-ink uppercase", item.accent)}>
                Case {item.number}
              </span>
              <h3 className="mt-2 font-display text-[2.6rem] leading-none text-cream text-pop">{item.title}</h3>
            </div>
          </div>
          <div className="relative flex flex-col gap-4 p-5">
            {/* Wax seal on the seam between poster and file; it pops loose when you reach for the case. */}
            <m.span
              aria-hidden
              className={cx(
                "absolute -top-10 right-4 grid size-20 place-items-center rounded-full border-[0.1875rem] border-ink text-ink shadow-pop-sm",
                item.accent,
              )}
              initial={{ rotate: -14 }}
              variants={{ hover: { rotate: [-14, 8, -4], y: [0, -10, -6], scale: 1.08, transition: { duration: 0.6 } } }}
            >
              <span className="grid size-[3.9rem] place-items-center rounded-full border-2 border-dashed border-ink/50 font-display text-[0.8rem] leading-none tracking-widest uppercase">
                Sealed
              </span>
            </m.span>
            <p className="pr-20 leading-snug font-semibold text-ink/80">{item.tagline}</p>
            <Link href={href} className={buttonClass("coral", "w-full text-base")}>
              {cta}
            </Link>
            {bundleNote && (
              <a href="#season-1" className="text-center text-sm font-extrabold text-ink/60 underline decoration-2 underline-offset-4 hover:text-ink">
                {bundleNote}
              </a>
            )}
          </div>
        </article>
      </TiltCard>
      {/* Price tag hanging off the corner on a string. */}
      <m.div
        className="absolute -top-2 right-5 z-20 origin-top"
        initial={{ rotate: 8 }}
        animate={{ rotate: [8, -4, 8] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
        variants={{ hover: { rotate: [8, -18, 14, -8, 4], transition: { duration: 0.9 } } }}
      >
        <span aria-hidden className="mx-auto block h-6 w-0.5 bg-cream/70" />
        <span className="block rounded-lg border-[0.1875rem] border-ink bg-cream px-3 py-1 font-display text-2xl text-ink shadow-pop-sm">{item.price}</span>
      </m.div>
    </m.div>
  );
}

/**
 * The Season 1 triptych: one panorama across all three cases, settling in as
 * it scrolls into view, with each case's name on its third of the street.
 */
export function SeasonBanner({ art, cases }: { art: StaticImageData; cases: ShelfCase[] }) {
  return (
    <div className="relative aspect-[18/7] overflow-hidden border-b-[0.1875rem] border-ink bg-night">
      <m.div
        className="absolute inset-0"
        initial={{ scale: 1.12 }}
        whileInView={{ scale: 1.03 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image src={art} alt="Season 1: the radio station, Maison Lune and Pinecrest Lodge on one night street" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
      </m.div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(42,47,92,0)_55%,rgba(42,47,92,0.85))]" />
      <ul className="absolute inset-x-0 top-3 grid grid-cols-3 px-2 sm:top-5">
        {cases.map((c, i) => (
          <m.li
            key={c.id}
            className="text-center"
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.6 + i * 0.15 }}
          >
            <span className={cx("inline-block -rotate-2 rounded-full border-2 border-ink px-2.5 py-0.5 text-[0.7rem] font-extrabold tracking-wider text-ink uppercase shadow-pop-sm sm:text-xs", c.accent)}>
              {c.number}
              <span className="hidden sm:inline"> · {c.title}</span>
            </span>
          </m.li>
        ))}
      </ul>
    </div>
  );
}

/** The three posters fanned out like cards in a hand; they spread when you reach for them. */
export function PosterFan({ cases }: { cases: ShelfCase[] }) {
  const spread = [-14, 0, 14];
  return (
    <m.div className="relative flex h-36 w-48 shrink-0 items-end justify-center sm:h-40" initial="rest" animate="rest" whileHover="spread">
      {cases.map((c, i) => (
        <m.div
          key={c.id}
          className="absolute bottom-0 w-20 origin-bottom overflow-hidden rounded-lg border-[0.1875rem] border-ink shadow-pop-sm sm:w-24"
          style={{ zIndex: i === 1 ? 2 : 1 }}
          variants={{
            rest: { rotate: spread[i], x: (i - 1) * 34, y: i === 1 ? -6 : 0 },
            spread: { rotate: spread[i] * 1.5, x: (i - 1) * 56, y: i === 1 ? -16 : -4, transition: { type: "spring", stiffness: 220, damping: 16 } },
          }}
        >
          <Image src={c.poster} alt="" sizes="96px" className="aspect-[2/3] w-full object-cover" />
        </m.div>
      ))}
    </m.div>
  );
}
