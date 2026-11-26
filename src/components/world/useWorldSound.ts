"use client";

import { useEffect } from "react";
import { Ambience, audioRunning, Music, play, unlock } from "@/components/game/audio/sound";
import { carriesSound } from "@/components/game/context";
import { themeOf } from "@/components/game/themes";
import type { PlayerView } from "@/lib/game/engine";
import { onTapsUntil } from "@/lib/audio-unlock";
import { isZoomedOut, roomInView } from "@/lib/world/camera";
import type { WorldPlate } from "@/lib/world/plates";
import type { WorldStore } from "@/lib/world/store";

/** How far apart footsteps fall while your detective walks. */
const STEP_MS = 320;

/** The room tone for each kind of room: rain on the building (muffled indoors) and the hum of what's running there. */
function toneOf(plate: WorldPlate, room: string | null, zoomedOut: boolean, rainy: boolean) {
  const rain = rainy ? 1 : 0;
  if (zoomedOut || !room) return { rain: 0.55 * rain, muffle: 0.45, hum: 0.2 };
  const kind = plate.rooms.find((r) => r.id === room);
  if (!kind) return { rain: 0.4 * rain, muffle: 0.6, hum: 0.2 };
  if (room === "outside") return { rain: 1 * rain, muffle: 0, hum: 0 };
  // Lab 4 has its servers and LEDs; the dark maker space its printers ticking over.
  const hum = room === "lab4" ? 0.8 : room === "maker" ? 0.6 : 0.3;
  return { rain: 0.35 * rain, muffle: 0.85, hum };
}

/**
 * The world's sound (W7.1): wakes the audio engine on the first tap, plays the case's music as the classic screens
 * do (on the phone that carries the room's sound), lays the room tone of wherever the camera is under it, and gives
 * your own detective footsteps and teammates' pings a chime.
 */
export function useWorldSound(store: WorldStore, plate: WorldPlate | null, view: PlayerView | null) {
  useEffect(() => {
    const stop = onTapsUntil(() => {
      unlock();
      return audioRunning();
    });
    return () => {
      stop();
      Music.want(null);
      Ambience.set(null);
    };
  }, []);

  const loud = view ? carriesSound(view) : false;
  const phase = view?.phase;
  const chapter = view?.chapter.number ?? 0;
  const chapters = view?.case.chapterTitles.length ?? 1;
  const theme = themeOf(view?.case.theme).id;
  const voting = view?.proposal?.kind === "final" ? 2 : view?.proposal?.kind === "answer" ? 1 : 0;
  const solved = view?.outcome?.kind === "solved";

  useEffect(() => {
    if (!loud) Music.want(null);
    else if (phase === "lobby") Music.want("lobby", 1, theme);
    else if (phase === "investigation") Music.want("investigation", chapter === chapters ? 3 : Math.min(2, chapter), theme);
    else if (phase === "reveal") Music.want(solved ? "solved" : "unsolved", 1, theme);
    else Music.want(null);
  }, [loud, phase, chapter, chapters, theme, solved]);

  useEffect(() => {
    Music.tension(voting);
  }, [voting]);

  // Room tone follows the camera.
  useEffect(() => {
    if (!plate || !loud) {
      Ambience.set(null);
      return;
    }
    const rainy = plate.ambience.rain.length > 0;
    let last = "";
    const apply = () => {
      const s = store.getState();
      if (s.viewport.w === 0) return;
      const out = isZoomedOut(s.camera, s.range);
      const room = out ? null : roomInView(plate, s.camera);
      const key = `${out}:${room}`;
      if (key === last) return;
      last = key;
      Ambience.set(toneOf(plate, room, out, rainy));
    };
    apply();
    return store.subscribe((s, prev) => {
      if (s.camera !== prev.camera || s.viewport !== prev.viewport) apply();
    });
  }, [store, plate, loud]);

  // Footsteps for your own detective, and a chime for a teammate's ping.
  useEffect(() => {
    let lastStep = 0;
    let lastPing = 0;
    return store.subscribe((s, prev) => {
      const me = s.me;
      if (me && s.positions !== prev.positions && s.positions[me] && prev.positions[me]) {
        const a = s.positions[me];
        const b = prev.positions[me];
        const now = performance.now();
        if ((a.x !== b.x || a.z !== b.z) && now - lastStep > STEP_MS) {
          lastStep = now;
          play("step");
        }
      }
      if (s.pings !== prev.pings) {
        const newest = s.pings.at(-1);
        if (newest && newest.at > lastPing && newest.by !== s.view?.me.id) {
          lastPing = newest.at;
          play("ping");
        }
      }
    });
  }, [store]);
}
