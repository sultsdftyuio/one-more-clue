"use client";

import { useMotionValue, useSpring, type MotionValue } from "motion/react";
import { createContext, useContext, useEffect, type ReactNode } from "react";

type Pointer = { x: MotionValue<number>; y: MotionValue<number> };

const PointerContext = createContext<Pointer | null>(null);

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * One shared "where is the viewer looking" signal from -1 to 1 on each axis:
 * the mouse on desktop, the phone's tilt where the browser reports it. Springs
 * keep it smooth. Everything that moves in 3D reads it from here.
 */
export function PointerProvider({ children }: { children: ReactNode }) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 50, damping: 16, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 50, damping: 16, mass: 0.6 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      rawX.set(clamp((e.clientX / window.innerWidth) * 2 - 1));
      rawY.set(clamp((e.clientY / window.innerHeight) * 2 - 1));
    };
    // Phones held upright sit around beta 45-60; tilting reads as looking around.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      rawX.set(clamp(e.gamma / 25));
      rawY.set(clamp((e.beta - 50) / 25));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [rawX, rawY]);

  return <PointerContext.Provider value={{ x, y }}>{children}</PointerContext.Provider>;
}

export function usePointer() {
  const pointer = useContext(PointerContext);
  if (!pointer) throw new Error("usePointer needs a PointerProvider");
  return pointer;
}
