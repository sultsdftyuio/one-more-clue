"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { aimCamera } from "../camera-events";
import { foundHotspots, nameOf, useGame } from "../context";
import { Icon, type IconName } from "../ui/Icon";
import { ChatPhone } from "./objects/ChatPhone";
import { ContradictionSlip, NotebookPage } from "./objects/FindingNote";
import { LogPrintout } from "./objects/LogPrintout";
import { StatementForm } from "./objects/StatementForm";
import { TypedSheet } from "./objects/TypedSheet";
import { PinButton } from "./PinButton";
import { ReadOutButton } from "./ReadOut";
import { RecordingPlayer } from "./RecordingPlayer";
import { ShowEveryoneButton } from "./ShowEveryone";
import { FootageView, SceneThumb, SceneView, type Tints } from "./SceneView";

const SOURCE: Record<VisibleEvidence["source"], { icon: IconName; label: string; tone: string }> = {
  desk: { icon: "file", label: "Case file", tone: "bg-cream-dk" },
  search: { icon: "search", label: "Records search", tone: "bg-teal" },
  interview: { icon: "mic", label: "Interview", tone: "bg-lilac" },
  inspect: { icon: "eye", label: "Spotted in a photo", tone: "bg-mustard" },
  crosscheck: { icon: "scale", label: "Contradiction", tone: "bg-coral" },
};

/** One line of what a piece of evidence says, for compact cards. */
export function snippet(body: EvidenceBody) {
  switch (body.type) {
    case "statement":
    case "document":
    case "finding":
      return body.text;
    case "chat":
      return body.messages.map((m) => `${m.from}: ${m.text}`).join(" · ");
    case "log":
      return body.rows.map((r) => `${r.time} ${r.text}`).join(" · ");
    case "scene":
    case "footage":
      return body.caption;
    case "recording":
      return body.segments.map((s) => `${s.at} ${s.text}`).join(" · ");
  }
}

/** This case's character colours, keyed by art name, for drawing scenes. */
export const tintsOf = (suspects: { art?: string; tint?: number }[]): Tints =>
  Object.fromEntries(suspects.flatMap((s) => (s.art && s.tint ? [[s.art, s.tint]] : [])));

/** The piece of evidence itself, as the object it really is. */
export function EvidenceObject({ evidence }: { evidence: VisibleEvidence }) {
  const { view } = useGame();
  const body = evidence.body;
  switch (body.type) {
    case "statement":
      return <StatementForm id={evidence.id} body={body} />;
    case "chat":
      return <ChatPhone body={body} />;
    case "log":
      return <LogPrintout body={body} />;
    case "document":
      return <TypedSheet id={evidence.id} body={body} />;
    case "finding":
      return evidence.source === "crosscheck" ? <ContradictionSlip evidence={evidence} body={body} /> : <NotebookPage evidence={evidence} body={body} />;
    case "recording":
      return <RecordingPlayer recording={body} />;
    case "scene":
    case "footage": {
      const photographer = view.phase === "investigation" && view.me.abilities.includes("inspect");
      const props = { found: foundHotspots(view, evidence.id), tints: tintsOf(view.case.suspects) };
      return (
        <div>
          {body.type === "scene" ? <SceneView scene={body} {...props} /> : <FootageView footage={body} {...props} />}
          {photographer ? (
            <button
              type="button"
              onClick={() => aimCamera(evidence.id)}
              className="mt-3 inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-2 font-extrabold text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5"
            >
              <Icon name="camera" className="size-5" /> Open in your camera
            </button>
          ) : (
            view.phase === "investigation" && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-cream/70">
                <Icon name="camera" className="size-4" />
                Only the Photographer can photograph details. Pin it for them.
              </p>
            )
          )}
        </div>
      );
    }
  }
}

/** The evidence tag tied to each piece: what it is, where it came from and who's seen it. */
function EvidenceTag({ evidence }: { evidence: VisibleEvidence }) {
  const { view } = useGame();
  const source = SOURCE[evidence.source];
  return (
    <header className={cx("obj-tag relative mb-3.5 text-ink", source.tone)}>
      <p className="flex items-center gap-1.5 text-xs font-extrabold">
        <Icon name={source.icon} className="size-3.5" />
        {source.label}
        <span className="opacity-60">chapter {evidence.chapter}</span>
      </p>
      <h3 className="font-display text-[1.35rem] leading-tight">{evidence.title}</h3>
      {evidence.foundBy && <p className="text-xs font-bold opacity-70">Found by {nameOf(view, evidence.foundBy)}</p>}
    </header>
  );
}

