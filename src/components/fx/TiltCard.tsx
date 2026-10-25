"use client";

import { m, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  children: ReactNode;
  className?: string;
  /** Largest tilt in degrees. */
  max?: number;
  /** A soft light that follows the cursor across the surface. */
  glare?: boolean;
};

/**
 * Leans toward the mouse in 3D with a moving glare, like a card held under a
 * lamp. Touch screens get no tilt, so scrolling never fights with it.
 */
export function TiltCard({ children, className, max = 10, glare = true }: Props) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);
  const spring = { stiffness: 160, damping: 18 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const lift = useSpring(useTransform(hover, [0, 1], [1, 1.03]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(hover, spring);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    hover.set(1);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  };

  return (
    <m.div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX, rotateY, scale: lift, transformPerspective: 900 }}
      className={cx("relative [transform-style:preserve-3d]", className)}
    >
      {children}
      {glare && (
        <m.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glareBg, opacity: glareOpacity }}
        />
      )}
    </m.div>
  );
}
