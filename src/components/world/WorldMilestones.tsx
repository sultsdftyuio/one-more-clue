"use client";

import { useEffect, useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { Icon, type IconName } from "@/components/game/ui/Icon";
import type { PlayerView } from "@/lib/game/engine";
import type { Help } from "@/lib/game/helps";
import { HelpMark } from "./jobs/frame";

type Flyer = { key: string; kind: "evidence"; title: string; icon: IconName } | { key: string; kind: "help"; help: Help };

const ICON_FOR: Record<string, IconName> = { log: "file", chat: "chat", scene: "camera", footage: "camera", statement: "mic", document: "note", recording: "speaker", finding: "sparkle" };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Small moments that make progress felt (the polish pass): a piece of evidence that turns up pops in the middle of the
 * screen as a little card and flies into the Evidence button, which bounces; a help the team wins flies into the helps
 * badge under the clock. Several arrive one after another. With reduced motion the buttons only bounce.
 */
export function WorldMilestones({ view }: { view: PlayerView }) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const known = useRef<Set<string> | null>(null);
  const helps = useRef<{ coffee: number; lit: number; sore: number } | null>(null);

  useEffect(() => {
    if (view.phase !== "investigation") return;
    const ids = new Set(view.evidence.map((e) => e.id));
    const h = { coffee: view.helps.coffee, lit: view.helps.lit.length, sore: view.helps.sore.length };
    if (!known.current || !helps.current) {
      known.current = ids;
      helps.current = h;
      return;
    }
    const added: Flyer[] = view.evidence
      .filter((e) => !known.current!.has(e.id))
      .map((e) => ({ key: `e-${e.id}`, kind: "evidence" as const, title: e.title, icon: ICON_FOR[e.body.type] ?? "file" }));
    const before = helps.current;
    if (h.coffee > before.coffee) added.push({ key: `h-coffee-${h.coffee}-${Date.now()}`, kind: "help", help: "coffee" });
    if (h.lit > before.lit) added.push({ key: `h-lit-${h.lit}-${Date.now()}`, kind: "help", help: "lightbulb" });
    if (h.sore > before.sore) added.push({ key: `h-sore-${h.sore}-${Date.now()}`, kind: "help", help: "sore-spot" });
    known.current = ids;
    helps.current = h;
    if (added.length) setFlyers((list) => [...list, ...added]);
  }, [view]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] overflow-hidden">
      {flyers.map((f, i) => (
        <Fly key={f.key} flyer={f} delay={i * 260} onDone={() => setFlyers((list) => list.filter((x) => x.key !== f.key))} />
      ))}
    </div>
  );
}

function Fly({ flyer, delay, onDone }: { flyer: Flyer; delay: number; onDone: () => void }) {
  const node = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = node.current;
    const target = document.querySelector<HTMLElement>(flyer.kind === "evidence" ? 'nav[aria-label="Open a panel"] button[title="Evidence"]' : '[aria-label^="Team helps"]');
    const bounce = () =>
      target?.animate([{ transform: "scale(1)" }, { transform: "scale(1.3) rotate(-6deg)" }, { transform: "scale(0.94)" }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
    if (!el || reduced()) {
      bounce();
      onDone();
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const box = el.getBoundingClientRect();
    const from = { x: w / 2 - box.width / 2, y: h * 0.42 - box.height / 2 };
    const t = target?.getBoundingClientRect();
    const to = t ? { x: t.left + t.width / 2 - box.width / 2, y: t.top + t.height / 2 - box.height / 2 } : { x: from.x, y: -80 };
    // Wait for any pop-up (a find's own moment, a side job) to close first, up to ten seconds.
    let waited = 0;
    let timer = 0;
    const go = () => {
      if (document.querySelector('[role="dialog"]') && waited < 10000) {
        waited += 250;
        timer = window.setTimeout(go, 250);
        return;
      }
      fly();
    };
    const fly = () => {
      play(flyer.kind === "evidence" ? "pin" : "found");
      const anim = el.animate(
        [
          { transform: `translate(${from.x}px, ${from.y + 30}px) scale(0.4)`, opacity: 0 },
          { transform: `translate(${from.x}px, ${from.y}px) scale(1.12)`, opacity: 1, offset: 0.18 },
          { transform: `translate(${from.x}px, ${from.y - 6}px) scale(1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${to.x}px, ${to.y}px) scale(0.22)`, opacity: 0.6 },
        ],
        { duration: 1250, easing: "cubic-bezier(0.5, 0, 0.3, 1)", fill: "forwards" },
      );
      anim.onfinish = () => {
        bounce();
        onDone();
      };
    };
    timer = window.setTimeout(go, delay);
    return () => window.clearTimeout(timer);
    // Once per flyer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={node} className="absolute top-0 left-0 opacity-0">
      {flyer.kind === "evidence" ? (
        <div className="flex max-w-[16rem] items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream py-2 pr-4 pl-2 text-ink shadow-card">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-mustard">
            <Icon name={flyer.icon} className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold tracking-widest text-ink/55 uppercase">New evidence</span>
            <span className="block truncate font-display text-lg leading-tight">{flyer.title}</span>
          </span>
        </div>
      ) : (
        <HelpMark help={flyer.help} className="size-16 shadow-card" />
      )}
    </div>
  );
}
