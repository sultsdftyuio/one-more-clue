"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ActivityKind } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { nameOf, roleNames, useGame } from "./context";
import { useLiveRoom } from "./live/useLive";
import { Avatar } from "./parts";
import { Icon, type IconName } from "./ui/Icon";

const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  lead: "bulb",
  found: "sparkle",
  miss: "x",
  pin: "pin",
  unpin: "pin",
  chapter: "flag",
  wrong: "x",
  hint: "bulb",
  join: "users",
  leave: "door",
  lie: "target",
  objection: "flag",
};

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function Chat() {
  const { view, act, busy } = useGame();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [view.chat.length]);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && (await act({ type: "chat", text }))) setText("");
  };
  return (
    <section className="rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card">
      <h3 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
        <Icon name="chat" /> Chat
      </h3>
      <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {view.chat.length === 0 && <li className="text-sm font-bold text-cream/60">No messages yet. Share a theory.</li>}
        {view.chat.map((line) => {
          const mine = line.playerId === view.me.id;
          return (
            <li key={line.id} className={cx("max-w-[85%] rounded-2xl px-3 py-2", mine ? "ml-auto rounded-br-md bg-mustard text-ink" : "rounded-bl-md bg-cream text-ink")}>
              {!mine && <p className="text-[0.7rem] font-extrabold text-ink/55">{nameOf(view, line.playerId)}</p>}
              <p className="leading-snug font-semibold break-words">{line.text}</p>
            </li>
          );
        })}
        <div ref={end} />
      </ul>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          autoComplete="off"
          placeholder="Share a theory…"
          className="min-w-0 flex-1 rounded-full border-[3px] border-ink bg-cream px-4 py-2 font-semibold text-ink outline-none focus:border-mustard"
        />
        <button type="submit" disabled={busy || !text.trim()} className="grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-mustard text-ink disabled:opacity-50" aria-label="Send">
          <Icon name="arrow" />
        </button>
      </form>
    </section>
  );
}

export function TeamPanel() {
  const { view, open } = useGame();
  const live = useLiveRoom();
  const activity = [...view.activity].reverse();
  const now = Date.now();
  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
          <Icon name="users" /> The team
        </h3>
        <ul className="grid gap-2">
          {view.players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar name={p.name} index={i} online={p.online} speaking={live.speaking.has(p.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-cream">
                  {p.id === view.me.id ? `${p.name} (you)` : p.name}
                  {p.bot && <span className="ml-1.5 rounded-full bg-lilac px-1.5 py-0.5 text-[0.65rem] text-ink">BOT</span>}
                </span>
                <span className="block truncate text-xs font-bold text-cream/55">{roleNames(view, p.roles).join(" & ")}</span>
              </span>
              {!p.online && <span className="text-xs font-bold text-cream/40">away</span>}
              {live.voice === "on" && p.id !== view.me.id && !p.bot && (
                <button
                  type="button"
                  onClick={() => live.toggleSilenced(p.id)}
                  aria-pressed={live.silenced.has(p.id)}
                  aria-label={live.silenced.has(p.id) ? `Hear ${p.name} again` : `Silence ${p.name} for you`}
                  className={cx("grid size-8 place-items-center rounded-full", live.silenced.has(p.id) ? "bg-coral text-cream" : "bg-cream/10 text-cream/70 hover:bg-cream/20")}
                >
                  <Icon name={live.silenced.has(p.id) ? "speakerOff" : "speaker"} className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Chat />

      <section className="rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 font-display text-xl text-cream">
          <Icon name="sparkle" /> What&apos;s happening
        </h3>
        {activity.length === 0 ? (
          <p className="text-sm font-bold text-cream/60">Nothing yet. Searches, finds and pins show up here.</p>
        ) : (
          <ol className="grid gap-1">
            {activity.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  disabled={!a.evidenceId || !view.evidence.some((e) => e.id === a.evidenceId)}
                  onClick={() => a.evidenceId && open(a.evidenceId)}
                  className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left enabled:hover:bg-cream/10"
                >
                  <span
                    className={cx(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                      a.kind === "found" ? "bg-mustard text-ink" : a.kind === "chapter" ? "bg-teal text-ink" : a.kind === "wrong" ? "bg-coral text-cream" : "bg-cream/10 text-cream/70",
                    )}
                  >
                    <Icon name={ACTIVITY_ICON[a.kind]} className="size-3.5" />
                  </span>
                  <span className="flex-1 text-sm leading-snug font-semibold text-cream/85">{a.text}</span>
                  <span className="shrink-0 text-[0.7rem] font-bold text-cream/40">{ago(a.at, now)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
