"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts every number in `value` up from zero the first time it's seen:
 * "15–25" runs both ends, "1st" keeps its suffix.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setProgress(1);
    const controls = animate(0, 1, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setProgress });
    return () => controls.stop();
  }, [inView, reduce]);

  const text = value.replace(/\d+/g, (n) => String(Math.round(Number(n) * progress)));
  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden>{text}</span>
    </span>
  );
}
