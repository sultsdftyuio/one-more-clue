"use client";

import { AnimatePresence, m, useAnimate, useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { burstConfetti } from "@/components/fx/confetti";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/TiltCard";
import { useBlackout } from "@/components/home/blackout";
import { sfx } from "@/components/home/sound";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { miniCase } from "@/data/mini-case";
import { suspectById } from "@/data/suspects";
import { brandArt } from "@/lib/art";
import { BlackoutClock } from "./BlackoutClock";
import { EvidenceCard } from "./EvidenceCard";
import { SuspectCard } from "./SuspectCard";
import { useMiniCase } from "./useMiniCase";
import { VerdictPanel } from "./VerdictPanel";

export function MiniCase() {
  const { verdicts, solved, wrongGuesses, lastWrong, accuse, reset } = useMiniCase(miniCase.liar);
  const { phase, setInCase, restoreLights } = useBlackout();
  const [scope, animate] = useAnimate<HTMLElement>();
  const inView = useInView(scope, { amount: 0.12 });
  const solvedOnce = useRef(false);

  useEffect(() => setInCase(inView), [inView, setInCase]);

  // Catching the liar: stamp, shake, confetti, and the lights come back on.
  useEffect(() => {
    if (!solved || solvedOnce.current) return;
    solvedOnce.current = true;
    sfx.stamp();
    void animate(scope.current, { x: [0, -14, 12, -9, 7, -4, 0] }, { duration: 0.55 });
    const t1 = window.setTimeout(() => burstConfetti(window.innerWidth / 2, window.innerHeight * 0.55, 180), 250);
    const t2 = window.setTimeout(restoreLights, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [solved, animate, scope, restoreLights]);

  useEffect(() => {
    if (lastWrong) sfx.stamp();
  }, [lastWrong]);

  const hint = miniCase.hints[Math.min(wrongGuesses, miniCase.hints.length) - 1];
  const status = lastWrong ? `Not ${suspectById(lastWrong).name}. ${hint}` : miniCase.prompt;
  const dark = phase === "dark";

  return (
    <m.section
      ref={scope}
      id="mini-case"
      className="relative isolate overflow-hidden px-4 py-20 sm:px-6 sm:py-24"
      animate={{ backgroundColor: dark ? "#0a0c1c" : "#1b1f3b" }}
      transition={{ duration: 0.8 }}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-20 transition-opacity duration-700"
        style={{ backgroundImage: `url(${brandArt.confetti.src})`, backgroundSize: "600px", opacity: dark ? 0.06 : 0.2 }}
      />

      <BlackoutClock />

      <Reveal>
        <SectionHeading eyebrow={miniCase.code} title={miniCase.title}>
          {miniCase.briefing}
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-20 grid max-w-6xl items-start gap-x-10 gap-y-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Reveal className="lg:sticky lg:top-24">
          <EvidenceCard {...miniCase.evidence} highlight={wrongGuesses > 0 && !solved} />
        </Reveal>

        <div className="grid gap-x-6 gap-y-20 sm:grid-cols-2">
          {miniCase.alibis.map((alibi, i) => (
            <Reveal key={alibi.suspect} delay={(i % 2) * 0.12}>
              <TiltCard className="rounded-3xl" max={8}>
                <SuspectCard
                  suspect={suspectById(alibi.suspect)}
                  alibi={alibi}
                  verdict={verdicts[alibi.suspect]}
                  locked={solved}
                  justCleared={lastWrong === alibi.suspect}
                  onAccuse={() => accuse(alibi.suspect)}
                />
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>

      {solved ? (
        <VerdictPanel {...miniCase.reveal} wrongGuesses={wrongGuesses} onReset={reset} />
      ) : (
        <AnimatePresence mode="wait">
          <m.p
            key={status}
            aria-live="polite"
            className="mx-auto mt-14 max-w-xl text-center text-lg font-bold text-mustard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {status}
          </m.p>
        </AnimatePresence>
      )}

      {/* The big stamp, slammed across the screen when the liar is caught. */}
      <AnimatePresence>
        {solved && (
          <m.div
            key="busted"
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[60] grid place-items-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.75, 1] }}
          >
            <m.span
              className="rounded-2xl border-[8px] border-coral bg-night/85 px-8 py-2 font-display text-[clamp(4rem,13.6vw,10rem)] tracking-widest text-coral uppercase shadow-[0_0_60px_rgba(239,91,91,0.55)]"
              initial={{ scale: 3, rotate: -28, opacity: 0 }}
              animate={{ scale: 1, rotate: -12, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
            >
              Busted
            </m.span>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
}
