import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import { propArt } from "@/lib/art";

type Props = {
  headline: string;
  explanation: string;
  nextStep: string;
  wrongGuesses: number;
  onReset: () => void;
};

function scoreLine(wrongGuesses: number) {
  if (wrongGuesses === 0) return "Cracked it on the first try.";
  return `Cracked it after ${wrongGuesses} wrong ${wrongGuesses === 1 ? "guess" : "guesses"}.`;
}

/** Shown once the liar is caught: the explanation, then the push to Case 001. */
export function VerdictPanel({ headline, explanation, nextStep, wrongGuesses, onReset }: Props) {
  return (
    <div className="relative mx-auto mt-16 max-w-3xl animate-pop-in rounded-3xl border-[0.1875rem] border-ink bg-mustard p-6 text-ink shadow-card sm:p-8">
      <Image
        src={propArt.sparkle}
        alt=""
        sizes="96px"
        className="absolute -top-10 -right-4 w-24 rotate-12 animate-float"
      />
      <p className="text-sm font-extrabold tracking-widest uppercase">{scoreLine(wrongGuesses)}</p>
      <h3 className="mt-2 font-display text-5xl">{headline}</h3>
      <p className="mt-3 text-lg leading-relaxed font-semibold">{explanation}</p>
      <p className="mt-4 rounded-2xl border-[0.1875rem] border-ink bg-cream px-4 py-3 font-bold">{nextStep}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ButtonLink href="/play" variant="coral">
          Play Case 001
        </ButtonLink>
        <ShareButton message="I just caught a liar in 30 seconds. Your turn:" />
        <button
          type="button"
          onClick={onReset}
          className="font-bold underline decoration-2 underline-offset-4 hover:text-ink/70"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
