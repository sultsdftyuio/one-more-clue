"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { goalOf } from "@/components/game/context";
import { Icon, type IconName } from "@/components/game/ui/Icon";
import type { PlayerView } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { isZoomedOut } from "@/lib/world/camera";
import type { CastMember } from "@/lib/world/cast";
import { getAudioSettings, setAudioSettings, subscribeAudio, unlock } from "@/components/game/audio/sound";
import { useWorld } from "./useWorld";
import { HelpsChip } from "./WorldJobs";
import { RewindButton } from "./WorldRewind";

export const chip = "rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold text-ink shadow-pop-sm active:translate-y-0.5 active:shadow-none";
/** A round icon button: the camera row and the HUD speak in pictures, with names for screen readers and on hover. */
export const roundButton =
  "pointer-events-auto grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-cream text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none aria-pressed:bg-mustard";

export function IconButton({ icon, label, onClick, pressed, className }: { icon: IconName; label: string; onClick: () => void; pressed?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} className={cx(roundButton, className)}>
      <Icon name={icon} className="size-5" />
    </button>
  );
}
// Solid, not frosted: a backdrop blur would re-blur the moving canvas every frame, which costs phones dearly.
const glass = "rounded-2xl border-2 border-ink/80 bg-night/90";

/**
 * The chapter and what the team is trying to prove, as a badge. When a chapter opens the question shows in full for a
 * few seconds, then folds into the badge; tap it to read it again, and tap the question to go and solve it.
 */
