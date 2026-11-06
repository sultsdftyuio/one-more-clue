"use client";

import { useEffect, useRef, useState } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { nameOf, useGame } from "../context";
import { buzz, BUZZ } from "../haptics";
import { Icon } from "../ui/Icon";
import { EvidenceObject } from "./EvidenceCard";
import { PinButton } from "./PinButton";

/** Pushes a piece onto every other phone for a moment. Only worth showing with someone to show it to. */
export function ShowEveryoneButton({ evidence, className }: { evidence: VisibleEvidence; className?: string }) {
  const { view, act, busy } = useGame();
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const timer = window.setTimeout(() => setSent(false), 2500);
    return () => window.clearTimeout(timer);
  }, [sent]);
  if (view.phase !== "investigation" || view.players.length < 2) return null;
  return (
    <button
      type="button"
      disabled={busy || sent}
      onClick={async (e) => {
        e.stopPropagation();
        if (await act({ type: "spotlight", evidenceId: evidence.id })) setSent(true);
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-2 text-sm font-extrabold transition-colors",
        sent ? "bg-teal text-ink" : "bg-cream text-ink hover:bg-mustard",
        className,
      )}
    >
      <Icon name={sent ? "check" : "share"} className="size-4" />
      {sent ? "On everyone's phone" : "Show everyone"}
    </button>
  );
}

/** How long a shown piece stays up on its own. Anyone can close it sooner. */
const SHOWN_MS = 9000;

/**
 * Something a teammate pushed onto every phone. It arrives with a sound and a
 * nudge, stays a few seconds, and only ever shows one at a time. Older shows
 * that were already up when this phone joined never pop up again.
 */
export function SpotlightMoment() {
  const { view } = useGame();
  const shown = view.spotlight;
  const seen = useRef<string | null | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const id = shown?.id ?? null;
    if (seen.current === undefined) {
      seen.current = id;
      return;
    }
    if (!id || id === seen.current) return;
    seen.current = id;
    if (shown!.by === view.me.id) return;
    setOpen(id);
    play("spotlight");
    buzz(BUZZ.tap);
  }, [shown, view.me.id]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setOpen(null), SHOWN_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open || !shown || shown.id !== open) return null;
  return (
    <div className="fixed inset-0 z-[54] grid animate-[fade-in_0.2s_ease-out] grid-cols-[minmax(0,1fr)] place-items-center overflow-y-auto bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-label={`${nameOf(view, shown.by)} is showing you ${shown.evidence.title}`}>
      <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute inset-0" />
      <div className="relative w-full max-w-md animate-[curtain_0.3s_ease-out]">
        <p className="mb-3 flex items-center justify-center gap-2 text-center text-sm font-extrabold tracking-widest text-mustard uppercase">
          <Icon name="share" className="size-4" /> {nameOf(view, shown.by)} is showing you
        </p>
        <p className="mb-3 text-center font-display text-2xl leading-tight text-cream">{shown.evidence.title}</p>
        <div className="max-h-[60svh] overflow-y-auto">
          <EvidenceObject evidence={shown.evidence} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {shown.evidence.pinned || view.evidence.some((e) => e.id === shown.evidence.id) ? <PinButton evidence={shown.evidence} /> : null}
          <button type="button" onClick={() => setOpen(null)} className="rounded-full border-2 border-cream/30 px-4 py-1.5 text-sm font-extrabold text-cream hover:bg-cream/10">
            Got it
          </button>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-cream/15" aria-hidden>
          <div className="h-full origin-left bg-mustard" style={{ animation: `drain ${SHOWN_MS}ms linear both` }} />
        </div>
      </div>
    </div>
  );
}
