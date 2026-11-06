"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { formatSpan } from "@/lib/game/clock";
import type { PlayerView } from "@/lib/game/engine";
import type { Beat } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { AudioToggles } from "./audio/AudioToggles";
import { CAMERA_EVENT } from "./camera-events";
import { play } from "./audio/sound";
import { BoardPanel, BoardPeek } from "./BoardPanel";
import { evidenceIn, GameProvider, nameOf, type Act } from "./context";
import { DeskPanel, Notebook } from "./desk/DeskPanel";
import { LieCallBar, LieMoment } from "./Interrogation";
import { EvidenceCard } from "./evidence/EvidenceCard";
import { SpotlightMoment } from "./evidence/ShowEveryone";
import { useLiveRoom } from "./live/useLive";
import { VoiceControl } from "./live/VoiceControl";
import { Avatar } from "./parts";
import { ProposalBar } from "./ProposalBar";
import { SolvePanel } from "./SolvePanel";
import { CrackMoment, Moments, SoundCues } from "./story/Moments";
import { StoryPlayer } from "./story/StoryPlayer";
import { TeamPanel } from "./TeamPanel";
import { Icon, type IconName } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";

type Panel = "board" | "solve" | "team" | "notes";

function useClock(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!startedAt) return "0:00";
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  const two = (n: number) => String(n).padStart(2, "0");
  // A long night reads as hours: 1:05:09, not 65:09.
  return s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
}