/** A piece of evidence at full size, lying on the desk with its tag on. */
export function EvidenceCard({ evidence, footer, highlight }: { evidence: VisibleEvidence; footer?: ReactNode; highlight?: boolean }) {
  const { view } = useGame();
  return (
    <article id={`evidence-${evidence.id}`} className={cx("evidence-mat relative rounded-3xl border-[3px] border-ink p-3 text-ink shadow-pop sm:p-4", highlight && "game-glow")}>
      <EvidenceTag evidence={evidence} />
      <EvidenceObject evidence={evidence} />
      {view.phase === "investigation" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PinButton evidence={evidence} />
          <ReadOutButton evidence={evidence} />
          <ShowEveryoneButton evidence={evidence} />
          {!evidence.pinned && evidence.mine && (
            <span className="flex items-center gap-1 text-xs font-bold text-cream/65">
              <Icon name="lock" className="size-3.5" /> Only you have this
            </span>
          )}
          {footer}
        </div>
      )}
    </article>
  );
}

const TILT = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];

/** What a pinned piece looks like from across the room: its own paper, a title and a few words. */
function TileFace({ evidence }: { evidence: VisibleEvidence }) {
  const body = evidence.body;
  const text = snippet(body);
  if (body.type === "scene" || body.type === "footage") {
    return (
      <span className="block border-2 border-ink bg-white p-1 pb-1.5">
        <SceneThumb scene={body} />
        <span className="mt-1 block font-hand text-[1.05rem] leading-tight text-ink">{evidence.title}</span>
      </span>
    );
  }
  if (body.type === "chat") {
    return (
      <span className="block rounded-xl border-2 border-ink bg-[#1d2038] p-1.5 text-cream">
        <span className="block text-sm leading-tight font-extrabold">{evidence.title}</span>
        <span className="mt-1 block rounded-lg rounded-bl-sm bg-[#e8ecf7] px-1.5 py-1 text-ink">
          <span className="line-clamp-3 text-xs leading-snug font-semibold">{text}</span>
        </span>
      </span>
    );
  }
  if (body.type === "log") {
    return (
      <span className="tile-log block border-2 border-ink px-2 py-1.5 font-printer text-[#27304f]">
        <span className="block text-[1.05rem] leading-tight">{evidence.title}</span>
        <span className="mt-0.5 line-clamp-3 text-[0.95rem] leading-tight">{text}</span>
      </span>
    );
  }
  const crosscheck = evidence.source === "crosscheck";
  const note = body.type === "finding" && !crosscheck;
  return (
    <span className={cx("block border-2 border-ink px-2 py-1.5 text-ink", crosscheck ? "bg-[#f8cfc8]" : note ? "bg-[#ffe98f]" : "bg-[#fbf6ea]")}>
      <span className={cx("block leading-tight", note ? "font-hand text-[1.1rem]" : "font-typed text-[0.95rem]")}>{evidence.title}</span>
      <span className={cx("mt-1 line-clamp-3 leading-snug", note ? "font-hand text-base" : "text-xs font-semibold text-ink/75")}>{text}</span>
    </span>
  );
}

/** A piece of evidence lying on your desk, small; tapping picks it up. */
export function EvidenceThumb({ evidence, onOpen, fresh, index = 0 }: { evidence: VisibleEvidence; onOpen: () => void; fresh?: boolean; index?: number }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Pick up ${evidence.title}`} className={cx("relative block w-full text-left transition-transform hover:z-10 hover:scale-[1.04]", TILT[index % TILT.length])}>
      {evidence.pinned && <Image src={propArt.pushpin} alt="On the board" sizes="24px" className="absolute top-[-0.6rem] left-1/2 z-10 w-6 -translate-x-1/2" />}
      {fresh && <span className="absolute -top-2 -right-1 z-10 rotate-6 rounded-full border-2 border-ink bg-coral px-2 py-0.5 text-xs font-black text-cream">NEW</span>}
      <span className="block drop-shadow-[0_3px_0_rgb(0_0_0/0.4)]">
        <TileFace evidence={evidence} />
      </span>
    </button>
  );
}

/** A piece of evidence pinned to the corkboard; tapping opens it. */
export function EvidenceTile({ evidence, onOpen, selected, index = 0 }: { evidence: VisibleEvidence; onOpen: () => void; selected?: boolean; index?: number }) {
  const { view } = useGame();
  const pin = view.pins.find((p) => p.evidenceId === evidence.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx("relative block w-full pt-2 text-left transition-transform hover:z-10 hover:scale-[1.03]", TILT[index % TILT.length], selected && "ring-4 ring-mustard")}
    >
      <Image src={propArt.pushpin} alt="" sizes="28px" className="absolute top-[-0.35rem] left-1/2 z-10 w-7 -translate-x-1/2" />
      <span className="block drop-shadow-[0_4px_0_rgb(27_31_59/0.45)]">
        <TileFace evidence={evidence} />
      </span>
      {pin && <span className="mt-0.5 block text-center text-[0.7rem] font-extrabold text-ink/70">{nameOf(view, pin.by)}</span>}
    </button>
  );
}
