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
        "relative flex flex-col rounded-3xl border-[3px] border-ink bg-dusk p-5 pt-0 shadow-card",
        verdict === "busted" && "ring-4 ring-coral",
        justCleared && "animate-shake",
      )}
    >
      <div className="relative mx-auto -mt-16 w-32">
        <Image
          src={verdict ? art.shocked : art.idle}
          alt=""
          sizes="128px"
          className={cx("transition-opacity", verdict === "cleared" && "opacity-60")}
        />
        {verdict && (
          <span
            className={cx(
              "absolute top-1/3 left-1/2 -translate-x-1/2 animate-stamp rounded-lg border-4 bg-night/80 px-2 font-display text-2xl tracking-wider uppercase",
              stamps[verdict],
            )}
          >
            {verdict}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <h3 className="font-display text-2xl text-cream">{suspect.name}</h3>
        <span className={cx("rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold text-ink", suspect.accent)}>
          {suspect.trait}
        </span>
      </div>

      <blockquote className="mt-3 rounded-2xl rounded-tl-sm border-[3px] border-ink bg-cream px-4 py-3 leading-snug font-semibold text-ink">
        “{alibi.claim}”
      </blockquote>

      {verdict && (
        <p className={cx("mt-3 animate-pop-in text-lg leading-snug font-extrabold", verdict === "busted" ? "text-coral" : "text-teal")}>
          “{alibi.reaction}”
        </p>
      )}

      <div className="mt-auto pt-5">
        <Button variant="coral" className="w-full" disabled={locked || !!verdict} onClick={onAccuse}>
          {verdict === "busted" ? "Caught!" : verdict === "cleared" ? "Not them" : `Accuse ${suspect.name}`}
        </Button>
      </div>
    </article>
  );
}
