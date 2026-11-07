"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Counts every number in `value` up from zero the first time it's seen:
 * "15–25" runs both ends, "1st" keeps its suffix. The real value is what the
 * server sends, so search engines, link previews and slow phones never see
 * "0". Numbers under 2 never count ("0 apps" and "1st" just sit there).
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  // null = show the value as written; a number = mid-count.
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, 1, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setProgress, onComplete: () => setProgress(null) });
    return () => controls.stop();
  }, [inView, reduce]);

  const text =
    progress === null ? value : value.replace(/\d+/g, (n) => (Number(n) < 2 ? n : String(Math.round(Number(n) * progress))));
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{value}</span>
      <span aria-hidden>{text}</span>
    </span>
  );
}
