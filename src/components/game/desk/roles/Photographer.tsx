"use client";

import Image from "next/image";
import { propArt } from "@/lib/art";
import { foundHotspots, useGame } from "../../context";
import { Icon } from "../../ui/Icon";

/** The Photographer works in the darkroom: every picture is a frame on the strip, waiting to be read. */
export function PhotographerTool() {
  const { view, open } = useGame();
  const frames = view.evidence.filter((e) => e.body.type === "scene" || e.body.type === "footage");

  return (
    <section className="tool-darkroom rounded-3xl border-[3px] border-ink p-4 text-cream shadow-pop sm:p-5">
      <header className="mb-1 flex items-center gap-2.5">
        <Image src={propArt.polaroid} alt="" sizes="56px" className="w-11 -rotate-6" />
        <h3 className="font-display text-2xl leading-tight">The darkroom</h3>
      </header>
      <p className="mb-4 text-sm leading-snug font-semibold text-cream/70">Open a picture and tap anything that looks off. Only you can do this, even on pictures others pin.</p>
      {frames.length ? (
        <div className="film-strip rounded-lg px-2.5 py-3.5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {frames.map((frame, i) => {
              const marked = foundHotspots(view, frame.id).length;
              return (
                <li key={frame.id}>
                  <button
                    type="button"
                    onClick={() => open(frame.id)}
                    className="flex w-full items-center gap-3 rounded-md border-2 border-coral/30 bg-[#2a0c0e] px-3 py-2.5 text-left font-bold transition-colors hover:border-coral hover:bg-[#3d1215]"
                  >
                    <span className="font-mono text-xs text-coral">{String(i + 1).padStart(2, "0")}A</span>
                    <span className="min-w-0 flex-1">
                      <span className="block leading-tight">{frame.title}</span>
                      <span className="block text-xs font-semibold text-cream/55">
                        {marked ? `${marked} ${marked === 1 ? "detail" : "details"} marked` : "Not read yet"}
                      </span>
                    </span>
                    <Icon name="eye" className="size-4 shrink-0 text-coral" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="font-semibold text-cream/60">Nothing to develop yet. When someone pins a picture, it shows up here.</p>
      )}
    </section>
  );
}
