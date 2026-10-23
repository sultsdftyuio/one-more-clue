"use client";

import { Button } from "@/components/ui/Button";
import type { PlayerView } from "@/lib/game/engine";
import { roleNames, type Act } from "./context";
import { CaseCover } from "./Lobby";
import { useLiveRoom } from "./live/useLive";
import { VoiceControl } from "./live/VoiceControl";
import { Panel, PlayerRow } from "./parts";
import { Icon, type IconName } from "./ui/Icon";

const POWER: Record<string, { icon: IconName; text: string }> = {
  search: { icon: "search", text: "Search the records for any name, number or place." },
  interview: { icon: "mic", text: "Spend the team's questions on suspects and witnesses." },
  inspect: { icon: "camera", text: "Tap into photos to find details nobody else can." },
  crosscheck: { icon: "scale", text: "Hold two pieces of evidence together to expose a lie." },
  none: { icon: "file", text: "Your evidence backs up the others." },
};

const HOW: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "Your desk is private", text: "Only you see your evidence. Read it out or pin it to the board, which holds just 8 things." },
  { icon: "users", title: "Powers need each other", text: "The Tech can only search what someone tells them to look for. The Photographer can only inspect photos they can see. Talk." },
  { icon: "flag", title: "Chapters unlock by vote", text: "Each chapter ends with a question. Agree on the answer to open the next one. Wrong answers cost." },
  { icon: "star", title: "One final report", text: "Who, why, and two pinned pieces of proof. Scored out of 5 stars." },
];

export function Briefing({ view, act, busy }: { view: PlayerView; act: Act; busy: boolean }) {
  const myRoles = view.case.roles.filter((r) => view.me.roles.includes(r.id));
  const waitingFor = view.players.filter((p) => !p.ready).length;
  const { speaking } = useLiveRoom();

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 pb-28">
      <CaseCover view={view} />
      <VoiceControl mode={view.mode} />

      <section className="relative rounded-[2rem] border-[3px] border-ink bg-cream p-5 text-ink shadow-card sm:p-7">
        <span className="absolute -top-4 right-6 rotate-6 rounded-lg border-[3px] border-coral px-3 py-0.5 font-display text-lg text-coral">CONFIDENTIAL</span>
        <p className="text-xs font-extrabold tracking-[0.25em] text-ink/50 uppercase">The briefing</p>
        <p className="paper mt-3 text-lg leading-8 font-semibold">{view.case.briefing}</p>
      </section>

      <section className="grid gap-3">
        {myRoles.map((role) => (
          <div key={role.id} className="rounded-[2rem] border-[3px] border-ink bg-mustard p-5 text-ink shadow-card">
            <p className="text-xs font-extrabold tracking-[0.25em] uppercase opacity-70">You are the</p>
            <p className="font-display text-4xl leading-tight">{role.name}</p>
            <p className="mt-1 font-semibold">{role.blurb}</p>
            <p className="mt-4 flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 font-bold">
              <Icon name={POWER[role.ability].icon} />
              <span>
                <span className="font-extrabold">Your power:</span> {POWER[role.ability].text}
              </span>
            </p>
          </div>
        ))}
      </section>

      <Panel title="How a case works">
        <ol className="grid gap-4 sm:grid-cols-2">
          {HOW.map((step) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-cream text-ink">
                <Icon name={step.icon} />
              </span>
              <span>
                <span className="block font-display text-lg text-cream">{step.title}</span>
                <span className="block text-sm leading-snug font-semibold text-cream/70">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Who's who">
        <ul className="grid gap-2">
          {view.players.map((p, i) => (
            <PlayerRow key={p.id} player={p} index={i} speaking={speaking.has(p.id)}>
              <span className="text-right text-xs leading-tight font-extrabold text-ink/60">
                {roleNames(view, p.roles).join(" & ")}
                <span className={p.ready ? "block text-teal" : "block text-ink/40"}>{p.ready ? "Ready" : "Reading…"}</span>
              </span>
            </PlayerRow>
          ))}
        </ul>
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-ink bg-night/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">
          {view.me.ready ? (
            <p className="flex items-center gap-2 font-bold text-cream/80">
              <span className="size-2.5 animate-pulse rounded-full bg-mustard" />
              Waiting for {waitingFor} more {waitingFor === 1 ? "detective" : "detectives"}
            </p>
          ) : (
            <Button onClick={() => act({ type: "ready" })} disabled={busy}>
              I&apos;m ready <Icon name="arrow" className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
