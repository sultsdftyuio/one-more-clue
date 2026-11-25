"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "@/components/game/game.css";
import { BoardPanel } from "@/components/game/BoardPanel";
import { evidenceIn, GameProvider, nameOf, type Act } from "@/components/game/context";
import { Notebook } from "@/components/game/desk/DeskPanel";
import { ArchivistTool } from "@/components/game/desk/roles/Archivist";
import { InterviewerTool } from "@/components/game/desk/roles/Interviewer";
import { ROLE_CARD } from "@/components/game/desk/roles/look";
import { PhotographerTool } from "@/components/game/desk/roles/Photographer";
import { TechTool } from "@/components/game/desk/roles/Tech";
import { EvidenceCard } from "@/components/game/evidence/EvidenceCard";
import { EvidenceShelf, useSeenEvidence } from "@/components/game/evidence/EvidenceShelf";
import { SpotlightMoment } from "@/components/game/evidence/ShowEveryone";
import { LieCallBar, LieMoment } from "@/components/game/Interrogation";
import { ActivityToasts, ChapterStory, Dock, type Panel } from "@/components/game/Investigation";
import { ProposalBar } from "@/components/game/ProposalBar";
import { SolvePanel } from "@/components/game/SolvePanel";
import { AccessMoment, CrackMoment, Moments } from "@/components/game/story/Moments";
import { TeamPanel } from "@/components/game/TeamPanel";
import { Icon } from "@/components/game/ui/Icon";
import { Sheet } from "@/components/game/ui/Sheet";
import type { PlayerView } from "@/lib/game/engine";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { TimelineBar } from "./TimelineBar";
import { ABILITY_ICON } from "./WorldSpots";

/** Each role's tool, the same ones the classic screens show (src/components/game/desk). */
const TOOL = { search: TechTool, interview: InterviewerTool, inspect: PhotographerTool, crosscheck: ArchivistTool };
const TOOL_NAME = { search: "The computer", interview: "The interrogation room", inspect: "The camera", crosscheck: "The evidence wall" };
const PANEL_TITLE: Record<Panel, string> = { evidence: "Evidence", board: "The board", solve: "Solve", team: "The team", notes: "Your notebook" };

/**
 * The game played over the building (W2.4 and W2.6): the game context the classic tools read, the dock with its
 * panels (Evidence, Board, Solve, Team, Notes), the team's vote bar, teammates' news, find moments, the chapter
 * stories, the night's timeline bar, and the sheets a spot opens (your role's tool, or who to ask). All of it is the
 * classic game's own components, so the rules and the words stay the same. It sits outside the world's touch-none
 * layer so sheets scroll like any other.
 */
export function WorldGame({
  view,
  act,
  busy,
  spot,
  onCloseSpot,
  panel,
  onPanel,
}: {
  view: PlayerView;
  act: Act;
  busy: boolean;
  spot: WorldSpotView | null;
  onCloseSpot: () => void;
  panel: Panel | null;
  onPanel: (panel: Panel | null) => void;
}) {
  const [opened, setOpened] = useState<string | null>(null);
  const { isNew, mark } = useSeenEvidence(view);
  const open = useCallback(
    (id: string) => {
      mark(id);
      setOpened(id);
    },
    [mark],
  );
  const game = useMemo(() => ({ view, act, busy, open }), [view, act, busy, open]);
  const piece = opened ? evidenceIn(view, opened) : undefined;

  // A new chapter plays its story once on this phone, shared with the classic screens' memory of it.
  const chapterKey = `omc-chapter-${view.code}`;
  const [seenChapter, setSeenChapter] = useState<number | null>(null);
  useEffect(() => {
    try {
      setSeenChapter(Number(window.localStorage.getItem(chapterKey) ?? 1));
    } catch {
      setSeenChapter(1);
    }
  }, [chapterKey]);
  const closeChapter = () => {
    setSeenChapter(view.chapter.number);
    try {
      window.localStorage.setItem(chapterKey, String(view.chapter.number));
    } catch {}
  };

  if (view.phase !== "investigation") return null;

  const roles = spot ? spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r) => r !== undefined) : [];
  const mine = roles.find((r) => view.me.roles.includes(r.id) && r.ability !== "none");
  const Tool = mine && mine.ability !== "none" ? TOOL[mine.ability] : null;
  const unread = view.evidence.filter(isNew).length;
  const badges: Partial<Record<Panel, string>> = {
    evidence: unread ? `${unread} new` : view.evidence.length ? String(view.evidence.length) : undefined,
    board: `${view.pins.length}/${view.pinLimit}`,
    solve: view.proposal ? "vote" : view.interrogation && !view.interrogation.over ? "live" : undefined,
  };
  const panels: Record<Panel, React.ReactNode> = {
    evidence: <EvidenceShelf isNew={isNew} onSolve={() => onPanel("solve")} />,
    board: <BoardPanel />,
    solve: <SolvePanel />,
    team: <TeamPanel />,
    notes: <Notebook code={view.code} />,
  };

  return (
    <GameProvider value={game}>
      {!view.proposal && <TimelineBar view={view} onOpen={open} />}
      <Dock badges={badges} onOpen={onPanel} />
      <ProposalBar view={view} act={act} busy={busy} />
      <ActivityToasts view={view} />
      <Moments />
      <SpotlightMoment />
      <CrackMoment />
      <AccessMoment />
      <LieMoment />
      <LieCallBar />

      {panel && (
        // An open piece of evidence sits on top of the panel: Esc closes that first.
        <Sheet title={PANEL_TITLE[panel]} onClose={() => !opened && onPanel(null)}>
          <div className={cx(view.proposal && "pb-80")}>{panels[panel]}</div>
        </Sheet>
      )}
      {spot && Tool && mine && mine.ability !== "none" && (
        <Sheet title={TOOL_NAME[mine.ability]} onClose={onCloseSpot}>
          <p className="mb-3 flex items-center gap-2 pr-12 text-sm font-bold text-cream/75">
            <Icon name="target" className="size-4" /> {spot.name}
          </p>
          <Tool />
        </Sheet>
      )}
      {spot && !Tool && (
        <Sheet title={spot.name} onClose={onCloseSpot}>
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
      {seenChapter !== null && view.chapter.number > seenChapter && <ChapterStory view={view} onClose={closeChapter} />}
    </GameProvider>
  );
}
