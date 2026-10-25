"use client";

import Link from "next/link";
import { m } from "motion/react";
import { TiltCard } from "@/components/fx/TiltCard";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";

export type ShelfCase = { id: string; number: string; title: string; tagline: string; price: string; tab: string };

/** A paid case as a sealed folder: tilts under the mouse, the price tag swings, the tape says not yet. */
export function SealedFolder({ item, index, href, cta }: { item: ShelfCase; index: number; href: string; cta: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 70, rotate: index % 2 ? 6 : -6 }}
      whileInView={{ opacity: 1, y: 0, rotate: index % 2 ? 1.5 : -1.5 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 80, damping: 13, delay: index * 0.12 }}
      whileHover="hover"
      className="relative pt-5"
    >
      <span className={cx("absolute top-0 left-6 h-7 w-28 rounded-t-xl border-[3px] border-b-0 border-ink", item.tab)} aria-hidden />
      <TiltCard className="rounded-3xl" max={12}>
        <article className="relative flex min-h-80 flex-col overflow-hidden rounded-3xl border-[3px] border-ink bg-[#e8c98d] p-5 text-ink shadow-card">
          {/* Police tape across the folder. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[46%] -left-10 w-[150%] -rotate-[14deg] border-y-[3px] border-ink bg-mustard py-1 text-center font-display text-sm tracking-[0.3em] text-ink uppercase opacity-95"
          >
            Sealed · Sealed · Sealed · Sealed
          </span>
          <p className="text-xs font-extrabold tracking-widest uppercase text-ink/60">Case {item.number}</p>
          <h3 className="font-display text-3xl leading-tight">{item.title}</h3>
          <p className="mt-2 font-semibold text-ink/80">{item.tagline}</p>
          <div className="relative z-10 mt-auto pt-16">
            <Link href={href} className={buttonClass("coral", "w-full text-base")}>
              {cta}
            </Link>
          </div>
        </article>
      </TiltCard>
      {/* Price tag hanging off the corner on a string. */}
      <m.div
        className="absolute -top-1 right-5 z-20 origin-top"
        initial={{ rotate: 8 }}
        animate={{ rotate: [8, -4, 8] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
        variants={{ hover: { rotate: [8, -18, 14, -8, 4], transition: { duration: 0.9 } } }}
      >
        <span aria-hidden className="mx-auto block h-6 w-0.5 bg-cream/70" />
        <span className="block rounded-lg border-[3px] border-ink bg-cream px-3 py-1 font-display text-2xl text-ink shadow-pop-sm">{item.price}</span>
      </m.div>
    </m.div>
  );
}

const W = 187;
const H = 128;
const D = 136;

function Face({ className, style, children }: { className?: string; style: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div className={cx("absolute border-[3px] border-ink bg-[#c9a265]", className)} style={style}>
      {children}
    </div>
  );
}

/** The Season 1 bundle as a real 3D evidence box. It sways, and the lid lifts when you reach for it. */
export function EvidenceBox() {
  return (
    <m.div
      className="mx-auto grid h-60 w-60 scale-[0.82] place-items-center [perspective:900px] sm:h-72 sm:w-72 sm:scale-100"
      initial={{ opacity: 0, scale: 0.6, y: 40 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 90, damping: 12 }}
      whileHover="open"
    >
      <m.div
        className="relative [transform-style:preserve-3d]"
        style={{ width: W, height: H }}
        animate={{ rotateY: [-32, -18, -32], rotateX: -16 }}
        transition={{ rotateY: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
        variants={{ open: { rotateY: -10, rotateX: -24, transition: { type: "spring", stiffness: 80, damping: 12 } } }}
      >
        <Face style={{ width: W, height: H, transform: `translateZ(${D / 2}px)` }} className="flex flex-col items-center justify-center gap-1 text-center text-ink">
          <span aria-hidden className="absolute inset-x-0 top-0 h-5 bg-coral/85" />
          <span className="relative rounded-md bg-[#c9a265] px-2 font-display text-xl tracking-widest">Evidence</span>
          <span className="relative rounded border-2 border-coral bg-[#c9a265] px-2 font-display text-sm tracking-widest text-coral uppercase">Season 1</span>
          <span className="relative text-[10px] font-extrabold tracking-widest uppercase">Do not open</span>
        </Face>
        <Face style={{ width: W, height: H, transform: `rotateY(180deg) translateZ(${D / 2}px)` }} className="bg-[#b38d55]" />
        <Face style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(90deg) translateZ(${W / 2}px)` }} className="bg-[#b38d55]">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-coral/85" />
        </Face>
        <Face style={{ width: D, height: H, left: (W - D) / 2, transform: `rotateY(-90deg) translateZ(${W / 2}px)` }} className="bg-[#b38d55]" />
        <Face style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(-90deg) translateZ(${H / 2}px)` }} className="bg-[#a3804b]" />
        {/* The lid: lifts along its own axis on hover. */}
        <div className="absolute [transform-style:preserve-3d]" style={{ width: W, height: D, top: (H - D) / 2, transform: `rotateX(90deg) translateZ(${H / 2}px)` }}>
          <m.div
            className="absolute inset-0 border-[3px] border-ink bg-[#d6b175]"
            variants={{ open: { z: 46, rotateX: -12, transition: { type: "spring", stiffness: 160, damping: 10 } } }}
          >
            <span aria-hidden className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-coral/85" />
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-coral/85" />
          </m.div>
        </div>
        {/* Shadow on the shelf. */}
        <div aria-hidden className="absolute -bottom-10 left-1/2 h-8 w-[130%] -translate-x-1/2 rounded-[50%] bg-black/40 blur-md [transform:rotateX(90deg)]" />
      </m.div>
    </m.div>
  );
}
