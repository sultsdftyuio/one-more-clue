"use client";

import { useEffect, useRef, useState } from "react";
import { play } from "@/components/game/audio/sound";
import { evidenceIn, nameOf, useGame } from "@/components/game/context";
import { ArchivistTool } from "@/components/game/desk/roles/Archivist";
import { ROLE_CARD } from "@/components/game/desk/roles/look";
import { PhotographerTool } from "@/components/game/desk/roles/Photographer";
import { TechTool } from "@/components/game/desk/roles/Tech";
import { buzz, BUZZ } from "@/components/game/haptics";
import { Icon } from "@/components/game/ui/Icon";
import { parseTime } from "@/lib/game/clock";
import type { CaseRole } from "@/lib/game/types";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { useWorld } from "./useWorld";
import { pictureOf } from "./WorldThenNow";
import { ABILITY_ICON } from "./WorldSpots";

/** How long each row of a log holds the rewind when it's played in the building. */
const ROW_MS = 1700;

const big = "w-full rounded-2xl border-[3px] border-ink px-4 py-3 font-display text-xl shadow-pop-sm disabled:opacity-50";
const small = "rounded-full border-2 border-ink bg-cream px-3 py-1.5 text-sm font-extrabold text-ink shadow-pop-sm disabled:opacity-50";

/** The minutes into the rewind's night of each timed row of a log, inside the night it covers. */
function logMoments(rows: { time: string }[], from: string, span: number) {
  const start = parseTime(from);
  return rows.flatMap((row) => {
    if (!row.time) return [];
    try {
      let m = parseTime(row.time) - start;
      if (m < -12 * 60) m += 24 * 60;
      return m >= 0 && m <= span ? [m] : [];
    } catch {
      return [];
    }
  });
}

/** What's at this spot that you already hold: tap to read it. */
function Pieces({ spot, extra }: { spot: WorldSpotView; extra?: (id: string) => React.ReactNode }) {
  const { view, open } = useGame();
  const pieces = spot.pieces.map((id) => evidenceIn(view, id)).filter((e) => e !== undefined);
  if (!pieces.length) return null;
  return (
    <ul className="mt-3 grid gap-2" aria-label={`What you have from ${spot.name}`}>
      {pieces.map((e) => (
        <li key={e.id} className="rounded-2xl border-2 border-ink bg-night/60 p-2.5">
          <button type="button" onClick={() => open(e.id)} className="flex w-full items-center gap-2 text-left">
            <Icon name={e.body.type === "log" ? "file" : e.body.type === "scene" || e.body.type === "footage" ? "camera" : e.body.type === "chat" ? "chat" : "file"} className="size-4 shrink-0 text-mustard" />
            <span className="min-w-0 flex-1 truncate font-bold text-cream">{e.title}</span>
            <span className="text-xs font-extrabold text-cream/60">Read</span>
          </button>
          {extra?.(e.id)}
        </li>
      ))}
    </ul>
  );
}

/** The Tech at a device or a cabinet (W5.2): pull what it holds, play a log through the building, or open the computer. */
function TechAt({ spot }: { spot: WorldSpotView }) {
  const { view, act, busy } = useGame();
  const [computer, setComputer] = useState(false);
  const openRewind = useWorld((s) => s.openRewind);
  const dragRewind = useWorld((s) => s.dragRewind);
  const [playing, setPlaying] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const last = view.searches.at(-1);
  const said = last && last.query === spot.name && Date.now() - last.at < 60_000 && !last.hit ? last.note : null;

  const pull = async () => {
    play("type");
    buzz(BUZZ.tap);
    await act({ type: "probe", spot: spot.id });
  };

  const playLog = (id: string) => {
    const piece = evidenceIn(view, id);
    if (!piece || piece.body.type !== "log" || !view.rewind) return;
    const moments = logMoments(piece.body.rows, view.rewind.from, view.rewind.span);
    if (!moments.length) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    setPlaying(id);
    openRewind(true);
    moments.forEach((m, i) => {
      timers.current.push(
        window.setTimeout(() => {
          play("tick");
          dragRewind(m, view.me.id, false);
        }, i * ROW_MS),
      );
    });
    timers.current.push(window.setTimeout(() => setPlaying(null), moments.length * ROW_MS));
  };

  return (
    <div>
      <button type="button" onClick={pull} disabled={busy} className={cx(big, spot.fresh ? "bg-teal text-ink" : "bg-cream text-ink")}>
        <span className="flex items-center justify-center gap-2">
          <Icon name="search" className="size-5" /> Pull the records
        </span>
      </button>
      <p className="mt-1.5 text-center text-sm font-semibold text-cream/75">
        {spot.fresh ? "Something new is waiting here." : spot.pieces.length ? "You've got what's here so far. Try again after a lead." : "See what this keeps a record of."}
      </p>
      {said && <p className="mt-2 rounded-2xl border-2 border-teal/60 bg-black/40 p-2.5 font-printer text-lg leading-tight text-teal">{said}</p>}
      <Pieces
        spot={spot}
        extra={(id) => {
          const piece = evidenceIn(view, id);
          if (!piece || piece.body.type !== "log" || !view.rewind || !logMoments(piece.body.rows, view.rewind.from, view.rewind.span).length) return null;
          return (
            <button type="button" onClick={() => playLog(id)} disabled={playing !== null} className={cx(small, "mt-2")}>
              {playing === id ? "Playing in the building…" : "Play it in the building"}
            </button>
          );
        }}
      />
      <button type="button" onClick={() => setComputer((v) => !v)} aria-expanded={computer} className={cx(small, "mt-4")}>
        {computer ? "Hide the computer" : "Open the computer"}
      </button>
      {computer && (
        <div className="mt-3">
          <TechTool />
        </div>
      )}
    </div>
  );
}

