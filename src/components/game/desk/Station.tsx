"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { play } from "../audio/sound";
import { Icon, type IconName } from "../ui/Icon";

/**
 * Every role works at a station laid out the same way, so learning one
 * teaches the others: who you are and what to do now along the top, the stage
 * in the middle, then one big main action with a few labelled side actions.
 * `data-coach` names on the controls let the tutorial point at them.
 */
export function Station({
  name,
  now,
  skin,
  onHelp,
  children,
  actions,
}: {
  name: string;
  /** One line: what to do right now. */
  now: ReactNode;
  /** The role's look, a class from game.css. */
  skin: string;
  onHelp: () => void;
  /** The stage: the photo, the suspect, the wall, the screen. */
  children: ReactNode;
  /** The ActionBar. */
  actions: ReactNode;
}) {
  return (
    <section className={cx("station overflow-hidden rounded-3xl border-[3px] border-ink shadow-pop", skin)} data-coach-root>
      <header className="flex items-start gap-3 px-4 pt-3.5 pb-2.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl leading-tight">{name}</h3>
          <p className="text-sm leading-snug font-semibold opacity-80" aria-live="polite">
            {now}
          </p>
        </div>
        <button
          type="button"
          onClick={onHelp}
          data-coach="help"
          aria-label={`How the ${name} works`}
          className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-current font-display text-lg leading-none opacity-70 transition-opacity hover:opacity-100"
        >
          ?
        </button>
      </header>
      <div className="px-3 sm:px-4">{children}</div>
      {actions}
    </section>
  );
}

export type SideAction = {
  id: string;
  label: string;
  icon: IconName;
  onClick: () => void;
  /** Why it can't be used right now. It still answers a tap, with the reason. */
  disabled?: string | false;
  /** For toggles: on or off. */
  pressed?: boolean;
  badge?: string | number;
};

/** One big main action in the middle, side actions either side, every one labelled. */
export function ActionBar({ main, side = [] }: { main: ReactNode; side?: SideAction[] }) {
  const left = side.slice(0, Math.ceil(side.length / 2));
  const right = side.slice(left.length);
  return (
    <div className="mt-3 flex items-start justify-center gap-2.5 border-t-[3px] border-ink/25 bg-black/20 px-3 pt-3 pb-3.5 sm:gap-5">
      {left.map((a) => (
        <SideButton key={a.id} action={a} />
      ))}
      <div className="min-w-0 flex-[0_1_16rem]">{main}</div>
      {right.map((a) => (
        <SideButton key={a.id} action={a} />
      ))}
    </div>
  );
}

function SideButton({ action }: { action: SideAction }) {
  const [why, setWhy] = useState<string | null>(null);
  useEffect(() => {
    if (!why) return;
    const timer = window.setTimeout(() => setWhy(null), 2600);
    return () => window.clearTimeout(timer);
  }, [why]);

  return (
    <div className="relative w-[4.25rem] shrink-0">
      <button
        type="button"
        data-coach={action.id}
        aria-pressed={action.pressed}
        aria-disabled={Boolean(action.disabled)}
        onClick={() => {
          if (action.disabled) {
            play("miss");
            setWhy(action.disabled);
            return;
          }
          play("tap");
          action.onClick();
        }}
        className={cx("group flex w-full flex-col items-center gap-1 text-center text-[0.72rem] leading-tight font-extrabold", action.disabled && "opacity-50")}
      >
        <span
          className={cx(
            "relative grid size-12 place-items-center rounded-full border-[3px] border-ink shadow-pop-sm transition-transform group-active:translate-y-0.5 group-active:shadow-none",
            !action.disabled && "group-hover:-translate-y-0.5",
            action.pressed ? "bg-mustard text-ink" : "bg-cream text-ink",
          )}
        >
          <Icon name={action.icon} />
          {action.badge ? (
            <span className="absolute -top-1.5 -right-2 min-w-5 rounded-full border-2 border-ink bg-coral px-1 text-[0.65rem] leading-4 text-cream">{action.badge}</span>
          ) : null}
        </span>
        {action.label}
      </button>
      {why && (
        <p role="status" className="absolute bottom-full left-1/2 z-20 mb-2 w-40 -translate-x-1/2 animate-pop-in rounded-xl border-2 border-ink bg-cream px-2.5 py-1.5 text-center text-xs leading-snug font-bold text-ink shadow-pop-sm">
          {why}
        </p>
      )}
    </div>
  );
}

/**
 * The station's main action: big, unmistakable, with what it costs written
 * underneath ("a miss costs 10 min") so nobody pays without knowing.
 */
export function MainAction({
  id,
  label,
  note,
  onClick,
  disabled,
  tone = "bg-coral text-cream",
  icon,
}: {
  id: string;
  label: string;
  note?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <div className="text-center">
      <button
        type="button"
        data-coach={id}
        onClick={onClick}
        disabled={disabled}
        className={cx(
          "flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink px-4 py-3 font-display text-2xl leading-none tracking-wide shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-pop-sm disabled:translate-y-0 disabled:opacity-50 disabled:shadow-pop-sm",
          tone,
        )}
      >
        {icon && <Icon name={icon} className="size-6" />}
        {label}
      </button>
      {note && <p className="mt-1.5 text-xs leading-snug font-bold opacity-75">{note}</p>}
    </div>
  );
}
