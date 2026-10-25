"use client";

import Image from "next/image";
import { m, useInView, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/fx/CountUp";
import { Reveal } from "@/components/fx/Reveal";
import { TiltCard } from "@/components/fx/TiltCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { facts, steps, type Step } from "@/data/how-it-works";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { PhoneFrame } from "./PhoneFrame";

const tilts = ["-rotate-2", "rotate-1", "-rotate-1"];

function StepCard({ step, index, active, onActive }: { step: Step; index: number; active: boolean; onActive: (i: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  // A step is "active" while it crosses the middle band of the screen.
  const centred = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (centred) onActive(index);
  }, [centred, index, onActive]);

  return (
    <li ref={ref} className="lg:flex lg:min-h-[78vh] lg:items-center">
      <m.div
        className="w-full"
        animate={{ opacity: active ? 1 : 0.5, scale: active ? 1 : 0.95 }}
        transition={{ type: "spring", stiffness: 160, damping: 20 }}
      >
        <Reveal>
          <div className={cx("relative rounded-3xl border-[3px] border-ink bg-white px-6 pt-24 pb-8 shadow-card", tilts[index])}>
            <m.div
              className="absolute -top-20 left-1/2 w-44 -translate-x-1/2"
              animate={active ? { y: [0, -10, 0], rotate: [0, -6, 0] } : { y: 0, rotate: 0 }}
              transition={{ duration: 2.4, repeat: active ? Infinity : 0, ease: "easeInOut" }}
            >
              <Image src={propArt[step.prop]} alt="" sizes="176px" />
            </m.div>
            <span
              className={cx(
                "absolute top-4 left-4 grid size-10 place-items-center rounded-full border-[3px] border-ink font-display text-xl transition-colors",
                active ? "bg-coral text-cream" : "bg-mustard",
              )}
            >
              {index + 1}
            </span>
            <h3 className="font-display text-3xl">{step.title}</h3>
            <p className="mt-3 text-lg leading-relaxed font-semibold text-ink/75">{step.text}</p>
          </div>
        </Reveal>
        {/* Phones get their own screen under each step. */}
        <m.div
          className="mx-auto mt-14 w-[min(15rem,70vw)] lg:hidden"
          initial={{ opacity: 0, rotateX: 35, y: 60 }}
          whileInView={{ opacity: 1, rotateX: 8, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 80, damping: 16 }}
          style={{ transformPerspective: 1000 }}
        >
          <PhoneFrame screen={index} rotateY={index % 2 ? 10 : -10} />
        </m.div>
      </m.div>
    </li>
  );
}

export function HowItWorks() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "end start"] });
  // The phone turns slowly in your hand as you read down the steps.
  const rotateY = useTransform(scrollYProgress, [0.2, 0.8], [-24, 18]);
  const rotateX = useTransform(scrollYProgress, [0.2, 0.8], [12, -4]);

  return (
    <section ref={section} className="bg-cream px-4 py-20 text-ink sm:px-6 sm:py-24">
      <Reveal>
        <SectionHeading eyebrow="How it works" title="The internet is the crime scene" surface="light">
          Every case is a pile of digital evidence and a group of friends who think they know better.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-24 max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20">
        <ol className="space-y-28 lg:space-y-0">
          {steps.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} active={active === i} onActive={setActive} />
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sticky top-[12vh]">
            <PhoneFrame screen={active} rotateX={rotateX} rotateY={rotateY} />
            <p className="mt-6 text-center text-sm font-extrabold text-ink/60">Real screens from a real game</p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 0.08}>
            <TiltCard className="rounded-2xl" max={14}>
              <p className="rounded-2xl border-[3px] border-ink bg-ink px-4 py-4 text-center text-cream shadow-pop">
                <CountUp value={fact.value} className="block font-display text-4xl text-mustard" />
                <span className="text-sm font-bold text-cream/80">{fact.label}</span>
              </p>
            </TiltCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
