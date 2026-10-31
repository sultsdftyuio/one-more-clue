"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { nameOf, useGame } from "../../context";

/** The Tech works at a records terminal: type a lead, read what comes back. */
export function TechTool() {
  const { view, act, busy } = useGame();
  const [query, setQuery] = useState("");
  const recent = [...view.searches].reverse().slice(0, 6);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    if (await act({ type: "search", query })) setQuery("");
  };

  return (
    <section className="tool-terminal rounded-3xl border-[3px] border-ink p-4 font-mono shadow-pop sm:p-5">
      <header className="mb-3 flex items-center gap-2.5 border-b-2 border-teal/30 pb-2">
        <Image src={propArt.keycard} alt="" sizes="56px" className="w-11 -rotate-6" />
        <h3 className="flex-1 font-display text-2xl leading-tight text-cream">Records terminal</h3>
        <span className="size-2.5 rounded-full bg-teal shadow-[0_0_8px_var(--color-teal)]" />
      </header>
      <p className="mb-3 font-printer text-[1.2rem] leading-tight text-teal/85">Type a name, number, place or company. You only find what you know to look for, so ask your team.</p>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-xl border-2 border-teal/50 bg-black/40 py-1.5 pr-1.5 pl-3 focus-within:border-teal">
        <span aria-hidden className="font-bold text-teal">
          &gt;
        </span>
        <label htmlFor="search-records" className="sr-only">
          Search the records
        </label>
        <input
          id="search-records"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder="search records_"
          className="min-w-0 flex-1 bg-transparent py-1.5 font-bold text-teal caret-teal outline-none placeholder:text-teal/55"
        />
        <button type="submit" disabled={busy || query.trim().length < 2} className="rounded-lg bg-teal px-4 py-2 text-sm font-black tracking-wider text-ink uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-40">
          Run
        </button>
      </form>
      {recent.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {recent.map((s) => (
            <li key={s.id} className={cx("leading-snug", s.hit ? "text-teal" : "text-teal/70")}>
              <span className="font-bold">{s.hit ? "[ MATCH ]" : "[ EMPTY ]"}</span> &ldquo;{s.query}&rdquo;
              <span className="block truncate pl-4 text-xs opacity-75">
                {s.hit ? (s.hitTitle ?? "found something") : "no records"} · {nameOf(view, s.by)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
