"use client";

import type { ReactNode } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { foundHotspots, nameOf, useGame } from "../context";
import { Icon, type IconName } from "../ui/Icon";
import { SceneView } from "./SceneView";

const SOURCE: Record<VisibleEvidence["source"], { icon: IconName; label: string; tone: string }> = {
  desk: { icon: "file", label: "Case file", tone: "bg-cream-dk" },
  search: { icon: "search", label: "Records search", tone: "bg-teal/40" },
  interview: { icon: "mic", label: "Interview", tone: "bg-lilac/40" },
  inspect: { icon: "eye", label: "Spotted in a photo", tone: "bg-mustard/60" },
  crosscheck: { icon: "scale", label: "Contradiction", tone: "bg-coral/40" },
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
      return body.caption;
  }
}

function Body({ evidence }: { evidence: VisibleEvidence }) {
  const { view, act } = useGame();
  const body = evidence.body;
  switch (body.type) {
    case "statement":
      return (
        <blockquote className="paper rounded-2xl border-2 border-ink/10 p-4 leading-7">
          <p className="text-[1.05rem] font-semibold">&ldquo;{body.text}&rdquo;</p>
          <footer className="mt-2 text-sm font-extrabold text-ink/55">— {body.speaker}</footer>
        </blockquote>
      );
    case "chat":
      return (
        <div className="rounded-2xl bg-ink p-3">
          <p className="mb-3 text-center text-xs font-extrabold tracking-wide text-cream/60">{body.title}</p>
          <ul className="space-y-2">
            {body.messages.map((m, i) => (
              <li key={i} className="max-w-[88%] rounded-2xl rounded-tl-md bg-dusk px-3 py-2 text-cream">
                <p className="text-[0.7rem] font-extrabold text-mustard">
                  {m.from} <span className="font-semibold text-cream/50">· {m.time}</span>
                  {m.edited && <span className="text-cream/50"> · edited</span>}
                </p>
                <p className="leading-snug font-semibold">{m.text}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "log":
      return (
        <div className="receipt rounded-b-xl px-4 pt-5 pb-3 font-mono text-sm text-ink">
          <p className="mb-2 border-b-2 border-dashed border-ink/20 pb-2 text-center text-xs font-bold tracking-wide text-ink/60 uppercase">
            {body.source}
          </p>
          <table className="w-full">
            <tbody>
              {body.rows.map((row, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-3 font-bold whitespace-nowrap text-coral-dk">{row.time}</td>
                  <td className="py-1 font-semibold">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "document":
      return <p className="paper rounded-2xl border-2 border-ink/10 p-4 leading-7 font-semibold whitespace-pre-line">{body.text}</p>;
    case "finding":
      return (
        <p
          className={cx(
            "rounded-2xl border-[3px] border-dashed p-4 text-[1.05rem] leading-relaxed font-bold",
            evidence.source === "crosscheck" ? "border-coral bg-coral/10" : "border-mustard bg-mustard/15",
          )}
        >
          {body.text}
        </p>
      );
    case "scene": {
      const canInspect = view.phase === "investigation" && view.me.abilities.includes("inspect");
      return (
        <div>
          <SceneView
            scene={body}
            found={foundHotspots(view, evidence.id)}
            onInspect={canInspect ? (hotspot) => act({ type: "inspect", scene: evidence.id, hotspot }, { quiet: true }) : undefined}
          />
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink/55">
            <Icon name="eye" className="size-4" />
            {canInspect ? "You're the Photographer: tap anything to look closer." : "Only the Photographer can inspect photos. Pin it for them."}
          </p>
        </div>
      );
    }
  }
}

function Meta({ evidence }: { evidence: VisibleEvidence }) {
  const { view } = useGame();
  const source = SOURCE[evidence.source];
  return (
    <div className={cx("flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs font-extrabold text-ink/70", source.tone)}>
      <Icon name={source.icon} className="size-4" />
      <span className="tracking-wide uppercase">{source.label}</span>
      <span className="rounded-full bg-ink/10 px-2 py-0.5">Ch. {evidence.chapter}</span>
      {evidence.foundBy && <span className="ml-auto">found by {nameOf(view, evidence.foundBy)}</span>}
    </div>
  );
}

/** Pin or unpin, with the board's space in mind. */
export function PinButton({ evidence, className }: { evidence: VisibleEvidence; className?: string }) {
  const { view, act, busy } = useGame();
  if (view.phase !== "investigation") return null;
  const pin = view.pins.find((p) => p.evidenceId === evidence.id);
  const full = view.pins.length >= view.pinLimit;
  if (pin) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          act({ type: "unpin", evidenceId: evidence.id });
        }}
        className={cx("inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mustard px-3 py-1.5 text-sm font-extrabold text-ink hover:bg-cream", className)}
      >
        <Icon name="pin" className="size-4" filled />
        Pinned{pin.by !== view.me.id && ` by ${nameOf(view, pin.by)}`} · Unpin
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy || full}
      title={full ? "The board is full. Unpin something first." : undefined}
      onClick={(e) => {
        e.stopPropagation();
        act({ type: "pin", evidenceId: evidence.id });
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-3 py-1.5 text-sm font-extrabold text-cream shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50",
        className,
      )}
    >
      <Icon name="pin" className="size-4" />
      {full ? "Board full" : "Pin to board"}
    </button>
  );
}

/** A piece of evidence at full size. */
export function EvidenceCard({ evidence, footer, highlight }: { evidence: VisibleEvidence; footer?: ReactNode; highlight?: boolean }) {
  return (
    <article
      id={`evidence-${evidence.id}`}
      className={cx("overflow-hidden rounded-3xl border-[3px] border-ink bg-cream text-ink shadow-pop", highlight && "game-glow")}
    >
      <Meta evidence={evidence} />
      <div className="p-4 sm:p-5">
        <h3 className="mb-3 font-display text-[1.4rem] leading-tight">{evidence.title}</h3>
        <Body evidence={evidence} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PinButton evidence={evidence} />
          {footer}
        </div>
      </div>
    </article>
  );
}

/** A piece of evidence as a small tile; tapping opens it. */
export function EvidenceTile({ evidence, onOpen, selected }: { evidence: VisibleEvidence; onOpen: () => void; selected?: boolean }) {
  const { view } = useGame();
  const source = SOURCE[evidence.source];
  const pin = view.pins.find((p) => p.evidenceId === evidence.id);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "group flex h-full w-full flex-col overflow-hidden rounded-2xl border-[3px] border-ink bg-cream text-left text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5",
        selected && "ring-4 ring-mustard",
      )}
    >
      <span className={cx("flex items-center gap-1.5 px-3 py-1.5 text-[0.7rem] font-extrabold tracking-wide text-ink/70 uppercase", source.tone)}>
        <Icon name={source.icon} className="size-3.5" />
        {source.label}
        {pin && <Icon name="pin" filled className="ml-auto size-3.5 text-coral-dk" />}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="font-display text-lg leading-tight">{evidence.title}</span>
        <span className="line-clamp-3 text-sm leading-snug font-semibold text-ink/70">{snippet(evidence.body)}</span>
      </span>
      {pin && <span className="px-3 pb-2 text-xs font-bold text-ink/50">pinned by {nameOf(view, pin.by)}</span>}
    </button>
  );
}
