"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { PlayerView } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { EvidenceView } from "./EvidenceView";
import { nameOf, Panel, roleNames, SuspectPortrait } from "./parts";
import { ProposalBar } from "./ProposalBar";

type Tab = "evidence" | "board" | "suspects" | "chat";
type Props = { view: PlayerView; act: (a: Action) => Promise<boolean>; busy: boolean };

export function Investigation({ view, act, busy }: Props) {
  const [tab, setTab] = useState<Tab>("evidence");
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "evidence", label: "Your evidence", count: view.myEvidence.length },
    { id: "board", label: "Board", count: view.board.length },
    { id: "suspects", label: "Suspects & hints" },
    ...(view.mode === "remote" ? [{ id: "chat" as const, label: "Chat", count: view.chat.length }] : []),
  ];
  const current = tabs.some((t) => t.id === tab) ? tab : "evidence";

  return (
    <div className={cx("mx-auto max-w-3xl", view.proposal && "pb-56")}>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold tracking-widest text-mustard uppercase">
            {view.case.code} · Room {view.code}
          </p>
          <h1 className="font-display text-3xl text-cream sm:text-4xl">{view.case.title}</h1>
          <p className="mt-1 text-sm font-bold text-cream/75">You are the {roleNames(view, view.me.roles).join(" & ")}.</p>
        </div>
        <LeaveButton act={act} />
      </header>

      <nav className="sticky top-0 z-20 -mx-4 mb-5 flex gap-1 overflow-x-auto bg-night/90 [scrollbar-width:none] px-4 py-2 backdrop-blur" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "shrink-0 rounded-full border-[3px] px-4 py-1.5 font-display transition-colors",
              current === t.id ? "border-ink bg-mustard text-ink" : "border-transparent text-cream hover:text-mustard",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
          </button>
        ))}
      </nav>

      {current === "evidence" && <MyEvidence view={view} act={act} busy={busy} />}
      {current === "board" && <Board view={view} />}
      {current === "suspects" && <Suspects view={view} act={act} busy={busy} />}
      {current === "chat" && <Chat view={view} act={act} busy={busy} />}

      <ProposalBar view={view} act={act} busy={busy} />
    </div>
  );
}

function MyEvidence({ view, act, busy }: Props) {
  const shared = new Set(view.board.map((b) => b.evidenceId));
  return (
    <div className="grid gap-4">
      <p className="rounded-2xl border-2 border-cream/20 px-4 py-3 text-sm font-bold text-cream/80">
        {view.mode === "together"
          ? "Only you have these. Read the important bits out loud, or put them on the board for everyone."
          : "Only you have these. Put the important ones on the board so everyone can see them."}
      </p>
      {view.myEvidence.map((e) => (
        <EvidenceView
          key={e.id}
          evidence={e}
          footer={
            shared.has(e.id) ? (
              <p className="text-sm font-extrabold text-teal">On the board</p>
            ) : (
              <Button
                variant="coral"
                className="px-4 py-2 text-base"
                disabled={busy}
                onClick={() => act({ type: "share", evidenceId: e.id })}
              >
                Share to board
              </Button>
            )
          }
        />
      ))}
    </div>
  );
}

function Board({ view }: { view: PlayerView }) {
  if (!view.board.length) {
    return (
      <Panel>
        <p className="font-bold text-cream/80">Nothing on the board yet. Share evidence from your tab and it shows up here for everyone.</p>
      </Panel>
    );
  }
  return (
    <div className="grid gap-4">
      {[...view.board].reverse().map((b) => (
        <EvidenceView key={b.evidenceId} evidence={b.evidence} tag={`Shared by ${nameOf(view, b.sharedBy)}`} />
      ))}
    </div>
  );
}

