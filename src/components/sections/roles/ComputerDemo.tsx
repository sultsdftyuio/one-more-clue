"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { sfx } from "@/components/home/sound";
import { rolesDemo } from "@/data/roles";
import { cx } from "@/lib/cx";
import { Cost, Handoff } from "./shared";

type Rec = (typeof rolesDemo.search.records)[number];
/** A green screen: faint scanlines and a glow in the middle. */
const CRT = "repeating-linear-gradient(0deg, rgba(63,184,175,0.06) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, rgba(63,184,175,0.14), transparent 75%), #04100c";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const find = (q: string) => rolesDemo.search.records.find((r) => r.terms.some((t) => norm(q).includes(t)));

/** A teammate's pinned paper, every word a button that types itself into the computer. */
function TapPaper({ text, onWord }: { text: string; onWord: (word: string) => void }) {
  return (
    <div className="mt-3 rounded-xl border-[0.1875rem] border-dashed border-teal/70 bg-cream p-3 text-ink">
      <p className="text-xs font-extrabold tracking-widest text-ink/55 uppercase">Pinned by the Interviewer · tap a word</p>
      <p className="mt-1 leading-relaxed font-semibold">
        {text.split(/(\s+)/).map((part, i) => {
          const word = part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").replace(/'s$/, "");
          if (!word || /^\s+$/.test(part)) return part;
          return (
            <button key={i} type="button" onClick={() => onWord(word)} className="rounded-sm underline decoration-teal decoration-dotted decoration-2 underline-offset-4 transition-colors hover:bg-teal/40 focus-visible:bg-teal/40 focus-visible:outline-none">
              {part}
            </button>
          );
        })}
      </p>
    </div>
  );
}

/**
 * Tech: the computer. Search by typing or by tapping words in a teammate's
 * evidence. Ollie's scanner turns up locked, and the password is in what he
 * told the Interviewer.
 */
