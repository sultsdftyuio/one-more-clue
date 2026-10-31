"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { PlayerView } from "@/lib/game/engine";
import type { Beat } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { AudioToggles } from "./audio/AudioToggles";
import { play } from "./audio/sound";
import { BoardPanel } from "./BoardPanel";
import { evidenceIn, GameProvider, nameOf, type Act } from "./context";
import { DeskPanel } from "./desk/DeskPanel";
import { LieMoment } from "./Interrogation";
import { EvidenceCard } from "./evidence/EvidenceCard";
import { useLiveRoom } from "./live/useLive";
import { VoiceControl } from "./live/VoiceControl";
import { Avatar } from "./parts";
import { ProposalBar } from "./ProposalBar";
import { SolvePanel } from "./SolvePanel";
import { Moments, SoundCues } from "./story/Moments";
import { StoryPlayer } from "./story/StoryPlayer";
import { TeamPanel } from "./TeamPanel";
import { Icon, type IconName } from "./ui/Icon";
import { Sheet } from "./ui/Sheet";

type Tab = "desk" | "board" | "solve" | "team";

function useClock(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!startedAt) return "0:00";
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

/** The night running out. It only moves when the team answers wrongly. */
function StoryClock({ view }: { view: PlayerView }) {
  const deadline = view.deadline;
  if (!deadline) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-t border-cream/10 px-4 py-1 text-xs font-bold text-cream/80">
      <Icon name="clock" className="size-3.5 shrink-0 text-mustard" />
      <span className="shrink-0 font-mono text-mustard">{deadline.time}</span>
      <span className="truncate">{deadline.what}</span>
      <span className="flex shrink-0 gap-1" aria-label={`${deadline.left} wrong answers left`}>
        {Array.from({ length: deadline.left }, (_, i) => (
          <span key={i} className="size-1.5 rounded-full bg-coral" />
        ))}
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
    const fresh = view.activity.slice(from + 1).filter((a) => a.playerId !== view.me.id && a.kind !== "miss" && a.kind !== "unpin");
    seen.current = last;
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh].slice(-3));
    const ids = fresh.map((a) => a.id);
    window.setTimeout(() => setToasts((t) => t.filter((x) => !ids.includes(x.id))), 4500);
  }, [view.activity, view.me.id]);

  return (
    <div className="pointer-events-none fixed top-20 right-3 z-40 grid w-[min(22rem,calc(100%-1.5rem))] gap-2" aria-live="polite">
      {toasts.map((a) => (
        <p key={a.id} className="animate-[toast-in_0.3s_ease-out] rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 text-sm leading-snug font-bold text-ink shadow-pop-sm">
          {a.text}
        </p>
      ))}
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "desk", label: "Desk", icon: "desk" },
  { id: "board", label: "Board", icon: "board" },
  { id: "solve", label: "Solve", icon: "target" },
  { id: "team", label: "Team", icon: "users" },
];

/** True on laptop-width screens, where the three panels sit side by side. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

export function Investigation({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const wide = useWide();
  const [tab, setTab] = useState<Tab>("desk");
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
    setTab("desk");
  };

  const game = useMemo(() => ({ view, act, busy, open: setOpened }), [view, act, busy]);
  const openedEvidence = opened ? evidenceIn(view, opened) : undefined;
  const badges: Partial<Record<Tab, string>> = {
    board: `${view.pins.length}/${view.pinLimit}`,
    solve: view.proposal ? "vote" : view.interrogation && !view.interrogation.over ? "live" : undefined,
  };

  const panels: Record<Tab, React.ReactNode> = {
    desk: <DeskPanel />,
    board: <BoardPanel />,
    solve: <SolvePanel />,
    team: <TeamPanel />,
  };

  return (
    <GameProvider value={game}>
      <TopBar view={view} act={act} />

      {wide ? (
        // Laptops: desk, board and the case side by side
        <main className={cx("mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(20rem,0.9fr)] items-start gap-6 px-6 pt-6 pb-16", view.proposal && "pb-72")}>
          <div className="grid gap-6">{panels.desk}</div>
          <div className="sticky top-24 grid gap-6">{panels.board}</div>
          <div className="grid gap-6">
            {panels.solve}
            {panels.team}
          </div>
        </main>
      ) : (
        // Phones and tablets: one panel at a time
        <main className={cx("mx-auto max-w-2xl px-4 pt-5 pb-32", view.proposal && "pb-72")}>{panels[tab]}</main>
      )}

      {!wide && <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" role="tablist">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                window.scrollTo({ top: 0 });
              }}
              className={cx("relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-extrabold", tab === t.id ? "text-mustard" : "text-cream/60")}
            >
              <span className={cx("grid h-8 w-14 place-items-center rounded-full transition-colors", tab === t.id && "bg-mustard/15")}>
                <Icon name={t.icon} />
              </span>
              {t.label}
              {badges[t.id] && (
                <span className={cx("absolute top-1 right-[calc(50%-2.4rem)] rounded-full border-2 border-ink px-1.5 text-[0.65rem] font-black", badges[t.id] === "vote" || badges[t.id] === "live" ? "bg-coral text-cream" : "bg-cream text-ink")}>
                  {badges[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>}

      <ProposalBar view={view} act={act} busy={busy} />
      <ActivityToasts view={view} />
      <SoundCues view={view} />
      <Moments />
      <LieMoment />

      {openedEvidence && (
        <Sheet title={openedEvidence.title} onClose={() => setOpened(null)}>
          <EvidenceCard evidence={openedEvidence} />
          {openedEvidence.pinned && (
            <p className="mt-3 text-center text-sm font-bold text-cream/60">
              On the board · pinned by {nameOf(view, view.pins.find((p) => p.evidenceId === openedEvidence.id)?.by)}
            </p>
          )}
        </Sheet>
      )}

      {seenChapter !== null && view.chapter.number > seenChapter && <ChapterStory view={view} onClose={closeCurtain} />}
    </GameProvider>
  );
}
