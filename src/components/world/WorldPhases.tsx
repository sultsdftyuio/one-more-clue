"use client";

import { Briefing } from "@/components/game/Briefing";
import type { Act } from "@/components/game/context";
import { Reveal } from "@/components/game/Reveal";
import { Icon } from "@/components/game/ui/Icon";
import type { PlayerView } from "@/lib/game/engine";
import { trackEvent } from "@/lib/analytics";
import { cx } from "@/lib/cx";

const SCREENS = [
  { mode: "together", label: "One screen", note: "Same room: the film and music play on the host's phone." },
  { mode: "remote", label: "Every phone", note: "Apart: everyone watches and hears it on their own phone." },
] as const;

/**
 * The lobby in the building (W9.1): who's here, where the team is playing, and Start for the host. Everyone's
 * detective already stands in the building behind it, and the camera row has Invite.
 */
export function WorldLobby({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const host = view.players.find((p) => p.isHost)?.name ?? "the host";
  const count = view.players.length;
  const short = view.case.minPlayers - count;
  const start = async () => {
    if (await act({ type: "start" })) trackEvent("game_started", { case: view.case.id, players: count, mode: view.mode, world: true });
  };
  return (
    <section
      aria-label="The lobby"
      className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md rounded-3xl sm:top-20 sm:right-4 sm:bottom-auto sm:left-auto sm:mx-0 sm:w-96 border-[3px] border-ink bg-dusk/95 p-4 text-cream shadow-card"
    >
      <p className="text-xs font-extrabold tracking-widest text-mustard uppercase">{view.case.code}</p>
      <h2 className="font-display text-2xl leading-tight">{view.case.title}</h2>
      <p className="mt-1 text-sm font-semibold text-cream/75">{view.case.tagline}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Detectives here">
        {view.players.map((p) => (
          <li key={p.id} className={cx("rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-extrabold", p.id === view.me.id ? "bg-mustard text-ink" : "bg-cream text-ink")}>
            {p.id === view.me.id ? `${p.name} (you)` : p.name}
            {p.isHost && <span className="font-semibold text-ink/60"> · host</span>}
          </li>
        ))}
        {Array.from({ length: Math.max(0, view.case.maxPlayers - count) }, (_, i) => (
          <li key={`free-${i}`} className="rounded-full border-2 border-dashed border-cream/30 px-2.5 py-0.5 text-sm font-bold text-cream/50">
            Free seat
          </li>
        ))}
      </ul>
      {view.me.isHost ? (
        <>
          <div role="radiogroup" aria-label="Where are you playing?" className="mt-3 grid grid-cols-2 gap-2">
            {SCREENS.map((s) => {
              const on = view.mode === s.mode;
              return (
                <button
                  key={s.mode}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => !on && act({ type: "setMode", mode: s.mode })}
                  className={cx("flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 text-left text-sm font-extrabold", on ? "border-mustard bg-mustard/10" : "border-white/15 text-cream/70")}
                >
                  <span className={cx("size-3 shrink-0 rounded-full", on ? "bg-mustard" : "bg-white/20")} />
                  {s.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs font-bold text-cream/60">{SCREENS.find((s) => s.mode === view.mode)?.note}</p>
          <button
            type="button"
            onClick={start}
            disabled={busy || short > 0}
            className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-mustard px-4 py-3 font-display text-xl text-ink shadow-pop-sm disabled:opacity-60"
          >
            {short > 0 ? `Invite ${short} more to start` : "Start the case"}
          </button>
          {view.testBots && count < view.case.maxPlayers && (
            <button type="button" disabled={busy} onClick={() => act({ type: "addBot" })} className="mt-2 flex w-full items-center justify-center gap-2 text-sm font-extrabold text-cream/60">
              <Icon name="robot" className="size-4" /> Add a test bot
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 font-extrabold text-cream/80">
          <span className="size-2 animate-pulse rounded-full bg-mustard" /> Waiting for {host} to start
        </p>
      )}
    </section>
  );
}

/**
 * The briefing and the reveal over the building (W9.1): the classic screens, whole, on a full-screen layer, so the
 * opening film, the role cards, the confession and the stars are the same in both versions.
 */
export function WorldPhaseLayer({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  if (view.phase !== "briefing" && view.phase !== "reveal") return null;
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-night/95 px-4 pt-5 pb-16 backdrop-blur-sm sm:px-6">
      {view.phase === "briefing" ? <Briefing view={view} act={act} busy={busy} /> : <Reveal view={view} act={act} busy={busy} />}
    </div>
  );
}
