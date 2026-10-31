"use client";

import type { VisibleEvidence } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { nameOf, useGame } from "../context";
import { Icon } from "../ui/Icon";

/** Pin or unpin, showing how much room the board has left. */
export function PinButton({ evidence, className }: { evidence: VisibleEvidence; className?: string }) {
  const { view, act, busy } = useGame();
  if (view.phase !== "investigation") return null;
  const pin = view.pins.find((p) => p.evidenceId === evidence.id);
  const left = view.pinLimit - view.pins.length;
  if (pin) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          act({ type: "unpin", evidenceId: evidence.id });
        }}
        className={cx("inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mustard px-3.5 py-2 text-sm font-extrabold text-ink hover:bg-cream", className)}
      >
        <Icon name="pin" className="size-4" filled />
        On the board{pin.by !== view.me.id && `, from ${nameOf(view, pin.by)}`} · Unpin
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy || left <= 0}
      title={left <= 0 ? "The board is full. Unpin something first." : undefined}
      onClick={(e) => {
        e.stopPropagation();
        act({ type: "pin", evidenceId: evidence.id });
      }}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-3.5 py-2 text-sm font-extrabold text-cream shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50",
        className,
      )}
    >
      <Icon name="pin" className="size-4" />
      {left <= 0 ? "Board full" : `Pin to board (${left} left)`}
    </button>
  );
}
