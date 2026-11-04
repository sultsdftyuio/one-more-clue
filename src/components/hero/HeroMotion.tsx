"use client";

import { m, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

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

/**
 * Pieces of the hero that pop in one after another once the title has landed.
 * A CSS animation, so slow phones show the words before the JavaScript arrives.
 */
export function PopIn({ children, delay, className, as = "div" }: { children: ReactNode; delay: number; className?: string; as?: "div" | "li" }) {
  const Tag = as;
  return (
    <Tag className={cx("animate-rise-in", className)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </Tag>
  );
}
