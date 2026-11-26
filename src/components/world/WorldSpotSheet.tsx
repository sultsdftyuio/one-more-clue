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
import { formatTime, parseTime } from "@/lib/game/clock";
import type { Ability, CaseRole } from "@/lib/game/types";
import type { WorldSpotView } from "@/lib/game/world";
import { cx } from "@/lib/cx";
import { useWorld } from "./useWorld";
import { pictureOf } from "./WorldThenNow";
import { ABILITY_ICON } from "./WorldSpots";

/** How long each row of a log holds the rewind when it's played in the building. */
const ROW_MS = 1700;

/** What each role does at a spot, under its name. */
const ROLE_LINE: Record<Ability, string> = {
  search: "Pull what this recorded",
  inspect: "Hold the photos up to the room",
  crosscheck: "Rewind the night, line up the records",
  interview: "Question who's here",
  none: "",
};

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

/** The role you're working this spot as: its colour, its picture, and what it does here. */
function RoleBand({ ability, name, line }: { ability: Ability; name: string; line: string }) {
  return (
    <div className={cx("mb-3 flex items-center gap-2.5 rounded-2xl border-[3px] border-ink px-3 py-2 shadow-pop-sm", ROLE_CARD[ability])}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-cream text-ink">
        <Icon name={ABILITY_ICON[ability]} className="size-5" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-display text-lg">{name}</span>
        <span className="block text-xs font-extrabold opacity-85">{line}</span>
      </span>
    </div>
  );
}

/** What's at this spot that you already hold, tap to read: printouts for the Tech, file cards for the Archivist. */
function Pieces({ spot, look = "file", extra }: { spot: WorldSpotView; look?: "slip" | "file"; extra?: (id: string) => React.ReactNode }) {
  const { view, open } = useGame();
  const pieces = spot.pieces.map((id) => evidenceIn(view, id)).filter((e) => e !== undefined);
  if (!pieces.length) return null;
  return (
    <ul className="mt-4 grid gap-3" aria-label={`What you have from ${spot.name}`}>
      {pieces.map((e, i) => (
        <li
          key={e.id}
          className={cx(
            "relative text-ink shadow-[0_5px_0_rgba(20,24,41,0.45)]",
            look === "slip"
              ? "rounded-b-md bg-[#FFF8E8] px-3 pt-4 pb-2.5 before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-[radial-gradient(circle,#232B52_2.5px,transparent_3px)] before:bg-[length:12px_8px]"
              : "rounded-xl rounded-tl-none border-2 border-ink bg-[#F4C85E] px-3 pt-2.5 pb-2.5",
          )}
          style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}
        >
          {look === "file" && <span aria-hidden="true" className="absolute -top-3 -left-0.5 h-3 w-16 rounded-t-md border-2 border-b-0 border-ink bg-[#F4C85E]" />}
          <button type="button" onClick={() => open(e.id)} className="flex w-full items-center gap-2 text-left">
            <Icon name={e.body.type === "scene" || e.body.type === "footage" ? "camera" : e.body.type === "chat" ? "chat" : "file"} className="size-4 shrink-0" />
            <span className={cx("min-w-0 flex-1 truncate", look === "slip" ? "font-printer text-xl leading-none" : "font-bold")}>{e.title}</span>
            <span className="shrink-0 rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold">Read</span>
          </button>
          {extra?.(e.id)}
        </li>
      ))}
    </ul>
  );
}

/** Lines of noise that scroll on the Tech's screen while a pull downloads. */
const NOISE = ["0x3F 12 A9 00 7C 4E", "SYNC 0042 ... OK", "0x1B 88 F2 3D 00 91", "READ BLOCK 07/12", "0xC4 2A 6E 11 B0 5F", "CHECKSUM 9F3A ... OK", "0x07 D2 44 E9 13 6A", "READ BLOCK 12/12"];

