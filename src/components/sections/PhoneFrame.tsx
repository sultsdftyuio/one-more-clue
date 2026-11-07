"use client";

import Image from "next/image";
import { AnimatePresence, m, useInView, useMotionTemplate, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePointer } from "@/components/fx/pointer";
import { steps } from "@/data/how-it-works";
import { cx } from "@/lib/cx";

/** Real screens from test games, one per "how it works" step. */
export const phoneScreens = steps.map((s) => s.screen);

/** The screens are 375 x 859: a 375 x 812 phone screenshot under a 47px status bar. */
export const SCREEN_ASPECT = 859 / 375;

/**
 * The WebGL phone's canvas is this many times the height of the phone's slot,
 * leaving room for the turn and the kick (see PhoneStage and PhoneScene).
 */
export const CANVAS_TALL = 1.3;

/** The body is this many thin slices stacked this far apart (px), so its rounded edge is solid from any angle. */
const SLICES = 14;
const STEP = 1;
const DEPTH = SLICES * STEP;
const RADIUS = "2.6rem";

type Angle = MotionValue<number> | number;

/**
 * The phone's turn: the angle it's given (fixed or driven by scroll) plus a
 * small lean toward the cursor, or the tilt of the viewer's own phone.
 */
export function usePhoneTurn(rotateX: Angle = 0, rotateY: Angle = 0) {
  const fixedX = useMotionValue(typeof rotateX === "number" ? rotateX : 0);
  const fixedY = useMotionValue(typeof rotateY === "number" ? rotateY : 0);
  const { x: px, y: py } = usePointer();
  const turnY = useTransform([typeof rotateY === "number" ? fixedY : rotateY, px] as MotionValue<number>[], ([b, p]: number[]) => b + p * 8);
  const turnX = useTransform([typeof rotateX === "number" ? fixedX : rotateX, py] as MotionValue<number>[], ([b, p]: number[]) => b - p * 5);
  return { turnX, turnY };
}

type Props = {
  screen: number;
  className?: string;
  rotateX?: Angle;
  rotateY?: Angle;
  /**
   * The WebGL phone is drawn over this one (see PhoneStage): the body fades
   * out and is then taken off the page, leaving the space and the shadow.
   */
  standIn?: boolean;
};

/** How long the body takes to fade before it's taken off the page. */
const FADE_MS = 300;

/**
 * A phone built in CSS 3D: a metal body of stacked slices with a sheen that
 * slides as it turns, a black glass front over a slightly recessed screen, a
 * back with a camera bump, and a shadow on the ground that follows the tilt.
 * Phones and older devices get this one; bigger screens get the WebGL phone.
 *
 * The body is fourteen full-size layers re-shaded on every turn, so it's only
 * on the page while it's near the screen and not standing in for the WebGL
 * phone. Otherwise an empty box of the same size holds its place.
 */
