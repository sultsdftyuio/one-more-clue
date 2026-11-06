"use client";

import { useEffect, useRef, useState } from "react";
import { formatSpan } from "@/lib/game/clock";
import { play } from "../../audio/sound";
import { evidenceIn, useGame } from "../../context";
import { ContradictionSlip } from "../../evidence/objects/FindingNote";
import { buzz, BUZZ } from "../../haptics";
import { quietFinds } from "../../story/Moments";
import { Icon } from "../../ui/Icon";
import { Wall, type TieOutcome } from "../../wall/Wall";
import { Coach, useCoach, type CoachStep } from "../Coach";
import { ActionBar, MainAction, Station } from "../Station";

const pairKey = (a: string, b: string) => [a, b].sort().join("+");

/**
 * The Archivist keeps the team's wall. Tie two pieces with red string, by
 * dragging from one to the other or tapping both: if they can't both be true,
 * the string snaps tight and the lie is caught; if they agree, it drops and
 * the night pays a little. Arrange the wall, pin papers up from the tray, and
 * present a piece when the team is ready to answer.
 */
export function ArchivistTool() {
  const { view, act, busy, open } = useGame();
  const coach = useCoach("crosscheck");
  const [selected, setSelected] = useState<string[]>([]);
  const [arranging, setArranging] = useState(false);
  const [outcome, setOutcome] = useState<TieOutcome | null>(null);
  const [caught, setCaught] = useState<string | null>(null);
  const tried = useRef<[string, string] | null>(null);
  const missPrice = view.deadline ? formatSpan(view.deadline.costs.miss) : null;
  const pieces = view.pins.flatMap((p) => {
    const e = evidenceIn(view, p.evidenceId);
    return e ? [e] : [];
  });
  const tray = view.evidence.filter((e) => e.mine && !e.pinned);
  const here = new Set([...pieces, ...tray].map((e) => e.id));
  const picked = selected.filter((id) => here.has(id));

  // The wall plays out the Archivist's own catches; no pop-up on top of it.
  useEffect(() => {
    quietFinds.add("crosscheck");
    return () => {
      quietFinds.delete("crosscheck");
    };
  }, []);

  // A new string of mine: it pulls tight, the stamp comes down, and the caught lie shows under the wall.
  const seenStrings = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seenStrings.current) {
      seenStrings.current = new Set(view.strings.map((s) => s.id));
      return;
    }
    const fresh = view.strings.find((s) => !seenStrings.current!.has(s.id));
    view.strings.forEach((s) => seenStrings.current!.add(s.id));
    if (!fresh || view.evidence.find((e) => e.id === fresh.id)?.foundBy !== view.me.id) return;
    setOutcome({ key: Date.now(), a: fresh.a, b: fresh.b, kind: "taut" });
    setCaught(fresh.id);
    setSelected([]);
    play("taut");
    window.setTimeout(() => play("stamp"), 380);
    buzz(BUZZ.snap);
  }, [view.strings, view.evidence, view.me.id]);

  // A pair that agreed after all: the string comes loose and drops, and the clock above loses a little.
  const seenChecks = useRef<number | null>(null);
  useEffect(() => {
    const count = view.checked.length;
    if (seenChecks.current === null || count <= seenChecks.current) {
      seenChecks.current = count;
      return;
    }
    seenChecks.current = count;
    const pair = tried.current;
    if (!pair || !view.checked.includes(pairKey(pair[0], pair[1]))) return;
    setOutcome({ key: Date.now(), a: pair[0], b: pair[1], kind: "slack" });
    setSelected([]);
    play("slack");
    buzz(BUZZ.miss);
  }, [view.checked]);

  const select = (id: string) => {
    if (arranging) return;
    play("tap");
    setSelected((current) => {
      const live = current.filter((x) => here.has(x));
      if (live.includes(id)) return live.filter((x) => x !== id);
      return live.length < 2 ? [...live, id] : [live[0], id];
    });
  };

  const tie = async () => {
    if (picked.length !== 2) return;
    tried.current = [picked[0], picked[1]];
    play("tap");
    await act({ type: "crosscheck", a: picked[0], b: picked[1] });
  };

  const single = picked.length === 1 ? picked[0] : null;
  const singleOnWall = Boolean(single && view.pins.some((p) => p.evidenceId === single));
  const pairTried = picked.length === 2 && view.checked.includes(pairKey(picked[0], picked[1]));
  const pairTied = picked.length === 2 && view.strings.some((s) => pairKey(s.a, s.b) === pairKey(picked[0], picked[1]));
  const presentWhy = !view.chapter.checkpoint
    ? "This chapter ends with naming who did it. Use Solve for that."
    : view.proposal
      ? "A vote is already open."
      : !single
        ? "Pick one piece to present."
        : !singleOnWall
          ? "Pin it to the wall first, so everyone can see it."
          : false;
  const caughtEvidence = caught ? evidenceIn(view, caught) : undefined;

  const now = arranging
    ? "Drag pieces to lay out the wall. Tap Done when it's how you want it."
    : picked.length === 0
      ? "Tap a piece, or drag a string from it to another."
      : picked.length === 1
        ? "Now tap the piece you think it contradicts."
        : pairTied
          ? "Those two are already tied."
          : pairTried
            ? "You've tried those two: they agree."
            : "Tie them, or tap another piece instead.";

  const steps: CoachStep[] = [
    { target: "wall", gesture: "look", title: "The team's wall", text: "Everything pinned lives up here, for everyone. Your own papers wait in a tray underneath until you pin them." },
    {
      target: "wall",
      gesture: "drag",
      title: "Tie two together",
      text: "Drag a string from one piece to another, or tap one and then the other. If they can't both be true, the string snaps tight.",
    },
    {
      target: "tie",
      gesture: "tap",
      title: "Pull it tight",
      text: missPrice ? `Press Tie to test it. If the two agree after all, the string drops and it costs ${missPrice} of the night.` : "Press Tie to test it. If the two agree after all, the string drops.",
    },
  ];

  return (
    <div>
      <Station
        name="The evidence wall"
        now={now}
        skin="tool-wall"
        onHelp={coach.show}
        actions={
          <ActionBar
            side={[
              {
                id: "arrange",
                label: arranging ? "Done" : "Arrange",
                icon: "board",
                pressed: arranging,
                onClick: () => {
                  setArranging((a) => !a);
                  setSelected([]);
                },
                disabled: pieces.length ? false : "Pin something to the wall first.",
              },
              {
                id: "present",
                label: "Present",
                icon: "flag",
                onClick: () => single && act({ type: "propose", kind: "answer", evidenceId: single }),
                disabled: presentWhy,
              },
            ]}
            main={
              <MainAction
                id="tie"
                label="Tie"
                icon="scale"
                onClick={tie}
                disabled={picked.length !== 2 || pairTried || pairTied || busy || arranging}
                note={picked.length !== 2 ? "Pick two pieces" : missPrice ? `A slack string costs ${missPrice}` : "Tie them together"}
              />
            }
          />
        }
      >
        <Wall
          pieces={pieces}
          places={view.wall}
          strings={view.strings}
          tray={tray}
          selected={picked}
          editable
          arranging={arranging}
          outcome={outcome}
          onTap={select}
          onMove={(id, place) => act({ type: "arrange", evidenceId: id, x: place.x, y: place.y }, { quiet: true })}
          onDragTie={(from, to) => {
            play("tap");
            setSelected([from, to]);
          }}
        />

        {single && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => open(single)} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-cream px-3.5 py-1.5 text-sm font-extrabold text-ink">
              <Icon name="eye" className="size-4" /> Read it
            </button>
            {!singleOnWall && (
              <button
                type="button"
                disabled={busy || view.pins.length >= view.pinLimit}
                onClick={() => act({ type: "pin", evidenceId: single })}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-3.5 py-1.5 text-sm font-extrabold text-cream shadow-pop-sm disabled:opacity-50"
              >
                <Icon name="pin" className="size-4" /> {view.pins.length >= view.pinLimit ? "The wall is full" : "Pin to the wall"}
              </button>
            )}
          </div>
        )}

        {caughtEvidence && caughtEvidence.body.type === "finding" && (
          <div className="mt-4 animate-[rise-in_0.35s_ease-out]">
            <div className="flex items-center justify-between gap-2 pb-1.5">
              <p className="text-xs font-extrabold tracking-widest uppercase opacity-70">Caught</p>
              <button type="button" onClick={() => setCaught(null)} aria-label="Put it away" className="grid size-7 place-items-center rounded-full bg-black/25">
                <Icon name="x" className="size-4" />
              </button>
            </div>
            <button type="button" onClick={() => open(caughtEvidence.id)} className="block w-full text-left">
              <ContradictionSlip evidence={caughtEvidence} body={caughtEvidence.body} stampDelay={0.45} />
            </button>
          </div>
        )}
      </Station>

      {coach.open && <Coach label="The evidence wall" steps={steps} onClose={coach.close} />}
    </div>
  );
}
