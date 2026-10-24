"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView, VisibleEvidence } from "@/lib/game/engine";
import { play } from "../audio/sound";
import { useGame } from "../context";
import { PinButton, snippet } from "../evidence/EvidenceCard";
import { SuspectPortrait } from "../parts";
import { Icon } from "../ui/Icon";
import { useTypewriter } from "./StoryPlayer";

/** A pop-up for something this player just found, styled by how they found it. */
function MomentCard({ evidence, onClose }: { evidence: VisibleEvidence; onClose: () => void }) {
  const { view } = useGame();
  const body = evidence.body;
  const spoken = evidence.source === "interview" && body.type === "statement" ? body.text : "";
  const typed = useTypewriter(spoken, Boolean(spoken));

  useEffect(() => {
    const sound = { search: "match", inspect: "found", crosscheck: "stamp" } as const;
    if (evidence.source in sound) play(sound[evidence.source as keyof typeof sound]);
  }, [evidence.source]);

  useEffect(() => {
    if (evidence.source === "interview") return; // reading takes as long as it takes
    const timer = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timer);
  }, [evidence.source, onClose]);

  let content;
  if (evidence.source === "search") {
    content = (
      <div className="rounded-2xl border-[3px] border-ink bg-[#0d1117] p-4 font-mono text-[#7ee787] shadow-card">
        <p className="text-xs font-bold tracking-[0.3em]">▌ MATCH FOUND</p>
        <p className="mt-2 text-lg font-bold text-cream">{evidence.title}</p>
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-[#7ee787]/80">{snippet(body)}</p>
      </div>
    );
  } else if (evidence.source === "interview" && body.type === "statement") {
    const suspect = view.case.suspects.find((s) => s.name === body.speaker);
    content = (
      <div className="flex items-end gap-3">
        {suspect ? (
          <SuspectPortrait suspect={suspect} className="w-24 shrink-0 animate-pop-in" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-lilac font-display text-2xl text-ink">
            {body.speaker[0]}
          </span>
        )}
        <div className="mb-4 flex-1 rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
          <p className="text-xs font-extrabold tracking-wide text-ink/50 uppercase">{body.speaker}</p>
          <p className="text-lg leading-snug font-bold">&ldquo;{typed.text}&rdquo;</p>
        </div>
      </div>
    );
  } else if (evidence.source === "inspect") {
    content = (
      <div className="text-center">
        <span className="mx-auto grid size-24 animate-pop-in place-items-center rounded-full border-[6px] border-ink bg-mustard shadow-card">
          <Icon name="search" className="size-10 text-ink" />
        </span>
        <p className="mt-4 text-xs font-extrabold tracking-[0.25em] text-mustard uppercase">You spotted something</p>
        <p className="mt-1 font-display text-2xl text-cream">{evidence.title}</p>
        <p className="mx-auto mt-2 max-w-sm rounded-2xl border-[3px] border-dashed border-mustard bg-mustard/15 p-3 font-bold text-cream">{snippet(body)}</p>
      </div>
    );
  } else {
    content = (
      <div className="text-center">
        <p className="inline-block -rotate-6 animate-stamp rounded-2xl border-4 border-coral px-5 py-1 font-display text-4xl text-coral uppercase">Contradiction</p>
        <p className="mt-5 font-display text-2xl text-cream">{evidence.title}</p>
        <p className="mx-auto mt-2 max-w-sm rounded-2xl border-[3px] border-dashed border-coral bg-coral/15 p-3 font-bold text-cream">{snippet(body)}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[52] grid animate-[fade-in_0.2s_ease-out] place-items-center bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label={evidence.title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-md animate-[curtain_0.3s_ease-out]">
        {content}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <PinButton evidence={evidence} />
          <button
            type="button"
            onClick={() => (evidence.source === "interview" && !typed.complete ? typed.finish() : onClose())}
            className="rounded-full border-2 border-cream/30 px-4 py-1.5 text-sm font-extrabold text-cream hover:bg-cream/10"
          >
            {evidence.source === "interview" && !typed.complete ? "Skip" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pops up this player's own finds, one at a time, as they happen. */
export function Moments() {
  const { view } = useGame();
  const seen = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    const found = view.evidence.filter((e) => e.foundBy);
    if (!seen.current) {
      seen.current = new Set(found.map((e) => e.id));
      return;
    }
    const fresh = found.filter((e) => !seen.current!.has(e.id));
    fresh.forEach((e) => seen.current!.add(e.id));
    const mine = fresh.filter((e) => e.foundBy === view.me.id).map((e) => e.id);
    if (mine.length) setQueue((q) => [...q, ...mine]);
  }, [view.evidence, view.me.id]);

  const current = queue[0] ? view.evidence.find((e) => e.id === queue[0]) : undefined;
  if (!current) return null;
  return <MomentCard key={current.id} evidence={current} onClose={() => setQueue((q) => q.slice(1))} />;
}

/** Quiet sound cues for what the rest of the team does, and for votes opening. */
export function SoundCues({ view }: { view: PlayerView }) {
  const lastActivity = useRef<string | null>(null);
  const lastProposal = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const id = view.proposal?.id ?? null;
    if (lastProposal.current !== undefined && id && id !== lastProposal.current) play("vote");
    lastProposal.current = id;
  }, [view.proposal?.id]);

  useEffect(() => {
    const latest = view.activity.at(-1)?.id ?? null;
    if (lastActivity.current === null) {
      lastActivity.current = latest ?? "";
      return;
    }
    const from = view.activity.findIndex((a) => a.id === lastActivity.current);
    const fresh = view.activity.slice(from + 1);
    lastActivity.current = latest;
    for (const a of fresh) {
      const mine = a.playerId === view.me.id;
      if (a.kind === "wrong") play("wrong");
      else if (a.kind === "miss" && mine) play("miss");
      else if (a.kind === "pin") play("pin");
      else if (a.kind === "found" && !mine) play("tap");
      else if (a.kind === "hint") play("message");
    }
  }, [view.activity, view.me.id]);

  return null;
}

