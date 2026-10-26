"use client";

import Image from "next/image";
import { AnimatePresence, m, useMotionTemplate, useMotionValue, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { usePointer } from "@/components/fx/pointer";
import { cx } from "@/lib/cx";

/** Real screenshots from a test game, one per "how it works" step. */
export const phoneScreens = [
  { src: "/screens/room-lobby-phone.jpg", alt: "The game lobby: Case 001, voice chat and the room code to share" },
  { src: "/screens/room-desk-phone.jpg", alt: "Investigating: your role, a records search and your evidence" },
  { src: "/screens/room-vote-phone.jpg", alt: "Solving: the group votes on what's wrong with the last message" },
];

/** How thick the phone is, in px: the edges, buttons and back sit this far behind the glass. */
const DEPTH = 16;

type Props = {
  screen: number;
  className?: string;
  rotateX?: MotionValue<number> | number;
  rotateY?: MotionValue<number> | number;
};

/** A piece of UI lifted off the glass, hovering in front of the phone. */
function Floating({ z, className, delay = 0, children }: { z: number; className: string; delay?: number; children: ReactNode }) {
  return (
    <m.div
      className={cx("pointer-events-none absolute", className)}
      initial={{ opacity: 0, z: 0, scale: 0.7 }}
      animate={{ opacity: 1, z, scale: 1 }}
      exit={{ opacity: 0, z: 0, scale: 0.7 }}
      transition={{ type: "spring", stiffness: 160, damping: 16, delay }}
    >
      {children}
    </m.div>
  );
}

/** What pops out of each screen: the invite, a piece of evidence, the verdict. */
function Pops({ screen }: { screen: number }) {
  if (screen === 0)
    return (
      <>
        <Floating key="code" z={90} className="top-[18%] -right-10 sm:-right-14" delay={0.15}>
          <span className="block rotate-6 rounded-2xl border-[0.1875rem] border-ink bg-mustard px-3 py-2 font-display text-lg leading-none text-ink shadow-pop-sm">
            Room K7QX
            <span className="mt-1 block font-sans text-[0.65rem] font-extrabold tracking-widest uppercase">Tap to join</span>
          </span>
        </Floating>
        <Floating key="joined" z={60} className="bottom-[22%] -left-8 sm:-left-12" delay={0.3}>
          <span className="flex -rotate-3 items-center gap-1.5 rounded-full border-[0.1875rem] border-ink bg-cream py-1 pr-3 pl-1.5 text-xs font-extrabold text-ink shadow-pop-sm">
            <span className="flex -space-x-1.5">
              {["bg-coral", "bg-teal", "bg-lilac"].map((c) => (
                <span key={c} className={cx("size-5 rounded-full border-2 border-ink", c)} />
              ))}
            </span>
            3 joined
          </span>
        </Floating>
      </>
    );
  if (screen === 1)
    return (
      <>
        <Floating key="log" z={100} className="top-[30%] -right-12 sm:-right-16" delay={0.15}>
          <span className="block -rotate-3 rounded-xl border-[0.1875rem] border-ink bg-cream px-3 py-2 font-mono text-[0.7rem] leading-snug font-bold text-ink shadow-pop-sm">
            <span className="block font-sans text-[0.6rem] font-extrabold tracking-widest text-coral uppercase">Badge log</span>
            9:12 PM · R. Tran · in
            <br />
            <span className="rounded bg-mustard px-1">9:16 PM · ??? · out</span>
          </span>
        </Floating>
        <Floating key="pin" z={70} className="bottom-[16%] -left-10 sm:-left-14" delay={0.3}>
          <span className="block rotate-6 rounded-lg border-[0.1875rem] border-ink bg-white p-1.5 pb-4 shadow-pop-sm">
            <span className="block size-14 rounded bg-[linear-gradient(180deg,#12152b,#2a2f5c)]">
              <span className="mt-6 ml-7 block size-3 rounded-sm bg-mustard" />
            </span>
          </span>
        </Floating>
      </>
    );
  return (
    <>
      <Floating key="closed" z={110} className="top-[38%] -right-8 sm:-right-12" delay={0.2}>
        <span className="block -rotate-12 rounded-xl border-[0.3125rem] border-coral bg-cream/95 px-3 py-1 font-display text-2xl tracking-widest text-coral uppercase shadow-pop-sm">
          Case closed
        </span>
      </Floating>
      <Floating key="votes" z={60} className="top-[14%] -left-10 sm:-left-14" delay={0.35}>
        <span className="block rotate-3 rounded-xl border-[0.1875rem] border-ink bg-cream px-3 py-2 text-[0.7rem] font-extrabold text-ink shadow-pop-sm">
          Votes 4 / 4
          <span className="mt-1 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-2 w-5 rounded-full border border-ink bg-teal" />
            ))}
          </span>
        </span>
      </Floating>
    </>
  );
}

