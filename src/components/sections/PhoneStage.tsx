"use client";

import dynamic from "next/dynamic";
import type { MotionValue } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { CANVAS_TALL, PhoneFrame, usePhoneTurn } from "./PhoneFrame";

// three.js only downloads for devices that get the WebGL phone, and only once it's nearly on screen.
const PhoneScene = dynamic(() => import("./PhoneScene"), { ssr: false });

/**
 * Laptops and tablets get the WebGL phone; phones and older devices keep the
 * CSS one. Wants a real GPU (not a software renderer), at least 4 cores and
 * 4 GB where the browser says, a screen at least 768px wide, and not a
 * phone held sideways.
 */
function supportsWebGLPhone() {
  if (window.innerWidth < 768) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(pointer: coarse)").matches && Math.max(screen.width, screen.height) < 1000) return false;
  if ((navigator.hardwareConcurrency ?? 8) < 4) return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory < 4) return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

type Props = {
  screen: number;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  className?: string;
};

/**
 * The sticky phone beside "how it works". The CSS phone always holds the
 * space; where WebGL is worth it, the 3D phone loads as the section nears,
 * draws over the same spot, and the CSS one fades out once it's ready.
 */
export function PhoneStage({ screen, rotateX, rotateY, className }: Props) {
  const { turnX, turnY } = usePhoneTurn(rotateX, rotateY);
  const slot = useRef<HTMLDivElement>(null);
  const [webgl, setWebgl] = useState(false);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (supportsWebGLPhone()) setWebgl(true);
  }, []);

  useEffect(() => {
    const el = slot.current;
    if (!el || !webgl) return;
    const nearby = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px 0px" });
    const visible = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "100px 0px" });
    nearby.observe(el);
    visible.observe(el);
    return () => {
      nearby.disconnect();
      visible.disconnect();
    };
  }, [webgl]);

  const onReady = useCallback(() => setReady(true), []);
  const onLost = useCallback(() => {
    setReady(false);
    setWebgl(false);
  }, []);

  return (
    <div ref={slot} className={cx("relative", className)}>
      <div className={cx("transition-opacity duration-700", ready && "opacity-0")} aria-hidden={ready || undefined}>
        <PhoneFrame screen={screen} rotateX={rotateX} rotateY={rotateY} />
      </div>
      {webgl && near && (
        <div
          className={cx("pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
          style={{ width: "170%", height: `${CANVAS_TALL * 100}%` }}
          aria-hidden
        >
          <PhoneScene screen={screen} rotateX={turnX} rotateY={turnY} onReady={onReady} onLost={onLost} active={onScreen} />
        </div>
      )}
    </div>
  );
}
