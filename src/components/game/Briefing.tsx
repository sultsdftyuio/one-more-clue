"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import type { PlayerView } from "@/lib/game/engine";
import { Music } from "./audio/sound";
import { carriesSound, roleNames, type Act } from "./context";
import { ROLE_CARD } from "./desk/roles/look";
import { useLiveRoom } from "./live/useLive";
import { Avatar } from "./parts";
import { Cinematic } from "./story/Cinematic";
import { StoryPlayer } from "./story/StoryPlayer";
import { Icon, type IconName } from "./ui/Icon";

const POWER: Record<string, { icon: IconName; text: string }> = {
  search: { icon: "search", text: "Search the records for any name, number or place." },
  interview: { icon: "mic", text: "Spend the team's questions on suspects and witnesses." },
  inspect: { icon: "camera", text: "Tap into photos to find details nobody else can." },
  crosscheck: { icon: "scale", text: "Hold two pieces of evidence together to expose a lie." },
  none: { icon: "file", text: "Your evidence backs up the others." },
};

/** The whole rulebook, short enough to read while the cards land. */
const HOW_TO_WIN = ["Use your power, and say what you find out loud.", "Pin what matters to the board so everyone sees it.", "Vote on each chapter's question. Then name who did it."];

/** The opening: the case's film if it has one, its story beats if not. Plays once per device. */
function Opening({ view, onDone }: { view: PlayerView; onDone: () => void }) {
  const film = view.case.cinematic;
  if (film) return <Cinematic video={film.video} poster={film.poster} muted={!carriesSound(view)} onDone={onDone} />;
  return <StoryPlayer beats={view.case.story} suspects={view.case.suspects} onDone={onDone} finishLabel="See your role" />;
}

/** Your role, dealt as a card, then one tap into the case. */
function RoleReveal({ view, act, busy, onReplay }: { view: PlayerView; act: Act; busy: boolean; onReplay: () => void }) {
  const myRoles = view.case.roles.filter((r) => view.me.roles.includes(r.id));
  const waitingFor = view.players.filter((p) => !p.ready).length;
  const { speaking } = useLiveRoom();

  return (
    <div className="mx-auto grid max-w-xl grid-cols-1 gap-5 pb-28">
      <header className="text-center">
        <p className="text-xs font-extrabold tracking-[0.25em] text-[var(--case-accent)] uppercase">{view.case.code}</p>
        <h1 className="font-case mt-1 text-4xl leading-tight text-cream text-pop">{view.case.title}</h1>
      </header>

      {myRoles.map((role, i) => (
        <article
          key={role.id}
          className={cx("animate-[deal_0.7s_cubic-bezier(0.34,1.4,0.64,1)_both] rounded-[2rem] border-[3px] border-ink p-5 shadow-card", ROLE_CARD[role.ability])}
          style={{ animationDelay: `${0.15 + i * 0.35}s` }}
        >
          <p className="text-xs font-extrabold tracking-[0.25em] uppercase opacity-70">You are the</p>
          <p className="font-display text-5xl leading-tight">{role.name}</p>
          <p className="mt-1 font-semibold">{role.blurb}</p>
          <p className="mt-4 flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 font-bold text-ink">
            <Icon name={POWER[role.ability].icon} />
            <span>{POWER[role.ability].text}</span>
          </p>
        </article>
      ))}

      <ol className="grid animate-[fade-in_0.5s_ease-out_0.9s_both] gap-2">
        {HOW_TO_WIN.map((line, i) => (
          <li key={line} className="flex items-center gap-3 font-bold text-cream">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-cream font-display text-ink">{i + 1}</span>
            {line}
          </li>
        ))}
      </ol>

      <ul className="flex animate-[fade-in_0.5s_ease-out_1.1s_both] flex-wrap justify-center gap-3">
        {view.players.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-full bg-cream/10 py-1 pr-3 pl-1 text-sm font-bold text-cream">
            <Avatar name={p.name} index={i} online={p.online} speaking={speaking.has(p.id)} size="sm" />
            <span>
              {p.id === view.me.id ? "You" : p.name}
              <span className="block text-xs text-cream/60">{roleNames(view, p.roles).join(" & ")}</span>
            </span>
            {p.ready && <Icon name="check" className="size-4 text-teal" />}
          </li>
        ))}
      </ul>

      <button type="button" onClick={onReplay} className="mx-auto flex items-center gap-1.5 text-sm font-extrabold text-cream/50 hover:text-cream">
        <Icon name="skip" className="size-4" /> Watch the opening again
      </button>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-night/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3">
          {view.me.ready ? (
            <p className="flex items-center gap-2 font-bold text-cream/80">
              <span className="size-2.5 animate-pulse rounded-full bg-mustard" />
              Waiting for {waitingFor} more {waitingFor === 1 ? "detective" : "detectives"}
            </p>
          ) : (
            <Button onClick={() => act({ type: "ready" })} disabled={busy} className="w-full max-w-sm">
              Let&apos;s go <Icon name="arrow" className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Briefing({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  // The opening plays once per device; after that (or on a reload) you land on your role.
  const seenKey = `omc-story-${view.code}`;
  const [opening, setOpening] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setOpening(!window.localStorage.getItem(seenKey));
    } catch {
      setOpening(true);
    }
  }, [seenKey]);

  // The film brings its own soundtrack; the briefing music waits for it to finish.
  const theme = view.case.theme;
  const loud = carriesSound(view);
  useEffect(() => {
    if (loud && (opening === false || (opening && !view.case.cinematic))) Music.want("briefing", 1, theme);
    else if (opening || !loud) Music.want(null);
  }, [loud, opening, theme, view.case.cinematic]);

  const closeOpening = () => {
    setOpening(false);
    try {
      window.localStorage.setItem(seenKey, "1");
    } catch {}
  };

  if (opening === null) return null;
  if (opening) return <Opening view={view} onDone={closeOpening} />;
  return <RoleReveal view={view} act={act} busy={busy} onReplay={() => setOpening(true)} />;
}
