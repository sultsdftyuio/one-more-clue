"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Sheets can stack, so the page only scrolls again once the last one has gone. */
let openSheets = 0;

/**
 * A modal: a bottom sheet on phones, a centred card on larger screens. Esc or the backdrop closes it. `side` (the
 * world game) docks it to the right edge at full height on larger screens instead, so the building stays in view.
 */
export function Sheet({ title, onClose, children, side = false }: { title: string; onClose: () => void; children: ReactNode; side?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    openSheets += 1;
    document.body.style.overflow = "hidden";
    return () => {
      openSheets -= 1;
      if (!openSheets) document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className={
        side ? "fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end sm:p-3" : "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      }
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={
          side
            ? "absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-night/75 backdrop-blur-sm sm:bg-night/20 sm:backdrop-blur-none"
            : "absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-night/75 backdrop-blur-sm"
        }
      />
      <div
        className={
          side
            ? "relative max-h-[92svh] w-full max-w-2xl animate-[sheet-up_0.3s_cubic-bezier(0.2,0.9,0.3,1.1)] overflow-y-auto rounded-t-[2rem] border-[3px] border-b-0 border-ink bg-dusk p-4 pb-8 shadow-card sm:max-h-none sm:w-[min(30rem,46vw)] sm:max-w-none sm:animate-[sheet-in_0.28s_cubic-bezier(0.2,0.9,0.3,1)] sm:rounded-[1.75rem] sm:border-b-[3px] sm:p-6"
            : "relative max-h-[92svh] w-full max-w-2xl animate-[sheet-up_0.3s_cubic-bezier(0.2,0.9,0.3,1.1)] overflow-y-auto rounded-t-[2rem] border-[3px] border-b-0 border-ink bg-dusk p-4 pb-8 shadow-card sm:rounded-[2rem] sm:border-b-[3px] sm:p-6"
        }
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="mx-auto h-1.5 w-12 rounded-full bg-cream/25 sm:hidden" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-night/60 text-cream hover:bg-coral"
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