/** The Tech's screen on the device: what it's connected to, whether there's anything new, and the pull downloading. */
function Terminal({ spot, pulling, said }: { spot: WorldSpotView; pulling: boolean; said: string | null }) {
  const status = pulling ? "DOWNLOADING" : spot.fresh ? "NEW RECORDS" : spot.pieces.length ? "ALL PULLED" : "READY";
  return (
    <div className="relative overflow-hidden rounded-2xl border-[3px] border-ink bg-[#08160F] p-3 font-printer text-xl leading-tight text-[#7CF2B4] shadow-[inset_0_0_34px_rgba(60,255,160,0.16)]">
      <span aria-hidden="true" className="world-scanlines pointer-events-none absolute inset-0 opacity-60" />
      <p className="truncate">&gt; CONNECT {spot.name.toUpperCase()}</p>
      <p className={cx("mt-1 flex items-center gap-2", spot.fresh && !pulling && "text-mustard")}>
        <span aria-hidden="true" className={cx("inline-block size-2.5 rounded-full", pulling ? "animate-pulse bg-[#7CF2B4]" : spot.fresh ? "world-osd bg-mustard" : "bg-[#7CF2B4]/50")} />
        {status}
      </p>
      {pulling ? (
        <div aria-hidden="true">
          <div className="mt-2 h-3 overflow-hidden rounded-sm border border-[#7CF2B4]/70">
            <span className="world-load block h-full bg-[#7CF2B4]" />
          </div>
          <div className="mt-1.5 h-12 overflow-hidden text-base leading-tight opacity-70">
            <div className="world-datascroll">
              {[...NOISE, ...NOISE].map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      ) : said ? (
        <p className="mt-2 text-[#9FE8FF]">{said}</p>
      ) : (
        <p className="mt-2 text-[#7CF2B4]/75">
          {spot.fresh ? "Something new is waiting here." : spot.pieces.length ? "Nothing new. Try again after a lead." : "See what this keeps a record of."}
          <span className="world-osd">_</span>
        </p>
      )}
    </div>
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

  const [pulling, setPulling] = useState(false);
  const pull = async () => {
    if (pulling) return;
    play("type");
    buzz(BUZZ.tap);
    setPulling(true);
    // The download takes a beat on screen even when the answer is quick, so the pull reads as a pull.
    await Promise.all([act({ type: "probe", spot: spot.id }), new Promise((r) => window.setTimeout(r, 1100))]);
    setPulling(false);
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
      <Terminal spot={spot} pulling={pulling} said={said ?? null} />
      <button
        type="button"
        onClick={pull}
        disabled={busy || pulling}
        aria-busy={pulling}
        className={cx(
          "mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-ink py-3 font-display text-xl text-ink shadow-[0_6px_0_#141829] transition-transform active:translate-y-1.5 active:shadow-none disabled:translate-y-1.5 disabled:shadow-none",
          spot.fresh ? "bg-teal" : "bg-cream",
        )}
      >
        <svg viewBox="0 0 24 24" className={cx("size-6", pulling && "animate-bounce")} aria-hidden="true">
          <path d="M12 3v12m-5-5 5 5 5-5M4 20h16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pulling ? "Pulling the records…" : "Pull the records"}
      </button>
      <Pieces
        spot={spot}
        look="slip"
        extra={(id) => {
          const piece = evidenceIn(view, id);
          if (!piece || piece.body.type !== "log" || !view.rewind || !logMoments(piece.body.rows, view.rewind.from, view.rewind.span).length) return null;
          return (
            <button type="button" onClick={() => playLog(id)} disabled={playing !== null} className={cx(small, "mt-2 flex items-center gap-1.5 bg-teal")}>
              <Icon name="play" className="size-3.5" /> {playing === id ? "Playing in the building…" : "Play it in the building"}
            </button>
          );
        }}
      />
      <button
        type="button"
        onClick={() => setComputer((v) => !v)}
        aria-expanded={computer}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-night/60 p-2.5 text-left text-cream"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-[#3E7FD9]">
          <Icon name="screen" className="size-5" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="block font-display text-lg">{computer ? "Close the computer" : "The computer"}</span>
          <span className="block text-xs font-bold text-cream/70">Search everything, crack passwords</span>
        </span>
      </button>
      {computer && (
        <div className="mt-3">
          <TechTool />
        </div>
      )}
    </div>
  );
}

/** The Photographer where a photo was taken (W5.1): the photos as prints, held up to the room as it is now, or the camera. */
function PhotographerAt({ spot, onCamera }: { spot: WorldSpotView; onCamera: () => void }) {
  const { view } = useGame();
  const setThenNow = useWorld((s) => s.setThenNow);
  const look = useWorld((s) => s.look);
  const [camera, setCamera] = useState(false);
  const [flash, setFlash] = useState(0);
  const photos = spot.pieces.filter((id) => pictureOf(evidenceIn(view, id)));
  return (
    <div>
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 px-1 pt-1" aria-label="Photos taken here">
          {photos.map((id, i) => {
            const piece = evidenceIn(view, id)!;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    play("focus");
                    look({ kind: "room", id: spot.room });
                    setThenNow({ evidenceId: id, room: spot.room });
                    onCamera();
                  }}
                  aria-label={`Hold up ${piece.title} to the room`}
                  className="w-full rounded-sm bg-white p-2 pb-2 text-left shadow-[0_6px_0_rgba(20,24,41,0.45)] transition-transform hover:rotate-0 hover:scale-[1.03]"
                  style={{ transform: `rotate(${i % 2 ? 2.5 : -2.5}deg)` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pictureOf(piece)!} alt="" className="aspect-[4/3] w-full border border-ink/20 object-cover" />
                  <span className="mt-1.5 line-clamp-2 block font-hand text-base leading-tight text-ink">{piece.title}</span>
                  <span className="mt-1.5 flex items-center justify-center gap-1 rounded-full border-2 border-ink bg-coral px-2 py-1 text-xs font-extrabold text-cream">
                    <Icon name="eye" className="size-3.5" /> Hold it up
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="grid place-items-center rounded-2xl border-[3px] border-dashed border-cream/30 p-5 text-center">
          <Icon name="camera" className="size-8 text-cream/50" />
          <p className="mt-2 text-sm font-bold text-cream/70">No photo of this place yet. Find one, then hold it up here.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (!camera) {
            play("shutter");
            setFlash(Date.now());
          }
          setCamera((v) => !v);
        }}
        aria-expanded={camera}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-[#2A2F4D] p-2 pr-4 text-left text-cream shadow-pop-sm active:translate-y-1 active:shadow-none"
      >
        <span className="relative grid size-14 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-[radial-gradient(circle_at_35%_35%,#7AA6FF,#1B2350_62%)]">
          <span className="size-6 rounded-full bg-[#0B1028] ring-4 ring-[#9FB8FF]/60" />
          <span className="absolute top-2.5 left-3 size-2 rounded-full bg-white/80" />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-xl">{camera ? "Put the camera away" : "Open the camera"}</span>
          <span className="block text-xs font-bold text-cream/70">Zoom in, enhance, develop</span>
        </span>
      </button>
      {flash > 0 && <span key={flash} aria-hidden="true" className="world-flash pointer-events-none fixed inset-0 z-[60]" />}
      {camera && (
        <div className="mt-3">
          <PhotographerTool />
        </div>
      )}
    </div>
  );
}

/** The Archivist at a record (W5.4): the night on tape to rewind, what's here, and the wall. */
function ArchivistAt({ spot, onClose }: { spot: WorldSpotView; onClose: () => void }) {
  const { view } = useGame();
  const openRewind = useWorld((s) => s.openRewind);
  const night = view.rewind;
  return (
    <div>
      {night && (
        <button
          type="button"
          onClick={() => {
            play("whoosh");
            openRewind(true);
            onClose();
          }}
          className="group w-full rounded-2xl border-[3px] border-ink bg-[#2B2F45] p-3 text-left text-cream shadow-[0_6px_0_#141829] active:translate-y-1.5 active:shadow-none"
        >
          {/* a cassette: the label, two reels that spin when you reach for it, and the night's span */}
          <span className="relative block rounded-xl border-[3px] border-ink bg-mustard px-3 pt-2 pb-3 text-ink">
            <span className="block font-display text-xl leading-none">◀◀ Rewind the night</span>
            <span className="mt-0.5 block font-hand text-base leading-none">
              {night.from} – {formatTime(parseTime(night.from) + night.span, night.from)}
            </span>
            <span className="mt-2 flex items-center justify-between rounded-lg border-2 border-ink bg-[#1B1F33] px-4 py-2">
              {[0, 1].map((r) => (
                <span key={r} aria-hidden="true" className="grid size-9 place-items-center rounded-full border-[3px] border-cream/80 bg-[#2B2F45] group-hover:animate-spin group-active:animate-spin">
                  <span className="size-3 rounded-full bg-[repeating-conic-gradient(#F4EEE4_0_15%,transparent_15%_33.3%)]" />
                </span>
              ))}
              <span aria-hidden="true" className="mx-2 h-3 flex-1 rounded-full bg-[#4A3426]" />
            </span>
          </span>
          <span className="mt-2 block text-center text-xs font-bold text-cream/75">Watch where everyone was, and who says so</span>
        </button>
      )}
      <Pieces spot={spot} look="file" />
      <p className="mt-6 mb-2 flex items-center gap-2 font-display text-lg text-cream">
        <Icon name="board" className="size-5 text-mustard" /> The wall
      </p>
      <ArchivistTool />
    </div>
  );
}

/**
 * What a spot opens in the world (W5): your role's way of working that object, or, when it isn't yours, who to ask.
 * Each role's full tool from the classic screens is still one tap away, so nothing the classic game can do is lost.
 */
/** Where a point of the building is in its painting, for a close-up of the object a panel is about. */
export type PlatePicture = { src: string; w: number; h: number; px: number; py: number };

/** A close-up of the painted object itself, cut from the building, with its name over it. */
function ObjectPicture({ picture, name }: { picture: PlatePicture; name: string }) {
  const k = 1.15;
  return (
    <div className="relative mb-4 h-44 overflow-hidden rounded-2xl border-[3px] border-ink bg-night" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={picture.src}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{ width: picture.w * k, height: picture.h * k, left: `calc(50% - ${(picture.px * k).toFixed(0)}px)`, top: `calc(50% - ${(picture.py * k).toFixed(0)}px)` }}
      />
      <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(9,12,30,0.75))]" />
      <span className="absolute bottom-2 left-3 rounded-full border-2 border-ink bg-night/85 px-2.5 py-0.5 text-sm font-extrabold text-cream">{name}</span>
    </div>
  );
}

