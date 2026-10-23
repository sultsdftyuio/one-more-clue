"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

/** A modal: a bottom sheet on phones, a centred card on larger screens. Esc or the backdrop closes it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-night/75 backdrop-blur-sm" />
      <div className="relative max-h-[92svh] w-full max-w-2xl animate-[sheet-up_0.3s_cubic-bezier(0.2,0.9,0.3,1.1)] overflow-y-auto rounded-t-[2rem] border-[3px] border-b-0 border-ink bg-dusk p-4 pb-8 shadow-card sm:rounded-[2rem] sm:border-b-[3px] sm:p-6">
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
