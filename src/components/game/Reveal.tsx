"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import type { PlayerView } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { GameProvider, nameOf, type Act } from "./context";
import { EvidenceCard } from "./evidence/EvidenceCard";
import { FeedbackCard } from "./FeedbackCard";
import { Panel, SuspectPortrait } from "./parts";
import { Icon } from "./ui/Icon";

const HEADLINES = {
  solved: { stamp: "Case closed", text: "You caught the culprit." },
  wrong: { stamp: "Wrong suspect", text: "The real culprit walks free tonight." },
  gaveUp: { stamp: "Case abandoned", text: "Here's what really happened." },
};

function Stars({ count }: { count: number }) {
  return (
    <p className="flex justify-center gap-1.5" aria-label={`${count} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="animate-[star-in_0.5s_ease-out_both]" style={{ animationDelay: `${0.5 + i * 0.18}s` }}>
          <Icon name="star" filled={i < count} className={cx("size-10 sm:size-12", i < count ? "text-mustard" : "text-cream/20")} />
        </span>
      ))}
    </p>
  );
}

function duration(view: PlayerView) {
  if (!view.startedAt || !view.outcome) return null;
  const minutes = Math.max(1, Math.round((view.outcome.at - view.startedAt) / 60000));
  return `${minutes} min`;
}

export function Reveal({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const outcome = view.outcome!;
  const solution = view.solution!;
  const culprit = view.case.suspects.find((s) => s.id === solution.culprit)!;
  const report = outcome.report;
  const accused = view.case.suspects.find((s) => s.id === report?.suspectId);
  const headline = HEADLINES[outcome.kind];
  const game = useMemo(() => ({ view, act, busy, open: () => undefined }), [view, act, busy]);

  // Count each finished case once per device, however often the page reloads.
  useEffect(() => {
    const key = `omc-finished-${view.code}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {}
    trackEvent("case_finished", {
      case: view.case.id,
      outcome: outcome.kind,
      stars: outcome.score.stars,
      minutes: view.startedAt ? Math.round((outcome.at - view.startedAt) / 60000) : null,
      players: view.players.length,
      hints: view.hintsUsed,
      mode: view.mode,
    });
  }, [outcome, view.case.id, view.code, view.hintsUsed, view.mode, view.players.length, view.startedAt]);

  const finds = view.activity.filter((a) => a.kind === "found" && a.playerId);
  const topFinder = Object.entries(
    finds.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.playerId!]: (acc[a.playerId!] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1])[0];

  const breakdown = [
    { ok: outcome.score.culprit, label: "Named the culprit", worth: 2 },
    { ok: outcome.score.motive, label: "Got the motive", worth: 1 },
    { ok: outcome.score.evidence, label: "Proof that holds up", worth: 1 },
    { ok: outcome.score.sharp, label: "Sharp: at most 1 hint and 1 wrong answer", worth: 1 },
  ];

  return (
    <GameProvider value={game}>
      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 pb-12">
        <section className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-[radial-gradient(circle_at_50%_0%,#3a3f78,#12152b_70%)] p-6 text-center shadow-card sm:p-8">
          <p className="text-xs font-extrabold tracking-[0.25em] text-mustard uppercase">{view.case.code} · The reveal</p>
          <p
            className={cx(
              "mx-auto mt-7 inline-block -rotate-6 animate-stamp rounded-2xl border-4 px-5 py-1 font-display text-3xl uppercase sm:text-5xl",
              outcome.kind === "solved" ? "border-teal text-teal" : "border-coral text-coral",
            )}
          >
            {headline.stamp}
          </p>
          <p className="mt-4 text-lg font-bold text-cream/80">
            {outcome.kind === "wrong" && accused ? `You accused ${accused.name}. ` : ""}
            {headline.text}
          </p>
          <div className="mt-5">
            <Stars count={outcome.score.stars} />
          </div>

          <SuspectPortrait suspect={culprit} shocked className="mx-auto mt-6 w-32 animate-pop-in [animation-delay:1.4s] sm:w-40" />
          <p className="font-display text-4xl text-mustard text-pop">It was {culprit.name}.</p>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed font-semibold text-cream/90">{solution.explanation}</p>
        </section>

        {outcome.kind !== "gaveUp" && (
          <Panel title="Your score">
            <ul className="grid gap-2">
              {breakdown.map((b) => (
                <li key={b.label} className="flex items-center gap-3 rounded-2xl bg-night/40 px-3 py-2">
                  <span className={cx("grid size-7 place-items-center rounded-full border-2 border-ink", b.ok ? "bg-teal text-ink" : "bg-coral text-cream")}>
                    <Icon name={b.ok ? "check" : "x"} className="size-4" />
                  </span>
                  <span className="flex-1 font-bold text-cream">{b.label}</span>
                  <span className="flex gap-0.5">
                    {Array.from({ length: b.worth }, (_, i) => (
                      <Icon key={i} name="star" filled={b.ok} className={cx("size-4", b.ok ? "text-mustard" : "text-cream/20")} />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Time", value: duration(view) ?? "–" },
                { label: "Hints", value: String(view.hintsUsed) },
                { label: "Wrong answers", value: String(view.wrongAnswers) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border-[3px] border-ink bg-cream p-2 text-ink">
                  <dd className="font-display text-2xl">{s.value}</dd>
                  <dt className="text-xs font-extrabold text-ink/60">{s.label}</dt>
                </div>
              ))}
            </dl>
            {topFinder && (
              <p className="mt-4 flex items-center justify-center gap-2 text-center font-bold text-cream/80">
                <Icon name="sparkle" className="text-mustard" /> Sharpest eyes: {nameOf(view, topFinder[0])} with {topFinder[1]} finds
              </p>
            )}
          </Panel>
        )}

        <FeedbackCard code={view.code} />

        <Panel title="What really happened">
          <ol className="relative grid gap-4 border-l-[3px] border-mustard/40 pl-5">
            {solution.timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1.5 -left-[1.95rem] size-4 rounded-full border-[3px] border-ink bg-mustard" />
                <p className="font-mono text-sm font-bold text-mustard">{t.time}</p>
                <p className="font-semibold text-cream/90">{t.text}</p>
              </li>
            ))}
          </ol>
        </Panel>

        <section>
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="flex w-full items-center justify-between rounded-2xl border-[3px] border-ink bg-dusk px-5 py-4 font-display text-xl text-cream shadow-pop-sm"
            aria-expanded={showAll}
          >
            Every piece of evidence ({view.evidence.length})
            <Icon name="arrow" className={cx("transition-transform", showAll && "rotate-90")} />
          </button>
          {showAll && (
            <div className="mt-4 grid gap-5">
              {view.evidence.map((e) => (
                <EvidenceCard key={e.id} evidence={e} />
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href="/host">Host another case</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back home
          </ButtonLink>
        </div>
      </div>
    </GameProvider>
  );
}