/**
 * A phone with real thickness, held at an angle and showing a real game
 * screen. It leans a little toward the cursor, glare slides across the glass
 * as it turns, and pieces of each screen float off the glass in 3D.
 */
export function PhoneFrame({ screen, className, rotateX = 0, rotateY = 0 }: Props) {
  const fixedX = useMotionValue(typeof rotateX === "number" ? rotateX : 0);
  const fixedY = useMotionValue(typeof rotateY === "number" ? rotateY : 0);
  const baseX = typeof rotateX === "number" ? fixedX : rotateX;
  const baseY = typeof rotateY === "number" ? fixedY : rotateY;
  const { x: px, y: py } = usePointer();
  const turnY = useTransform([baseY, px] as MotionValue<number>[], ([b, p]: number[]) => b + p * 8);
  const turnX = useTransform([baseX, py] as MotionValue<number>[], ([b, p]: number[]) => b - p * 5);
  // Light comes from the top left: the glare slides as the phone turns, the shadow falls the other way.
  const glareAt = useTransform(turnY, [-30, 30], [-10, 70]);
  const glare = useMotionTemplate`linear-gradient(115deg, rgba(255,255,255,0) ${glareAt}%, rgba(255,255,255,0.22) calc(${glareAt}% + 8%), rgba(255,255,255,0) calc(${glareAt}% + 22%))`;
  const shadowX = useTransform(turnY, [-30, 30], [28, -28]);

  return (
    <div className={cx("relative [perspective:1400px]", className)}>
      <m.div
        aria-hidden
        className="absolute -bottom-10 left-1/2 h-10 w-[85%] -translate-x-1/2 rounded-[50%] bg-ink/35 blur-xl"
        style={{ x: shadowX }}
      />
      <m.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="[transform-style:preserve-3d]">
        <m.div className="relative rounded-[2.6rem] bg-ink p-2 [transform-style:preserve-3d]" style={{ rotateX: turnX, rotateY: turnY }}>
          {/* The body: back plate and four edges, so it has depth from every angle. */}
          <span aria-hidden className="absolute inset-0 rounded-[2.6rem] bg-[#22264a]" style={{ transform: `translateZ(-${DEPTH}px)` }} />
          <span aria-hidden className="absolute inset-y-10 right-0 origin-right rounded-sm bg-[linear-gradient(90deg,#2a2f5c,#3a4080,#2a2f5c)]" style={{ width: DEPTH, transform: "rotateY(-90deg)" }}>
            <span className="absolute top-[22%] left-1/2 h-14 w-1.5 -translate-x-1/2 rounded-full bg-[#4a5194]" />
          </span>
          <span aria-hidden className="absolute inset-y-10 left-0 origin-left rounded-sm bg-[linear-gradient(90deg,#2a2f5c,#353a74,#2a2f5c)]" style={{ width: DEPTH, transform: "rotateY(90deg)" }}>
            <span className="absolute top-[16%] left-1/2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-[#4a5194]" />
            <span className="absolute top-[24%] left-1/2 h-8 w-1.5 -translate-x-1/2 rounded-full bg-[#4a5194]" />
          </span>
          <span aria-hidden className="absolute inset-x-10 top-0 origin-top bg-[#2f3466]" style={{ height: DEPTH, transform: "rotateX(-90deg)" }} />
          <span aria-hidden className="absolute inset-x-10 bottom-0 origin-bottom bg-[#1f2346]" style={{ height: DEPTH, transform: "rotateX(90deg)" }} />

          {/* The front: bezel outline and the glass. */}
          <div className="relative rounded-[2.1rem] outline-[0.1875rem] outline-offset-[0.4rem] outline-ink">
            <div className="relative aspect-[469/1015] overflow-hidden rounded-[2rem] bg-night">
              <AnimatePresence initial={false}>
                <m.div
                  key={screen}
                  className="absolute inset-0"
                  initial={{ y: "100%", opacity: 0.4 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-25%", opacity: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 22 }}
                >
                  <Image src={phoneScreens[screen].src} alt={phoneScreens[screen].alt} fill sizes="320px" className="object-cover object-top" />
                </m.div>
              </AnimatePresence>
              <m.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glare }} />
              <span aria-hidden className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
            </div>
          </div>

          <AnimatePresence>
            <Pops key={screen} screen={screen} />
          </AnimatePresence>
        </m.div>
      </m.div>
    </div>
  );
}
