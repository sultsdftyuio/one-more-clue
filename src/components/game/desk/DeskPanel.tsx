"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/cx";
import type { CaseRole } from "@/lib/game/types";
import { nameOf, useGame } from "../context";
import { EvidenceCard } from "../evidence/EvidenceCard";
import { Icon } from "../ui/Icon";
import { ArchivistTool } from "./roles/Archivist";
import { InterviewerTool } from "./roles/Interviewer";
import { ROLE_CARD } from "./roles/look";
import { PhotographerTool } from "./roles/Photographer";
import { TechTool } from "./roles/Tech";

const ABILITY_LABEL = { search: "Search", interview: "Interview", inspect: "Inspect", crosscheck: "Cross-check", none: "Evidence" };

/** Your role, folded down to its name: everyone read it when it was dealt, and the tools matter more now. Tap to read it again. */
function RoleCard({ role }: { role: CaseRole }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className={cx("w-full rounded-2xl border-[3px] border-ink px-4 py-2 text-left shadow-pop-sm", ROLE_CARD[role.ability])}
    >
      <span className="flex items-center gap-2">
        <span className="font-display text-xl leading-tight">{role.name}</span>
        <span className="rounded-full border-2 border-ink bg-cream px-2 py-px text-xs font-extrabold text-ink">{ABILITY_LABEL[role.ability]}</span>
        <Icon name="arrow" className={cx("ml-auto size-4 transition-transform", open && "rotate-90")} />
      </span>
      {open && <span className="mt-1 block text-sm leading-snug font-semibold">{role.blurb}</span>}
    </button>
  );
}

/** A private scratchpad, kept on this device only. */
function Notebook({ code }: { code: string }) {
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
        rows={5}
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

/** Evidence counts as new for a little while after it arrives. */
const NEW_MS = 45_000;

export function DeskPanel() {
  const { view } = useGame();
  const myRoles = view.case.roles.filter((r) => view.me.roles.includes(r.id));
  const mine = view.evidence.filter((e) => e.mine).sort((a, b) => b.chapter - a.chapter || (b.foundAt ?? 0) - (a.foundAt ?? 0));
  const now = Date.now();

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        {myRoles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      <Leads />

      {view.me.abilities.includes("search") && <TechTool />}
      {view.me.abilities.includes("interview") && <InterviewerTool />}
      {view.me.abilities.includes("inspect") && <PhotographerTool />}
      {view.me.abilities.includes("crosscheck") && <ArchivistTool />}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-2xl text-cream">
          <Icon name="desk" /> Your evidence <span className="text-cream/50">{mine.length}</span>
        </h2>
        <p className="mb-4 text-sm font-bold text-cream/65">
          Only you have these. Read out what matters, and pin the best to the board.
        </p>
        <div className="grid gap-5">
          {mine.map((e) => (
            <div key={e.id} className="relative">
              {(e.foundAt ? now - e.foundAt < NEW_MS : false) && (
                <span className="absolute -top-2 -right-1 z-10 rotate-6 rounded-full border-2 border-ink bg-coral px-2 py-0.5 text-xs font-black text-cream">
                  NEW
                </span>
              )}
              <EvidenceCard evidence={e} />
            </div>
          ))}
        </div>
      </section>

      <Notebook code={view.code} />
    </div>
  );
}
