"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { miniCase } from "@/data/mini-case";
import { suspectById } from "@/data/suspects";
import { brandArt } from "@/lib/art";
import { EvidenceCard } from "./EvidenceCard";
import { SuspectCard } from "./SuspectCard";
import { useMiniCase } from "./useMiniCase";
import { VerdictPanel } from "./VerdictPanel";

export function MiniCase() {
  const { verdicts, solved, wrongGuesses, lastWrong, accuse, reset } = useMiniCase(miniCase.liar);

  const hint = miniCase.hints[Math.min(wrongGuesses, miniCase.hints.length) - 1];
  const status = lastWrong ? `Not ${suspectById(lastWrong).name}. ${hint}` : miniCase.prompt;

  return (
    <section id="mini-case" className="relative isolate overflow-hidden bg-ink px-4 py-20 sm:px-6 sm:py-24">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-20"
        style={{ backgroundImage: `url(${brandArt.confetti.src})`, backgroundSize: "600px" }}
      />

      <SectionHeading eyebrow={miniCase.code} title={miniCase.title}>
        {miniCase.briefing}
      </SectionHeading>

      <div className="mx-auto mt-20 grid max-w-6xl items-start gap-x-10 gap-y-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <EvidenceCard {...miniCase.evidence} />

        <div className="grid gap-x-6 gap-y-20 sm:grid-cols-2">
          {miniCase.alibis.map((alibi) => (
            <SuspectCard
              key={alibi.suspect}
              suspect={suspectById(alibi.suspect)}
              alibi={alibi}
              verdict={verdicts[alibi.suspect]}
              locked={solved}
              justCleared={lastWrong === alibi.suspect}
              onAccuse={() => accuse(alibi.suspect)}
            />
          ))}
        </div>
      </div>

      {solved ? (
        <VerdictPanel {...miniCase.reveal} wrongGuesses={wrongGuesses} onReset={reset} />
      ) : (
        <p aria-live="polite" className="mx-auto mt-14 max-w-xl text-center text-lg font-bold text-mustard">
          {status}
        </p>
      )}
    </section>
  );
}
