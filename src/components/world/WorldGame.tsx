"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import "@/components/game/game.css";
import { BoardPanel } from "@/components/game/BoardPanel";
import { evidenceIn, GameProvider, type Act } from "@/components/game/context";
import { Notebook } from "@/components/game/desk/DeskPanel";
import { InterviewerTool } from "@/components/game/desk/roles/Interviewer";
import { PhotographerTool } from "@/components/game/desk/roles/Photographer";
import { EvidenceCard } from "@/components/game/evidence/EvidenceCard";
import { EvidenceShelf, useSeenEvidence } from "@/components/game/evidence/EvidenceShelf";
import { SpotlightMoment } from "@/components/game/evidence/ShowEveryone";
import { LieCallBar, LieMoment } from "@/components/game/Interrogation";
import { ActivityToasts, ChapterStory, Dock, type Panel } from "@/components/game/Investigation";
import { ProposalBar } from "@/components/game/ProposalBar";
import { SolvePanel } from "@/components/game/SolvePanel";
import { AccessMoment, CrackMoment, Moments } from "@/components/game/story/Moments";
import { TeamPanel } from "@/components/game/TeamPanel";
import { Sheet } from "@/components/game/ui/Sheet";
import type { PlayerView } from "@/lib/game/engine";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { useWorld } from "./useWorld";
import { DOCK_ICONS } from "./WorldIcons";
import { WorldMilestones } from "./WorldMilestones";
import { RewindBar } from "./WorldRewind";
import { SpotSheetBody, type PlatePicture } from "./WorldSpotSheet";

/** A role's tool opened from the building rather than a spot: the interrogation room on someone you walked up to (W5.3), or the camera from "then and now" (W5.1). */
export type WorldTool = { kind: "interview"; who: string } | { kind: "camera" };
const PANEL_TITLE: Record<Panel, string> = {
  evidence: "Evidence",
  board: "The board",
  solve: "Solve",
  team: "The team",
  notes: "Your notebook",
};

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
  tool,
  onCloseTool,
  picture,
}: {
  view: PlayerView;
  act: Act;
  busy: boolean;
  spot: WorldSpotView | null;
  onCloseSpot: () => void;
  tool: WorldTool | null;
  onCloseTool: () => void;
  /** A close-up of the building at a spot, for the top of its panel. */
  picture?: (x: number, z: number) => PlatePicture | null;
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
  const rewinding = useWorld((s) => s.rewind.open);

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
  // The sheet follows the spot as the view changes (a pull brings a piece in, a find makes it fresh).
  const here = spot ? (view.spots.find((s) => s.id === spot.id) ?? spot) : null;

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
      {rewinding && view.rewind && <RewindBar view={view} map={view.rewind} />}
      {!rewinding && <Dock badges={badges} onOpen={onPanel} floating icons={DOCK_ICONS} />}
      <WorldMilestones view={view} />
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
        <Sheet side title={PANEL_TITLE[panel]} onClose={() => !opened && onPanel(null)}>
          <div className={cx(view.proposal && "pb-80")}>{panels[panel]}</div>
        </Sheet>
      )}
      {here && (
        <Sheet side title={here.name} onClose={onCloseSpot}>
          <SpotSheetBody spot={here} onClose={onCloseSpot} onCamera={onCloseSpot} picture={picture?.(here.x, here.z)} />
        </Sheet>
      )}
      {tool?.kind === "interview" && (
        <Sheet side title="The interrogation room" onClose={onCloseTool}>
          <SoreLine view={view} name={tool.who} />
          <InterviewerTool key={tool.who} who={tool.who} />
        </Sheet>
      )}
      {tool?.kind === "camera" && (
        <Sheet side title="The camera" onClose={onCloseTool}>
          <PhotographerTool />
        </Sheet>
      )}
      {piece && (
        <Sheet side title={piece.title} onClose={() => setOpened(null)}>
          <EvidenceCard evidence={piece} />
        </Sheet>
      )}
      {seenChapter !== null && view.chapter.number > seenChapter && <ChapterStory view={view} onClose={closeChapter} />}
    </GameProvider>
  );
}

/** A sore spot the team has won for whoever is in the chair: the topic that makes them uneasy (never whether they lie). */
function SoreLine({ view, name }: { view: PlayerView; name: string }) {
  const sore = view.helps.sore.find((s) => s.name === name);
  if (!sore) return null;
  const short = name.split(" ")[0] === "Prof." ? name : name.split(" ")[0];
  return (
    <p className="mb-3 rounded-2xl border-2 border-ink bg-[#bfe0ff] px-3 py-2 text-sm font-extrabold text-ink">
      Sore spot: {short} gets uneasy about {sore.topic}.
    </p>
  );
}