export function PhoneFrame({ screen, className, rotateX = 0, rotateY = 0, standIn = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { margin: "300px 0px" });
  const [stoodDown, setStoodDown] = useState(false);
  useEffect(() => {
    if (!standIn) {
      setStoodDown(false);
      return;
    }
    const t = setTimeout(() => setStoodDown(true), FADE_MS + 50);
    return () => clearTimeout(t);
  }, [standIn]);
  const drawn = near && !stoodDown;

  const { turnX, turnY } = usePhoneTurn(rotateX, rotateY);
  // Light from the top left: the sheen slides along the metal, the glass reflection across the screen.
  const sheen = useTransform(turnY, [-30, 30], [15, 75]);
  const metal = useMotionTemplate`linear-gradient(100deg, #191d3d 0%, #2a2f5c ${sheen}%, #6a72b8 calc(${sheen}% + 6%), #2a2f5c calc(${sheen}% + 14%), #191d3d 100%)`;
  const glareAt = useTransform(turnY, [-30, 30], [-20, 60]);
  const glare = useMotionTemplate`linear-gradient(115deg, rgba(255,255,255,0) ${glareAt}%, rgba(255,255,255,0.16) calc(${glareAt}% + 10%), rgba(255,255,255,0) calc(${glareAt}% + 26%))`;
  const shadowX = useTransform(turnY, [-30, 30], [24, -24]);
  const shadowW = useTransform(turnY, (v) => 1 + Math.abs(v) / 90);

  return (
    <div ref={box} className={cx("relative", className)}>
      {/* Contact shadow: stretches and slides away from the light as the phone turns. */}
      <m.div aria-hidden className="absolute -bottom-9 left-1/2 h-8 w-[78%] -translate-x-1/2 rounded-[50%] bg-ink/40 blur-lg" style={{ x: shadowX, scaleX: shadowW }} />
      {/* The fade sits on the perspective box, not inside the 3D, where opacity would flatten the phone. */}
      <div
        className={cx("[perspective:1400px] transition-opacity", standIn && "opacity-0")}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        aria-hidden={standIn || undefined}
      >
        {drawn ? (
          <div className="animate-hover [transform-style:preserve-3d] motion-reduce:animate-none">
            <PhoneBody screen={screen} turnX={turnX} turnY={turnY} metal={metal} glare={glare} />
          </div>
        ) : (
          <div aria-hidden className="p-[3px]">
            <div className="p-[0.55rem]">
              <div className="aspect-[375/859]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type BodyProps = {
  screen: number;
  turnX: MotionValue<number>;
  turnY: MotionValue<number>;
  metal: MotionValue<string>;
  glare: MotionValue<string>;
};

/**
 * One slice of the metal edge, a little darker the deeper it sits. The shade is
 * a dark wash painted over the metal, not a CSS filter: fourteen filtered
 * layers repainting on every turn made phones drop to a few frames a second.
 */
function Slice({ index, metal }: { index: number; metal: MotionValue<string> }) {
  const shade = (0.05 + (index / SLICES) * 0.35).toFixed(3);
  const background = useTransform(metal, (m) => `linear-gradient(rgba(5,6,15,${shade}), rgba(5,6,15,${shade})), ${m}`);
  return <m.span aria-hidden className="absolute inset-0" style={{ borderRadius: RADIUS, background, transform: `translateZ(-${(index + 1) * STEP}px)` }} />;
}

function PhoneBody({ screen, turnX, turnY, metal, glare }: BodyProps) {
  return (
    <m.div className="relative [transform-style:preserve-3d]" style={{ rotateX: turnX, rotateY: turnY }}>
      {/* Body: slices behind the front form the rounded metal edge. */}
      {Array.from({ length: SLICES }, (_, i) => (
        <Slice key={i} index={i} metal={metal} />
      ))}
      {/* Side buttons, a few slices deep so they read from the side. */}
      {[0.3, 0.5].map((z) =>
        [
          { side: "-right-[3px]", top: "top-[22%]", h: "h-14" },
          { side: "-left-[3px]", top: "top-[17%]", h: "h-9" },
          { side: "-left-[3px]", top: "top-[25%]", h: "h-9" },
        ].map((b) => (
          <span
            key={`${z}${b.side}${b.top}`}
            aria-hidden
            className={cx("absolute w-1 rounded-full bg-[#4a5194]", b.side, b.top, b.h)}
            style={{ transform: `translateZ(-${DEPTH * z}px)` }}
          />
        )),
      )}
      {/* Back plate with the camera bump (seen when it turns right round). */}
      <span aria-hidden className="absolute inset-0 bg-[#1f2346]" style={{ borderRadius: RADIUS, transform: `translateZ(-${DEPTH + 0.5}px) rotateY(180deg)` }}>
        <span className="absolute top-5 left-5 grid size-[38%] grid-cols-2 gap-1.5 rounded-[1.4rem] border border-[#4a5194]/60 bg-[#272c55] p-2.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="aspect-square rounded-full border-[3px] border-[#3a4080] bg-[radial-gradient(circle_at_35%_35%,#4a5194,#0b0d1a_60%)]" />
          ))}
          <span className="m-auto size-3 rounded-full bg-moon/80" />
        </span>
      </span>

      {/* Front: metal rim, black glass bezel, recessed screen. */}
      <m.div className="relative p-[3px]" style={{ borderRadius: RADIUS, background: metal }}>
        <div className="rounded-[2.45rem] bg-[#07081a] p-[0.55rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <div className="relative aspect-[375/859] overflow-hidden rounded-[1.95rem] bg-night shadow-[inset_0_0_0.6rem_rgba(0,0,0,0.6)]">
            <AnimatePresence initial={false}>
              <m.div
                key={screen}
                className="absolute inset-0"
                initial={{ y: "100%", opacity: 0.4 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-25%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
              >
                <Image src={phoneScreens[screen].src} alt={phoneScreens[screen].alt} fill sizes="(min-width: 768px) 320px, 60vw" className="object-cover object-top" />
              </m.div>
            </AnimatePresence>
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0.35rem_rgba(0,0,0,0.55)]" />
            <span aria-hidden className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#07081a]" />
          </div>
        </div>
        {/* Reflection on the glass, sliding as the phone turns. */}
        <m.span aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: RADIUS, background: glare }} />
      </m.div>
    </m.div>
  );
}
