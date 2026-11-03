"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Reveal } from "@/components/fx/Reveal";
import { sfx } from "@/components/home/sound";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { roles, rolesDemo, type RoleId } from "@/data/roles";
import { propArt, suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";

type Pin = { id: string; role: RoleId; title: string };

const tintOf = (role: RoleId) => roles.find((r) => r.id === role)!.tint;

/** The button that hands the lead to the next role. */
function Handoff({ to, onClick, children }: { to: RoleId; onClick: () => void; children: ReactNode }) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      className={cx("mt-5 inline-flex items-center gap-2 rounded-full border-[0.1875rem] border-ink px-5 py-2 font-display text-lg shadow-pop-sm transition-transform hover:-translate-y-0.5", tintOf(to))}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {children} <span aria-hidden>→</span>
    </m.button>
  );
}

/** Photographer: tap a spot and the camera pushes in on it. */
function PhotoDemo({ found, onFind, next }: { found: string[]; onFind: (id: string) => void; next: () => void }) {
  const { image, caption, spots } = rolesDemo.photo;
  const [looking, setLooking] = useState<string | null>(null);
  const spot = spots.find((s) => s.id === looking);
  const origin = spot ? `${spot.x + spot.w / 2}% ${spot.y + spot.h / 2}%` : "50% 50%";

  const look = (id: string) => {
    setLooking((current) => (current === id ? null : id));
    onFind(id);
  };

  return (
    <div>
      <figure className="overflow-hidden rounded-2xl border-[0.1875rem] border-ink bg-black">
        <div className="relative aspect-[4/3] overflow-hidden">
          <m.div className="absolute inset-0" style={{ transformOrigin: origin }} animate={{ scale: spot ? 2.4 : 1 }} transition={{ type: "spring", stiffness: 90, damping: 18 }}>
            <Image src={image} alt="A busy café counter on a Thursday night, posted to the café's Instagram" fill sizes="(min-width: 1024px) 1200px, 100vw" className="object-cover" />
            {spots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => look(s.id)}
                aria-label={`Look closer: ${s.title}`}
                className="absolute rounded-lg before:absolute before:-inset-2 focus-visible:outline-3 focus-visible:outline-mustard"
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
              >
                {!found.includes(s.id) && <span aria-hidden className="absolute inset-0 animate-ping rounded-lg border-2 border-cream/80" />}
                {looking === s.id && <span aria-hidden className="absolute -inset-1 rounded-lg border-[3px] border-coral" />}
              </button>
            ))}
          </m.div>
        </div>
        <figcaption className="bg-night px-3 py-2 font-mono text-xs text-cream/70">{caption}</figcaption>
      </figure>

      <AnimatePresence mode="wait">
        {spot ? (
          <m.div
            key={spot.id}
            className="mt-4 rounded-2xl border-[0.1875rem] border-ink bg-cream p-4 text-ink shadow-pop-sm"
            initial={{ opacity: 0, y: 12, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <p className="text-xs font-extrabold tracking-widest text-coral uppercase">You spotted</p>
            <p className="font-display text-xl">{spot.title}</p>
            <p className="mt-1 font-semibold">{spot.text}</p>
          </m.div>
        ) : (
          <m.p key="hint" className="mt-4 text-sm font-bold text-cream/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {found.length ? "Tap it again to step back, or try the other glow." : "Something on the counter is glowing. Tap it."}
          </m.p>
        )}
      </AnimatePresence>

      {found.length > 0 && (
        <Handoff to="interviewer" onClick={next}>
          Now ask around
        </Handoff>
      )}
    </div>
  );
}

