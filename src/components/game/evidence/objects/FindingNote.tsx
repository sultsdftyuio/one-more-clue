"use client";

import type { VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { evidenceIn, useGame } from "../../context";
import { ZoomedSpot } from "../SceneView";

type Finding = Extract<EvidenceBody, { type: "finding" }>;

/** The Archivist's slip for two pieces that can't both be true. The stamp only comes down when `stampDelay` is set; on the desk it's already there. */
export function ContradictionSlip({ evidence, body, stampDelay }: { evidence: VisibleEvidence; body: Finding; stampDelay?: number }) {
  const [a, b] = evidence.compared ?? [];
  return (
    <div className="obj-slip relative border-2 border-ink px-4 pt-3 pb-4 text-ink">
      <p className="border-b-2 border-[#a23b3b] pb-1 font-typed text-lg leading-tight text-[#a23b3b]">Discrepancy report</p>
      {a && b && (
        <p className="mt-3 flex items-stretch gap-2 text-center text-sm leading-tight font-extrabold">
          <span className="flex flex-1 items-center justify-center rounded-sm border-2 border-ink/60 bg-white/60 p-1.5">{a}</span>
          <span aria-label="does not match" className="self-center font-display text-2xl text-[#a23b3b]">
            ≠
          </span>
          <span className="flex flex-1 items-center justify-center rounded-sm border-2 border-ink/60 bg-white/60 p-1.5">{b}</span>
        </p>
      )}
      <p className="mt-3 pb-9 font-typed text-[1.05rem] leading-7">{body.text}</p>
      <span
        className={cx("absolute right-3 bottom-2.5 rounded-lg border-4 border-coral-dk px-2 font-display text-xl tracking-wide text-coral-dk", stampDelay === undefined ? "-rotate-12" : "animate-stamp")}
        style={stampDelay === undefined ? undefined : { animationDelay: `${stampDelay}s` }}
      >
        Contradiction
      </span>
    </div>
  );
}

/** The Photographer's notebook page, with the part of the picture they marked taped on. */
export function NotebookPage({ evidence, body }: { evidence: VisibleEvidence; body: Finding }) {
  const { view } = useGame();
  const scene = evidence.spot && evidenceIn(view, evidence.spot.scene);
  return (
    <div className="obj-notebook relative border-2 border-ink pt-7 pr-4 pb-3 pl-5 text-ink">
      {scene && evidence.spot && (
        <figure className="relative float-right mb-1 ml-3 w-[38%] rotate-2 border-2 border-ink bg-white p-1">
          <span aria-hidden className="obj-tape absolute -top-2 left-1/2 -translate-x-1/2 -rotate-3" />
          <ZoomedSpot scene={scene.body} hotspot={evidence.spot.hotspot} />
        </figure>
      )}
      <p className="font-hand text-[1.4rem] leading-8">{body.text}</p>
      {scene && <p className="clear-both pt-1 text-right font-hand text-base leading-8 text-ink/60">from {scene.title}</p>}
    </div>
  );
}
