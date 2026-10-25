"use client";

import Image from "next/image";
import { m } from "motion/react";
import type { EvidenceEntry } from "@/data/mini-case";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";

type Props = { source: string; entries: EvidenceEntry[]; highlight?: boolean };

/** A pinned printout of the one piece of evidence in the warm-up. After a wrong guess it glows: look here. */
export function EvidenceCard({ source, entries, highlight }: Props) {
  return (
    <m.div
      className="relative mx-auto max-w-sm rotate-1"
      animate={highlight ? { scale: [1, 1.04, 1], rotate: [1, -1, 1] } : { scale: 1, rotate: 1 }}
      transition={highlight ? { duration: 0.9, repeat: 2 } : { duration: 0.3 }}
    >
      <m.div
        aria-hidden
        className="absolute inset-[-18px] -z-10 rounded-[2rem] bg-[radial-gradient(circle,rgba(242,179,61,0.55),rgba(242,179,61,0)_70%)]"
        animate={{ opacity: highlight ? [0.4, 1, 0.4] : 0 }}
        transition={highlight ? { duration: 1.6, repeat: Infinity } : { duration: 0.4 }}
      />
      <Image src={propArt.pushpin} alt="" sizes="64px" className="absolute -top-8 left-1/2 z-10 w-16 -translate-x-1/2" />
      <Image src={propArt.clock} alt="" sizes="112px" className="absolute -top-12 -right-8 z-10 w-28 rotate-12 animate-float" />
      <div className={cx("overflow-hidden rounded-2xl border-[3px] border-ink bg-cream text-ink shadow-card", highlight && "ring-4 ring-mustard")}>
        <p className="bg-ink px-5 py-3 text-xs font-extrabold tracking-widest text-mustard uppercase">Evidence · {source}</p>
        <ol className="space-y-4 p-5">
          {entries.map((entry, i) => (
            <m.li
              key={entry.time}
              className="flex gap-3"
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.15 }}
            >
              <span className="h-fit shrink-0 rounded-lg border-2 border-ink bg-mustard px-2 py-0.5 font-display text-base">{entry.time}</span>
              <span className="leading-snug font-semibold">{entry.text}</span>
            </m.li>
          ))}
        </ol>
        <p className="border-t-2 border-dashed border-ink/25 px-5 py-3 text-sm font-bold text-ink/60">
          Every alibi below is about the minute the lights went out.
        </p>
      </div>
    </m.div>
  );
}
