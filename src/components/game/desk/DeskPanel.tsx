"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import type { CaseRole } from "@/lib/game/types";
import { nameOf, useGame } from "../context";
import { Icon } from "../ui/Icon";
import { ArchivistTool } from "./roles/Archivist";
import { InterviewerTool } from "./roles/Interviewer";
import { ROLE_CARD } from "./roles/look";
import { PhotographerTool } from "./roles/Photographer";
import { TechTool } from "./roles/Tech";

/** Your roles as a strip. With two, tapping one switches to its tool; tapping the one you're on reads it again. */
function RoleStrip({ roles, active, onPick }: { roles: CaseRole[]; active: CaseRole; onPick: (id: string) => void }) {
  const [reading, setReading] = useState(false);
  return (
    <div>
      <div className="flex gap-2">
        {roles.map((role) => {
          const on = role.id === active.id;
          return (
            <button
              key={role.id}
              type="button"
              aria-pressed={on}
              aria-expanded={on && reading}
              onClick={() => {
                setReading(on && !reading);
                onPick(role.id);
              }}
              className={cx("min-w-0 flex-1 rounded-2xl border-[3px] border-ink px-3 py-1.5 text-left shadow-pop-sm transition-opacity", ROLE_CARD[role.ability], !on && "opacity-70 hover:opacity-100")}
            >
              <span className="flex items-center gap-2">
                <span className="truncate font-display text-lg leading-tight">{role.name}</span>
                {on && <Icon name="arrow" className={cx("ml-auto size-4 shrink-0 transition-transform", reading && "rotate-90")} />}
              </span>
            </button>
          );
        })}
      </div>
      {reading && <p className="mt-2 px-1 text-sm leading-snug font-semibold text-cream/85">{active.blurb}</p>}
    </div>
  );
}

/** A private scratchpad, kept on this device only. */
export function Notebook({ code }: { code: string }) {
  const key = `omc-notes-${code}`;
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setText(window.localStorage.getItem(key) ?? "");
    } catch {}
  }, [key]);
  const save = (value: string) => {
    setText(value);
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  };
  return (
    <section className="rounded-3xl border-[3px] border-ink bg-cream p-4 text-ink shadow-pop sm:p-5">
      <h3 className="mb-1 flex items-center gap-2 font-display text-xl">
        <Icon name="note" /> Your notebook
      </h3>
      <p className="mb-3 text-sm font-semibold text-ink/60">Only you can see this. It stays on this device.</p>
      <textarea
        value={text}
        onChange={(e) => save(e.target.value)}
        rows={9}
        placeholder="Times, names, things that don't add up…"
        className="paper w-full resize-y rounded-2xl border-2 border-ink/15 p-3 leading-7 font-semibold outline-none focus:border-mustard"
      />
    </section>
  );
}

/** Someone's find opened a next move for this player. It says who to ask, not what they found. */
function Leads() {
  const { view } = useGame();
  if (!view.leads.length) return null;
  return (
    <section className="animate-pop-in rounded-3xl border-[3px] border-ink bg-coral p-4 text-cream shadow-pop sm:p-5">
      <h3 className="mb-2 flex items-center gap-2 font-display text-xl">
        <Icon name="bulb" /> {view.leads.length === 1 ? "A new lead" : "New leads"}
      </h3>
      <ul className="grid gap-1.5 text-sm leading-snug font-bold">
        {view.leads.map((lead) => (
          <li key={lead.id}>
            {lead.by === view.me.id ? <>You found &ldquo;{lead.title}&rdquo;. It points somewhere new for you.</> : <>{nameOf(view, lead.by)} found &ldquo;{lead.title}&rdquo;. Ask what it says.</>}
          </li>
        ))}
      </ul>
    </section>
  );
}

const TOOL = { search: TechTool, interview: InterviewerTool, inspect: PhotographerTool, crosscheck: ArchivistTool };

/** Your side of the table: your role and its tool. What you find goes to Evidence, in the bar at the bottom. */
export function DeskPanel() {
  const { view } = useGame();
  const myRoles = view.case.roles.filter((r) => view.me.roles.includes(r.id));
  const [picked, setPicked] = useState<string | null>(null);
  const active = myRoles.find((r) => r.id === picked) ?? myRoles.find((r) => r.ability !== "none") ?? myRoles[0];
  const Tool = active && active.ability !== "none" ? TOOL[active.ability] : null;

  return (
    // minmax(0, 1fr): one long line inside a station (a photo's caption) must never widen the page.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {active && <RoleStrip roles={myRoles} active={active} onPick={setPicked} />}

      <Leads />

      {Tool && <Tool />}
    </div>
  );
}