function GoalBadge({ chapter, chapters, question, onSolve }: { chapter: number; chapters: number; question: string; onSolve: () => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    setOpen(true);
    const timer = window.setTimeout(() => setOpen(false), 8000);
    return () => window.clearTimeout(timer);
  }, [chapter]);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Chapter ${chapter} of ${chapters}: ${question}`}
        className="flex items-center gap-1 rounded-full border-[3px] border-ink bg-mustard py-1 pr-1.5 pl-2.5 font-display text-lg text-ink shadow-pop-sm"
      >
        {chapter}
        <span className="text-xs font-black text-ink/60">/{chapters}</span>
        <span className="grid size-7 place-items-center rounded-full bg-ink text-mustard">
          <Icon name="target" className="size-4" />
        </span>
      </button>
      {open && (
        <button
          type="button"
          onClick={onSolve}
          className="world-bubble absolute top-full left-0 z-10 mt-2 flex w-[min(20rem,80vw)] items-start gap-2 rounded-2xl border-[3px] border-ink bg-night/95 p-3 text-left shadow-card"
        >
          <Icon name="target" className="mt-0.5 size-4 shrink-0 text-mustard" />
          <span className="text-sm leading-snug font-bold text-cream">{question}</span>
        </button>
      )}
    </div>
  );
}

/** How smoothly the building is drawing, for checking on phones: add ?fps to the address to see it. */
function FrameMeter() {
  const fps = useWorld((s) => s.status.fps);
  const slowest = useWorld((s) => s.status.slowest);
  const renderer = useWorld((s) => s.status.renderer);
  const dpr = useWorld((s) => s.status.dpr);
  const [wanted, setWanted] = useState(false);
  useEffect(() => setWanted(new URLSearchParams(window.location.search).has("fps")), []);
  if (!renderer || !wanted) return null;
  const tone = fps >= 55 ? "text-teal" : fps >= 40 ? "text-mustard" : "text-coral";
  return (
    <p className={cx(glass, "px-2.5 py-1 text-right text-[11px] leading-tight font-bold text-cream/80")} aria-label={`Drawing at ${fps} frames a second`}>
      <span className={cx("text-sm font-extrabold", tone)}>{fps || "–"} fps</span>
      <br />
      {renderer} · {dpr}× · worst {slowest} ms
    </p>
  );
}

/**
 * The night left and what the team has earned (W2.6): the story clock as a small chip, with room for the helps the
 * side jobs win (W6). It goes coral when the night is nearly gone.
 */
function NightChip({ view }: { view: PlayerView }) {
  const d = view.deadline;
  if (!d) return null;
  const share = d.night ? d.left / d.night : 1;
  return (
    <div className={cx(glass, "pointer-events-auto flex items-center gap-2 px-2.5 py-1.5")} title={d.what}>
      <Icon name="clock" className={cx("size-4 shrink-0", d.low ? "animate-pulse text-coral" : "text-mustard")} />
      <span className={cx("font-mono text-sm font-bold whitespace-nowrap", d.low ? "text-coral" : "text-mustard")}>{d.time}</span>
      <span
        role="meter"
        aria-label="Night left"
        aria-valuemin={0}
        aria-valuemax={d.night}
        aria-valuenow={d.left}
        className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-cream/15"
      >
        <span className={cx("block h-full rounded-full", d.low ? "bg-coral" : "bg-mustard")} style={{ width: `${share * 100}%` }} />
      </span>
    </div>
  );
}

/** Copies the world link for friends (or opens the phone's share sheet). */
/** Sound on this device, on and off (sound and music together). The tap itself starts the sound if nothing has yet. */
function SoundButton() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const read = () => setOn(getAudioSettings().sound);
    read();
    const stop = subscribeAudio(read);
    return () => {
      stop();
    };
  }, []);
  return (
    <IconButton
      icon={on ? "speaker" : "speakerOff"}
      label={on ? "Sound on: tap to mute" : "Sound off: tap to turn it on"}
      pressed={!on}
      onClick={() => {
        unlock();
        setAudioSettings({ sound: !on, music: !on });
      }}
    />
  );
}

function InviteButton({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => setDone(false), 2200);
    return () => window.clearTimeout(timer);
  }, [done]);
  const invite = async () => {
    const url = `${window.location.origin}/r/${code}/world`;
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
    } catch {
      await navigator.share?.({ url }).catch(() => {});
    }
  };
  return <IconButton icon={done ? "check" : "share"} label={done ? "Link copied" : "Invite a friend"} onClick={invite} pressed={done} />;
}

/**
 * The overlay on the building (W0.4, W2.6): the chapter and its question (tap it to solve), the night clock, the team
 * (tap a name to find them), the minimap, the camera buttons and the card of whoever was tapped. During the
 * investigation the dock and the timeline bar (WorldGame) sit under the camera buttons. Everything a player reads is
 * DOM, never canvas.
 */
export function WorldHud({
  code,
  view,
  cast,
  stickers,
  minimap,
  onSolve,
  personActions,
  roleButtons,
}: {
  code: string;
  view: PlayerView | null;
  cast: Record<string, CastMember>;
  /** The detective sticker each player wears, by player id. */
  stickers: Record<string, string>;
  /** Shown under the title card. */
  minimap?: ReactNode;
  onSolve: () => void;
  /** What you can do with someone you tapped (question them, W5.3), under their card. */
  personActions?: (member: CastMember) => ReactNode;
  /** More camera-row buttons for your role (the Photographer's flash, W5.1). */
  roleButtons?: ReactNode;
}) {
  const stage = useWorld((s) => s.status.stage);
  const failure = useWorld((s) => s.status.error);
  const zoomedOut = useWorld((s) => s.status.stage === "ready" && isZoomedOut(s.camera, s.range));
  const selected = useWorld((s) => s.selected);
  const look = useWorld((s) => s.look);
  const select = useWorld((s) => s.select);
  const member = selected ? cast[selected] : undefined;
  const mine = view ? (stickers[view.me.id] ?? null) : null;
  const followingMe = useWorld((s) => Boolean(mine) && s.following === mine);
  const playing = view?.phase === "investigation";
  const rewinding = useWorld((s) => s.rewind.open);
  const goal = view && playing ? goalOf(view) : null;

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="flex max-w-[75%] min-w-0 flex-col items-start gap-2">
          <div className="pointer-events-auto flex max-w-full items-center gap-2">
            {view && playing && goal ? (
              <GoalBadge chapter={view.chapter.number} chapters={view.case.chapterTitles.length} question={goal.question} onSolve={onSolve} />
            ) : (
              <span className={cx(glass, "px-3 py-1.5 font-display text-lg leading-tight text-cream")}>{view ? view.case.title : "The building"}</span>
            )}
            {view && (
              <ul className="flex -space-x-1.5" aria-label="Your team">
                {view.players.map((p) => {
                  const sticker = stickers[p.id];
                  const me = p.id === view.me.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={!sticker}
                        onClick={() => {
                          if (!sticker) return;
                          select(sticker);
                          look({ kind: "person", id: sticker });
                        }}
                        aria-label={me ? `${p.name} (you)` : `${p.name}${p.online ? "" : ", away"}: find them`}
                        title={me ? `${p.name} (you)` : p.name}
                        className={cx(
                          "relative grid size-9 place-items-center rounded-full border-[3px] border-ink font-display text-base shadow-pop-sm",
                          me ? "bg-mustard text-ink" : "bg-cream text-ink",
                        )}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                        <span className={cx("absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-ink", p.online ? "bg-teal" : "bg-cream/50")} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {minimap}
        </div>
        <div className="flex flex-col items-end gap-2">
          {view && playing && <NightChip view={view} />}
          {view && playing && <HelpsChip view={view} />}
          <FrameMeter />
        </div>
      </header>

      {stage === "loading" && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center font-display text-2xl text-cream">
          <span className="flex items-center gap-3">
            <span className="size-3 animate-pulse rounded-full bg-mustard" /> Opening the building…
          </span>
        </p>
      )}
      {stage === "failed" && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="max-w-sm rounded-3xl border-[3px] border-ink bg-dusk p-6 text-center shadow-card">
            <h2 className="font-display text-2xl text-cream">The building didn&apos;t open</h2>
            <p className="mt-2 font-semibold text-cream/80">{failure}</p>
            <Link href={`/r/${code}`} className={cx(chip, "mt-5 inline-block")}>
              Classic screens
            </Link>
          </div>
        </div>
      )}

      {/* During the investigation the dock (4.6rem) and the timeline bar sit underneath. */}
      <footer className={cx("pointer-events-none absolute inset-x-0 grid gap-3 p-3", playing ? (rewinding ? "bottom-[calc(13.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(7.4rem+env(safe-area-inset-bottom))]") : "bottom-0")}>
        {member && (
          <section
            aria-live="polite"
            className="pointer-events-auto relative mx-auto w-full max-w-md animate-pop-in rounded-3xl border-[3px] border-ink bg-cream p-4 pr-12 text-ink shadow-card"
          >
            <h2 className="font-display text-2xl leading-tight">{member.name}</h2>
            <p className="text-sm font-extrabold text-ink/70">{member.line}</p>
            {member.blurb && <p className="mt-1.5 text-sm font-semibold">{member.blurb}</p>}
            {playing && personActions?.(member)}
            <button
              type="button"
              onClick={() => select(null)}
              aria-label="Close"
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-full border-2 border-ink bg-white text-lg font-black"
            >
              ×
            </button>
          </section>
        )}
        <nav className="pointer-events-none flex flex-wrap items-center justify-center gap-2" aria-label="Camera">
          {zoomedOut ? (
            <IconButton icon="crosshair" label="Close-up" onClick={() => look(mine ? { kind: "person", id: mine } : { kind: "closeUp" })} />
          ) : (
            <IconButton icon="building" label="Whole building" onClick={() => look({ kind: "whole" })} />
          )}
          {mine && !zoomedOut && (
            <IconButton
              icon="target"
              label={followingMe ? "Following you" : "Find me"}
              pressed={followingMe}
              onClick={() => {
                select(mine);
                look({ kind: "person", id: mine });
              }}
            />
          )}
          {playing && view?.rewind && <RewindButton className={roundButton} />}
          {playing && !zoomedOut && roleButtons}
          {!playing && <InviteButton code={code} />}
          <SoundButton />
          <Link href={`/r/${code}`} aria-label="Classic screens" title="Classic screens" className={cx(roundButton, "bg-cream/80")}>
            <Icon name="screen" className="size-5" />
          </Link>
        </nav>
      </footer>
    </>
  );
}
