"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { useGame } from "../context";
import { Icon } from "../ui/Icon";
import { PinButton } from "./PinButton";
import { SceneThumb } from "./SceneView";

type Line = { label?: string; text: string };

/** What a piece of evidence says, line by line, ready to be spoken. */
function linesOf(body: EvidenceBody): Line[] {
  switch (body.type) {
    case "statement":
      return [{ label: body.speaker, text: `“${body.text}”` }];
    case "chat":
      return body.messages.map((m) => ({ label: `${m.from}, ${m.time}${m.edited ? " (edited)" : ""}`, text: m.text }));
    case "log":
      return body.rows.map((r) => ({ label: r.time || undefined, text: r.text }));
    case "document":
      return body.text.split("\n").map((text) => ({ text }));
    case "finding":
      return [{ text: body.text }];
    case "recording":
      return body.segments.map((s) => ({ label: s.at, text: s.text }));
    case "scene":
    case "footage":
      return [{ text: body.caption }];
  }
}

/** Big enough to read aloud across a table, or to turn the phone round and show someone. */
function ReadOutView({ evidence, onClose }: { evidence: VisibleEvidence; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const body = evidence.body;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-[fade-in_0.15s_ease-out] flex-col bg-night text-cream" role="dialog" aria-modal aria-label={`Read out ${evidence.title}`}>
      <header className="flex items-start gap-3 border-b-[3px] border-ink bg-dusk px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold text-mustard">Read this out</span>
          <span className="block font-display text-2xl leading-tight">{evidence.title}</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 shrink-0 place-items-center rounded-full bg-night/60 hover:bg-coral">
          <Icon name="x" />
        </button>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {(body.type === "scene" || body.type === "footage") && <SceneThumb scene={body} />}
        {linesOf(body).map((line, i) => (
          <p key={i}>
            {line.label && <span className="block text-base font-extrabold text-mustard">{line.label}</span>}
            <span className="block text-[1.7rem] leading-snug font-bold">{line.text}</span>
          </p>
        ))}
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t-[3px] border-ink bg-dusk p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PinButton evidence={evidence} />
        <button type="button" onClick={onClose} className="rounded-full border-2 border-cream/30 px-5 py-2 text-sm font-extrabold hover:bg-cream/10">
          Done
        </button>
      </footer>
    </div>,
    document.body,
  );
}

/** Opens the big reading view, for evidence only this player can see or that the team should hear. */
export function ReadOutButton({ evidence }: { evidence: VisibleEvidence }) {
  const { view } = useGame();
  const [open, setOpen] = useState(false);
  if (view.phase !== "investigation") return null;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3.5 py-2 text-sm font-extrabold text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5"
      >
        <Icon name="speaker" className="size-4" /> Read out
      </button>
      {open && <ReadOutView evidence={evidence} onClose={() => setOpen(false)} />}
    </>
  );
}
