import Image from "next/image";
import Link from "next/link";
import { suspects } from "@/data/suspects";
import { suspectArt } from "@/lib/art";

/**
 * The four suspects standing on the street. The art has ~10% of its width as
 * empty space under the feet, so each one is pulled down by that much.
 */
export function SuspectLineup({ bubble }: { bubble: string }) {
  return (
    <div className="relative flex items-end justify-center [--w:clamp(76px,10.5vw,170px)]">
      <p className="absolute -top-14 left-1/2 -translate-x-1/2 -rotate-3 animate-pop-in rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-display text-lg whitespace-nowrap text-ink shadow-pop-sm [animation-delay:1.8s] after:absolute after:-bottom-[11px] after:left-8 after:size-4 after:rotate-45 after:border-r-[3px] after:border-b-[3px] after:border-ink after:bg-cream">
        {bubble}
      </p>
      {suspects.map((s, i) => (
        <Link
          key={s.id}
          href="#mini-case"
          aria-label={`Investigate ${s.name}`}
          className="group -mx-1 mb-[calc(var(--w)*-0.1)] w-(--w) focus-visible:outline-none"
        >
          <Image
            src={suspectArt[s.id].idle}
            alt=""
            sizes="170px"
            priority
            className="animate-bob transition-transform duration-200 group-hover:-translate-y-2 group-hover:rotate-3 group-focus-visible:-translate-y-2"
            style={{ animationDelay: `${i * -0.8}s` }}
          />
        </Link>
      ))}
    </div>
  );
}
