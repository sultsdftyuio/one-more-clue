import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { Alibi } from "@/data/mini-case";
import type { Suspect } from "@/data/suspects";
import { suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import type { Verdict } from "./useMiniCase";

type Props = {
  suspect: Suspect;
  alibi: Alibi;
  verdict?: Verdict;
  locked: boolean;
  justCleared: boolean;
  onAccuse: () => void;
};

const stamps: Record<Verdict, string> = {
  cleared: "border-teal text-teal",
  busted: "border-coral text-coral",
};

export function SuspectCard({ suspect, alibi, verdict, locked, justCleared, onAccuse }: Props) {
  const art = suspectArt[suspect.id];
  return (
    <article
      className={cx(
        "relative flex h-full flex-col rounded-3xl border-[0.1875rem] border-ink bg-dusk p-3 pt-0 shadow-card sm:p-5 sm:pt-0",
        verdict === "busted" && "ring-4 ring-coral",
        justCleared && "animate-shake",
      )}
    >
      <div className="relative mx-auto -mt-10 w-20 sm:-mt-16 sm:w-32">
        <Image
          src={verdict ? art.shocked : art.idle}
          alt=""
          sizes="128px"
          className={cx("transition-opacity", verdict === "cleared" && "opacity-60")}
        />
        {verdict && (
          <span
            className={cx(
              "absolute top-1/3 left-1/2 -translate-x-1/2 animate-stamp rounded-lg border-4 bg-night/80 px-2 font-display text-lg tracking-wider uppercase sm:text-2xl",
              stamps[verdict],
            )}
          >
            {verdict}
          </span>
        )}
      </div>

      {/* Phones show the four as a 2×2 grid, so the name and trait stack. */}
      <div className="mt-1 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <h3 className="font-display text-lg leading-tight text-cream sm:text-2xl">{suspect.name}</h3>
        <span className={cx("rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold text-ink", suspect.accent)}>
          {suspect.trait}
        </span>
      </div>

      <blockquote className="mt-2 rounded-2xl rounded-tl-sm border-[0.1875rem] border-ink bg-cream px-3 py-2 text-sm leading-snug font-semibold text-ink sm:mt-3 sm:px-4 sm:py-3 sm:text-base">
        “{alibi.claim}”
      </blockquote>

      {verdict && (
        <p className={cx("mt-3 animate-pop-in text-base leading-snug font-extrabold sm:text-lg", verdict === "busted" ? "text-coral" : "text-teal")}>
          “{alibi.reaction}”
        </p>
      )}

      <div className="mt-auto pt-3 sm:pt-5">
        <Button
          variant="coral"
          className="w-full max-sm:px-3 max-sm:py-2 max-sm:text-base"
          disabled={locked || !!verdict}
          onClick={onAccuse}
          aria-label={verdict ? undefined : `Accuse ${suspect.name}`}
        >
          {verdict === "busted" ? (
            "Caught!"
          ) : verdict === "cleared" ? (
            "Not them"
          ) : (
            <>
              Accuse<span className="max-sm:hidden"> {suspect.name}</span>
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
