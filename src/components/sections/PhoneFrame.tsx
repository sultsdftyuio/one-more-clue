"use client";

import Image from "next/image";
import { AnimatePresence, m, type MotionValue } from "motion/react";
import { cx } from "@/lib/cx";

/** Real screenshots from a test game, one per "how it works" step. */
export const phoneScreens = [
  { src: "/screens/room-lobby-phone.jpg", alt: "The game lobby: Case 001, voice chat and the room code to share" },
  { src: "/screens/room-desk-phone.jpg", alt: "Investigating: your role, a records search and your evidence" },
  { src: "/screens/room-vote-phone.jpg", alt: "Solving: the group votes on what's wrong with the last message" },
];

type Props = {
  screen: number;
  className?: string;
  rotateX?: MotionValue<number> | number;
  rotateY?: MotionValue<number> | number;
};

/** A phone held at an angle, showing a real game screen. Screens slide over each other when `screen` changes. */
export function PhoneFrame({ screen, className, rotateX = 0, rotateY = 0 }: Props) {
  return (
    <m.div className={cx("[perspective:1400px]", className)}>
      <m.div
        className="relative rounded-[2.6rem] border-[3px] border-ink bg-ink p-2 [transform-style:preserve-3d]"
        style={{ rotateX, rotateY, boxShadow: "0 30px 60px -20px rgba(27,31,59,0.55), 10px 14px 0 rgba(27,31,59,0.9)" }}
      >
        {/* Side edge, so the phone has thickness when it turns. */}
        <span aria-hidden className="absolute inset-y-6 -right-[9px] w-[9px] rounded-r-xl bg-[#2a2f5c] [transform:rotateY(90deg)] [transform-origin:left]" />
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
          {/* Glass reflection. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_35%)]" />
        </div>
        <span aria-hidden className="absolute top-4 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/80" />
      </m.div>
    </m.div>
  );
}
