"use client";

import type { ComponentType } from "react";
import type { Act } from "@/components/game/context";
import type { PlayerView } from "@/lib/game/engine";
import type { SideJobView } from "@/lib/game/helps";
import type { CaseSuspect } from "@/lib/game/types";
import { shortName } from "@/lib/world/cast";
import { SideJobFrame, type GameProps, type Stars } from "./frame";
import { CoffeeRun, Penalty, PrintIt, Rewire } from "./games-a";
import { Breathe, Race, Tea } from "./games-b";

type GameSpec = {
  /** The job's name on screen: short, a word or two. */
  title: (suspect: string | null) => string;
  prompt: string;
  backdrop: string;
  Game: ComponentType<GameProps & { who?: CaseSuspect }>;
};

/**
 * The side-job games by the `game` a case's job names (src/data/cases/<case>.world.ts). The moves repeat on purpose
 * (tap on time, swipe, tap to stack, turn tiles, drag in order, hold and let go, trace), so another case can give
 * them new skins. Prompts are a few words: the pictures do the explaining.
 */
export const GAMES: Record<string, GameSpec> = {
  "coffee-run": { title: () => "Coffee run", prompt: "Tap Pour on green", backdrop: "bg-[linear-gradient(#b9aa90,#9c8e78_70%,#8a7c66)]", Game: CoffeeRun },
  penalty: { title: () => "Penalty", prompt: "Swipe up to shoot", backdrop: "bg-[#141a33]", Game: ({ onDone, who }) => <Penalty onDone={onDone} keeper={who} /> },
  "print-it": { title: () => "Print it", prompt: "Tap to stack", backdrop: "bg-[linear-gradient(#1d2340,#2a2f4d)]", Game: PrintIt },
  rewire: { title: () => "Rewire", prompt: "Tap a tile to turn it", backdrop: "bg-[linear-gradient(#1c1d27,#2a2c3c)]", Game: Rewire },
  tea: { title: (s) => `Tea for ${s ?? "them"}`, prompt: "Drag them in, in order", backdrop: "bg-[#5a3a26]", Game: Tea },
  breathe: { title: () => "Breathe", prompt: "Hold, then let go on the ring", backdrop: "bg-[#25304a]", Game: ({ onDone, who }) => <Breathe onDone={onDone} friend={who} /> },
  race: { title: (s) => `Race ${s ?? ""}`.trim(), prompt: "Trace the wire, fast", backdrop: "bg-[#46506a]", Game: Race },
};

/** A side job, played: the frame, the game, and the help sent to the team when it ends. */
export function SideJob({ job, view, act, roomName, onClose }: { job: SideJobView; view: PlayerView; act: Act; roomName: string; onClose: () => void }) {
  const spec = GAMES[job.game];
  if (!spec) return null;
  const suspect = job.suspect ? view.case.suspects.find((s) => s.id === job.suspect!.id) : undefined;
  const short = suspect ? shortName(suspect.name) : null;
  const { Game } = spec;
  return (
    <SideJobFrame
      title={spec.title(short)}
      place={short ? `Favour · ${short}` : `Odd job · ${roomName}`}
      help={job.help}
      helpText={(stars: Stars) => (job.help === "coffee" ? (stars === 3 ? "Two coffees" : "A coffee") : job.help === "lightbulb" ? "A Lightbulb" : `Sore spot: ${short ?? "?"}`)}
      backdrop={spec.backdrop}
      prompt={spec.prompt}
      onFinish={(stars) => act({ type: "sideJob", job: job.id, stars })}
      onClose={onClose}
    >
      {(done) => <Game onDone={done} who={suspect} />}
    </SideJobFrame>
  );
}
