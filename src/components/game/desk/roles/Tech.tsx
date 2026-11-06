"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatSpan } from "@/lib/game/clock";
import { cx } from "@/lib/cx";
import { play } from "../../audio/sound";
import { nameOf, useGame } from "../../context";
import { buzz, BUZZ } from "../../haptics";
import { Coach, useCoach, type CoachStep } from "../Coach";
import { ActionBar, MainAction, Station } from "../Station";
import { setQuery, setTapping, useTechDesk } from "./tech-store";

const BOOT = ["BIOS 4.2 ... ok", "Mounting records ... ok", "Network ... connected", "Welcome back, operator."];

/** The computer coming on: a few lines of boot, once per room on this phone. Tap to skip. */
function Boot({ code, onDone }: { code: string; onDone: () => void }) {
  const [lines, setLines] = useState(0);
  useEffect(() => {
    if (lines >= BOOT.length) {
      const timer = window.setTimeout(onDone, 350);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      play("type");
      setLines((n) => n + 1);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [lines, onDone]);
  return (
    <button type="button" onClick={onDone} aria-label="Skip the start-up" className="block w-full text-left font-printer text-lg leading-snug text-teal">
      <span className="block text-teal/60">ROOM {code} · RECORDS</span>
      {BOOT.slice(0, lines).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
      <span className="crt-cursor inline-block h-5 w-2.5 bg-teal align-middle" />
    </button>
  );
}

/** One locked file: its name, its hint, and a password box. A wrong guess shakes it. */
function LockedFile({ file, denied }: { file: { id: string; title: string; hint: string; by: string }; denied: number }) {
  const { view, act, busy } = useGame();
  const [password, setPassword] = useState("");
  const price = view.deadline ? formatSpan(view.deadline.costs.miss) : null;
  return (
    <form
      key={denied}
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.trim().length < 2) return;
        if (await act({ type: "unlock", evidenceId: file.id, password })) setPassword("");
      }}
      className={cx("rounded-lg border-2 border-[#ffb454]/60 bg-black/40 p-2.5", denied > 0 && "animate-shake")}
    >
      <p className="flex items-center gap-2 font-bold text-[#ffb454]">
        <span aria-hidden>▣</span>
        <span className="min-w-0 flex-1 truncate">{file.title}</span>
        <span className="text-xs text-[#ffb454]/70">LOCKED</span>
      </p>
      <p className="mt-1 font-printer text-lg leading-tight text-cream/90">{file.hint}</p>
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={`pw-${file.id}`} className="sr-only">
          Password for {file.title}
        </label>
        <input
          id={`pw-${file.id}`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={40}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="password_"
          className="min-w-0 flex-1 rounded-md border-2 border-[#ffb454]/50 bg-black/50 px-2.5 py-1.5 font-bold text-[#ffb454] caret-[#ffb454] outline-none placeholder:text-[#ffb454]/40 focus:border-[#ffb454]"
        />
        <button type="submit" disabled={busy || password.trim().length < 2} className="rounded-md bg-[#ffb454] px-3 py-1.5 text-sm font-black tracking-wider text-ink uppercase disabled:opacity-40">
          Unlock
        </button>
      </div>
      <p className="mt-1.5 text-xs text-cream/55">
        Found by {nameOf(view, file.by)}. {price ? `A wrong password costs ${price}.` : ""}
      </p>
    </form>
  );
}

/**
 * The Tech's computer. Search the records for any name, number or place
 * (searching is free), or switch on Tap words and tap words in any evidence
 * to build the search without typing. Some records turn up locked: the
 * password is somewhere on a teammate's desk, and a wrong guess costs time.
 */
export function TechTool() {
  const { view, act, busy } = useGame();
  const coach = useCoach("search");
  const { tapping, query } = useTechDesk();
  const bootKey = `omc-boot-${view.code}`;
  const [booting, setBooting] = useState(false);
  const [granted, setGranted] = useState<string | null>(null);
  const lockedRef = useRef<HTMLDivElement>(null);
  const recent = [...view.searches].reverse().slice(0, 6);
  const price = view.deadline ? formatSpan(view.deadline.costs.miss) : null;

  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem(bootKey)) setBooting(true);
    } catch {}
  }, [bootKey]);
  const booted = () => {
    setBooting(false);
    try {
      window.sessionStorage.setItem(bootKey, "1");
    } catch {}
  };

  // Tapping words ends when the computer is put away.
  useEffect(() => () => setTapping(false), []);

  // A password tried: granted lights up the screen; denied shakes the file and the clock drops.
  const lastTry = view.tries.at(-1);
  const seenTry = useRef(lastTry?.id);
  const [denied, setDenied] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!lastTry || lastTry.id === seenTry.current) return;
    seenTry.current = lastTry.id;
    if (lastTry.ok) {
      play("granted");
      buzz(BUZZ.granted);
      setGranted(lastTry.id);
    } else {
      play("denied");
      buzz(BUZZ.miss);
      setDenied((d) => ({ ...d, [lastTry.evidenceId]: lastTry.time }));
    }
  }, [lastTry]);
  useEffect(() => {
    if (!granted) return;
    const timer = window.setTimeout(() => setGranted(null), 1600);
    return () => window.clearTimeout(timer);
  }, [granted]);

  // A newly found locked file: a little alarm, and the files window comes into view.
  const lockedCount = view.locked.length;
  const seenLocked = useRef(lockedCount);
  useEffect(() => {
    if (lockedCount > seenLocked.current) {
      play("denied");
      lockedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    seenLocked.current = lockedCount;
  }, [lockedCount]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    play("tap");
    if (await act({ type: "search", query })) setQuery("");
  };

  const now = tapping
    ? "Tap words in any evidence. They land in your search."
    : view.locked.length
      ? "A file is locked. Read the hint out: someone has the password."
      : "Search any name, number or place. Searching is free.";

  const steps: CoachStep[] = [
    { target: "search", gesture: "type", title: "Search the records", text: "Type a name, number or place, then press Search. Searching is free, so try anything that comes up." },
    { target: "words", gesture: "tap", title: "Or tap the words", text: "Turn on Tap words, then tap words in any evidence to add them to your search. No typing on a tiny keyboard." },
    {
      target: "locked",
      gesture: "look",
      title: "Locked files",
      text: `Some records turn up locked. The password is on a teammate's desk, so read them the hint.${price ? ` A wrong password costs ${price}.` : ""}`,
    },
  ];

  return (
    <div>
      <Station
        name="The computer"
        now={now}
        skin="tool-computer"
        onHelp={coach.show}
        actions={
          <ActionBar
            side={[
              { id: "words", label: tapping ? "Tapping" : "Tap words", icon: "search", pressed: tapping, onClick: () => setTapping(!tapping) },
              {
                id: "locked",
                label: "Locked",
                icon: "lock",
                badge: view.locked.length || undefined,
                onClick: () => lockedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }),
                disabled: view.locked.length ? false : "No locked files yet.",
              },
            ]}
            main={<MainAction id="run" label="Search" icon="search" tone="bg-teal text-ink" onClick={() => submit()} disabled={busy || query.trim().length < 2} note="Searching is free" />}
          />
        }
      >
        <div className="monitor rounded-[1.4rem] border-[3px] border-ink p-3 pb-5 shadow-pop-sm">
          <div className="crt relative min-h-[15rem] overflow-hidden rounded-xl border-[3px] border-black p-3.5 font-mono">
            {booting ? (
              <Boot code={view.code} onDone={booted} />
            ) : (
              <>
                <p className="mb-2.5 flex items-center gap-2 border-b border-teal/25 pb-1.5 text-xs font-bold tracking-widest text-teal/70 uppercase">
                  <span className="size-2 rounded-full bg-teal shadow-[0_0_6px_var(--color-teal)]" /> Records · room {view.code}
                </p>
                <form onSubmit={submit} className="flex items-center gap-2 rounded-lg border-2 border-teal/50 bg-black/40 py-1.5 pr-1.5 pl-3 focus-within:border-teal">
                  <span aria-hidden className="font-bold text-teal">
                    &gt;
                  </span>
                  <label htmlFor="search-records" className="sr-only">
                    Search the records
                  </label>
                  <input
                    id="search-records"
                    data-coach="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={40}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder={tapping ? "tap words in the evidence_" : "search records_"}
                    className="min-w-0 flex-1 bg-transparent py-1.5 font-bold text-teal caret-teal outline-none placeholder:text-teal/50"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery("")} aria-label="Clear the search" className="px-1.5 text-lg leading-none font-bold text-teal/70 hover:text-teal">
                      ×
                    </button>
                  )}
                </form>

                {recent.length > 0 && (
                  <ul className="mt-3 space-y-2 text-sm">
                    {recent.map((s) => (
                      <li key={s.id} className={cx("leading-snug", s.locked ? "text-[#ffb454]" : s.hit ? "text-teal" : "text-teal/70")}>
                        <span className="font-bold">{s.locked ? "[ LOCKED ]" : s.hit ? "[ MATCH ]" : "[ EMPTY ]"}</span> &ldquo;{s.query}&rdquo;
                        <span className="block truncate pl-4 text-xs opacity-75">
                          {s.hit ? (s.hitTitle ?? (s.locked ? "a locked file" : "found something")) : "no records"} · {nameOf(view, s.by)}
                        </span>
                        {!s.hit && s.note && <span className="mt-0.5 block pl-4 font-printer text-[1.05rem] leading-tight text-cream/85">&rsaquo; {s.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                <div ref={lockedRef} data-coach-locked className="mt-3 grid gap-2">
                  {view.locked.map((file) => (
                    <LockedFile key={file.id} file={file} denied={denied[file.id] ?? 0} />
                  ))}
                </div>
              </>
            )}
            {granted && (
              <div className="crt-granted pointer-events-none absolute inset-0 grid place-items-center bg-[#06130f]/90 text-center" role="status">
                <p className="font-printer text-4xl leading-none text-teal">ACCESS GRANTED</p>
              </div>
            )}
          </div>
          <div aria-hidden className="mt-2 flex items-center justify-end gap-2 pr-1">
            <span className="h-1.5 w-8 rounded-full bg-black/30" />
            <span className="size-2 rounded-full bg-teal shadow-[0_0_6px_var(--color-teal)]" />
          </div>
        </div>
      </Station>

      {coach.open && <Coach label="The computer" steps={steps} onClose={coach.close} />}
    </div>
  );
}
