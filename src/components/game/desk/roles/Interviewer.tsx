"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSpan } from "@/lib/game/clock";
import type { CaseSuspect } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { play, speak } from "../../audio/sound";
import { evidenceIn, useGame } from "../../context";
import { EvidenceTile } from "../../evidence/EvidenceCard";
import { buzz, BUZZ } from "../../haptics";
import { SuspectPortrait } from "../../parts";
import { quietFinds } from "../../story/Moments";
import { useTypewriter } from "../../story/StoryPlayer";
import { Icon } from "../../ui/Icon";
import { Sheet } from "../../ui/Sheet";
import { Coach, useCoach, type CoachStep } from "../Coach";
import { ActionBar, MainAction, Station } from "../Station";

/** What a suspect says when the evidence doesn't land. Picked in turn, so the same line doesn't come twice running. */
const SHRUGS = ["And?", "Is that supposed to mean something?", "I don't see what that has to do with me.", "Very nice. Next question.", "You'll have to do better than that."];

/** Someone in the chair: a suspect with a portrait, or a witness drawn as their initial. */
const personFor = (suspects: CaseSuspect[], name: string): CaseSuspect => suspects.find((s) => s.name === name) ?? { id: name, name, blurb: "" };
const firstName = (name: string) => (/^(Prof\.|Sir|Dame|Lord|Dr\.)\s/.test(name) ? name : name.split(/[\s,(]/)[0]);

type Line = { key: string; who: string; text: string; mood: "answer" | "crack" | "shrug" };

/** The person in the chair, under the lamp, saying their line in their own voice. */
function TheChair({ person, line }: { person: CaseSuspect; line: Line | null }) {
  const voice = useCallback(() => {
    if (line) speak(line.who);
  }, [line]);
  const typed = useTypewriter(line?.text ?? "", Boolean(line), voice);
  const cracked = line?.mood === "crack";
  const smug = line?.mood === "shrug";

  return (
    <div data-coach="room" className="interrogation-room relative flex min-h-[15.5rem] items-end gap-2 overflow-hidden rounded-2xl border-[3px] border-black px-3 pt-8 pb-3">
      <span aria-hidden className="interrogation-lamp pointer-events-none absolute inset-x-0 top-0 h-full" />
      <div key={`${line?.key ?? "idle"}-${person.name}`} className={cx("relative z-10 w-28 shrink-0 sm:w-36", cracked ? "animate-shake" : smug ? "suspect-smug" : "suspect-breathe")}>
        <SuspectPortrait suspect={person} mood={cracked ? "cracked" : smug ? "smug" : "idle"} className="aspect-[5/7] w-full object-contain object-bottom" />
        {cracked && <span aria-hidden className="suspect-sweat pointer-events-none absolute top-[18%] right-[14%]" />}
      </div>
      <div className="relative z-10 mb-6 min-w-0 flex-1">
        {line ? (
          <button
            type="button"
            onClick={() => typed.finish()}
            className="block w-full rounded-3xl rounded-bl-md border-[3px] border-ink bg-cream px-3.5 py-2.5 text-left text-ink shadow-card"
            aria-label={typed.complete ? `${line.who}: ${line.text}` : "Show the whole answer"}
          >
            <span className="block text-xs font-extrabold text-ink/50">{line.who}</span>
            <span className="block leading-snug font-bold">&ldquo;{typed.text}&rdquo;</span>
          </button>
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-cream/25 px-3 py-2 text-sm font-semibold text-cream/70">
            {person.role ? `${person.role}. ` : ""}Waiting for your question.
          </p>
        )}
        {cracked && (
          <span aria-hidden className="absolute -top-6 right-1 -rotate-12 animate-stamp rounded-xl border-[4px] border-coral bg-cream/90 px-2.5 font-display text-2xl text-coral">
            CRACK
          </span>
        )}
      </div>
      <span aria-hidden className="interrogation-table pointer-events-none absolute inset-x-0 bottom-0 h-7" />
    </div>
  );
}

/**
 * The Interviewer's interrogation room. Bring someone into the chair, play a
 * question, and hear the answer in their voice. Caught them in a lie? Put
 * something from the board in front of them: if it breaks their story they
 * crack, on every phone; if it doesn't, it costs the night some time.
 */
export function InterviewerTool() {
  const { view, act, busy, open } = useGame();
  const coach = useCoach("interview");
  const questions = useMemo(() => view.questions ?? [], [view.questions]);
  const people = useMemo(() => [...new Set(questions.map((q) => q.suspect))], [questions]);
  const [chairPick, setChair] = useState<string | null>(null);
  // Whoever has something new to be asked comes in first.
  const fresh = questions.filter((q) => !q.asked);
  const chair = chairPick && people.includes(chairPick) ? chairPick : (fresh.at(-1)?.suspect ?? people[0] ?? null);
  const person = chair ? personFor(view.case.suspects, chair) : null;
  const cards = questions.filter((q) => q.suspect === chair).sort((a, b) => Number(a.asked) - Number(b.asked) || b.chapter - a.chapter);
  const [picked, setPicked] = useState<string | null>(null);
  const card = cards.find((q) => q.id === picked && !q.asked) ?? null;
  const [line, setLine] = useState<Line | null>(null);
  const [showing, setShowing] = useState(false);
  const [shownPick, setShownPick] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(false);
  const price = view.deadline ? formatSpan(view.deadline.costs.question) : null;
  const missPrice = view.deadline ? formatSpan(view.deadline.costs.miss) : null;
  const pinned = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });

  // While the room is open, answers and cracks play here, not as pop-ups.
  useEffect(() => {
    quietFinds.add("interview");
    quietFinds.add("press");
    return () => {
      quietFinds.delete("interview");
      quietFinds.delete("press");
    };
  }, []);

  // A new answer of mine, or a crack, takes the chair.
  const heard = useRef<Set<string> | null>(null);
  useEffect(() => {
    const mine = view.evidence.filter((e) => (e.source === "interview" || e.source === "press") && e.foundBy === view.me.id);
    if (!heard.current) {
      heard.current = new Set(mine.map((e) => e.id));
      return;
    }
    const arrived = mine.find((e) => !heard.current!.has(e.id));
    mine.forEach((e) => heard.current!.add(e.id));
    if (!arrived || arrived.body.type !== "statement") return;
    const crack = arrived.source === "press";
    setChair(arrived.body.speaker);
    setLine({ key: arrived.id, who: arrived.body.speaker, text: arrived.body.text, mood: crack ? "crack" : "answer" });
    if (crack) {
      play("crack");
      buzz(BUZZ.crack);
    }
  }, [view.evidence, view.me.id]);

  // Evidence that didn't land: a shrug, and the clock above drops.
  const lastShow = view.shows.at(-1);
  const shrugged = useRef(lastShow?.id);
  useEffect(() => {
    if (!lastShow || lastShow.id === shrugged.current) return;
    shrugged.current = lastShow.id;
    if (lastShow.crack) return;
    play("miss");
    buzz(BUZZ.miss);
    setLine({ key: lastShow.id, who: lastShow.suspect, text: SHRUGS[view.shows.filter((s) => !s.crack).length % SHRUGS.length], mood: "shrug" });
  }, [lastShow, view.shows]);

  const ask = async () => {
    if (!card) return;
    play("tap");
    if (await act({ type: "ask", evidenceId: card.id })) setPicked(null);
  };

  const show = async () => {
    if (!chair || !shownPick) return;
    play("stamp");
    buzz(BUZZ.tap);
    if (await act({ type: "show", suspect: chair, evidenceId: shownPick })) {
      setShowing(false);
      setShownPick(null);
    }
  };

  const answers = (who: string) =>
    view.evidence
      .filter((e) => (e.source === "interview" || e.source === "press") && e.body.type === "statement" && e.body.speaker === who)
      .sort((a, b) => (a.foundAt ?? 0) - (b.foundAt ?? 0));

  const now = !person
    ? "Nobody to question yet."
    : card
      ? `Ask ${firstName(person.name)}, or pick another card.`
      : cards.some((q) => !q.asked)
        ? `Pick a question for ${firstName(person.name)}.`
        : `${firstName(person.name)} has answered everything. Show them something, or bring someone else in.`;

  const steps: CoachStep[] = [
    { target: "chair", gesture: "tap", title: "Bring someone in", text: "Tap a face to put them in the chair. Everyone you can question is along here." },
    {
      target: "ask",
      gesture: "tap",
      title: "Ask a question",
      text: price ? `Pick a card, then Ask. Each question takes ${price} out of the night. Leads, marked free, cost nothing.` : "Pick a card, then Ask. Leads are marked free.",
    },
    {
      target: "show",
      gesture: "tap",
      title: "Show them the evidence",
      text: `Caught them out? Put something from the board in front of them. If it breaks their story, they crack.${missPrice ? ` If it doesn't, it costs ${missPrice}.` : ""}`,
    },
  ];

  return (
    <div>
      <Station
        name="The interrogation room"
        now={now}
        skin="tool-interrogation"
        onHelp={coach.show}
        actions={
          <ActionBar
            side={[
              {
                id: "transcript",
                label: "Tapes",
                icon: "mic",
                badge: chair ? answers(chair).length || undefined : undefined,
                onClick: () => setTranscript(true),
                disabled: chair && answers(chair).length ? false : "Nothing on tape yet. Ask them something first.",
              },
              {
                id: "show",
                label: "Show them",
                icon: "target",
                onClick: () => setShowing(true),
                disabled: !chair ? "Nobody's in the chair." : pinned.length ? false : "The board is empty. Pin something to show them.",
              },
            ]}
            main={
              <MainAction
                id="ask"
                label="Ask"
                icon="mic"
                onClick={ask}
                disabled={!card || busy}
                tone="bg-lilac text-ink"
                note={!card ? "Pick a question card" : card.lead || !price ? "A lead: free to ask" : `Takes ${price} of the night`}
              />
            }
          />
        }
      >
        {people.length > 0 && (
          <ul data-coach="chair" className="mb-3 flex snap-x gap-2 overflow-x-auto pb-1.5" aria-label="Who can be questioned">
            {people.map((name) => {
              const who = personFor(view.case.suspects, name);
              const waiting = questions.filter((q) => q.suspect === name && !q.asked).length;
              const on = name === chair;
              return (
                <li key={name} className="shrink-0 snap-start">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      play("tap");
                      setChair(name);
                      setPicked(null);
                      setLine(null);
                    }}
                    className={cx("relative flex w-[4.75rem] flex-col items-center gap-1 rounded-2xl border-2 p-1.5 transition-colors", on ? "border-mustard bg-mustard/15" : "border-transparent opacity-75 hover:opacity-100")}
                  >
                    <SuspectPortrait suspect={who} className="h-14 w-auto object-contain" />
                    <span className="w-full truncate text-center text-[0.7rem] leading-tight font-extrabold">{firstName(name)}</span>
                    {waiting > 0 && <span className="absolute -top-1 -right-1 min-w-5 rounded-full border-2 border-ink bg-coral px-1 text-center text-[0.65rem] leading-4 font-black text-cream">{waiting}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {person ? (
          <TheChair person={person} line={line && line.who === person.name ? line : null} />
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-cream/25 p-4 text-center font-semibold text-cream/70">Nobody to question yet.</p>
        )}

        {cards.length > 0 && (
          <ul className="mt-3 grid gap-2" aria-label={`Questions for ${chair}`}>
            {cards.map((q) => (
              <li key={q.id}>
                {q.asked ? (
                  <button
                    type="button"
                    onClick={() => {
                      const answer = view.evidence.find((e) => e.id === q.id);
                      if (answer?.body.type === "statement") setLine({ key: `${q.id}-${Date.now()}`, who: answer.body.speaker, text: answer.body.text, mood: "answer" });
                    }}
                    className="flex w-full items-center gap-2 rounded-2xl rounded-tl-md bg-cream/10 px-3 py-2 text-left text-sm font-semibold text-cream/65 hover:bg-cream/15"
                  >
                    <Icon name="check" className="size-4 shrink-0 text-teal" />
                    <span className="flex-1">{q.question}</span>
                    <span className="shrink-0 text-xs font-extrabold text-lilac">Play back</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-pressed={picked === q.id}
                    onClick={() => {
                      play("tap");
                      setPicked((p) => (p === q.id ? null : q.id));
                    }}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-2xl rounded-tl-md border-[3px] border-ink px-3 py-2.5 text-left font-bold transition-transform",
                      picked === q.id ? "-translate-y-1 -rotate-1 bg-mustard text-ink shadow-pop" : "bg-cream text-ink shadow-pop-sm hover:-translate-y-0.5",
                    )}
                  >
                    <span className="flex-1 leading-snug">{q.question}</span>
                    <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-black", q.lead || !price ? "bg-teal text-ink" : "bg-ink/10 text-ink")}>
                      {q.lead || !price ? "Free" : price}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Station>

      {coach.open && <Coach label="The interrogation room" steps={steps} onClose={coach.close} />}

      {showing && chair && (
        <Sheet title={`Show ${chair} something`} onClose={() => setShowing(false)}>
          <h2 className="mb-1 font-display text-2xl text-cream">Show {firstName(chair)} something</h2>
          <p className="mb-4 text-sm font-bold text-cream/70">
            Pick a piece from the board that breaks what they told you. {missPrice ? `If it doesn't, it costs ${missPrice} of the night.` : ""}
          </p>
          <ul className="corkboard grid grid-cols-2 items-start gap-x-3 gap-y-4 rounded-2xl border-[3px] border-ink p-3 sm:grid-cols-3">
            {pinned.map((e, i) => (
              <li key={e.id}>
                <EvidenceTile evidence={e} index={i} selected={shownPick === e.id} onOpen={() => setShownPick((p) => (p === e.id ? null : e.id))} />
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!shownPick || busy}
            onClick={show}
            className="mt-4 w-full rounded-2xl border-[3px] border-ink bg-coral py-3 font-display text-2xl tracking-wide text-cream shadow-pop transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-pop-sm disabled:opacity-50"
          >
            {shownPick ? `Show ${firstName(chair)}` : "Pick something first"}
          </button>
        </Sheet>
      )}

      {transcript && chair && (
        <Sheet title={`${chair}: the tapes`} onClose={() => setTranscript(false)}>
          <h2 className="mb-4 font-display text-2xl text-cream">{chair}: the tapes</h2>
          <ol className="grid gap-3">
            {answers(chair).map((e) => {
              const q = questions.find((x) => x.id === e.id);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTranscript(false);
                      open(e.id);
                    }}
                    className={cx("block w-full rounded-2xl border-[3px] border-ink p-3 text-left shadow-pop-sm", e.source === "press" ? "bg-[#f8cfc8] text-ink" : "bg-cream text-ink")}
                  >
                    <span className="block text-xs font-extrabold text-ink/55">{e.source === "press" ? "Cracked" : (q?.question ?? e.title)}</span>
                    {e.body.type === "statement" && <span className="mt-0.5 block leading-snug font-bold">&ldquo;{e.body.text}&rdquo;</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </Sheet>
      )}
    </div>
  );
}