/** The Photographer where a photo was taken (W5.1): hold it over the room as it is now, or shoot it in the camera. */
function PhotographerAt({ spot, onCamera }: { spot: WorldSpotView; onCamera: () => void }) {
  const { view } = useGame();
  const setThenNow = useWorld((s) => s.setThenNow);
  const look = useWorld((s) => s.look);
  const [camera, setCamera] = useState(false);
  const photos = spot.pieces.filter((id) => pictureOf(evidenceIn(view, id)));
  return (
    <div>
      {photos.length > 0 && (
        <ul className="grid gap-2" aria-label="Photos taken here">
          {photos.map((id) => {
            const piece = evidenceIn(view, id)!;
            return (
              <li key={id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-night/60 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pictureOf(piece)!} alt="" className="h-14 w-[4.7rem] shrink-0 rounded-lg border-2 border-ink object-cover" />
                <span className="min-w-0 flex-1 text-sm leading-tight font-bold text-cream">{piece.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    play("focus");
                    look({ kind: "room", id: spot.room });
                    setThenNow({ evidenceId: id, room: spot.room });
                    onCamera();
                  }}
                  className={small}
                >
                  Then and now
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button type="button" onClick={() => setCamera((v) => !v)} aria-expanded={camera} className={cx(small, "mt-4")}>
        {camera ? "Hide the camera" : "Open the camera"}
      </button>
      {camera && (
        <div className="mt-3">
          <PhotographerTool />
        </div>
      )}
    </div>
  );
}

/** The Archivist at a record (W5.4): what's here, the wall, and the night rewound. */
function ArchivistAt({ spot, onClose }: { spot: WorldSpotView; onClose: () => void }) {
  const { view } = useGame();
  const openRewind = useWorld((s) => s.openRewind);
  return (
    <div>
      {view.rewind && (
        <button
          type="button"
          onClick={() => {
            openRewind(true);
            onClose();
          }}
          className={cx(big, "bg-lilac text-ink")}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="clock" className="size-5" /> Rewind the night
          </span>
        </button>
      )}
      <Pieces spot={spot} />
      <div className="mt-4">
        <ArchivistTool />
      </div>
    </div>
  );
}

/**
 * What a spot opens in the world (W5): your role's way of working that object, or, when it isn't yours, who to ask.
 * Each role's full tool from the classic screens is still one tap away, so nothing the classic game can do is lost.
 */
export function SpotSheetBody({ spot, onClose, onCamera }: { spot: WorldSpotView; onClose: () => void; onCamera: () => void }) {
  const { view } = useGame();
  const roles = spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r): r is CaseRole => r !== undefined);
  const mine = roles.find((r) => view.me.roles.includes(r.id) && r.ability !== "none");
  const others = roles.filter((r) => r !== mine);

  return (
    <div>
      <p className="mb-3 flex items-center gap-2 pr-12 text-sm font-bold text-cream/75">
        <Icon name="target" className="size-4" /> {spot.name}
      </p>
      {mine?.ability === "search" && <TechAt spot={spot} />}
      {mine?.ability === "inspect" && <PhotographerAt spot={spot} onCamera={onCamera} />}
      {mine?.ability === "crosscheck" && <ArchivistAt spot={spot} onClose={onClose} />}
      {!mine && <p className="font-semibold text-cream/80">Someone else has something to look at here.</p>}
      {others.length > 0 && (
        <ul className="mt-5 grid gap-2" aria-label="Who else works here">
          {others.map((r) => {
            const holders = view.players.filter((p) => p.roles.includes(r.id) && p.id !== view.me.id);
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-night/60 p-3">
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink", ROLE_CARD[r.ability])}>
                  <Icon name={ABILITY_ICON[r.ability]} className="size-4" />
                </span>
                <span className="font-bold text-cream">
                  {r.name}
                  <span className="block text-sm font-semibold text-cream/70">
                    {holders.length ? `Ask ${holders.map((p) => nameOf(view, p.id)).join(" or ")} to come and look.` : "Nobody else has this role in your game."}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
