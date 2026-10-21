import Image from "next/image";
import type { EvidenceEntry } from "@/data/mini-case";
import { propArt } from "@/lib/art";

type Props = { source: string; entries: EvidenceEntry[] };

/** A pinned printout of the one piece of evidence in the warm-up. */
export function EvidenceCard({ source, entries }: Props) {
  return (
    <div className="relative mx-auto max-w-sm rotate-1 lg:sticky lg:top-8">
      <Image
        src={propArt.pushpin}
        alt=""
        sizes="64px"
        className="absolute -top-8 left-1/2 z-10 w-16 -translate-x-1/2"
      />
      <Image
        src={propArt.clock}
        alt=""
        sizes="112px"
        className="absolute -top-12 -right-8 z-10 w-28 rotate-12 animate-float"
      />
      <div className="overflow-hidden rounded-2xl border-[3px] border-ink bg-cream text-ink shadow-card">
        <p className="bg-ink px-5 py-3 text-xs font-extrabold tracking-widest text-mustard uppercase">
          Evidence · {source}
        </p>
        <ol className="space-y-4 p-5">
          {entries.map((entry) => (
            <li key={entry.time} className="flex gap-3">
              <span className="h-fit shrink-0 rounded-lg border-2 border-ink bg-mustard px-2 py-0.5 font-display text-base">
                {entry.time}
              </span>
              <span className="leading-snug font-semibold">{entry.text}</span>
            </li>
          ))}
        </ol>
        <p className="border-t-2 border-dashed border-ink/25 px-5 py-3 text-sm font-bold text-ink/60">
          Every alibi below is about the minute the lights went out.
        </p>
      </div>
    </div>
  );
}