export function ComputerDemo({
  asked,
  autoType,
  onTyped,
  unlocked,
  onFound,
  go,
  next,
}: {
  asked: boolean;
  autoType: boolean;
  onTyped: () => void;
  unlocked: string[];
  onFound: (id: string) => void;
  go: () => void;
  next: () => void;
}) {
  const [query, setQuery] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ q: string; record: Rec | null } | null>(null);
  const [denied, setDenied] = useState(0);
  const [granted, setGranted] = useState(false);
  const record = result?.record ?? null;
  const locked = Boolean(record && "lock" in record && record.lock && !unlocked.includes(record.id));
  const pwRef = useRef<HTMLInputElement>(null);

  const search = (q: string) => {
    if (!q.trim()) return;
    const hit = find(q) ?? null;
    setResult({ q: q.trim(), record: hit });
    if (hit && !("lock" in hit && hit.lock)) onFound(hit.id);
    if (hit && "lock" in hit && hit.lock && !unlocked.includes(hit.id)) {
      sfx.denied();
      window.setTimeout(() => pwRef.current?.focus({ preventScroll: true }), 300);
    }
  };

  const unlock = (e?: FormEvent) => {
    e?.preventDefault();
    if (!record || !("lock" in record) || !record.lock || !password.trim()) return;
    if (record.lock.answers.some((a) => norm(a) === norm(password))) {
      sfx.granted();
      setGranted(true);
      window.setTimeout(() => setGranted(false), 1400);
      onFound(record.id);
      setPassword("");
    } else {
      sfx.denied();
      setDenied((n) => n + 1);
    }
  };

  // Arriving with the Interviewer's lead types it in by itself.
  useEffect(() => {
    if (!autoType) return;
    const word = rolesDemo.search.lead;
    let i = 0;
    let done = 0;
    const id = window.setInterval(() => {
      i += 1;
      sfx.key();
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

  const tapped = (word: string) => {
    sfx.key();
    if (locked) setPassword(word);
    else setQuery((q) => (q ? `${q} ${word}` : word));
  };

  return (
    <div>
      {/* A beige monitor round a green screen. */}
      <div className="rounded-[1.4rem] border-[0.1875rem] border-ink bg-[linear-gradient(#e6dcc4,#cbbf9f)] p-2.5 pb-4 shadow-pop-sm">
        <div className="relative min-h-[14rem] overflow-hidden rounded-xl border-[0.1875rem] border-black p-3 font-mono text-sm text-teal shadow-[inset_0_0_24px_rgba(0,0,0,0.75)]" style={{ background: CRT }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
            className="flex items-center gap-2 rounded-lg border-2 border-teal/50 bg-black/40 py-1 pr-1 pl-2.5 focus-within:border-teal"
          >
            <span aria-hidden className="font-bold">
              &gt;
            </span>
            <label className="sr-only" htmlFor="roles-search">
              Search the records
            </label>
            <input
              id="roles-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search records_"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-1 font-bold text-teal caret-teal outline-none placeholder:text-teal/45"
            />
            <button type="submit" className="rounded-md bg-teal px-3 py-1 text-xs font-black tracking-wider text-ink uppercase">
              Search
            </button>
          </form>

          <AnimatePresence mode="wait">
            {!result ? (
              <m.p key="hint" className="mt-3 text-xs text-teal/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Try &ldquo;Tri&rdquo;, or follow the Interviewer&rsquo;s lead.
              </m.p>
            ) : !record ? (
              <m.p key="none" className="mt-3 text-xs text-teal/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                [ EMPTY ] &ldquo;{result.q}&rdquo;: no records. Try a name, a number or a place.
              </m.p>
            ) : locked && "lock" in record && record.lock ? (
              <m.form
                key={`locked-${denied}`}
                onSubmit={unlock}
                className={cx("mt-3 rounded-lg border-2 border-[#ffb454]/60 bg-black/40 p-2.5 text-[#ffb454]", denied > 0 && "animate-shake")}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="flex items-center justify-between gap-2 font-bold">
                  <span>▣ {record.source}</span> <span className="text-xs opacity-75">LOCKED</span>
                </p>
                <p className="mt-1 text-cream/90">{record.lock.hint}</p>
                <div className="mt-2 flex gap-2">
                  <label className="sr-only" htmlFor="roles-password">
                    Password
                  </label>
                  <input
                    ref={pwRef}
                    id="roles-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password_"
                    autoComplete="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-md border-2 border-[#ffb454]/50 bg-black/50 px-2 py-1 font-bold text-[#ffb454] outline-none placeholder:text-[#ffb454]/40 focus:border-[#ffb454]"
                  />
                  <button type="submit" className="rounded-md bg-[#ffb454] px-3 py-1 text-xs font-black tracking-wider text-ink uppercase">
                    Unlock
                  </button>
                </div>
                {denied > 0 && <p className="mt-1.5 text-xs text-cream/70">Access denied. In the game, a wrong guess costs a few minutes.</p>}
              </m.form>
            ) : (
              <m.div key={record.id} className="mt-3 overflow-hidden rounded-lg border-2 border-teal/40 bg-black/30 text-cream" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="border-b border-teal/30 px-2.5 py-1.5 text-xs text-teal">[ MATCH ] {record.source}</p>
                <ul>
                  {record.rows.map((row, i) => (
                    <m.li key={row.time + row.text} className="flex gap-3 border-b border-teal/10 px-2.5 py-1.5 last:border-0" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
                      <span className="shrink-0 text-mustard">{row.time}</span>
                      <span>{row.text}</span>
                    </m.li>
                  ))}
                </ul>
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {granted && (
              <m.div
                className="pointer-events-none absolute inset-0 grid place-items-center bg-[#06130f]/90"
                initial={{ opacity: 0, filter: "brightness(2)" }}
                animate={{ opacity: 1, filter: "brightness(1)" }}
                exit={{ opacity: 0 }}
                role="status"
              >
                <p className="font-display text-3xl tracking-wide text-teal sm:text-4xl">ACCESS GRANTED</p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {asked ? (
        <TapPaper text={rolesDemo.interview.answer} onWord={tapped} />
      ) : (
        <button
          type="button"
          onClick={go}
          className="mt-3 w-full rounded-xl border-[0.1875rem] border-dashed border-cream/40 p-3 text-left text-sm font-bold text-cream/70 transition-colors hover:border-cream hover:text-cream"
        >
          A teammate&rsquo;s evidence shows up here once it&rsquo;s pinned. Ask Ollie something first →
        </button>
      )}
      <Cost>Searching is always free. Locked files need a password that&rsquo;s on a teammate&rsquo;s desk.</Cost>

      {unlocked.includes("scanner") && (
        <Handoff to="archivist" onClick={next}>
          Hand it to the Archivist
        </Handoff>
      )}
    </div>
  );
}
