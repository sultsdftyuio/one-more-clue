"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string; delay?: number; y?: number };

/** Rises, sharpens and fades in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, y = 40 }: Props) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: "spring", stiffness: 90, damping: 18, delay }}
    >
      {children}
    </m.div>
  );
}
