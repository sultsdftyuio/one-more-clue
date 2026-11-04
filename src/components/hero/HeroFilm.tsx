"use client";

import { AnimatePresence, m, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePointer } from "@/components/fx/pointer";
import { Icon } from "@/components/game/ui/Icon";
import { duckSound } from "@/components/home/sound";
import { cx } from "@/lib/cx";

type Props = { video: string; poster: string; label: string; className?: string };

/** Whether the visitor asked for less motion or less data: then the film waits for a tap. */
function holdBack() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || Boolean(saveData);
}

/**
 * The case's opening film, playing on a phone in the street. It starts muted
 * once the page has loaded and pauses when scrolled away; one tap plays it
 * from the top with the narrator, and quiets the page's own sounds meanwhile.
 */
export function HeroFilm({ video, poster, label, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const { x, y } = usePointer();
  const rotateY = useTransform(x, [-1, 1], [-10, 6]);
  const rotateX = useTransform(y, [-1, 1], [5, -5]);

  useEffect(() => {
    const film = ref.current;
    if (!film) return;
    if (holdBack()) {
      setWaiting(true);
      return;
    }
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) film.pause();
        else if (!film.ended) film.play().catch(() => setWaiting(true));
      },
      { threshold: 0.35 },
    );
    // Load the film after the page, so it never holds up the first paint.
    const start = () => seen.observe(film);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      seen.disconnect();
      window.removeEventListener("load", start);
      duckSound(false);
    };
  }, []);

  const fromTheTop = (withSound: boolean) => {
    const film = ref.current;
    if (!film) return;
    film.muted = !withSound;
    film.currentTime = 0;
    setMuted(!withSound);
    setEnded(false);
    setWaiting(false);
    duckSound(withSound);
    void film.play();
  };

  const hush = () => {
    if (ref.current) ref.current.muted = true;
    setMuted(true);
    duckSound(false);
  };

  return (
    // The entrance is CSS, so the phone shows on slow phones before the JavaScript arrives.
    <div className={cx("animate-phone-in [perspective:1200px] [animation-delay:0.6s]", className)}>
      <m.div
        className="relative rounded-[2.4rem] border-[0.1875rem] border-ink bg-[#07081a] p-2 shadow-[0_0.625rem_0_var(--color-ink),0_30px_60px_rgba(0,0,0,0.55)]"
        style={{ rotateX, rotateY, rotate: 3 }}
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.9rem] bg-night">
          <video
            ref={ref}
            src={video}
            poster={poster}
            muted
            playsInline
            preload="none"
            onEnded={() => {
              setEnded(true);
              duckSound(false);
            }}
            aria-label={`${label}: the opening film`}
            className="absolute inset-0 size-full object-cover"
          />
          <span aria-hidden className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#07081a]" />

          <AnimatePresence>
            {(ended || waiting) && (
              <m.div
                key="again"
                className="absolute inset-0 grid place-items-center bg-night/70 p-5 text-center backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>
                  <p className="font-display text-2xl leading-tight text-cream text-pop">
                    {ended ? "That's how it opens." : "Every case opens like a film."}
                  </p>
                  <button
                    type="button"
                    onClick={() => fromTheTop(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border-[0.1875rem] border-ink bg-cream px-4 py-2 font-display text-lg text-ink shadow-pop-sm"
                  >
                    <Icon name="speaker" className="size-5" />
                    {ended ? "Watch again" : "Play with sound"}
                  </button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
        <p className="absolute -top-4 -left-5 z-10 -rotate-6 rounded-full border-[0.1875rem] border-ink bg-mustard px-3 py-0.5 text-xs font-extrabold tracking-widest whitespace-nowrap text-ink uppercase shadow-pop-sm">
          {label}
        </p>
      </m.div>

      {/* Under the phone, not on it, so it never covers the film's captions. */}
      <button
        type="button"
        onClick={() => (muted || ended || waiting ? fromTheTop(true) : hush())}
        aria-pressed={!muted && !ended}
        className="mx-auto mt-5 flex animate-rise-in items-center gap-2 rounded-full border-[0.1875rem] border-ink bg-cream px-4 py-2 text-sm font-extrabold whitespace-nowrap text-ink shadow-pop-sm transition-transform [animation-delay:1.4s] hover:-translate-y-0.5"
      >
        <Icon name={muted || ended ? "speakerOff" : "speaker"} className="size-4" />
        {muted || ended || waiting ? "Hear the narrator" : "Mute"}
      </button>
    </div>
  );
}
