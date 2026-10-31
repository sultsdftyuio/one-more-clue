"use client";

import { useEffect, useState } from "react";
import { nameOf, useGame } from "../context";
import { EvidenceCard } from "../evidence/EvidenceCard";
import { Icon } from "../ui/Icon";
import { CrosscheckTool, InspectTool, InterviewTool, SearchTool } from "./Abilities";

const ABILITY_LABEL = { search: "Search", interview: "Interview", inspect: "Inspect", crosscheck: "Cross-check", none: "Evidence" };

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
      <section className="rounded-3xl border-[3px] border-ink bg-mustard p-4 text-ink shadow-pop sm:p-5">
        <p className="text-xs font-extrabold tracking-widest uppercase opacity-70">Your {myRoles.length > 1 ? "roles" : "role"}</p>
        {myRoles.map((role) => (
          <div key={role.id} className="mt-2">
            <p className="flex flex-wrap items-center gap-2 font-display text-2xl leading-tight">
              {role.name}
              <span className="rounded-full border-2 border-ink bg-cream px-2.5 py-0.5 font-sans text-xs font-extrabold tracking-wide uppercase">
                {ABILITY_LABEL[role.ability]}
              </span>
            </p>
            <p className="mt-1 text-sm leading-snug font-semibold">{role.blurb}</p>
          </div>
        ))}
      </section>

      <Leads />

      {view.me.abilities.includes("search") && <SearchTool />}
      {view.me.abilities.includes("interview") && <InterviewTool />}
      {view.me.abilities.includes("inspect") && <InspectTool />}
      {view.me.abilities.includes("crosscheck") && <CrosscheckTool />}

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
