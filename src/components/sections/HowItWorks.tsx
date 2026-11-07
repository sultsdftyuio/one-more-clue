"use client";

import Image from "next/image";
import { animate, AnimatePresence, m, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/fx/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { hero } from "@/data/hero";
import { steps, type Clue } from "@/data/how-it-works";
import { roles } from "@/data/roles";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { PhoneStage } from "./PhoneStage";

/** How far you scroll per step while the stage is pinned, in screen heights. */
const PER_STEP = 0.5;

/** The phone's angle at each step: from turned left at the start to turned right at the end. */
const turnFor = (i: number) => {
  const t = steps.length > 1 ? i / (steps.length - 1) : 0;
  return { y: -24 + t * 46, x: 10 - t * 14 };
};

/** Crime-scene tape across the section, sliding in from one side. */
function Tape({ className, from, children }: { className: string; from: "left" | "right"; children: string }) {
  return (
    <m.div
      aria-hidden
      className={cx("pointer-events-none absolute w-[140%] border-y-[0.1875rem] border-ink bg-mustard py-1.5 shadow-pop-sm", className)}
      initial={{ x: from === "left" ? "-60%" : "60%", opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 60, damping: 16 }}
    >
      <p className="font-display text-sm tracking-[0.35em] whitespace-nowrap text-ink uppercase">{Array(12).fill(children).join(" · ")}</p>
    </m.div>
  );
}

/** The bit of evidence each step carries: the film, the roles, the vote, the objection, the stars. */
function StepEvidence({ clue, active }: { clue: Clue; active: boolean }) {
  const pop = (i: number) => ({
    initial: false as const,
    animate: active ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.85, opacity: 0.6, y: 4 },
    transition: { type: "spring" as const, stiffness: 380, damping: 18, delay: active ? 0.1 + i * 0.08 : 0 },
  });


  if (clue === "film")
    return (
      <div className="mt-5 flex items-center gap-4">
        {/* A frame of the opening film, on a strip of film stock. */}
        <div className="relative w-16 shrink-0 -rotate-3 rounded-md border-[0.1875rem] border-ink bg-ink px-2 py-1.5 shadow-pop-sm">
          <div className="absolute inset-y-1 left-0.5 flex w-1 flex-col justify-between">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1 rounded-[1px] bg-cream/70" />)}
          </div>
          <div className="absolute inset-y-1 right-0.5 flex w-1 flex-col justify-between">
            {Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1 rounded-[1px] bg-cream/70" />)}
          </div>
          <div className="relative aspect-[9/16] overflow-hidden rounded-sm">
            <Image src={hero.film.poster} alt="" fill sizes="64px" className="object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-6 place-items-center rounded-full bg-cream/90 pl-0.5 text-[0.6rem] text-ink">▶</span>
            </span>
          </div>
        </div>
        <p className="font-mono text-sm font-bold text-ink/70">
          <span className="rounded bg-mustard px-1 text-ink">9:17 PM</span> Case 001 · The opening
        </p>
      </div>
    );

  if (clue === "roles")
    return (
      <ul className="mt-5 flex flex-wrap items-center gap-2">
        {roles.map((role, i) => (
          <m.li key={role.id} {...pop(i)} className={cx("rounded-full border-[0.1875rem] border-ink px-3 py-1 text-sm font-extrabold shadow-pop-sm", role.tint)}>
            {role.name}
          </m.li>
        ))}
      </ul>
    );

  if (clue === "vote")
    return (
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="relative -rotate-2 rounded-xl border-[0.1875rem] border-ink bg-cream px-3 pt-4 pb-2 shadow-pop-sm">
          <Image src={propArt.pushpin} alt="" sizes="28px" className="absolute -top-3 left-1/2 w-7 -translate-x-1/2" />
          <p className="text-[0.65rem] font-extrabold tracking-widest text-ink/50 uppercase">Presented</p>
          {/* Hidden on purpose, like the game screens: blurred, never a black bar. */}
          <p aria-label="A piece of evidence, hidden" className="mt-1 text-sm font-extrabold whitespace-nowrap text-ink blur-[3px] select-none">
            <span aria-hidden>The night&apos;s best clue</span>
          </p>
        </div>
        <ul className="flex gap-1.5" aria-label="Three of four agree">
          {[true, true, true, false].map((yes, i) => (
            <m.li key={i} {...pop(i)} className={cx("grid size-8 place-items-center rounded-full border-[0.1875rem] border-ink text-sm font-extrabold", yes ? "bg-teal" : "bg-cream text-ink/40")}>
              {yes ? "✓" : "?"}
            </m.li>
          ))}
        </ul>
      </div>
    );

  if (clue === "objection")
    return (
      <div className="mt-5 max-w-56 overflow-hidden rounded-xl border-[0.1875rem] border-ink bg-coral shadow-pop-sm">
        <p className="px-3 pt-2 font-display text-lg text-cream">Objection!</p>
        <div className="h-2 bg-ink/20">
          <m.div
            className="h-full origin-left bg-cream"
            initial={false}
            animate={active ? { scaleX: [1, 0] } : { scaleX: 1 }}
            transition={active ? { duration: 5, ease: "linear", repeat: Infinity, repeatDelay: 0.8 } : { duration: 0.3 }}
          />
        </div>
      </div>
    );

  return (
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <m.span
        className="inline-block rounded-xl border-[0.3125rem] border-coral px-4 py-0.5 font-display text-2xl tracking-widest text-coral uppercase"
        initial={false}
        animate={active ? { scale: 1, rotate: -8, opacity: 1 } : { scale: 2.2, rotate: -24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
      >
        Case closed
      </m.span>
      <span className="flex gap-1 text-2xl text-mustard [text-shadow:0_2px_0_var(--color-ink)]" aria-label="Five stars">
        {Array.from({ length: 5 }, (_, i) => (
          <m.span key={i} {...pop(i + 2)}>
            ★
          </m.span>
        ))}
      </span>
    </div>
  );
}

/** The step's number, title, words and its small piece of evidence: the caption beside (or under) the phone. */
function Caption({ index }: { index: number }) {
  const step = steps[index];
  return (
    <div>
      <p className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border-[0.1875rem] border-ink bg-coral font-display text-lg text-cream lg:size-11 lg:text-xl">
          {index + 1}
        </span>
        <span className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">
          Exhibit {String.fromCharCode(65 + index)} · {index + 1} of {steps.length}
        </span>
      </p>
      <h3 className="mt-3 font-display text-3xl leading-none lg:text-5xl">{step.title}</h3>
      <p className="mt-3 max-w-md text-base leading-relaxed font-semibold text-ink/75 lg:text-lg">{step.text}</p>
      <div className="max-lg:hidden">
        <StepEvidence clue={step.clue} active />
      </div>
    </div>
  );
}

/**
 * The steps as pins on a red string: the string fills as you scroll, and each
 * pin jumps to its step. A column beside the phone on wide screens, a row of
 * pins above it on phones.
 */
function StepPins({ active, progress, go, vertical }: { active: number; progress: MotionValue<number>; go: (i: number) => void; vertical: boolean }) {
  return (
    <nav aria-label="Steps of a night" className="relative">
      {/* The string: a faint track, and the red part pulled through so far. */}
      <span aria-hidden className={cx("absolute rounded-full bg-ink/15", vertical ? "top-5 bottom-5 left-[1.0625rem] w-1" : "top-[1.3rem] right-5 left-5 h-1")} />
      <m.span
        aria-hidden
        className={cx("absolute rounded-full bg-coral", vertical ? "top-5 bottom-5 left-[1.0625rem] w-1 origin-top" : "top-[1.3rem] right-5 left-5 h-1 origin-left")}
        style={vertical ? { scaleY: progress } : { scaleX: progress }}
      />
      <ol className={cx("relative flex", vertical ? "flex-col gap-3" : "justify-between")}>
        {steps.map((step, i) => (
          <li key={step.title}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === active ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${step.title}`}
              className="group flex min-h-[44px] items-center gap-3 text-left"
            >
              <span
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full border-[0.1875rem] border-ink font-display text-base transition-[background-color,transform] duration-200",
                  i === active ? "scale-110 bg-coral text-cream" : i < active ? "bg-mustard text-ink" : "bg-cream text-ink/60 group-hover:bg-mustard/60",
                )}
              >
                {i + 1}
              </span>
              {vertical && (
                <span className={cx("font-display text-lg leading-tight transition-colors", i === active ? "text-ink" : "text-ink/45 group-hover:text-ink/70")}>
                  {step.title}
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The caption, swapping as the step changes. */
function LiveCaption({ active, reduce, rise }: { active: number; reduce: boolean | null; rise: number }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={active}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: rise }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -rise * 0.6 }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      >
        <Caption index={active} />
      </m.div>
    </AnimatePresence>
  );
}

/**
 * "How a night plays": the phone is the stage. The section pins to the screen
 * while you scroll through the five moments; the phone turns in your hand and
 * its screen moves on, with the words for each moment beside it.
 */
export function HowItWorks() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  // Only a new step re-renders; scrolling within a step changes nothing.
  const current = useRef(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const step = Math.min(steps.length - 1, Math.max(0, Math.floor(p * steps.length)));
    if (step !== current.current) {
      current.current = step;
      setActive(step);
    }
  });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  // The phone turns a little further in your hand with each step, then holds
  // still. Turning it on every scroll frame repainted the phone non-stop.
  const rotateY = useMotionValue(turnFor(0).y);
  const rotateX = useMotionValue(turnFor(0).x);
  useEffect(() => {
    const { x, y } = turnFor(active);
    if (reduce) {
      rotateX.set(x);
      rotateY.set(y);
      return;
    }
    const opts = { type: "spring", stiffness: 70, damping: 16 } as const;
    const runs = [animate(rotateY, y, opts), animate(rotateX, x, opts)];
    return () => runs.forEach((r) => r.stop());
  }, [active, reduce, rotateX, rotateY]);

  /** Scrolls to the middle of a step's stretch of the pinned track. */
  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const run = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + ((i + 0.5) / steps.length) * run, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section
      className="relative overflow-x-clip bg-cream text-ink"
      style={{
        backgroundImage:
          "linear-gradient(rgba(27,31,59,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(27,31,59,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="relative px-4 pt-28 sm:px-6 sm:pt-32">
        <Tape className="top-10 -left-[20%] -rotate-3" from="left">
          Crime scene · Do not cross
        </Tape>
        <Tape className="top-[4.6rem] -left-[10%] rotate-2 opacity-90" from="right">
          Evidence inside
        </Tape>
        <Reveal>
          <SectionHeading eyebrow="How a night plays" title="One case. One team. One liar." surface="light" className="relative mt-10">
            Every case opens with a short film. Then each of you works your own role, and nobody can crack it alone.
          </SectionHeading>
        </Reveal>
      </div>

      {/* Every step's words for screen readers and search engines; the stage below shows one at a time. */}
      <ol className="sr-only">
        {steps.map((step) => (
          <li key={step.title}>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>

      {/* The track is as tall as the scrolling the steps need; the stage stays pinned inside it. */}
      <div ref={track} className="relative" style={{ height: `${100 + steps.length * PER_STEP * 100}svh` }}>
        <div className="sticky top-0 flex h-[100svh] flex-col px-4 pt-5 pb-[4.5rem] sm:px-6 lg:justify-center lg:py-8">
          <div className="mx-auto grid w-full max-w-6xl flex-1 grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:flex-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,15rem)] lg:grid-rows-1 lg:gap-10 lg:gap-16">
            {/* Phones: the pins in a row over the phone. */}
            <div className="mx-auto w-full max-w-xs lg:hidden">
              <StepPins active={active} progress={progress} go={go} vertical={false} />
            </div>

            {/* Wide screens: the words on the left. */}
            <div className="relative max-lg:hidden" aria-hidden>
              <LiveCaption active={active} reduce={reduce} rise={24} />
            </div>

            {/* The phone: the hero of the section. */}
            <div className="relative isolate flex min-h-0 flex-col items-center justify-center">
              {/* Behind the phone: a warm pool of light and the step's number, huge and faint. */}
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,180,61,0.38),rgba(244,180,61,0)_62%)]" />
              <AnimatePresence initial={false}>
                <m.span
                  key={active}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 font-display text-[11rem] leading-none text-ink/[0.07] lg:text-[26rem]"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  0{active + 1}
                </m.span>
              </AnimatePresence>
              <div className="w-[min(calc(44svh*375/859),54vw)] sm:w-[min(calc(52svh*375/859),20rem)] lg:w-[min(calc(76svh*375/859),26rem)]">
                <PhoneStage screen={active} rotateX={rotateX} rotateY={rotateY} />
              </div>
              <p className="mt-10 text-center text-xs font-extrabold tracking-wide text-ink/50 uppercase max-lg:hidden">Real screens from a real game</p>
            </div>

            {/* Wide screens: the pins on the right. Phones: the words under the phone. */}
            <div className="max-lg:hidden">
              <StepPins active={active} progress={progress} go={go} vertical />
            </div>
            <div className="relative min-h-[10.5rem] w-full sm:mx-auto sm:max-w-lg lg:hidden" aria-hidden>
              <LiveCaption active={active} reduce={reduce} rise={16} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
