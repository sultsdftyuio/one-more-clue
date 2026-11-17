"use client";

import type { MatchSide, PlayerView, VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { evidenceIn, useGame } from "../../context";
import { Icon, type IconName } from "../../ui/Icon";
import { SceneThumb, ZoomedSpot } from "../SceneView";

type Finding = Extract<EvidenceBody, { type: "finding" }>;

/** What kind of paper a piece is, as a small icon: a phone for a chat, a clock for a log, a mic for words someone said. */
export const PIECE_ICON: Partial<Record<EvidenceBody["type"], IconName>> = {
  chat: "chat",
  log: "clock",
  statement: "mic",
  document: "file",
  recording: "speaker",
  scene: "camera",
  footage: "camera",
  finding: "eye",
};

/** One side of a contradiction: the piece's name, then the picture or the words that clash. */
function SideCard({ side }: { side: MatchSide }) {
  const picture = side.picture && (side.picture.type === "scene" || side.picture.type === "footage") ? side.picture : null;
  return (
    <figure className="flex h-full min-w-0 flex-col rounded-sm border-2 border-ink/70 bg-white/70 p-1.5">
      <figcaption className="mb-1.5 flex items-start gap-1 text-xs leading-tight font-extrabold text-ink/70">
        <Icon name={PIECE_ICON[side.type] ?? "file"} className="mt-px size-3.5 shrink-0" />
        <span>{side.title}</span>
      </figcaption>
      {side.crop ? (
        <ZoomedSpot scene={side.crop.scene} hotspot={side.crop.hotspot} className="border-2 border-ink" />
      ) : picture ? (
        <SceneThumb scene={picture} />
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <blockquote className="font-typed text-[0.95rem] leading-snug break-words">&ldquo;{side.quote}&rdquo;</blockquote>
          {side.by && <p className="mt-1 text-xs leading-tight font-extrabold text-ink/60">{side.by}</p>}
        </div>
      )}
    </figure>
  );
}

/**
 * The Archivist's slip for two pieces that can't both be true. A case written picture-first puts
 * the two pieces side by side, so the clash speaks for itself and the team says why; an older case
 * names them and explains. The stamp only comes down when `stampDelay` is set; on the desk it's
 * already there. `enter` slides the two sides in from either edge.
 */
export function ContradictionSlip({ evidence, body, stampDelay, enter }: { evidence: VisibleEvidence; body: Finding; stampDelay?: number; enter?: boolean }) {
  const [a, b] = evidence.compared ?? [];
  const sides = evidence.sides;
  return (
    <div className="obj-slip relative border-2 border-ink px-4 pt-3 pb-4 text-ink">
      <p className="border-b-2 border-[#a23b3b] pb-1 font-typed text-lg leading-tight text-[#a23b3b]">Discrepancy report</p>
      {sides ? (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-1.5 pb-10">
          <div className={cx(enter && "animate-[slide-left_0.45s_ease-out_both]")}>
            <SideCard side={sides[0]} />
          </div>
          <span aria-label="does not match" className="self-center font-display text-3xl text-[#a23b3b]">
            ≠
          </span>
          <div className={cx(enter && "animate-[slide-right_0.45s_ease-out_both]")}>
            <SideCard side={sides[1]} />
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
      <span
        className={cx("absolute right-3 bottom-2.5 rounded-lg border-4 border-coral-dk px-2 font-display text-xl tracking-wide text-coral-dk", stampDelay === undefined ? "-rotate-12" : "animate-stamp")}
        style={stampDelay === undefined ? undefined : { animationDelay: `${stampDelay}s` }}
      >
        Contradiction
      </span>
    </div>
  );
}

/** A find's close-up: sent with the find, or cut from the photo when this phone has it. */
export function cropFor(view: PlayerView, evidence: VisibleEvidence) {
  if (evidence.crop) return evidence.crop;
  const scene = evidence.spot && evidenceIn(view, evidence.spot.scene);
  return scene && evidence.spot ? { scene: scene.body, hotspot: evidence.spot.hotspot, from: scene.title } : undefined;
}

/** The Photographer's notebook page: the print of what they caught, taped in, with a few words under it. */
export function NotebookPage({ evidence, body }: { evidence: VisibleEvidence; body: Finding }) {
  const { view } = useGame();
  const crop = cropFor(view, evidence);
  if (!crop) {
    return (
      <div className="obj-notebook relative border-2 border-ink pt-7 pr-4 pb-3 pl-5 text-ink">
        <p className="font-hand text-[1.4rem] leading-8">{body.text}</p>
      </div>
    );
  }
  return (
    <div className="obj-notebook relative border-2 border-ink px-4 pt-6 pb-2 text-ink">
      <figure className="relative mx-auto w-full max-w-sm -rotate-1 border-2 border-ink bg-white p-1.5 pb-2 shadow-pop-sm">
        <span aria-hidden className="obj-tape absolute -top-2 left-1/2 z-10 -translate-x-1/2 -rotate-3" />
        <ZoomedSpot scene={crop.scene} hotspot={crop.hotspot} />
        <figcaption className="mt-1.5 px-1 font-hand text-[1.45rem] leading-tight">{body.text}</figcaption>
      </figure>
      <p className="pt-2 text-right font-hand text-base leading-6 text-ink/60">from {crop.from}</p>
    </div>
  );
}
