"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { MIN_SHOT_ZOOM } from "@/lib/game/camera";
import { formatSpan } from "@/lib/game/clock";
import type { VisibleEvidence } from "@/lib/game/engine";
import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";
import { play } from "../../audio/sound";
import { CAMERA_EVENT } from "../../camera-events";
import { foundHotspots, useGame } from "../../context";
import { tintsOf } from "../../evidence/EvidenceCard";
import { SceneThumb, ZoomedSpot } from "../../evidence/SceneView";
import { EmptyFrame, ShutterFlash, Viewfinder, type ViewfinderHandle } from "../../evidence/Viewfinder";
import { buzz, BUZZ } from "../../haptics";
import { askForMotion, motionNeedsAsking, motionReady } from "../../motion";
import { Icon } from "../../ui/Icon";
import { Sheet } from "../../ui/Sheet";
import { Coach, useCoach, type CoachStep } from "../Coach";
import { ActionBar, MainAction, Station } from "../Station";

type Picture = VisibleEvidence & { body: Extract<EvidenceBody, { type: "scene" | "footage" }> };
const isPicture = (e: VisibleEvidence): e is Picture => e.body.type === "scene" || e.body.type === "footage";

/** Every picture the Photographer can point the camera at, along the top. */
function ContactSheet({ pictures, picked, onPick }: { pictures: Picture[]; picked: string; onPick: (id: string) => void }) {
  const { view } = useGame();
  return (
    <ul className="mb-3 flex snap-x gap-2.5 overflow-x-auto pb-1.5" aria-label="Pictures">
      {pictures.map((p) => {
        const kept = foundHotspots(view, p.id).length;
        const on = p.id === picked;
        return (
          <li key={p.id} className="w-24 shrink-0 snap-start">
            <button type="button" onClick={() => onPick(p.id)} aria-pressed={on} className="block w-full text-left">
              <span className={cx("block border-2 bg-white p-1 transition-transform", on ? "-rotate-1 border-mustard shadow-[0_0_0_3px_var(--color-mustard)]" : "border-ink opacity-75 hover:opacity-100")}>
                <SceneThumb scene={p.body} />
              </span>
              <span className="mt-1 block truncate text-xs font-extrabold">{p.title}</span>
              <span className="block text-[0.7rem] font-bold opacity-60">{kept ? `${kept} kept` : p.body.type === "footage" ? "Footage" : "Not shot yet"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Camera footage: pick the moment on the tape, then frame it like any picture. */
function Scrubber({ frames, moment, onMoment }: { frames: { time: string; image?: string }[]; moment: number; onMoment: (m: number) => void }) {
  const [playing, setPlaying] = useState(false);
  const last = frames.length - 1;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (moment >= last) setPlaying(false);
      else {
        play("tap");
        onMoment(moment + 1);
      }
    }, 1300);
    return () => window.clearInterval(timer);
  }, [playing, moment, last, onMoment]);
  return (
    <div className="mt-2.5 flex items-center gap-2" data-coach="scrub">
      {/* Every painted moment loads up front, so scrubbing never lands on a blank one. */}
      <span className="sr-only">
        {frames.map((f) => f.image && <Image key={f.time} src={f.image} alt="" width={4} height={3} loading="eager" />)}
      </span>
      <button
        type="button"
        onClick={() => {
          if (moment >= last) onMoment(0);
          setPlaying((p) => !p);
        }}
        aria-label={playing ? "Pause the tape" : "Play the tape"}
        className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-black bg-[#c9c4b8] text-ink shadow-[0_2px_0_#000]"
      >
        {playing ? "❚❚" : <Icon name="skip" className="size-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={last}
        value={moment}
        onChange={(e) => {
          setPlaying(false);
          onMoment(Number(e.target.value));
        }}
        aria-label="Scrub through the tape"
        className="min-w-0 flex-1 accent-coral"
      />
      <span className="shrink-0 font-printer text-lg leading-none text-[#7ee787]">{frames[moment]?.time}</span>
    </div>
  );
}

/** What a catch looks like in the prints drawer. */
function PrintTile({ evidence, scene, onOpen }: { evidence: VisibleEvidence; scene?: VisibleEvidence; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="block w-full -rotate-1 border-[3px] border-ink bg-white p-1.5 pb-2 text-left shadow-pop-sm transition-transform hover:rotate-0">
      {scene && evidence.spot ? <ZoomedSpot scene={scene.body} hotspot={evidence.spot.hotspot} /> : <span className="block aspect-[4/3] bg-cream-dk" />}
      <span className="mt-1 block font-hand text-lg leading-tight text-ink">{evidence.title}</span>
    </button>
  );
}

/**
 * The Photographer's camera. Pick a picture, frame a detail, shoot. A catch
 * comes out as a blank print to develop; a shot of nothing costs time. Only
 * the shutter ever costs anything: looking around is free.
 */
export function PhotographerTool() {
  const { view, act, busy, open } = useGame();
  const pictures = view.evidence.filter(isPicture).sort((a, b) => b.chapter - a.chapter);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pictures.find((p) => p.id === pickedId) ?? pictures[0];
  const [moment, setMoment] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState(0);
  const [miss, setMiss] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const finder = useRef<ViewfinderHandle>(null);
  const root = useRef<HTMLDivElement>(null);
  const coach = useCoach("inspect");
  const price = view.deadline ? formatSpan(view.deadline.costs.miss) : null;
  const prints = view.evidence.filter((e) => e.source === "inspect").sort((a, b) => (b.foundAt ?? 0) - (a.foundAt ?? 0));

  // A different picture remounts the viewfinder, which reports its own zoom; the same picture keeps its framing.
  const pick = (id: string) => {
    setPickedId((current) => {
      if (current !== id) setMoment(0);
      return id;
    });
  };

  // "Open in your camera" from any card lands here.
  useEffect(() => {
    const onAim = (e: Event) => {
      pick((e as CustomEvent<string>).detail);
      root.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    window.addEventListener(CAMERA_EVENT, onAim);
    return () => window.removeEventListener(CAMERA_EVENT, onAim);
  }, []);

  // A shot that caught nothing comes back as a blank print, and the night drops above. A catch develops in its own moment.
  const lastShot = view.shots.at(-1);
  const seenShot = useRef(lastShot?.id);
  useEffect(() => {
    if (!lastShot || lastShot.id === seenShot.current) return;
    seenShot.current = lastShot.id;
    if (lastShot.hit) return;
    setMiss(lastShot.id);
    play("miss");
    buzz(BUZZ.miss);
    const timer = window.setTimeout(() => setMiss(null), 2600);
    return () => window.clearTimeout(timer);
  }, [lastShot]);

  const shoot = async () => {
    if (!picked || !finder.current || busy) return;
    const frame = finder.current.frame();
    play("shutter");
    buzz(BUZZ.tap);
    setFlash(Date.now());
    const ok = await act({ type: "shoot", scene: picked.id, frame, at: picked.body.type === "footage" ? moment : undefined });
    if (ok) play("wind");
  };

  const ready = Boolean(picked) && zoom >= MIN_SHOT_ZOOM;
  const now = !picked
    ? "No pictures yet. Photos your team pins come to your camera."
    : picked.body.type === "scene" && picked.body.dark
      ? "It's dark. Your lamp lights wherever the camera points."
      : !ready
        ? "Zoom in on anything that looks off."
        : "Hold it there, and shoot.";

  const steps: CoachStep[] = [
    {
      target: "viewfinder",
      gesture: "pinch",
      title: "Frame a detail",
      text: "Pinch or press + to zoom, and drag to look around. Get the thing you want big in the frame. Looking is free, so try it now.",
    },
    {
      target: "shoot",
      gesture: "tap",
      title: "Shoot it",
      text: price ? `If your shot catches a clue, it's yours. A shot of nothing costs ${price} of the night.` : "If your shot catches a clue, it's yours.",
    },
    {
      gesture: "shake",
      title: "Develop it",
      text: "Every catch comes out blank, like an instant photo. Shake your phone to bring it up, or rub it with a finger.",
      action: motionNeedsAsking() && !motionReady() ? { label: "Let me shake photos", run: () => void askForMotion() } : undefined,
    },
  ];

  return (
    <div ref={root} className="scroll-mt-24">
      <Station
        name="The camera"
        now={now}
        skin="tool-camera"
        onHelp={coach.show}
        actions={
          <ActionBar
            side={[
              {
                id: "prints",
                label: "Prints",
                icon: "camera",
                badge: prints.length || undefined,
                onClick: () => setDrawer(true),
                disabled: prints.length ? false : "No prints yet. Catch something first.",
              },
              {
                id: "show",
                label: "Show all",
                icon: "share",
                onClick: () => picked && act({ type: "spotlight", evidenceId: picked.id }),
                disabled: !picked ? "No picture to show yet." : view.players.length < 2 ? "There's nobody else here to show." : false,
              },
            ]}
            main={
              <MainAction
                id="shoot"
                label="Shoot"
                icon="camera"
                onClick={shoot}
                disabled={!ready || busy}
                note={!picked ? "Nothing to shoot yet" : !ready ? "Zoom in to shoot" : price ? `A miss costs ${price}` : "Shoot what looks off"}
              />
            }
          />
        }
      >
        {pictures.length > 1 && picked && <ContactSheet pictures={pictures} picked={picked.id} onPick={pick} />}
        {picked ? (
          <div className="relative">
            <Viewfinder
              key={picked.id}
              ref={finder}
              picture={picked.body}
              moment={moment}
              found={foundHotspots(view, picked.id)}
              tints={tintsOf(view.case.suspects)}
              onZoom={setZoom}
            />
            <ShutterFlash shotKey={flash} />
            {miss && (
              <p key={miss} role="status" className="camera-miss pointer-events-none absolute bottom-4 left-1/2 z-30 w-max max-w-[85%] border-[3px] border-ink bg-white px-3 py-2 text-center font-hand text-lg leading-tight text-ink shadow-pop-sm">
                Nothing worth keeping.{price && <span className="block font-sans text-xs font-extrabold text-coral-dk">−{price} of the night</span>}
              </p>
            )}
          </div>
        ) : (
          <EmptyFrame text="When someone pins a photo or camera still, it comes to your camera." />
        )}
        {picked?.body.type === "footage" && <Scrubber frames={picked.body.frames} moment={moment} onMoment={setMoment} />}
        {picked && <p className="mt-2 truncate px-1 text-xs font-bold opacity-60">{picked.body.caption}</p>}
      </Station>

      {coach.open && <Coach label="The camera" steps={steps} onClose={coach.close} />}

      {drawer && (
        <Sheet title="Your prints" onClose={() => setDrawer(false)}>
          <h2 className="mb-1 font-display text-2xl text-cream">Your prints</h2>
          <p className="mb-4 text-sm font-bold text-cream/65">Everything your camera has caught. Tap one to pin it or show it.</p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {prints.map((p) => (
              <li key={p.id}>
                <PrintTile
                  evidence={p}
                  scene={p.spot ? view.evidence.find((e) => e.id === p.spot!.scene) : undefined}
                  onOpen={() => {
                    setDrawer(false);
                    open(p.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