function ChapterSteps({ view }: { view: PlayerView }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Chapter ${view.chapter.number} of ${view.case.chapterTitles.length}`}>
      {view.case.chapterTitles.map((title, i) => {
        const n = i + 1;
        const done = n < view.chapter.number;
        const current = n === view.chapter.number;
        return (
          <li key={title} className="flex items-center gap-1.5">
            {i > 0 && <span className={cx("h-0.5 w-3 rounded-full sm:w-6", done || current ? "bg-mustard" : "bg-cream/20")} />}
            <span
              title={title}
              className={cx(
                "grid size-7 place-items-center rounded-full border-2 text-xs font-black",
                done && "border-ink bg-teal text-ink",
                current && "border-ink bg-mustard text-ink",
                !done && !current && "border-cream/25 text-cream/40",
              )}
            >
              {done ? <Icon name="check" className="size-3.5" /> : n}
            </span>
            {current && <span className="hidden font-display text-cream lg:inline">{title}</span>}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The night running out. Every paid move spends some of it, and each spend
 * drops off the clock as it happens, on every phone, so the whole team feels it.
 */
function StoryClock({ view }: { view: PlayerView }) {
  const deadline = view.deadline;
  const spent = deadline?.spent ?? 0;
  const last = useRef(spent);
  const [drop, setDrop] = useState<{ id: number; minutes: number } | null>(null);

  useEffect(() => {
    const minutes = spent - last.current;
    last.current = spent;
    if (minutes <= 0) return;
    setDrop({ id: Date.now(), minutes });
    const timer = window.setTimeout(() => setDrop(null), 2200);
    return () => window.clearTimeout(timer);
  }, [spent]);

  if (!deadline) return null;
  const share = deadline.night ? deadline.left / deadline.night : 1;
  return (
    <div className="mx-auto flex max-w-[90rem] items-center gap-2 border-t border-cream/10 px-4 py-1 text-xs font-bold text-cream/80">
      <Icon name="clock" className={cx("size-3.5 shrink-0", deadline.low ? "animate-pulse text-coral" : "text-mustard")} />
      <span className={cx("relative shrink-0 font-mono", deadline.low ? "text-coral" : "text-mustard")}>
        {deadline.time}
        {drop && (
          <span
            key={drop.id}
            aria-hidden
            className="clock-drop absolute top-full left-0 z-10 mt-1 rounded-full border-2 border-ink bg-coral px-2 py-0.5 font-sans text-[0.7rem] font-black whitespace-nowrap text-cream shadow-pop-sm"
          >
            −{formatSpan(drop.minutes)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{deadline.low ? "The night is almost gone. Every mistake counts." : deadline.what}</span>
      <span
        role="meter"
        aria-label="Night left"
        aria-valuemin={0}
        aria-valuemax={deadline.night}
        aria-valuenow={deadline.left}
        aria-valuetext={`${formatSpan(deadline.left)} left`}
        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-cream/15 sm:w-28"
      >
        <span className={cx("block h-full rounded-full transition-[width] duration-700 ease-out", deadline.low ? "bg-coral" : "bg-mustard")} style={{ width: `${share * 100}%` }} />
      </span>
    </div>
  );
}

function TopBar({ view, act }: { view: PlayerView; act: Act }) {
  const clock = useClock(view.startedAt);
  const [menu, setMenu] = useState(false);
  const { speaking } = useLiveRoom();
  return (
    <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-night/90 backdrop-blur">
      <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.7rem] font-extrabold tracking-widest text-mustard uppercase">
            {view.case.code} · Room {view.code}
          </p>
          <p className="font-case truncate text-lg leading-tight text-[var(--case-accent)] sm:text-xl">{view.case.title}</p>
        </div>
        <ChapterSteps view={view} />
        <span className="hidden items-center gap-1 rounded-full bg-cream/10 px-3 py-1 font-mono text-sm font-bold text-cream sm:flex" title="Time on the case">
          <Icon name="clock" className="size-4" /> {clock}
        </span>
        <VoiceControl compact />
        <div className="hidden -space-x-2 md:flex">
          {view.players.map((p, i) => (
            <span key={p.id} title={p.name}>
              <Avatar name={p.name} index={i} online={p.online} speaking={speaking.has(p.id)} size="sm" />
            </span>
          ))}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setMenu((m) => !m)} className="grid size-9 place-items-center rounded-full bg-cream/10 font-black text-cream hover:bg-cream/20" aria-label="Menu" aria-expanded={menu}>
            ⋯
          </button>
          {menu && (
            <div className="absolute top-11 right-0 w-64 animate-pop-in rounded-2xl border-[3px] border-ink bg-cream p-3 text-ink shadow-card">
              <p className="mb-2 font-mono text-sm font-bold">
                <Icon name="clock" className="size-4" /> {clock} on the case
              </p>
              <AudioToggles className="mb-3" />
              <p className="mb-3 text-sm font-semibold text-ink/70">Leaving passes your roles and evidence to someone else.</p>
              <button type="button" onClick={() => act({ type: "leave" })} className="w-full rounded-xl border-2 border-ink bg-coral py-2 font-extrabold text-cream">
                Leave the case
              </button>
            </div>
          )}
        </div>
      </div>
      <StoryClock view={view} />
    </header>
  );
}

/**
 * Each new chapter opens as a short story: what the last answer proved, the
 * chapter's title, then its beats. A fanfare marks the moment.
 */
function ChapterStory({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const last = view.solved.at(-1);
  const beats: Beat[] = [
    ...(last ? [{ kind: "narration" as const, text: `Correct. ${last.reveal}` }] : []),
    { kind: "title", text: `Chapter ${view.chapter.number}`, sub: view.chapter.title },
    ...view.chapter.story,
  ];
  useEffect(() => {
    play("chapter");
  }, []);
  return <StoryPlayer beats={beats} suspects={view.case.suspects} onDone={onClose} finishLabel="Open the chapter" />;
}

/** The team has named the right person, and every phone goes into the room with them. */
function ConfrontationStory({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const room = view.interrogation!;
  const suspect = view.case.suspects.find((s) => s.id === room.suspect)!;
  const beats: Beat[] = [
    { kind: "title", text: "The confrontation", sub: suspect.name },
    { kind: "line", who: suspect.id, text: room.opening },
  ];
  useEffect(() => {
    play("chapter");
  }, []);
  return <StoryPlayer beats={beats} suspects={view.case.suspects} onDone={onClose} finishLabel="Break their story" />;
}

/** Brief pop-ups when teammates find, pin or unlock something. */
function ActivityToasts({ view }: { view: PlayerView }) {
  const seen = useRef<string | null>(null);
  const [toasts, setToasts] = useState<PlayerView["activity"]>([]);

  useEffect(() => {
    const last = view.activity.at(-1)?.id ?? null;
    if (seen.current === null) {
      seen.current = last ?? "";
      return;
    }
    const from = view.activity.findIndex((a) => a.id === seen.current);
    const fresh = view.activity.slice(from + 1).filter((a) => a.playerId !== view.me.id && a.kind !== "miss" && a.kind !== "unpin" && a.kind !== "spotlight");
    seen.current = last;
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh].slice(-3));
    const ids = fresh.map((a) => a.id);
    window.setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 4500);
  }, [view.activity, view.me.id]);

  return (
    <div className="pointer-events-none fixed top-20 right-3 z-[51] grid w-[min(22rem,calc(100%-1.5rem))] gap-2" aria-live="polite">
      {toasts.map((a) => (
        <p key={a.id} className="animate-[toast-in_0.3s_ease-out] rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 text-sm leading-snug font-bold text-ink shadow-pop-sm">
          {a.text}
        </p>
      ))}
    </div>
  );
}

const DOCK: { id: Panel; label: string; icon: IconName }[] = [
  { id: "board", label: "Board", icon: "board" },
  { id: "solve", label: "Solve", icon: "target" },
  { id: "team", label: "Team", icon: "users" },
  { id: "notes", label: "Notes", icon: "note" },
];

const URGENT = ["vote", "live"];

/** Everything that isn't your own desk: one tap away, with a badge when something there needs you. */
function Dock({ badges, onOpen }: { badges: Partial<Record<Panel, string>>; onOpen: (panel: Panel) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Open a panel">
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {DOCK.map((d) => (
          <button key={d.id} type="button" onClick={() => onOpen(d.id)} className="relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-extrabold text-cream/70 transition-colors hover:text-mustard">
            <span className="grid h-8 w-14 place-items-center rounded-full">
              <Icon name={d.icon} />
            </span>
            {d.label}
            {badges[d.id] && (
              <span className={cx("absolute top-1 right-[calc(50%-2.4rem)] rounded-full border-2 border-ink px-1.5 text-[0.65rem] font-black", URGENT.includes(badges[d.id]!) || d.id === "team" ? "bg-coral text-cream" : "bg-cream text-ink")}>
                {badges[d.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** What the team is trying to answer right now, so nobody has to go looking for why they're here. */
function ChapterGoal({ view, onOpen }: { view: PlayerView; onOpen: () => void }) {
  const room = view.interrogation;
  const suspect = room && view.case.suspects.find((s) => s.id === room.suspect);
  const question = suspect ? `Break ${suspect.name}'s story.` : view.chapter.checkpoint ? view.chapter.checkpoint.question : view.case.confrontation ? "Who did it? Name them." : "Who did it, why, and what proves it?";
  return (
    <button type="button" onClick={onOpen} className="mb-5 flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-dusk px-4 py-2.5 text-left shadow-pop-sm transition-transform hover:-translate-y-0.5">
      <Icon name="target" className="size-5 shrink-0 text-mustard" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.7rem] font-extrabold tracking-widest text-mustard uppercase">{suspect ? "The confrontation" : `Chapter ${view.chapter.number}: ${view.chapter.title}`}</span>
        <span className="line-clamp-2 leading-snug font-bold text-cream">{question}</span>
      </span>
      <Icon name="arrow" className="size-4 shrink-0 text-cream/60" />
    </button>
  );
}

