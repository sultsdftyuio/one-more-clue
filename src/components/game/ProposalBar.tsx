"use client";

import type { PlayerView } from "@/lib/game/engine";
import type { Action, DecidedProposal, Proposal } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { nameOf } from "./parts";

function describe(view: PlayerView, p: Pick<Proposal, "kind" | "suspectId" | "by">) {
  const who = nameOf(view, p.by);
  const verb = who === "You" ? "want" : "wants";
  const suspect = view.case.suspects.find((s) => s.id === p.suspectId)?.name;
  if (p.kind === "accuse") return `${who} ${verb} to accuse ${suspect}.`;
  if (p.kind === "hint") return `${who} ${verb} a hint.`;
  return `${who} ${verb} to give up and see the answer.`;
}

const consequence: Record<Proposal["kind"], string> = {
  accuse: "If the majority agrees, that's your final answer.",
  hint: "If the majority agrees, the next hint unlocks for everyone.",
  giveUp: "If the majority agrees, the case ends and the answer is revealed.",
};

/** The open vote, pinned to the bottom of the screen so nobody misses it. */
export function ProposalBar({ view, act, busy }: { view: PlayerView; act: (a: Action) => Promise<boolean>; busy: boolean }) {
  const proposal = view.proposal;
  if (!proposal) return <LastDecision view={view} decision={view.decided.at(-1)} />;

  const mine = proposal.votes[view.me.id];
  const yes = Object.values(proposal.votes).filter((v) => v === "yes").length;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-3 sm:p-4" role="region" aria-label="Group vote" aria-live="polite">
      <div className="mx-auto max-w-3xl animate-pop-in rounded-3xl border-[3px] border-ink bg-mustard p-4 text-ink shadow-card">
        <p className="font-display text-xl leading-tight">{describe(view, proposal)}</p>
        <p className="mt-1 text-sm font-bold text-ink/75">
          {consequence[proposal.kind]} {yes} of {view.votesNeeded} votes needed.
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {view.players.map((p) => {
            const vote = proposal.votes[p.id];
            return (
              <li
                key={p.id}
                className={cx(
                  "rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold",
                  vote === "yes" ? "bg-teal" : vote === "no" ? "bg-coral text-cream" : "bg-cream",
                )}
              >
                {p.id === view.me.id ? "You" : p.name} {vote === "yes" ? "✓" : vote === "no" ? "✗" : "…"}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["yes", "no"] as const).map((vote) => (
            <button
              key={vote}
              type="button"
              disabled={busy}
              onClick={() => act({ type: "vote", proposalId: proposal.id, vote })}
              className={cx(
                "rounded-full border-[3px] border-ink px-5 py-2 font-display text-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60",
                mine === vote ? (vote === "yes" ? "bg-teal" : "bg-coral text-cream") : "bg-cream",
              )}
            >
              {vote === "yes" ? "Agree" : "Disagree"}
            </button>
          ))}
          {proposal.by === view.me.id && (
            <button
              type="button"
              onClick={() => act({ type: "withdraw", proposalId: proposal.id })}
              className="ml-auto font-extrabold text-ink/70 hover:underline"
            >
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A short note when the latest vote didn't pass, so the group knows why nothing happened. */
function LastDecision({ view, decision }: { view: PlayerView; decision?: DecidedProposal }) {
  if (!decision || decision.passed || Date.now() - decision.decidedAt > 20_000) return null;
  return (
    <p className="fixed inset-x-0 bottom-0 z-30 mx-auto mb-3 w-fit max-w-[calc(100%-1.5rem)] animate-pop-in rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-center text-sm font-extrabold text-ink shadow-pop-sm">
      Vote didn&apos;t pass: {describe(view, decision)}
    </p>
  );
}
