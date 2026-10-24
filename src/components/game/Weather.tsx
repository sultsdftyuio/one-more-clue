"use client";

import { useEffect, useRef } from "react";
import type { Weather as WeatherKind } from "./themes";

type Particle = { x: number; y: number; r: number; v: number; drift: number; phase: number };

/**
 * The weather drifting behind a case: rain for noir, radio waves for the
 * station, steam for the bistro, snow for the lodge. A single canvas, paused
 * while the tab is hidden and skipped for people who prefer reduced motion.
 */
export function Weather({ kind }: { kind: WeatherKind }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const count = { rain: 90, radio: 0, steam: 26, snow: 80 }[kind];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      r: kind === "steam" ? rand(30, 90) : kind === "snow" ? rand(1, 3.2) : rand(10, 22),
      v: kind === "rain" ? rand(6, 11) : kind === "steam" ? rand(0.15, 0.45) : rand(0.4, 1.2),
      drift: rand(-0.4, 0.4),
      phase: rand(0, Math.PI * 2),
    }));

    let frame = 0;
    let t = 0;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) return;
      t += 1;
      ctx.clearRect(0, 0, w, h);

      if (kind === "rain") {
        ctx.strokeStyle = "rgba(170, 200, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const p of particles) {
          p.y += p.v;
          p.x += p.v * 0.25;
          if (p.y > h) {
            p.y = -p.r;
            p.x = rand(-50, w);
          }
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.r * 0.25, p.y - p.r);
        }
        ctx.stroke();
      }

      if (kind === "snow") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        for (const p of particles) {
          p.y += p.v;
          p.x += Math.sin(t / 60 + p.phase) * 0.5 + p.drift;
          if (p.y > h + 4) {
            p.y = -4;
            p.x = rand(0, w);
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (kind === "steam") {
        for (const p of particles) {
          p.y -= p.v;
          p.x += Math.sin(t / 90 + p.phase) * 0.3;
          if (p.y < -p.r) {
            p.y = h + p.r;
            p.x = rand(0, w);
          }
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(255, 236, 210, 0.07)");
          g.addColorStop(1, "rgba(255, 236, 210, 0)");
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      }

      if (kind === "radio") {
        // Rings broadcasting out from the corner, like a transmitter.
        const cx = w * 0.92;
        const cy = h * 0.88;
        for (let i = 0; i < 5; i++) {
          const r = ((t * 1.2 + i * 90) % 450) + 10;
          ctx.strokeStyle = `rgba(255, 92, 205, ${0.22 * (1 - r / 460)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI * 0.9, Math.PI * 1.6);
          ctx.stroke();
        }
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [kind]);

  return <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 -z-10 size-full" />;
}
