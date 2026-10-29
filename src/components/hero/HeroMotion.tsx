"use client";

import { m, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";

/** The hero copy drifts up and fades as the camera pushes into the street. */
export function ScrollAway({ children, className }: { children: ReactNode; className?: string }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, -140]);
  const opacity = useTransform(scrollY, [0, 450], [1, 0]);
  return (
    <m.div className={className} style={{ y, opacity }}>
      {children}
    </m.div>
  );
}

/** Pieces of the hero that pop in one after another once the title has landed. */
export function PopIn({ children, delay, className, as = "div" }: { children: ReactNode; delay: number; className?: string; as?: "div" | "li" }) {
  const Tag = as === "li" ? m.li : m.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 18, delay }}
    >
      {children}
    </Tag>
  );
}
