"use client";

import { useState, type FormEvent } from "react";
import type { VisibleEvidence } from "@/lib/game/engine";
import { cx } from "@/lib/cx";
import { nameOf, useGame } from "../context";
import { Icon } from "../ui/Icon";

const toolBox = "rounded-3xl border-[3px] border-ink bg-cream p-4 text-ink shadow-pop sm:p-5";

function ToolHeader({ icon, title, text }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; text: string }) {
  return (
    <header className="mb-4 flex gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-mustard">
        <Icon name={icon} />
      </span>
      <span>
        <span className="block font-display text-xl leading-tight">{title}</span>
        <span className="block text-sm leading-snug font-semibold text-ink/65">{text}</span>
      </span>
    </header>
  );
}

export function SearchTool() {
  const { view, act, busy } = useGame();
  const [query, setQuery] = useState("");
  const recent = [...view.searches].reverse().slice(0, 6);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    if (await act({ type: "search", query })) setQuery("");
  };

  return (
    <section className={toolBox}>
      <ToolHeader
        icon="search"
        title="Search the records"
        text="Type a name, card number, place or company. You only find what you know to look for, so ask your team."
      />
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="search-records" className="sr-only">
          Search the records
        </label>
        <input
          id="search-records"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder="e.g. a name or number…"
          className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-white px-4 py-2.5 font-mono font-bold outline-none focus:border-teal"
        />
        <button
          type="submit"
          disabled={busy || query.trim().length < 2}
          className="rounded-2xl border-[3px] border-ink bg-teal px-4 font-display text-lg shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          Search
        </button>
      </form>
      {recent.length > 0 && (
        <ul className="mt-4 space-y-1.5 font-mono text-sm">
          {recent.map((s) => (
            <li key={s.id} className="flex items-baseline gap-2">
              <span className={cx("font-bold", s.hit ? "text-teal" : "text-ink/40")}>{s.hit ? "✓" : "∅"}</span>
              <span className="font-bold">&ldquo;{s.query}&rdquo;</span>
              <span className="truncate text-ink/55">
                {s.hit ? (s.hitTitle ?? "found something") : "no records"} · {nameOf(view, s.by)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InterviewTool() {
  const { view, act, busy, open } = useGame();
  const [armed, setArmed] = useState<string | null>(null);
  const questions = view.questions ?? [];
  const left = view.questionsLeft;
  const bySuspect = questions.reduce<Record<string, typeof questions>>((acc, q) => ({ ...acc, [q.suspect]: [...(acc[q.suspect] ?? []), q] }), {});

  return (
    <section className={toolBox}>
      <ToolHeader icon="mic" title="Interviews" text="The whole team shares a handful of questions. Agree on them before you spend them." />
      <div className="mb-4 flex items-center gap-1.5" aria-label={`${left} of ${view.case.questionBudget} questions left`}>
        {Array.from({ length: view.case.questionBudget }, (_, i) => (
          <span key={i} className={cx("h-3 flex-1 rounded-full border-2 border-ink", i < left ? "bg-lilac" : "bg-ink/10")} />
        ))}
        <span className="ml-2 text-sm font-extrabold whitespace-nowrap">{left} left</span>
      </div>
      <div className="space-y-4">
        {Object.entries(bySuspect).map(([suspect, list]) => (
          <div key={suspect}>
            <p className="mb-1.5 text-xs font-extrabold tracking-widest text-ink/50 uppercase">{suspect}</p>
            <ul className="space-y-2">
              {list.map((q) => (
                <li key={q.id}>
                  {q.asked ? (
                    <button
                      type="button"
                      onClick={() => open(q.id)}
                      className="flex w-full items-center gap-2 rounded-2xl border-2 border-ink/15 bg-ink/5 px-3 py-2 text-left font-semibold text-ink/60"
                    >
                      <Icon name="check" className="size-4 text-teal" />
                      <span className="flex-1">{q.question}</span>
                      <span className="text-xs font-extrabold text-ink/50">Answer</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy || left === 0}
                      onClick={async () => {
                        if (armed !== q.id) return setArmed(q.id);
                        setArmed(null);
                        await act({ type: "ask", evidenceId: q.id });
                      }}
                      onBlur={() => setArmed((a) => (a === q.id ? null : a))}
                      className={cx(
                        "flex w-full items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left font-bold transition-colors disabled:opacity-50",
                        armed === q.id ? "border-ink bg-lilac" : "border-ink/25 bg-white hover:border-ink",
                      )}
                    >
                      <span className="flex-1">{q.question}</span>
                      <span className="shrink-0 text-xs font-extrabold">{armed === q.id ? "Tap to ask (uses 1)" : "Ask"}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CrosscheckTool() {
  const { view, act, busy } = useGame();
  const [picked, setPicked] = useState<string[]>([]);
  const candidates = view.evidence.filter((e) => e.body.type !== "scene");
  const key = [...picked].sort().join("+");
  const tried = picked.length === 2 && view.checked.includes(key);

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length === 2 ? [p[1], id] : [...p, id]));

  const compare = async () => {
    if (await act({ type: "crosscheck", a: picked[0], b: picked[1] })) setPicked([]);
  };

  const slot = (i: number) => {
    const e = candidates.find((c) => c.id === picked[i]);
    return (
      <span
        className={cx(
          "flex min-h-14 flex-1 items-center justify-center rounded-2xl border-[3px] p-2 text-center text-sm font-extrabold",
          e ? "border-ink bg-white" : "border-dashed border-ink/30 text-ink/40",
        )}
      >
        {e ? e.title : `Pick ${i ? "another" : "one"}`}
      </span>
    );
  };

  return (
    <section className={toolBox}>
      <ToolHeader
        icon="scale"
        title="Cross-check"
        text="Hold two pieces of evidence up against each other. If they can't both be true, you've caught a lie. Ask others to pin what you need."
      />
      <div className="flex items-center gap-2">
        {slot(0)}
        <Icon name="scale" className="text-ink/40" />
        {slot(1)}
      </div>
      <button
        type="button"
        disabled={busy || picked.length !== 2 || tried}
        onClick={compare}
        className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-coral py-2.5 font-display text-lg text-cream shadow-pop-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {tried ? "Already compared, they agree" : "Compare"}
      </button>
      <ul className="mt-4 flex flex-wrap gap-2">
        {candidates.map((e: VisibleEvidence) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => toggle(e.id)}
              aria-pressed={picked.includes(e.id)}
              className={cx(
                "rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors",
                picked.includes(e.id) ? "border-ink bg-mustard" : "border-ink/20 bg-white hover:border-ink",
              )}
            >
              {e.title}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InspectTool() {
  const { view, open } = useGame();
  const scenes = view.evidence.filter((e) => e.body.type === "scene");
  return (
    <section className={toolBox}>
      <ToolHeader
        icon="camera"
        title="Inspect photos"
        text="Open a photo and tap anything that looks off. Only you can do this, including on photos others pin."
      />
      {scenes.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {scenes.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => open(s.id)}
                className="flex w-full items-center gap-2 rounded-2xl border-[3px] border-ink bg-white px-3 py-2 text-left font-bold hover:bg-mustard"
              >
                <Icon name="eye" className="size-4" />
                <span className="flex-1">{s.title}</span>
                <Icon name="arrow" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-semibold text-ink/60">No photos yet. When someone pins one, it shows up here.</p>
      )}
    </section>
  );
}
