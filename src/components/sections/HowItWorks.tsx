"use client";

import Image from "next/image";
import { m, useInView, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CountUp } from "@/components/fx/CountUp";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/TiltCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { facts, steps, type Step } from "@/data/how-it-works";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { PhoneFrame } from "./PhoneFrame";

const tilts = ["-rotate-2", "rotate-1", "-rotate-1"];

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

/** The bit of evidence each step carries: the invite link, the board, the verdict. */
function StepEvidence({ index, active }: { index: number; active: boolean }) {
  if (index === 0)
    return (
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded-2xl rounded-bl-sm border-[0.1875rem] border-ink bg-teal px-3 py-2 text-sm font-bold text-ink">who&apos;s in for a mystery tonight?</span>
        <span className="rounded-2xl rounded-br-sm border-[0.1875rem] border-ink bg-cream px-3 py-2 font-mono text-sm font-bold text-ink">
          onemoreclue.com/r/<span className="rounded bg-mustard px-1">K7QX</span>
        </span>
      </div>
    );
  if (index === 1)
    return (
      <ul className="mt-5 flex flex-wrap gap-3">
        {(["phone", "keycard", "polaroid"] as const).map((prop, i) => (
          <li key={prop} className={cx("relative rounded-xl border-[0.1875rem] border-ink bg-cream p-1.5", ["-rotate-6", "rotate-3", "-rotate-2"][i])}>
            <Image src={propArt.pushpin} alt="" sizes="28px" className="absolute -top-3 left-1/2 w-7 -translate-x-1/2" />
            <Image src={propArt[prop]} alt="" sizes="56px" className="size-12" />
          </li>
        ))}
      </ul>
    );
  return (
    <div className="mt-5 h-12">
      <m.span
        className="inline-block rounded-xl border-[0.3125rem] border-coral px-4 py-0.5 font-display text-2xl tracking-widest text-coral uppercase"
        initial={false}
        animate={active ? { scale: 1, rotate: -8, opacity: 1 } : { scale: 2.2, rotate: -24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
      >
        Case closed
      </m.span>
    </div>
  );
}

function StepCard({ step, index, active, onActive, pin }: { step: Step; index: number; active: boolean; onActive: (i: number) => void; pin: (el: HTMLElement | null) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  // A step is "active" while it crosses the middle band of the screen.
  const centred = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (centred) onActive(index);
  }, [centred, index, onActive]);

  return (
    <li ref={ref} className="lg:flex lg:min-h-[64vh] lg:items-center">
      <m.div
        className="w-full"
        animate={{ opacity: active ? 1 : 0.55, scale: active ? 1 : 0.95 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <Reveal>
          <div className={cx("relative rounded-3xl border-[0.1875rem] border-ink bg-white px-6 pt-20 pb-7 shadow-card", tilts[index])}>
            {/* The pin the red string runs through. */}
            <span ref={pin} aria-hidden className="absolute top-3 left-1/2 z-10 size-0" />
            <Image src={propArt.pushpin} alt="" sizes="40px" className="absolute -top-4 left-1/2 z-20 w-10 -translate-x-1/2" />
            <m.div
              className="absolute -top-16 -right-4 w-32 sm:w-36"
              animate={active ? { y: [0, -10, 0], rotate: [0, -6, 0] } : { y: 0, rotate: 0 }}
              transition={{ duration: 2.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
            >
              <Image src={propArt[step.prop]} alt="" sizes="144px" />
            </m.div>
            <span
              className={cx(
                "absolute top-5 left-5 grid size-11 place-items-center rounded-full border-[0.1875rem] border-ink font-display text-xl transition-colors",
                active ? "bg-coral text-cream" : "bg-mustard",
              )}
            >
              {index + 1}
            </span>
            <p className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">Exhibit {String.fromCharCode(65 + index)}</p>
            <h3 className="font-display text-3xl">{step.title}</h3>
            <p className="mt-2 text-lg leading-relaxed font-semibold text-ink/75">{step.text}</p>
            <StepEvidence index={index} active={active} />
          </div>
        </Reveal>
        {/* Phones get their own screen under each step. */}
        <m.div
          className="mx-auto mt-16 w-[min(15rem,58vw)] lg:hidden"
          initial={{ opacity: 0, rotateX: 35, y: 60 }}
          whileInView={{ opacity: 1, rotateX: 8, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 16 }}
          style={{ transformPerspective: 1000 }}
        >
          <PhoneFrame screen={index} rotateY={index % 2 ? 12 : -12} />
        </m.div>
      </m.div>
    </li>
  );
}

/**
 * Red string from pin to pin down the steps, drawn as you scroll. The pins are
 * measured, so it follows the cards wherever the layout puts them.
 */
function RedString({ pins, children }: { pins: (HTMLElement | null)[]; children: ReactNode }) {
  const box = useRef<HTMLOListElement>(null);
  const [d, setD] = useState("");
  const { scrollYProgress } = useScroll({ target: box, offset: ["start 70%", "end 60%"] });
  const length = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const o = el.getBoundingClientRect();
      const pts = pins.flatMap((p) => {
        if (!p) return [];
        const r = p.getBoundingClientRect();
        return [[r.left - o.left, r.top - o.top] as const];
      });
      if (pts.length < 2) return;
      // Each span sags a little and swings out to the side, like string pulled between pins.
      setD(
        pts.reduce((path, [x, y], i) => {
          if (i === 0) return `M ${x} ${y}`;
          const [px, py] = pts[i - 1];
          const swing = i % 2 ? -1 : 1;
          return `${path} Q ${(px + x) / 2 + swing * Math.min(140, o.width * 0.3)} ${(py + y) / 2 + 40} ${x} ${y}`;
        }, ""),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pins]);

  return (
    <ol ref={box} className="relative space-y-32 lg:space-y-0">
      {/* Behind the cards: the string disappears under each one and comes out at its pin. */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {d && (
          <>
            <m.path d={d} fill="none" stroke="rgba(27,31,59,0.18)" strokeWidth={5} strokeLinecap="round" style={{ pathLength: length, translateY: 4 }} />
            <m.path d={d} fill="none" stroke="var(--color-coral)" strokeWidth={3.5} strokeLinecap="round" style={{ pathLength: length }} />
          </>
        )}
      </svg>
      {children}
    </ol>
  );
}

export function HowItWorks() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [pins, setPins] = useState<(HTMLElement | null)[]>([]);
  // One stable ref callback per step, so React doesn't detach and reattach them every render.
  const pinRefs = useMemo(
    () =>
      steps.map((_, i) => (el: HTMLElement | null) => {
        if (el) setPins((p) => (p[i] === el ? p : Object.assign([...p], { [i]: el })));
      }),
    [],
  );
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "end start"] });
  // The phone turns slowly in your hand as you read down the steps.
  const rotateY = useTransform(scrollYProgress, [0.2, 0.8], [-26, 20]);
  const rotateX = useTransform(scrollYProgress, [0.2, 0.8], [12, -4]);

  return (
    <section
      ref={section}
      className="relative overflow-x-clip bg-cream px-4 pt-28 pb-20 text-ink sm:px-6 sm:pt-32 sm:pb-24"
      style={{
        backgroundImage:
          "linear-gradient(rgba(27,31,59,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(27,31,59,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <Tape className="top-10 -left-[20%] -rotate-3" from="left">
        Crime scene · Do not cross
      </Tape>
      <Tape className="top-[4.6rem] -left-[10%] rotate-2 opacity-90" from="right">
        Evidence inside
      </Tape>

      <Reveal>
        <SectionHeading eyebrow="How it works" title="The internet is the crime scene" surface="light" className="relative mt-10">
          Every case is a pile of digital evidence and a group of friends who think they know better.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-28 max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-24">
        <RedString pins={pins}>
          {steps.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} active={active === i} onActive={setActive} pin={pinRefs[i]} />
          ))}
        </RedString>
        <div className="hidden lg:block">
          <div className="sticky top-[12vh] px-10">
            <PhoneFrame screen={active} rotateX={rotateX} rotateY={rotateY} />
            <p className="mt-14 text-center text-sm font-extrabold text-ink/60">Real screens from a real game</p>
          </div>
        </div>
      </div>

      {/* The facts, tied on like evidence tags. */}
      <div className="mx-auto mt-24 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
        {facts.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 0.08} className="relative">
            <span aria-hidden className="absolute -top-6 left-1/2 h-8 w-0.5 -translate-x-1/2 bg-ink/40" />
            <TiltCard className="rounded-2xl" max={14}>
              <p className={cx("relative rounded-2xl border-[0.1875rem] border-ink bg-[#e8c98d] px-4 pt-7 pb-4 text-center shadow-pop", ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"][i])}>
                <span aria-hidden className="absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-ink bg-cream" />
                <CountUp value={fact.value} className="block font-display text-4xl text-ink" />
                <span className="text-sm font-extrabold text-ink/70">{fact.label}</span>
              </p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