export function SpotSheetBody({ spot, onClose, onCamera, picture }: { spot: WorldSpotView; onClose: () => void; onCamera: () => void; picture?: PlatePicture | null }) {
  const { view } = useGame();
  const roles = spot.roles.map((id) => view.case.roles.find((r) => r.id === id)).filter((r): r is CaseRole => r !== undefined);
  const mine = roles.find((r) => view.me.roles.includes(r.id) && r.ability !== "none");
  const others = roles.filter((r) => r !== mine);

  return (
    <div>
      {picture ? (
        <ObjectPicture picture={picture} name={spot.name} />
      ) : (
        <p className="mb-3 flex items-center gap-2 pr-12 text-sm font-bold text-cream/75">
          <Icon name="target" className="size-4" /> {spot.name}
        </p>
      )}
      {mine && <RoleBand ability={mine.ability} name={mine.name} line={ROLE_LINE[mine.ability]} />}
      {mine?.ability === "search" && <TechAt spot={spot} />}
      {mine?.ability === "inspect" && <PhotographerAt spot={spot} onCamera={onCamera} />}
      {mine?.ability === "crosscheck" && <ArchivistAt spot={spot} onClose={onClose} />}
      {!mine && (
        <p className="flex items-center gap-2.5 rounded-2xl border-2 border-dashed border-cream/30 p-3 font-semibold text-cream/80">
          <Icon name="lock" className="size-5 shrink-0 text-cream/60" /> This isn&apos;t yours to work. Someone else on the team can.
        </p>
      )}
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