export function Investigation({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const chapterKey = `omc-chapter-${view.code}`;
  const [seenChapter, setSeenChapter] = useState<number | null>(null);

  useEffect(() => {
    try {
      setSeenChapter(Number(window.localStorage.getItem(chapterKey) ?? 1));
    } catch {
      setSeenChapter(1);
    }
  }, [chapterKey]);

  const closeCurtain = () => {
    trackEvent("chapter_opened", { case: view.case.id, chapter: view.chapter.number });
    setSeenChapter(view.chapter.number);
    try {
      window.localStorage.setItem(chapterKey, String(view.chapter.number));
    } catch {}
    setPanel(null);
  };

  const confrontedKey = `omc-confronted-${view.code}`;
  const [confronted, setConfronted] = useState<boolean | null>(null);
  const inTheRoom = Boolean(view.interrogation);
  useEffect(() => {
    try {
      const entered = Boolean(window.localStorage.getItem(confrontedKey));
      setConfronted(entered);
      // Coming back to a confrontation: it's the only thing happening, so it opens by itself.
      if (entered && inTheRoom) setPanel("solve");
    } catch {
      setConfronted(false);
    }
  }, [confrontedKey, inTheRoom]);

  const enterConfrontation = () => {
    setConfronted(true);
    try {
      window.localStorage.setItem(confrontedKey, "1");
    } catch {}
    setPanel("solve");
  };

  // Chat lives behind the Team button now, so messages that arrive while it's shut get counted.
  const heard = view.chat.filter((line) => line.playerId !== view.me.id).length;
  const [heardSeen, setHeardSeen] = useState(heard);
  useEffect(() => {
    if (panel === "team") setHeardSeen(heard);
  }, [panel, heard]);

  useEffect(() => {
    const close = () => {
      setOpened(null);
      setPanel(null);
    };
    window.addEventListener(CAMERA_EVENT, close);
    return () => window.removeEventListener(CAMERA_EVENT, close);
  }, []);

  const game = useMemo(() => ({ view, act, busy, open: setOpened }), [view, act, busy]);
  const openedEvidence = opened ? evidenceIn(view, opened) : undefined;
  const unread = heard - heardSeen;
  const badges: Partial<Record<Panel, string>> = {
    board: `${view.pins.length}/${view.pinLimit}`,
    solve: view.proposal ? "vote" : view.interrogation && !view.interrogation.over ? "live" : undefined,
    team: unread > 0 ? String(unread) : undefined,
  };

  const panels: Record<Panel, { title: string; body: React.ReactNode }> = {
    board: { title: "The board", body: <BoardPanel /> },
    solve: { title: "Solve", body: <SolvePanel /> },
    team: { title: "The team", body: <TeamPanel /> },
    notes: { title: "Your notebook", body: <Notebook code={view.code} /> },
  };

  return (
    <GameProvider value={game}>
      <TopBar view={view} act={act} />

      <main className={cx("mx-auto grid max-w-5xl items-start gap-6 px-4 pt-5 pb-32 lg:grid-cols-[minmax(0,1fr)_16rem] lg:px-6", view.proposal && "pb-96")}>
        <div className="min-w-0">
          <ChapterGoal view={view} onOpen={() => setPanel("solve")} />
          <DeskPanel />
        </div>
        <BoardPeek onOpen={() => setPanel("board")} />
      </main>

      <Dock badges={badges} onOpen={setPanel} />

      <ProposalBar view={view} act={act} busy={busy} />
      <ActivityToasts view={view} />
      <SoundCues view={view} />
      <Moments />
      <SpotlightMoment />
      <CrackMoment />
      <LieMoment />
      <LieCallBar />

      {panel && (
        // An open piece of evidence sits on top of the panel: Esc closes that first.
        <Sheet title={panels[panel].title} onClose={() => !opened && setPanel(null)}>
          <div className={cx(view.proposal && "pb-80")}>{panels[panel].body}</div>
        </Sheet>
      )}

      {openedEvidence && (
        <Sheet title={openedEvidence.title} onClose={() => setOpened(null)}>
          <div className={cx(view.proposal && "pb-80")}>
            <EvidenceCard evidence={openedEvidence} />
            {openedEvidence.pinned && (
              <p className="mt-3 text-center text-sm font-bold text-cream/60">
                On the board · pinned by {nameOf(view, view.pins.find((p) => p.evidenceId === openedEvidence.id)?.by)}
              </p>
            )}
          </div>
        </Sheet>
      )}

      {seenChapter !== null && view.chapter.number > seenChapter && <ChapterStory view={view} onClose={closeCurtain} />}
      {confronted === false && view.interrogation && <ConfrontationStory view={view} onClose={enterConfrontation} />}
    </GameProvider>
  );
}
