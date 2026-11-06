/**
 * The landing page's sound: the power cut at 9:17, the lights coming back and a
 * stamp. No background bed, only these moments. They're short recordings made
 * with the case films' sound kit (scripts/landing-sounds.py), about 125 KB in
 * all, fetched only once the visitor turns sound on. Off until then; the choice
 * is remembered on this device.
 */
import { playThroughSilentSwitch } from "@/lib/audio-unlock";

const STORAGE_KEY = "omc-sound";
const DIR = "/landing/sound";

/** How far the page drops while the hero film plays with its narrator. */
const DUCKED = 0.08;

type Name = "power-down" | "power-up" | "stamp";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
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

/**
 * Tiny made-on-the-spot sounds for the role tools: nothing to download, and
 * silent until the visitor turns sound on.
 */
function tone(notes: { f: number; at: number; len: number; type?: OscillatorType; vol?: number; to?: number }[]) {
  if (!enabled || ducked) return;
  const { ctx, master } = audio();
  const now = ctx.currentTime;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, now + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, now + n.at + n.len);
    gain.gain.setValueAtTime(0.0001, now + n.at);
    gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.25, now + n.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.at + n.len);
    osc.connect(gain).connect(master);
    osc.start(now + n.at);
    osc.stop(now + n.at + n.len + 0.05);
  }
}

/** A short burst of noise, for the shutter. */
function noise(len: number, vol: number) {
  if (!enabled || ducked) return;
  const { ctx, master } = audio();
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = vol;
  source.buffer = buffer;
  source.connect(gain).connect(master);
  source.start();
}

export const sfx = {
  powerDown: () => play("power-down"),
  powerUp: () => play("power-up"),
  stamp: () => play("stamp"),
  shutter: () => {
    noise(0.05, 0.5);
    setTimeout(() => noise(0.04, 0.35), 70);
  },
  /** One syllable of a suspect's voice. */
  blip: () => tone([{ f: 180 + Math.random() * 60, at: 0, len: 0.06, type: "triangle", vol: 0.12 }]),
  key: () => tone([{ f: 900 + Math.random() * 200, at: 0, len: 0.025, type: "square", vol: 0.04 }]),
  granted: () => tone([0, 0.09, 0.18].map((at, i) => ({ f: [523, 659, 784][i], at, len: 0.18, type: "square" as const, vol: 0.08 }))),
  denied: () => tone([{ f: 150, at: 0, len: 0.25, type: "sawtooth", vol: 0.1 }, { f: 110, at: 0.12, len: 0.3, type: "sawtooth", vol: 0.1 }]),
  /** A string pulled, then let go. */
  string: () => tone([{ f: 220, at: 0, len: 0.5, type: "triangle", vol: 0.15, to: 165 }]),
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
    void load("power-down");
    void load("power-up");
    void load("stamp");
    master.gain.setTargetAtTime(ducked ? DUCKED : 1, ctx.currentTime, 0.4);
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
  listeners.forEach((fn) => fn(on));
}

/** Quiet the page's effects under the hero film's narrator, without changing the visitor's choice. */
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
