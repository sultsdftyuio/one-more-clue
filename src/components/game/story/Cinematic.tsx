"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";

/**
 * A case's opening film, full screen. It starts on its own when the browser
 * allows sound; otherwise (iPhones, mostly) one big tap starts it. Skip is
 * always there, and the film ending moves on by itself.
 */
export function Cinematic({ video, poster, onDone }: { video: string; poster?: string; onDone: () => void }) {
  const film = useRef<HTMLVideoElement>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    film.current?.play().catch(() => setNeedsTap(true));
  }, []);

  const start = () => {
    setNeedsTap(false);
    film.current?.play().catch(() => setNeedsTap(true));
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden bg-black" role="dialog" aria-modal aria-label="The case opens">
      {/* The film is vertical: on wide screens a blurred, dimmed copy fills the sides. */}
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl" />
      )}
      <video ref={film} src={video} poster={poster} playsInline preload="auto" onEnded={onDone} className="absolute inset-0 h-full w-full object-contain" />
      {needsTap && (
        <button
          type="button"
          onClick={start}
          className="absolute inset-0 grid place-items-center bg-black/55"
          aria-label="Play the opening"
        >
          <span className="flex flex-col items-center gap-4">
            <span className="grid size-24 animate-pulse place-items-center rounded-full border-4 border-cream/80 text-cream">
              <Icon name="arrow" className="size-10" />
            </span>
            <span className="font-display text-2xl text-cream">Tap to open the case</span>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={onDone}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-1.5 rounded-full border-2 border-cream/30 bg-black/40 px-4 py-1.5 text-sm font-extrabold text-cream/80 backdrop-blur hover:text-cream"
      >
        Skip <Icon name="skip" className="size-4" />
      </button>
    </div>
  );
}
