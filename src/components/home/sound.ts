/**
 * The landing page's sound: rain on the window, the power cut at 9:17, the
 * lights coming back and a stamp. They're short recordings made with the case
 * films' sound kit (scripts/landing-sounds.py), about 280 KB in all, fetched
 * only once the visitor turns sound on. Off until then; the choice is
 * remembered on this device.
 */
import { playThroughSilentSwitch } from "@/lib/audio-unlock";

const STORAGE_KEY = "omc-sound";
const DIR = "/landing/sound";

/** The rain file is a seamless loop with this much of itself on each side (see the script). */
const RAIN_PAD = 0.5;
const RAIN_LOOP = 12;
/** The rain is a bed under the page, well below the effects. */
const RAIN_LEVEL = 0.4;
/** How far the page drops while the hero film plays with its narrator. */
const DUCKED = 0.08;

type Name = "rain" | "power-down" | "power-up" | "stamp";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let rain: AudioBufferSourceNode | null = null;
let enabled = false;
/** Turned right down while something louder plays, like the hero film with its sound on. */
let ducked = false;
const buffers = new Map<Name, AudioBuffer>();
const loading = new Map<Name, Promise<AudioBuffer | null>>();
const listeners = new Set<(on: boolean) => void>();

function audio() {
  if (!ctx) {
    playThroughSilentSwitch();
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return { ctx, master: master! };
}

function load(name: Name) {
  let pending = loading.get(name);
  if (!pending) {
    const { ctx } = audio();
    pending = fetch(`${DIR}/${name}.mp3`)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(res.statusText))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(name, buffer);
        return buffer;
      })
      .catch(() => {
        // Offline or blocked: stay quiet, and let a later toggle try again.
        loading.delete(name);
        return null;
      });
    loading.set(name, pending);
  }
  return pending;
}

function startRain() {
  if (rain) return;
  void load("rain").then((buffer) => {
    if (!buffer || rain || !enabled) return;
    const { ctx, master } = audio();
    rain = ctx.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;
    rain.loopStart = RAIN_PAD;
    rain.loopEnd = RAIN_PAD + RAIN_LOOP;
    const level = ctx.createGain();
    // Fade the rain in rather than starting mid-downpour.
    level.gain.setValueAtTime(0, ctx.currentTime);
    level.gain.setTargetAtTime(RAIN_LEVEL, ctx.currentTime, 0.8);
    rain.connect(level).connect(master);
    rain.start(0, RAIN_PAD);
  });
}

/**
 * Plays one effect. If its file hasn't arrived yet the moment has passed, so it
 * stays silent rather than playing late.
 */
function play(name: Name) {
  if (!enabled) return;
  const buffer = buffers.get(name);
  if (!buffer) {
    void load(name);
    return;
  }
  const { ctx, master } = audio();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(master);
  source.start();
}

export const sfx = {
  powerDown: () => play("power-down"),
  powerUp: () => play("power-up"),
  stamp: () => play("stamp"),
};

export function soundEnabled() {
  return enabled;
}

/** Whether the audio engine is playing (browsers keep it paused until a tap). */
export function soundRunning() {
  return ctx?.state === "running";
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode: just don't remember.
  }
  if (on) {
    const { ctx, master } = audio();
    void ctx.resume();
    startRain();
    void load("power-down");
    void load("power-up");
    void load("stamp");
    master.gain.setTargetAtTime(ducked ? DUCKED : 1, ctx.currentTime, 0.4);
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
  listeners.forEach((fn) => fn(on));
}

/** Quiet the rain under the hero film's narrator, without changing the visitor's choice. */
export function duckSound(on: boolean) {
  ducked = on;
  if (enabled && ctx && master) master.gain.setTargetAtTime(on ? DUCKED : 1, ctx.currentTime, 0.3);
}

/** The remembered choice. Browsers only allow audio after a tap, so it starts muted either way. */
export function rememberedSound() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
