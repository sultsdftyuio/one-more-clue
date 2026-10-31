"use client";

import type { PlayerView } from "@/lib/game/engine";
import type { DecidedProposal, Proposal } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { evidenceIn, nameOf, type Act } from "./context";
import { Icon } from "./ui/Icon";

type Described = Pick<Proposal, "kind" | "evidenceId" | "report" | "by">;

function headline(view: PlayerView, p: Described) {
  const who = nameOf(view, p.by);
  const verb = who === "You" ? "propose" : "proposes";
  if (p.kind === "answer") {
    const title = evidenceIn(view, p.evidenceId ?? "")?.title ?? "a piece of evidence";
    return `${who} ${who === "You" ? "present" : "presents"}: "${title}"`;
  }
  if (p.kind === "final") {
    const suspect = view.case.suspects.find((s) => s.id === p.report?.suspectId)?.name;
    return view.case.confrontation ? `${who} ${verb}: ${suspect} did it.` : `${who} ${verb} the final report: ${suspect} did it.`;
  }
  if (p.kind === "hint") return `${who} ${who === "You" ? "want" : "wants"} a hint.`;
  return `${who} ${who === "You" ? "want" : "wants"} to give up and see the answer.`;
}

const CONSEQUENCE: Record<Proposal["kind"], string> = {
  answer: "If the majority agrees, it's presented. Real proof opens the next chapter; anything else costs you.",
  final: "If the majority agrees, it's locked in. One shot: name the wrong person and the case is over.",
  hint: "If the majority agrees, the next hint opens for everyone.",
  giveUp: "If the majority agrees, the case ends and the answer is revealed.",
};

/** The open vote, pinned to the bottom of the screen so nobody misses it. */
export function ProposalBar({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const proposal = view.proposal;
  if (!proposal) return <LastDecision view={view} decision={view.decided.at(-1)} />;

  const mine = proposal.votes[view.me.id];
  const yes = Object.values(proposal.votes).filter((v) => v === "yes").length;
  const motive = view.case.motives.find((m) => m.id === proposal.report?.motiveId)?.label;

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-40 p-3 lg:bottom-0 lg:p-5" role="region" aria-label="Group vote" aria-live="polite">
      <div className="mx-auto max-w-2xl animate-[sheet-up_0.35s_ease-out] rounded-3xl border-[3px] border-ink bg-mustard p-4 text-ink shadow-card">
        <p className="flex items-start gap-2 font-display text-xl leading-tight">
          <Icon name="flag" className="mt-0.5" />
          {headline(view, proposal)}
        </p>
        {proposal.report && (
          <ul className="mt-2 grid gap-0.5 text-sm font-bold">
            <li>Why: {motive}</li>
            <li>Proof: {proposal.report.evidenceIds.map((id) => evidenceIn(view, id)?.title ?? "pinned evidence").join(" + ")}</li>
          </ul>
        )}
        <p className="mt-1 text-sm font-semibold text-ink/75">{CONSEQUENCE[proposal.kind]}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-cream">
            <div className="h-full bg-teal transition-[width] duration-500" style={{ width: `${Math.min(100, (yes / view.votesNeeded) * 100)}%` }} />
          </div>
          <span className="text-sm font-black whitespace-nowrap">
            {yes}/{view.votesNeeded} needed
          </span>
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {view.players.map((p) => {
            const vote = proposal.votes[p.id];
            return (
              <li key={p.id} className={cx("rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold", vote === "yes" ? "bg-teal" : vote === "no" ? "bg-coral text-cream" : "bg-cream")}>
                {p.id === view.me.id ? "You" : p.name} {vote === "yes" ? "✓" : vote === "no" ? "✗" : "…"}
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["yes", "no"] as const).map((vote) => (
            <button
              key={vote}
              type="button"
              disabled={busy}
              onClick={() => act({ type: "vote", proposalId: proposal.id, vote })}
              className={cx(
                "flex-1 rounded-full border-[3px] border-ink py-2 font-display text-lg transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:flex-none sm:px-6",
                mine === vote ? (vote === "yes" ? "bg-teal shadow-pop-sm" : "bg-coral text-cream shadow-pop-sm") : "bg-cream",
              )}
            >
              {vote === "yes" ? "Agree" : "Disagree"}
            </button>
          ))}
          {proposal.by === view.me.id && (
            <button type="button" onClick={() => act({ type: "withdraw", proposalId: proposal.id })} className="ml-auto text-sm font-extrabold text-ink/70 hover:underline">
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A short note on the latest decision, so the group knows what just happened. */
function LastDecision({ view, decision }: { view: PlayerView; decision?: DecidedProposal }) {
  if (!decision || Date.now() - decision.decidedAt > 12_000) return null;
  if (decision.passed && decision.kind !== "answer") return null;
  const wrong = decision.passed && decision.correct === false;
  const text = !decision.passed ? `Vote didn't pass: ${headline(view, decision)}` : wrong ? "That doesn't prove it. Look at the evidence again." : null;
  if (!text) return null;
  return (
    <p className="fixed inset-x-0 bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-40 mx-auto w-fit max-w-[calc(100%-1.5rem)] animate-pop-in rounded-full border-[3px] border-ink bg-cream px-4 py-2 text-center text-sm font-extrabold text-ink shadow-pop-sm lg:bottom-6">
      {wrong ? "✗ " : ""}
      {text}
    </p>
  );
}
