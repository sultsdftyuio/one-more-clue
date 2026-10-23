import { ButtonLink } from "@/components/ui/Button";
import type { PlayerView } from "@/lib/game/engine";
import { EvidenceView } from "./EvidenceView";
import { Panel, roleNames, SuspectPortrait } from "./parts";

const HEADLINES = {
  solved: { title: "Case closed!", text: "You found the culprit." },
  wrong: { title: "Wrong suspect.", text: "The real culprit walks free tonight." },
  gaveUp: { title: "Case abandoned.", text: "Here's what really happened." },
};

export function Reveal({ view }: { view: PlayerView }) {
  const outcome = view.outcome!;
  const solution = view.solution!;
  const culprit = view.case.suspects.find((s) => s.id === solution.culprit)!;
  const accused = view.case.suspects.find((s) => s.id === outcome.suspectId);
  const headline = HEADLINES[outcome.kind];

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6">
      <Panel className="text-center">
        <p className="text-sm font-extrabold tracking-widest text-mustard uppercase">{view.case.code} · The reveal</p>
        <h1 className="mt-2 animate-stamp font-display text-5xl text-cream sm:text-6xl">{headline.title}</h1>
        <p className="mt-2 text-lg font-bold text-cream/80">
          {outcome.kind === "wrong" && accused ? `You accused ${accused.name}. ` : ""}
          {headline.text}
        </p>
        <SuspectPortrait suspect={culprit} shocked className="mx-auto mt-6 w-32 animate-pop-in" />
        <p className="font-display text-3xl text-mustard">It was {culprit.name}.</p>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed font-semibold text-cream/90">{solution.explanation}</p>
        {view.hints.length > 0 && (
          <p className="mt-4 text-sm font-bold text-cream/60">
            Hints used: {view.hints.length} of {view.case.hintsTotal}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/host">Host another case</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back home
          </ButtonLink>
        </div>
      </Panel>

      {view.allEvidence && (
        <section>
          <h2 className="mb-4 font-display text-3xl text-cream">Every piece of evidence</h2>
          <div className="grid gap-4">
            {view.allEvidence.map((e) => (
              <EvidenceView key={e.id} evidence={e} tag={roleNames(view, [e.role])[0]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
