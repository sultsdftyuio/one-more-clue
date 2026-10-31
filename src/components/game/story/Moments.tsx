"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerView, VisibleEvidence } from "@/lib/game/engine";
import { play } from "../audio/sound";
import { evidenceIn, useGame } from "../context";
import { EvidenceObject, snippet } from "../evidence/EvidenceCard";
import { ContradictionSlip } from "../evidence/objects/FindingNote";
import { PinButton } from "../evidence/PinButton";
import { ReadOutButton } from "../evidence/ReadOut";
import { Cassette } from "../evidence/RecordingPlayer";
import { ZoomedSpot } from "../evidence/SceneView";
import { SuspectPortrait } from "../parts";
import { useTypewriter } from "./StoryPlayer";

/** Seconds into a contradiction when the stamp lands. */
const STAMP_AT = 0.6;

/** A pop-up for something this player just found, played out the way their role found it. Stays until they close it. */
function MomentCard({ evidence, onClose }: { evidence: VisibleEvidence; onClose: () => void }) {
  const { view } = useGame();
  const body = evidence.body;
  const speaks = evidence.source === "interview";
  const spoken = speaks && body.type === "statement" ? body.text : "";
  const typed = useTypewriter(spoken, Boolean(spoken));

  useEffect(() => {
    // The stamp's sound lands with the stamp, once the two papers have met.
    if (evidence.source === "crosscheck") {
      const timer = window.setTimeout(() => play("stamp"), STAMP_AT * 1000);
      return () => window.clearTimeout(timer);
    }
    const sound = { search: "match", inspect: "found" } as const;
    if (evidence.source in sound) play(sound[evidence.source as keyof typeof sound]);
  }, [evidence.source]);

  const scene = evidence.spot && evidenceIn(view, evidence.spot.scene);

  let content;
  if (evidence.source === "search") {
    // The record prints out of the terminal, line by line.
    content = (
      <div>
        <div className="tool-terminal relative z-10 flex items-center gap-2 rounded-xl border-[3px] border-ink px-4 py-2.5 shadow-pop-sm">
          <span className="size-2.5 animate-pulse rounded-full bg-teal" />
          <span className="font-printer text-2xl leading-none text-teal">Match found</span>
          <span className="ml-auto h-1.5 w-1/3 rounded-full bg-black" />
        </div>
        <div className="moment-print mx-3 max-h-[58svh] overflow-y-auto">
          <EvidenceObject evidence={evidence} />
        </div>
      </div>
    );
  } else if (speaks && body.type === "statement") {
    const suspect = view.case.suspects.find((s) => s.name === body.speaker);
    content = (
      <div>
        <div className="mx-auto mb-3 w-44">
          <Cassette playing={!typed.complete} progress={typed.complete ? 1 : 0.5} />
        </div>
        <div className="flex items-end gap-3">
          {suspect ? (
            <SuspectPortrait suspect={suspect} className="w-24 shrink-0 animate-pop-in" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-lilac font-display text-2xl text-ink">
              {body.speaker[0]}
            </span>
          )}
          <div className="mb-4 flex-1 rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-4 py-3 text-ink shadow-card">
            <p className="text-sm font-extrabold text-ink/55">{body.speaker}</p>
            <p className="text-lg leading-snug font-bold">&ldquo;{typed.text}&rdquo;</p>
          </div>
        </div>
      </div>
    );
  } else if (evidence.source === "inspect" && scene && evidence.spot) {
    // The marked part of the picture develops in the tray, then the note appears under it.
    content = (
      <div className="text-center">
        <figure className="mx-auto w-[min(19rem,88%)] -rotate-2 border-[3px] border-ink bg-white p-2 pb-3 shadow-card">
          <ZoomedSpot scene={scene.body} hotspot={evidence.spot.hotspot} className="moment-develop" />
          <figcaption className="mt-2 font-hand text-xl leading-tight text-ink">{evidence.title}</figcaption>
        </figure>
        <p className="mx-auto mt-4 max-w-sm animate-[rise-in_0.4s_ease-out_1.5s_both] border-2 border-ink bg-[#ffe98f] px-4 py-2 font-hand text-[1.3rem] leading-snug text-ink">{snippet(body)}</p>
      </div>
    );
  } else if (evidence.source === "crosscheck" && body.type === "finding") {
    // Two papers meet in the middle, and the stamp comes down.
    const [a, b] = evidence.compared ?? [];
    content = (
      <div>
        <div className="mb-3 flex gap-2 text-center text-sm leading-tight font-extrabold text-ink">
          <span className="grid flex-1 animate-[slide-left_0.45s_ease-out_both] place-items-center border-2 border-ink bg-[#fbf6ea] p-2">{a}</span>
          <span className="grid flex-1 animate-[slide-right_0.45s_ease-out_both] place-items-center border-2 border-ink bg-[#fbf6ea] p-2">{b}</span>
        </div>
        <div className="animate-[rise-in_0.3s_ease-out_0.3s_both]">
          <ContradictionSlip evidence={{ ...evidence, compared: undefined }} body={body} stampDelay={STAMP_AT} />
        </div>
      </div>
    );
  } else {
    content = (
      <div className="max-h-[70svh] overflow-y-auto">
        <EvidenceObject evidence={evidence} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[52] grid animate-[fade-in_0.2s_ease-out] grid-cols-[minmax(0,1fr)] place-items-center overflow-y-auto bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label={evidence.title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-md animate-[curtain_0.3s_ease-out]">
        {content}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <PinButton evidence={evidence} />
          <ReadOutButton evidence={evidence} />
          <button
            type="button"
            onClick={() => (speaks && !typed.complete ? typed.finish() : onClose())}
            className="rounded-full border-2 border-cream/30 px-4 py-1.5 text-sm font-extrabold text-cream hover:bg-cream/10"
          >
            {speaks && !typed.complete ? "Skip" : "Got it"}
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
      else if (a.kind === "lead") play("found");
      else if (a.kind === "objection") play("vote");
      else if (a.kind === "miss" && mine) play("miss");
      else if (a.kind === "pin") play("pin");
      else if (a.kind === "found" && !mine) play("tap");
      else if (a.kind === "hint") play("message");
    }
  }, [view.activity, view.me.id]);

  return null;
}

