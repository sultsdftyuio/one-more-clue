"use client";

import { useCallback, useMemo, useState } from "react";
import "@/components/game/game.css";
import { evidenceIn, GameProvider, nameOf, type Act } from "@/components/game/context";
import { ArchivistTool } from "@/components/game/desk/roles/Archivist";
import { InterviewerTool } from "@/components/game/desk/roles/Interviewer";
import { ROLE_CARD } from "@/components/game/desk/roles/look";
import { PhotographerTool } from "@/components/game/desk/roles/Photographer";
import { TechTool } from "@/components/game/desk/roles/Tech";
import { EvidenceCard } from "@/components/game/evidence/EvidenceCard";
import { Icon } from "@/components/game/ui/Icon";
import { Sheet } from "@/components/game/ui/Sheet";
import type { PlayerView } from "@/lib/game/engine";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { ABILITY_ICON } from "./WorldSpots";

/** Each role's tool, the same ones the classic screens show (src/components/game/desk). */
const TOOL = { search: TechTool, interview: InterviewerTool, inspect: PhotographerTool, crosscheck: ArchivistTool };
const TOOL_NAME = { search: "The computer", interview: "The interrogation room", inspect: "The camera", crosscheck: "The evidence wall" };

/**
 * What opens from a spot (W2.4): if one of your roles has something there, that role's own tool, as a sheet over the
 * building; if not, who to ask. A piece of evidence a tool opens comes up in a sheet of its own. These sit outside the
 * world's touch-none layer so a sheet scrolls like any other, and they bring the game context the tools read.
 */
export function WorldSheets({ view, act, busy, spot, onClose }: { view: PlayerView; act: Act; busy: boolean; spot: WorldSpotView | null; onClose: () => void }) {
  const [opened, setOpened] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpened(id), []);
  const game = useMemo(() => ({ view, act, busy, open }), [view, act, busy, open]);
  const piece = opened ? evidenceIn(view, opened) : undefined;
  if (!spot && !piece) return null;

  const roles = spot ? spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r) => r !== undefined) : [];
  const mine = roles.find((r) => view.me.roles.includes(r.id) && r.ability !== "none");
  const Tool = mine && mine.ability !== "none" ? TOOL[mine.ability] : null;

  return (
    <GameProvider value={game}>
      {spot && Tool && mine && mine.ability !== "none" && (
        <Sheet title={TOOL_NAME[mine.ability]} onClose={onClose}>
          <p className="mb-3 flex items-center gap-2 pr-12 text-sm font-bold text-cream/75">
            <Icon name="target" className="size-4" /> {spot.name}
          </p>
          <Tool />
        </Sheet>
      )}
      {spot && !Tool && (
        <Sheet title={spot.name} onClose={onClose}>
          <h2 className="pr-12 font-display text-2xl text-cream">{spot.name}</h2>
          <p className="mt-1 font-semibold text-cream/80">Someone else has something to look at here.</p>
          <ul className="mt-4 grid gap-2">
            {roles.map((r) => {
              const holders = view.players.filter((p) => p.roles.includes(r.id));
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-night/60 p-3">
                  <span className={cx("grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink", ROLE_CARD[r.ability])}>
                    <Icon name={ABILITY_ICON[r.ability]} className="size-4" />
                  </span>
                  <span className="font-bold text-cream">
                    {r.name}
                    <span className="block text-sm font-semibold text-cream/70">
                      {holders.length ? `Ask ${holders.map((p) => nameOf(view, p.id)).join(" or ")} to come and look.` : "Nobody has this role in your game."}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
      {piece && (
        <Sheet title={piece.title} onClose={() => setOpened(null)}>
          <EvidenceCard evidence={piece} />
        </Sheet>
      )}
    </GameProvider>
  );
}
