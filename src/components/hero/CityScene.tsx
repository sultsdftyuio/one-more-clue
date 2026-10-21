"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { sceneArt } from "@/lib/art";
import { cx } from "@/lib/cx";

/** Wraps a layer that sinks at `depth` x the scroll speed, so far layers lag behind. */
function Layer({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  return (
    <div
      className={cx("absolute will-change-transform", className)}
      style={{ transform: `translate3d(0, calc(var(--scroll, 0) * ${depth}px), 0)` }}
    >
      {children}
    </div>
  );
}

/** Night sky, moon, clouds and two city layers with scroll parallax. */
export function CityScene() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.setProperty("--scroll", String(Math.min(window.scrollY, window.innerHeight)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden className="absolute inset-0 overflow-hidden">
      <Layer depth={0.5} className="inset-0">
        <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="object-cover" />
      </Layer>

      <Layer depth={0.42} className="top-[7%] right-[5%] w-[clamp(130px,19vw,300px)]">
        <Image src={sceneArt.moon} alt="" priority sizes="300px" className="animate-float" />
      </Layer>

      <Layer depth={0.34} className="top-[22%] right-[2%] w-[clamp(170px,27vw,430px)]">
        <Image src={sceneArt.cloudA} alt="" sizes="430px" className="animate-drift" />
      </Layer>

      <Layer depth={0.3} className="top-[9%] left-[40%] hidden w-[clamp(120px,17vw,280px)] md:block">
        <Image src={sceneArt.cloudB} alt="" sizes="280px" className="animate-drift [animation-delay:-6s]" />
      </Layer>

      <Layer depth={0.16} className="inset-x-0 bottom-0 aspect-[1600/560] min-h-[300px]">
        <Image src={sceneArt.cityBack} alt="" fill sizes="100vw" className="object-cover object-bottom" />
      </Layer>

      <div className="absolute inset-x-0 bottom-0 aspect-[1600/460] min-h-[230px]">
        <Image src={sceneArt.cityFront} alt="" fill priority sizes="100vw" className="object-cover object-bottom" />
      </div>
    </div>
  );
}
