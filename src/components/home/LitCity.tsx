"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";

const BLOCKS = 10;

type Props = {
  lit: StaticImageData;
  dark: StaticImageData;
  /** "glitch": the odd block flickers out and back. "out"/"on": the whole street switches, block by block. */
  mode: "glitch" | "out" | "on";
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * One street drawn twice, lit and with every light out (the art lines up
 * window for window). The dark copy is masked in block by block, so lights go
 * out or come back a building at a time.
 */
export function LitCity({ lit, dark, mode, priority, className, sizes = "100vw" }: Props) {
  const [off, setOff] = useState<boolean[]>(() => Array(BLOCKS).fill(false));
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => timers.current.splice(0).forEach((t) => window.clearTimeout(t));
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clear();

    if (mode === "out" || mode === "on") {
      const target = mode === "out";
      if (reduce) setOff(Array(BLOCKS).fill(target));
      else
        // Out: a sweep with a stutter. On: block by block from the middle, like breakers flipping.
        for (let i = 0; i < BLOCKS; i++) {
          const order = target ? i : Math.abs(i - (BLOCKS - 1) / 2);
          const at = order * (target ? 70 : 130);
          later(() => setOff((o) => o.map((v, j) => (j === i ? target : v))), at);
          later(() => setOff((o) => o.map((v, j) => (j === i ? !target : v))), at + 90);
          later(() => setOff((o) => o.map((v, j) => (j === i ? target : v))), at + 170);
        }
      return clear;
    }

    setOff(Array(BLOCKS).fill(false));
    if (reduce) return clear;
    // Glitch: every few seconds one block browns out for a moment. Foreshadowing.
    const glitch = () => {
      const i = Math.floor(Math.random() * BLOCKS);
      const set = (v: boolean) => setOff((o) => o.map((x, j) => (j === i ? v : x)));
      set(true);
      later(() => set(false), 110);
      later(() => set(true), 190);
      later(() => set(false), 420);
      later(glitch, 2600 + Math.random() * 3200);
    };
    later(glitch, 2200);
    return clear;
  }, [mode]);

  const step = 100 / BLOCKS;
  const mask = `linear-gradient(90deg, ${off.map((o, i) => `${o ? "#000" : "transparent"} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;

  return (
    <div className={cx("relative", className)}>
      <Image src={lit} alt="" fill priority={priority} sizes={sizes} className="object-cover object-bottom" />
      <Image
        src={dark}
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-bottom"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
    </div>
  );
}