/** Interviewer: spend one of the team's questions, and the answer hands someone else a lead. */
function InterviewDemo({ asked, onAsk, next }: { asked: boolean; onAsk: () => void; next: () => void }) {
  const { suspect, name, budget, question, answer, lead } = rolesDemo.interview;
  const left = budget - (asked ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-cream/80">
          Team questions: {left} of {budget} left
        </p>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: budget }, (_, i) => (
            <span key={i} className={cx("h-4 w-6 rounded-sm border-2 border-ink", i < left ? "bg-lilac" : "bg-night")} />
          ))}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <Image src={suspectArt[suspect].idle} alt="" sizes="96px" className="w-20 shrink-0 drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)] sm:w-24" />
        <div className="min-w-0 flex-1 space-y-3">
          {asked ? (
            <>
              <m.p
                className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm border-[0.1875rem] border-ink bg-lilac px-4 py-2 font-bold text-ink"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {question}
              </m.p>
              <m.p
                className="w-fit max-w-[95%] rounded-2xl rounded-bl-sm border-[0.1875rem] border-ink bg-cream px-4 py-2 font-semibold text-ink"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <span className="block text-xs font-extrabold tracking-widest text-ink/60 uppercase">{name}</span>
                {answer}
              </m.p>
            </>
          ) : (
            <button
              type="button"
              onClick={onAsk}
              className="w-full rounded-2xl border-[0.1875rem] border-ink bg-lilac px-4 py-3 text-left font-bold text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5"
            >
              <span className="block text-xs font-extrabold tracking-widest text-ink/60 uppercase">Ask {name}</span>
              {question}
            </button>
          )}
        </div>
      </div>

      {asked && (
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
          <p className="mt-5 inline-block -rotate-1 rounded-xl border-[0.1875rem] border-ink bg-teal px-4 py-2 font-bold text-ink shadow-pop-sm">
            New lead for the Tech: {lead}
          </p>
          <div>
            <Handoff to="tech" onClick={next}>
              Pass it to the Tech
            </Handoff>
          </div>
        </m.div>
      )}
    </div>
  );
}

