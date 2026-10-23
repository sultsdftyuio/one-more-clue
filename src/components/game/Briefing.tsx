"use client";

import { Button } from "@/components/ui/Button";
import type { PlayerView } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";
import { Panel, PlayerRow, SuspectPortrait } from "./parts";

export function Briefing({ view, act, busy }: { view: PlayerView; act: (a: Action) => Promise<boolean>; busy: boolean }) {
  const myRoles = view.case.roles.filter((r) => view.me.roles.includes(r.id));
  const waitingFor = view.players.filter((p) => !p.ready).length;

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6">
      <Panel>
        <p className="text-sm font-extrabold tracking-widest text-mustard uppercase">Briefing · {view.case.code}</p>
        <h1 className="font-display text-4xl text-cream sm:text-5xl">{view.case.title}</h1>
        <p className="mt-4 text-lg leading-relaxed font-semibold text-cream/90">{view.case.briefing}</p>
      </Panel>

      <Panel title={myRoles.length > 1 ? "Your roles" : "Your role"}>
        <ul className="grid gap-3">
          {myRoles.map((role) => (
            <li key={role.id} className="rounded-2xl border-[3px] border-ink bg-mustard p-4 text-ink">
              <p className="font-display text-2xl">{role.name}</p>
              <p className="mt-1 font-semibold">{role.blurb}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-bold text-cream/70">
          Only you can see your evidence. Share what matters to the board, or read it out.
        </p>
      </Panel>

      <Panel title="The suspects">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {view.case.suspects.map((s) => (
            <li key={s.id} className="rounded-2xl border-[3px] border-ink bg-cream p-2 text-center text-ink">
              <SuspectPortrait suspect={s} className="mx-auto w-20" />
              <p className="font-display text-lg leading-tight">{s.name}</p>
              <p className="text-xs leading-snug font-semibold text-ink/70">{s.blurb}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Who's ready">
        <ul className="grid gap-2">
          {view.players.map((p) => (
            <PlayerRow key={p.id} player={p}>
              <span className="text-sm font-extrabold">{p.ready ? "Ready" : "Reading…"}</span>
            </PlayerRow>
          ))}
        </ul>
        <div className="mt-5">
          {view.me.ready ? (
            <p className="font-bold text-cream/80">
              Waiting for {waitingFor} more {waitingFor === 1 ? "detective" : "detectives"}…
            </p>
          ) : (
            <Button onClick={() => act({ type: "ready" })} disabled={busy}>
              I&apos;ve read it, let&apos;s go
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
