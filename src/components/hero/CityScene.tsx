"use client";

import Image from "next/image";
import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import type { ReactNode } from "react";
import { StarField } from "@/components/fx/StarField";
import { usePointer } from "@/components/fx/pointer";
import { useBlackout } from "@/components/home/blackout";
import { LitCity } from "@/components/home/LitCity";
import { sceneArt } from "@/lib/art";
import { cx } from "@/lib/cx";

/**
 * A layer at some depth: it slides with the pointer (or phone tilt) by `look`
 * pixels and sinks behind the scroll by `sink` x the distance scrolled, so
 * near layers move more than far ones and the street reads as 3D.
 */
function Layer({ look, lookY = look / 2, sink, className, children }: { look: number; lookY?: number; sink: number; className?: string; children: ReactNode }) {
  const { x: px, y: py } = usePointer();
  const { scrollY } = useScroll();
  const x = useTransform(px, (v) => v * -look);
  const y = useTransform([py, scrollY] as MotionValue<number>[], ([v, s]: number[]) => v * -lookY + Math.min(s, 1200) * sink);
  return (
    <m.div className={cx("absolute will-change-transform", className)} style={{ x, y }}>
      {children}
    </m.div>
  );
}

/** Night sky, stars, moon, clouds and two streets, with depth, a camera push on scroll, the odd power glitch and the 9:17 blackout. */
export function CityScene() {
  const { scrollY } = useScroll();
  // The camera pushes into the street as you scroll toward 9:17.
  const push = useTransform(scrollY, [0, 900], [1, 1.14]);
  // This street is the one that goes dark at 9:17 and comes back when the liar is caught.
  const { phase } = useBlackout();
  const mode = phase === "lit" ? "glitch" : phase === "dark" ? "out" : "on";

  return (
    <m.div aria-hidden className="absolute inset-0 overflow-hidden" style={{ scale: push, transformOrigin: "50% 100%" }}>
      <Layer look={6} sink={0.5} className="-inset-8">
        <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="object-cover" />
      </Layer>

      <Layer look={8} sink={0.48} className="inset-0">
        <StarField />
      </Layer>

      <Layer look={14} sink={0.42} className="top-[7%] right-[5%] w-[clamp(130px,19vw,300px)]">
        {/* Moon halo breathes slowly. */}
        <m.div
          className="absolute inset-[-35%] rounded-full bg-[radial-gradient(circle,rgba(255,230,167,0.35),rgba(255,230,167,0)_65%)]"
          animate={{ opacity: [0.55, 1, 0.55], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <Image src={sceneArt.moon} alt="" priority sizes="300px" className="relative animate-float" />
      </Layer>

      <Layer look={22} sink={0.34} className="top-[22%] right-[2%] w-[clamp(170px,27vw,430px)]">
        <Image src={sceneArt.cloudA} alt="" sizes="430px" className="animate-drift" />
      </Layer>

      <Layer look={18} sink={0.3} className="top-[9%] left-[40%] hidden w-[clamp(120px,17vw,280px)] md:block">
        <Image src={sceneArt.cloudB} alt="" sizes="280px" className="animate-drift [animation-delay:-6s]" />
      </Layer>

      <Layer look={30} sink={0.16} className="-inset-x-10 bottom-0 aspect-[1600/560] min-h-[300px]">
        <LitCity lit={sceneArt.cityBack} dark={sceneArt.cityBackDark} mode={mode} className="h-full w-full" />
      </Layer>

      {/* The suspects stand on this street, so it never moves vertically. */}
      <Layer look={46} lookY={0} sink={0} className="-inset-x-12 bottom-0 aspect-[1600/460] min-h-[230px]">
        <LitCity lit={sceneArt.cityFront} dark={sceneArt.cityFrontDark} mode={mode} priority className="h-full w-full" />
      </Layer>

      {/* Haze over the street so the copy stays readable as the camera pushes in. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,21,43,0)_55%,rgba(18,21,43,0.35)_100%)]" />
    </m.div>
  );
}
