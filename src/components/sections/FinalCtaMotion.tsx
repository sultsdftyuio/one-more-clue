"use client";

import Image from "next/image";
import { m, useAnimationControls, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { burstConfetti } from "@/components/fx/confetti";
import { suspects, type SuspectId } from "@/data/suspects";
import { suspectArt } from "@/lib/art";

function Runner({ id, name, index, go }: { id: SuspectId; name: string; index: number; go: boolean }) {
  const jump = useAnimationControls();
  const [shocked, setShocked] = useState(false);
  const fromLeft = index < 2;
  return (
    <m.button
      type="button"
      aria-label={`Make ${name} jump`}
      className="w-[clamp(64px,13vw,120px)]"
      initial={{ x: fromLeft ? "-60vw" : "60vw", rotate: fromLeft ? -20 : 20 }}
      // Started off-screen, so the row (not each runner) decides when to run in.
      animate={go ? { x: 0, rotate: 0 } : undefined}
      transition={{ type: "spring", stiffness: 60, damping: 11, delay: 0.15 + (fromLeft ? 1 - index : index - 2) * 0.15 }}
      onClick={() => {
        setShocked(true);
        void jump.start({ y: [0, -50, 0], rotate: [0, index % 2 ? 12 : -12, 0], transition: { duration: 0.55 } });
        window.setTimeout(() => setShocked(false), 900);
      }}
    >
      <m.span className="block" animate={jump}>
        <Image src={shocked ? suspectArt[id].shocked : suspectArt[id].idle} alt="" sizes="120px" className="animate-bob" style={{ animationDelay: `${index * -0.6}s` }} />
      </m.span>
    </m.button>
  );
}

/** The four suspects run in from both sides and line up; confetti goes off once as they land. */
export function GatherLineup() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!seen) return;
    const t = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (r) burstConfetti(r.left + r.width / 2, r.top + r.height / 2, 120);
    }, 900);
    return () => window.clearTimeout(t);
  }, [seen]);

  return (
    <div ref={ref} className="mx-auto mt-10 flex items-end justify-center gap-1 sm:gap-3">
      {suspects.map((s, i) => (
        <Runner key={s.id} id={s.id} name={s.name} index={i} go={seen} />
      ))}
    </div>
  );
}