/** Tech: a records search. Arriving with a lead types it in by itself. */
function SearchDemo({ autoType, onTyped, onFound, found, next }: { autoType: boolean; onTyped: () => void; onFound: (id: string) => void; found: string[]; next: () => void }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const hit = searched ? rolesDemo.search.records.find((r) => r.terms.some((t) => searched.toLowerCase().includes(t))) : undefined;

  const search = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setSearched(term);
    const record = rolesDemo.search.records.find((r) => r.terms.some((t) => term.toLowerCase().includes(t)));
    if (record) onFound(record.id);
  };

  // Only when the Tech is opened from the lead, so it runs once, on arrival.
  useEffect(() => {
    if (!autoType) return;
    const word = rolesDemo.search.lead;
    let i = 0;
    let done = 0;
    const id = window.setInterval(() => {
      i += 1;
      setQuery(word.slice(0, i));
      if (i >= word.length) {
        window.clearInterval(id);
        done = window.setTimeout(() => {
          search(word);
          onTyped();
        }, 250);
      }
    }, 70);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    search(query);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor="roles-search">
          Search the records
        </label>
        <input
          id="roles-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A name, number or place"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border-[0.1875rem] border-ink bg-[#0b1f24] px-3 py-2 font-mono text-teal placeholder:text-teal/40 focus:outline-3 focus:outline-teal"
        />
        <button type="submit" className="rounded-xl border-[0.1875rem] border-ink bg-teal px-4 font-display text-lg text-ink shadow-pop-sm">
          Search
        </button>
      </form>

      <AnimatePresence mode="wait">
        {hit ? (
          <m.div
            key={hit.id}
            className="mt-4 overflow-hidden rounded-xl border-[0.1875rem] border-ink bg-[#0b1f24] font-mono text-sm text-cream"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="border-b-2 border-teal/30 px-3 py-2 text-xs text-teal">{hit.source}</p>
            <ul>
              {hit.rows.map((row, i) => (
                <m.li
                  key={row.time + row.text}
                  className="flex gap-3 border-b border-teal/10 px-3 py-2 last:border-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.12 }}
                >
                  <span className="shrink-0 text-mustard">{row.time}</span>
                  <span>{row.text}</span>
                </m.li>
              ))}
            </ul>
          </m.div>
        ) : searched ? (
          <m.p key="none" className="mt-4 text-sm font-bold text-cream/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Nothing on file for “{searched}”. Try a name, a number or a place.
          </m.p>
        ) : (
          <m.p key="hint" className="mt-4 text-sm font-bold text-cream/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Try “Tri”, or follow the lead from the Interviewer.
          </m.p>
        )}
      </AnimatePresence>

      {found.includes("scanner") && (
        <Handoff to="archivist" onClick={next}>
          Hand it to the Archivist
        </Handoff>
      )}
    </div>
  );
}

/** Archivist: two papers side by side. Missing one sends you to the role that can get it. */
function CrossCheckDemo({ statement, record, checked, onCheck, go }: { statement: boolean; record: boolean; checked: boolean; onCheck: () => void; go: (role: RoleId) => void }) {
  const { interview, search, crosscheck } = rolesDemo;
  const scanner = search.records.find((r) => r.id === "scanner")!;
  const papers = [
    { have: statement, title: `${interview.name}: 8:41 to 8:44`, text: `“${interview.answer.split(".")[0]}.”`, from: "interviewer" as const, missing: `Get ${interview.name}'s story from the Interviewer` },
    { have: record, title: "QuickParcel scanner", text: scanner.rows.slice(0, 2).map((r) => `${r.time} · next door`).join("\n"), from: "tech" as const, missing: "Get his scanner from the Tech" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {papers.map((paper, i) =>
          paper.have ? (
            <m.div
              key={paper.title}
              className={cx("rounded-xl border-[0.1875rem] border-ink bg-cream p-3 text-ink shadow-pop-sm", i ? "rotate-1" : "-rotate-1")}
              animate={checked ? { x: i ? -10 : 10, rotate: 0 } : { x: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 14 }}
            >
              <p className="text-sm font-extrabold">{paper.title}</p>
              <p className="mt-1 text-sm leading-snug font-semibold whitespace-pre-line text-ink/80">{paper.text}</p>
            </m.div>
          ) : (
            <button
              key={paper.title}
              type="button"
              onClick={() => go(paper.from)}
              className="rounded-xl border-[0.1875rem] border-dashed border-cream/40 p-3 text-left text-sm font-bold text-cream/70 transition-colors hover:border-cream hover:text-cream"
            >
              {paper.missing} →
            </button>
          ),
        )}
      </div>

      {checked ? (
        <m.div className="mt-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <m.p
            className="inline-block rounded-xl border-[0.3125rem] border-teal px-4 py-0.5 font-display text-3xl tracking-widest text-teal uppercase"
            initial={{ scale: 2.2, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: -6, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
          >
            {crosscheck.verdict}
          </m.p>
          <p className="mt-3 font-semibold text-cream/90">{crosscheck.text}</p>
        </m.div>
      ) : (
        <button
          type="button"
          disabled={!statement || !record}
          onClick={onCheck}
          className="mt-5 rounded-full border-[0.1875rem] border-ink bg-mustard px-5 py-2 font-display text-lg text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Hold them together
        </button>
      )}
    </div>
  );
}

/** The team board: eight pins, the only way everyone sees what you found. */
function Board({ pins }: { pins: Pin[] }) {
  return (
    <div className="mt-10 rounded-3xl border-[0.1875rem] border-ink bg-[#b98a5a] p-4 shadow-card [background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1.5px)] [background-size:9px_9px] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl text-ink">Team board</p>
        <p className="text-sm font-extrabold text-ink/75">{pins.length} of 8 pins · the only way everyone sees what you found</p>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => {
          const pin = pins[i];
          return (
            <li key={i} className="relative aspect-[3/4]">
              {pin ? (
                <m.div
                  className={cx("flex size-full items-center rounded-lg border-2 border-ink p-1.5 text-center shadow-pop-sm", tintOf(pin.role), i % 2 ? "rotate-2" : "-rotate-2")}
                  initial={{ scale: 1.6, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <Image src={propArt.pushpin} alt="" sizes="24px" className="absolute -top-2.5 left-1/2 w-6 -translate-x-1/2" />
                  <span className="w-full text-[0.65rem] leading-tight font-extrabold sm:text-xs">{pin.title}</span>
                </m.div>
              ) : (
                <span className="block size-full rounded-lg border-2 border-dashed border-ink/25" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Who are you tonight?": the four roles, each with its tool, and one lead passed round the table. */
export function Roles() {
  const [active, setActive] = useState<RoleId>("photographer");
  const [pins, setPins] = useState<Pin[]>([]);
  const [autoType, setAutoType] = useState(false);
  const role = roles.find((r) => r.id === active)!;
  const has = (id: string) => pins.some((p) => p.id === id);
  const pin = (p: Pin) => setPins((all) => (all.some((x) => x.id === p.id) ? all : [...all, p]));
  const done: Record<RoleId, boolean> = {
    photographer: has("jar") || has("reader"),
    interviewer: has("ollie"),
    tech: has("scanner") || has("phone"),
    archivist: has("checked"),
  };

  return (
    <section className="relative overflow-hidden bg-dusk px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Pick a role" title="Who are you tonight?">
          Everyone gets a different job and different evidence. Try all four with a real lead from the practice case, and watch it travel round the table.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-14 max-w-5xl">
        <div role="tablist" aria-label="Roles" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              id={`role-tab-${r.id}`}
              aria-selected={active === r.id}
              aria-controls="role-panel"
              onClick={() => setActive(r.id)}
              className={cx(
                "relative flex items-center gap-3 rounded-2xl border-[0.1875rem] border-ink p-3 text-left transition-[translate,box-shadow,opacity] duration-200",
                r.tint,
                active === r.id ? "-translate-y-1.5 shadow-card" : "opacity-75 shadow-pop-sm hover:-translate-y-0.5 hover:opacity-100",
              )}
            >
              <Image src={propArt[r.prop]} alt="" sizes="56px" className={cx("w-11 shrink-0 sm:w-12", i % 2 ? "rotate-6" : "-rotate-6")} />
              <span className="min-w-0">
                <span className="block font-display text-xl leading-none sm:text-2xl">{r.name}</span>
                <span className="mt-1 block text-xs font-extrabold opacity-80 sm:text-sm">{r.verb}</span>
              </span>
              {done[r.id] && (
                <span aria-label="done" className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-ink bg-cream text-sm font-extrabold text-ink">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${active}`} className="mt-6 rounded-3xl border-[0.1875rem] border-ink bg-night p-5 text-cream shadow-card sm:p-8">
          <AnimatePresence mode="wait">
            <m.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
                <div>
                  <p className="font-display text-3xl leading-none">The {role.name}</p>
                  <p className="mt-3 leading-relaxed font-semibold text-cream/80">{role.power}</p>
                </div>
                <div>
                  {active === "photographer" && (
                    <PhotoDemo
                      found={pins.map((p) => p.id)}
                      onFind={(id) => pin({ id, role: "photographer", title: rolesDemo.photo.spots.find((s) => s.id === id)!.title })}
                      next={() => setActive("interviewer")}
                    />
                  )}
                  {active === "interviewer" && (
                    <InterviewDemo
                      asked={has("ollie")}
                      onAsk={() => pin({ id: "ollie", role: "interviewer", title: "Ollie: next door" })}
                      next={() => {
                        setAutoType(!has("scanner"));
                        setActive("tech");
                      }}
                    />
                  )}
                  {active === "tech" && (
                    <SearchDemo
                      autoType={autoType}
                      onTyped={() => setAutoType(false)}
                      found={pins.map((p) => p.id)}
                      onFound={(id) => pin({ id, role: "tech", title: id === "scanner" ? "Ollie's scanner" : "Tri's call log" })}
                      next={() => setActive("archivist")}
                    />
                  )}
                  {active === "archivist" && (
                    <CrossCheckDemo
                      statement={has("ollie")}
                      record={has("scanner")}
                      checked={has("checked")}
                      onCheck={() => {
                        sfx.stamp();
                        pin({ id: "checked", role: "archivist", title: "Ollie checks out" });
                      }}
                      go={setActive}
                    />
                  )}
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        <Board pins={pins} />
      </div>
    </section>
  );
}