function Suspects({ view, act, busy }: Props) {
  const [accusing, setAccusing] = useState<string | null>(null);
  const [givingUp, setGivingUp] = useState(false);
  const voting = Boolean(view.proposal);
  const hintsLeft = view.case.hintsTotal - view.hints.length;
  const target = view.case.suspects.find((s) => s.id === accusing);

  return (
    <div className="grid gap-6">
      <Panel title="Who did it?">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {view.case.suspects.map((s) => (
            <li key={s.id} className="flex flex-col rounded-2xl border-[3px] border-ink bg-cream p-2 text-center text-ink">
              <SuspectPortrait suspect={s} className="mx-auto w-20" />
              <p className="font-display text-lg leading-tight">{s.name}</p>
              <p className="mb-2 flex-1 text-xs leading-snug font-semibold text-ink/70">{s.blurb}</p>
              <button
                type="button"
                disabled={voting || busy}
                onClick={() => setAccusing(s.id)}
                className="rounded-full border-2 border-ink bg-coral py-1 font-display text-cream disabled:opacity-50"
              >
                Accuse
              </button>
            </li>
          ))}
        </ul>
        {voting && <p className="mt-4 text-sm font-bold text-cream/70">Finish the current vote before proposing another.</p>}
        {target && !voting && (
          <div className="mt-5 rounded-2xl border-[3px] border-ink bg-mustard p-4 text-ink">
            <p className="font-display text-xl">Accuse {target.name}?</p>
            <p className="mt-1 text-sm font-bold">
              Everyone votes. If the majority agrees, it&apos;s your group&apos;s final answer. There&apos;s no second try.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="coral"
                className="px-4 py-2 text-base"
                disabled={busy}
                onClick={async () => {
                  if (await act({ type: "propose", kind: "accuse", suspectId: target.id })) setAccusing(null);
                }}
              >
                Put it to a vote
              </Button>
              <Button variant="secondary" className="px-4 py-2 text-base" onClick={() => setAccusing(null)}>
                Not yet
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Hints">
        {view.hints.length > 0 ? (
          <ol className="mb-4 grid gap-2">
            {view.hints.map((hint, i) => (
              <li key={i} className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink">
                <span className="mr-2 font-display text-coral">#{i + 1}</span>
                {hint}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mb-4 font-bold text-cream/75">No hints used yet. Stuck? Ask the group.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            className="px-4 py-2 text-base"
            disabled={voting || busy || hintsLeft === 0}
            onClick={() => act({ type: "propose", kind: "hint" })}
          >
            {hintsLeft ? `Ask for a hint (${hintsLeft} left)` : "No hints left"}
          </Button>
          {givingUp ? (
            <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-cream">
              End the case and see the answer?
              <button
                type="button"
                disabled={voting || busy}
                className="font-extrabold text-coral hover:underline"
                onClick={async () => {
                  if (await act({ type: "propose", kind: "giveUp" })) setGivingUp(false);
                }}
              >
                Put it to a vote
              </button>
              <button type="button" className="font-extrabold text-cream/70 hover:underline" onClick={() => setGivingUp(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={voting}
              onClick={() => setGivingUp(true)}
              className="text-sm font-extrabold text-cream/60 hover:text-coral disabled:opacity-50"
            >
              We give up
            </button>
          )}
        </div>
      </Panel>

      <Panel title="Who holds what">
        <ul className="grid gap-2 text-sm font-bold text-cream/85">
          {view.players.map((p) => (
            <li key={p.id} className="flex flex-wrap gap-x-2">
              <span className={cx("font-extrabold", p.online ? "text-cream" : "text-cream/40")}>
                {p.id === view.me.id ? "You" : p.name}
                {!p.online && " (away)"}
              </span>
              <span className="text-cream/60">{roleNames(view, p.roles).join(", ")}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Chat({ view, act, busy }: Props) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [view.chat.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await act({ type: "chat", text })) setText("");
  };

  return (
    <Panel>
      <ul className="grid max-h-[55svh] gap-2 overflow-y-auto pr-1">
        {view.chat.length === 0 && <li className="font-bold text-cream/70">No messages yet. Say hi to your fellow detectives.</li>}
        {view.chat.map((line) => {
          const mine = line.playerId === view.me.id;
          return (
            <li key={line.id} className={cx("max-w-[85%] rounded-2xl px-3 py-2", mine ? "ml-auto bg-mustard text-ink" : "bg-cream text-ink")}>
              {!mine && <p className="text-xs font-extrabold text-ink/60">{nameOf(view, line.playerId)}</p>}
              <p className="leading-snug font-semibold break-words">{line.text}</p>
            </li>
          );
        })}
        <div ref={end} />
      </ul>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Share a theory…"
          className="min-w-0 flex-1 rounded-full border-[3px] border-ink bg-cream px-4 py-2 font-semibold text-ink outline-none focus:border-mustard"
        />
        <Button type="submit" className="px-5 py-2 text-base" disabled={busy || !text.trim()}>
          Send
        </Button>
      </form>
    </Panel>
  );
}

function LeaveButton({ act }: { act: (a: Action) => Promise<boolean> }) {
  const [sure, setSure] = useState(false);
  if (!sure) {
    return (
      <button type="button" onClick={() => setSure(true)} className="text-sm font-extrabold text-cream/60 hover:text-coral">
        Leave
      </button>
    );
  }
  return (
    <span className="flex items-center gap-3 text-sm font-bold text-cream">
      Your evidence passes to the others.
      <button type="button" onClick={() => act({ type: "leave" })} className="font-extrabold text-coral hover:underline">
        Leave
      </button>
      <button type="button" onClick={() => setSure(false)} className="font-extrabold text-cream/70 hover:underline">
        Stay
      </button>
    </span>
  );
}
