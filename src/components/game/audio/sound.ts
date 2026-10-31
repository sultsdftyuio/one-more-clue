"use client";

import { playThroughSilentSwitch } from "@/lib/audio-unlock";
import type { ThemeId } from "@/lib/game/types";

/**
 * Every sound in the game, synthesised with the Web Audio API: no files to
 * load or license. Sound effects and music each have an on/off setting kept on
 * this device. Browsers only allow audio after a tap, so `unlock()` runs on
 * taps until the engine is running (see lib/audio-unlock.ts).
 *
 * The mix: sound effects and music feed a master bus, then a gentle compressor
 * glues them, makeup gain brings them up to a normal listening level, and a
 * limiter keeps the loudest moments from clipping on phone speakers.
 */

export type Sfx =
  | "tap"
  | "pin"
  | "found"
  | "match"
  | "miss"
  | "stamp"
  | "wrong"
  | "vote"
  | "chapter"
  | "reveal"
  | "solved"
  | "unsolved"
  | "message"
  | "type"
  | "powerdown"
  | "static"
  | "shutter"
  | "whoosh";

type Settings = { sound: boolean; music: boolean };

const KEY = "omc-audio";
const listeners = new Set<() => void>();
let settings: Settings = { sound: true, music: true };
let loaded = false;

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
/** The synthesised music is written quietly; this brings it up under the effects. */
const MUSIC_TRIM = 2.4;
let musicBus: GainNode;
let noise: AudioBuffer;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    settings = { ...settings, ...JSON.parse(window.localStorage.getItem(KEY) ?? "{}") };
  } catch {}
}

export function getAudioSettings(): Settings {
  load();
  return settings;
}

export function setAudioSettings(next: Partial<Settings>) {
  load();
  settings = { ...settings, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
  music.apply();
  listeners.forEach((l) => l());
}

export function subscribeAudio(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Creates or wakes the audio engine. Call from a tap. */
export function unlock() {
  load();
  if (typeof window === "undefined") return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    playThroughSilentSwitch();
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -22;
    glue.knee.value = 10;
    glue.ratio.value = 3;
    glue.attack.value = 0.006;
    glue.release.value = 0.25;
    const makeup = ctx.createGain();
    makeup.gain.value = 2.2;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    // The limiter can overshoot on sharp hits, so leave a little headroom after it.
    const ceiling = ctx.createGain();
    ceiling.gain.value = 0.8;
    master.connect(glue).connect(makeup).connect(limiter).connect(ceiling).connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    const musicTrim = ctx.createGain();
    musicTrim.gain.value = MUSIC_TRIM;
    musicBus.connect(musicTrim).connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }
  if (ctx.state !== "running" && !document.hidden) void ctx.resume().then(() => music.apply(), () => undefined);
  music.apply();
}

/** Whether the audio engine has started and is playing. */
export function audioRunning() {
  return ctx?.state === "running";
}

// ---------------------------------------------------------------------------
// Building blocks

type Tone = { freq: number; type?: OscillatorType; start?: number; length: number; volume?: number; glide?: number; bus?: GainNode };

function tone({ freq, type = "sine", start = 0, length, volume = 0.3, glide, bus = sfxBus }: Tone) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(bus);
  osc.start(t);
  osc.stop(t + length + 0.05);
}

type Hiss = { start?: number; length: number; volume?: number; from?: number; to?: number; type?: BiquadFilterType; bus?: GainNode };

/** Filtered noise: brushes, clicks, whooshes. */
function hiss({ start = 0, length, volume = 0.2, from = 1200, to = 4000, type = "bandpass", bus = sfxBus }: Hiss) {
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + length);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter).connect(gain).connect(bus);
  src.start(t);
  src.stop(t + length + 0.05);
}

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);

let lastType = 0;

/** Plays a sound effect, if sound is on. */
export function play(sfx: Sfx) {
  load();
  if (!settings.sound || !ctx || ctx.state !== "running") return;
  switch (sfx) {
    case "tap":
      tone({ freq: 620, glide: 900, length: 0.07, volume: 0.12 });
      break;
    case "pin":
      tone({ freq: 523, type: "triangle", length: 0.12, volume: 0.25 });
      tone({ freq: 784, type: "triangle", start: 0.06, length: 0.16, volume: 0.22 });
      break;
    case "found":
      [0, 4, 7, 12].forEach((n, i) => tone({ freq: NOTE(15 + n), type: "triangle", start: i * 0.07, length: 0.35, volume: 0.18 }));
      hiss({ start: 0.05, length: 0.4, volume: 0.05, from: 6000, to: 9000, type: "highpass" });
      break;
    case "match":
      hiss({ length: 0.35, volume: 0.12, from: 800, to: 5000 });
      tone({ freq: 988, start: 0.3, length: 0.18, volume: 0.22 });
      tone({ freq: 1319, start: 0.42, length: 0.3, volume: 0.22 });
      break;
    case "miss":
      tone({ freq: 220, glide: 140, length: 0.18, volume: 0.18 });
      break;
    case "stamp":
      hiss({ length: 0.12, volume: 0.5, from: 400, to: 200, type: "lowpass" });
      tone({ freq: 110, glide: 55, length: 0.25, volume: 0.5 });
      break;
    case "wrong":
      tone({ freq: 150, type: "square", length: 0.16, volume: 0.12 });
      tone({ freq: 140, type: "square", start: 0.2, length: 0.28, volume: 0.12 });
      break;
    case "vote":
      tone({ freq: 880, length: 0.6, volume: 0.15 });
      tone({ freq: 1320, start: 0.02, length: 0.5, volume: 0.08 });
      break;
    case "message":
      tone({ freq: 1175, length: 0.09, volume: 0.15 });
      tone({ freq: 1568, start: 0.1, length: 0.14, volume: 0.15 });
      break;
    case "type": {
      // Typewriter clicks, thinned out so long lines don't rattle.
      const now = ctx.currentTime;
      if (now - lastType < 0.045) return;
      lastType = now;
      hiss({ length: 0.025, volume: 0.06, from: 3000, to: 2500 });
      break;
    }
    case "chapter":
      [
        [-9, -5, -2],
        [-7, -3, 0],
        [-4, 0, 3],
      ].forEach((chord, i) =>
        chord.forEach((n) => tone({ freq: NOTE(n), type: "sawtooth", start: i * 0.22, length: i === 2 ? 1.1 : 0.3, volume: 0.06 })),
      );
      hiss({ start: 0.44, length: 0.6, volume: 0.06, from: 2000, to: 8000, type: "highpass" });
      break;
    case "solved":
      // A bright fanfare: Bb major climbing, a brass chord and a cymbal.
      [1, 5, 8, 13].forEach((n, i) => tone({ freq: NOTE(n), type: "triangle", start: i * 0.12, length: 0.5, volume: 0.2 }));
      [1, 5, 8, 13].forEach((n) => tone({ freq: NOTE(n - 12), type: "sawtooth", start: 0.5, length: 1.4, volume: 0.05 }));
      hiss({ start: 0.5, length: 1.6, volume: 0.12, from: 6000, to: 9000, type: "highpass" });
      tone({ freq: NOTE(-23), start: 0.5, length: 1.2, volume: 0.35 });
      break;
    case "unsolved":
      // A slow chromatic fall and a low thud.
      [0, -1, -2, -3].forEach((n, i) => tone({ freq: NOTE(n - 5), type: "sawtooth", start: i * 0.32, length: i === 3 ? 1.4 : 0.34, volume: 0.06 }));
      tone({ freq: 70, glide: 40, start: 1.0, length: 0.8, volume: 0.4 });
      break;
    case "powerdown":
      // The lights die: a hum sliding to nothing, then a thunk.
      tone({ freq: 220, glide: 30, length: 0.9, volume: 0.18, type: "sawtooth" });
      tone({ freq: 60, start: 0.85, length: 0.3, volume: 0.4 });
      break;
    case "static":
      hiss({ length: 0.9, volume: 0.22, from: 2000, to: 3500 });
      break;
    case "shutter":
      tone({ freq: 1800, length: 0.02, volume: 0.2 });
      hiss({ start: 0.02, length: 0.08, volume: 0.2, from: 3000, to: 1500 });
      break;
    case "whoosh":
      hiss({ length: 0.7, volume: 0.1, from: 300, to: 1200, type: "lowpass" });
      break;
    case "reveal":
      hiss({ length: 1.4, volume: 0.1, from: 300, to: 6000 });
      tone({ freq: 55, start: 1.35, length: 1.2, volume: 0.5 });
      [-21, -14, -9, -5].forEach((n) => tone({ freq: NOTE(n), type: "sawtooth", start: 1.35, length: 1.6, volume: 0.05 }));
      break;
  }
}

/** One moment of a tape recording, synthesised. Plays for about `seconds`. */
export function playTape(sound: import("@/lib/game/types").TapeSound) {
  load();
  if (!settings.sound || !ctx || ctx.state !== "running") return;
  switch (sound) {
    case "speech":
      // A murmur of voices: bursts of filtered noise, like words under tape hiss.
      for (let i = 0; i < 6; i++) hiss({ start: i * 0.2, length: 0.16, volume: 0.07, from: 500 + Math.random() * 400, to: 900, bus: sfxBus });
      break;
    case "music":
      [0, 4, 7, 4].forEach((n, i) => tone({ freq: NOTE(n - 5), type: "triangle", start: i * 0.25, length: 0.3, volume: 0.1 }));
      break;
    case "jingle":
      [3, 7, 10, 15].forEach((n, i) => tone({ freq: NOTE(n), type: "square", start: i * 0.11, length: 0.25, volume: 0.06 }));
      [3, 7, 10].forEach((n) => tone({ freq: NOTE(n), type: "sawtooth", start: 0.45, length: 0.7, volume: 0.04 }));
      break;
    case "static":
      hiss({ length: 1.2, volume: 0.12, from: 2000, to: 3500 });
      break;
    case "click":
      tone({ freq: 1800, length: 0.02, volume: 0.25 });
      hiss({ length: 0.04, volume: 0.15, from: 4000, to: 3000 });
      break;
    case "creak":
      tone({ freq: 110, glide: 160, type: "sawtooth", length: 0.45, volume: 0.05 });
      break;
    case "breath":
      hiss({ length: 0.7, volume: 0.06, from: 500, to: 700, type: "lowpass" });
      break;
    case "beep":
      tone({ freq: 1046, length: 0.1, volume: 0.15 });
      tone({ freq: 1046, start: 0.16, length: 0.1, volume: 0.15 });
      break;
    case "door":
      tone({ freq: 80, glide: 50, length: 0.25, volume: 0.4 });
      tone({ freq: 1400, start: 0.22, length: 0.03, volume: 0.15 });
      break;
    case "silence":
      break;
  }
}

// ---------------------------------------------------------------------------
// Music: generated tracks for each part of a case, crossfading between them.

export type Track = "lobby" | "briefing" | "investigation" | "solved" | "unsolved";

/** What a track's player gets for each beat. `at` is seconds from now. */
type BeatInfo = { at: number; beat: number; bar: number; chord: number[]; intensity: number; spb: number; per: number };
/** `beatsPerBar` defaults to 4; the waltzes use 3. */
type TrackDef = { bpm: number; level: number; beatsPerBar?: number; bars: number[][]; play: (b: BeatInfo) => void };

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Instruments, all on the music bus. Notes are semitones from A4. */
const inst = {
  pad(notes: number[], at: number, length: number, volume = 0.022, soft = false) {
    notes.forEach((n) => {
      tone({ freq: NOTE(n), type: soft ? "sine" : "sawtooth", start: at, length, volume: soft ? volume * 1.6 : volume, bus: musicBus });
      tone({ freq: NOTE(n) * 1.004, type: "triangle", start: at, length, volume: volume * 1.3, bus: musicBus });
    });
  },
  bass(n: number, at: number, length: number, volume = 0.22) {
    tone({ freq: NOTE(n - 12), type: "triangle", start: at, length, volume, bus: musicBus });
  },
  /** Vibraphone: two sines a hair apart, so it shimmers. */
  vibes(n: number, at: number, volume = 0.05) {
    tone({ freq: NOTE(n), start: at, length: 1.3, volume, bus: musicBus });
    tone({ freq: NOTE(n) * 1.006, start: at, length: 1.1, volume: volume * 0.6, bus: musicBus });
  },
  /** Glassy celesta for the mysterious intro. */
  celesta(n: number, at: number, volume = 0.035) {
    tone({ freq: NOTE(n), type: "triangle", start: at, length: 0.7, volume, bus: musicBus });
    tone({ freq: NOTE(n + 12), start: at, length: 0.35, volume: volume * 0.45, bus: musicBus });
  },
  piano(n: number, at: number, volume = 0.05) {
    tone({ freq: NOTE(n), type: "triangle", start: at, length: 0.6, volume, bus: musicBus });
  },
  drone(n: number, at: number, length: number) {
    tone({ freq: NOTE(n), start: at, length, volume: 0.07, bus: musicBus });
    tone({ freq: NOTE(n + 12), start: at, length, volume: 0.02, bus: musicBus });
  },
  brush: (at: number, volume = 0.05) => hiss({ start: at, length: 0.12, volume, from: 5000, to: 7000, type: "highpass", bus: musicBus }),
  snare: (at: number, volume = 0.04) => hiss({ start: at, length: 0.2, volume, from: 3000, to: 4000, bus: musicBus }),
  kick: (at: number, volume = 0.3) => tone({ freq: 70, glide: 40, start: at, length: 0.18, volume, bus: musicBus }),
};

/** Swung eighth: the offbeat lands two-thirds through the beat. */
const SWING = 0.66;
const offbeat = (at: number, spb: number) => at + (Math.random() < 0.5 ? 0 : spb * SWING);

/** The noir set: Case 001, the practice case, and any case without a theme. */
const NOIR: Record<Track, TrackDef> = {
  // A relaxed detective-lounge swing in F while people gather.
  lobby: {
    bpm: 112,
    level: 0.17,
    bars: [
      [-16, -12, -7, -2, 3], // F6/9
      [-19, -16, -12, -5, -4], // Dm9
      [-14, -11, -7, -4, 0], // Gm9
      [-21, -11, -5, 0, 5], // C13
    ],
    play({ at, beat, chord, spb }) {
      if (beat === 0) inst.pad(chord.slice(1), at, spb * 4, 0.016);
      const root = chord[0];
      inst.bass([root, root + 4, root + 7, root + 9][beat], at, spb * 0.85, 0.2);
      inst.brush(at + spb * SWING, 0.04);
      if (beat % 2 === 1) inst.snare(at, 0.035);
      if (Math.random() < 0.4) inst.vibes(pick([-4, -2, 0, 3, 5, 8, 10]) + 12, offbeat(at, spb), 0.045);
    },
  },
  // Slow and mysterious: a low drone, sustained chords and a glassy arpeggio. No drums.
  briefing: {
    bpm: 64,
    level: 0.2,
    bars: [
      [-19, -12, -5, -4], // Dm(add9)
      [-23, -16, -12, -7], // Bbmaj7
      [-26, -19, -11, 0], // Gm(add9)
      [-24, -17, -14, -7], // A7sus
    ],
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        inst.pad(chord.slice(1), at, spb * 4.2, 0.018, true);
        inst.drone(-31, at, spb * 4.2);
      }
      const tones = chord.slice(1).map((n) => n + 24);
      inst.celesta(tones[(beat * 2) % tones.length], at);
      inst.celesta(tones[(beat * 2 + 1) % tones.length], at + spb / 2, 0.028);
    },
  },
  // Noir jazz in D minor that grows with each chapter: brushes from chapter 2, piano in the last.
  investigation: {
    bpm: 84,
    level: 0.22,
    bars: [
      [-19, -12, -7, -4, 3], // Dm9
      [-23, -14, -11, -7, -2], // Bbmaj7
      [-14, -11, -7, -4, 1], // Gm7
      [-12, -8, -5, -2, 1], // A7
    ],
    play({ at, beat, chord, intensity, spb }) {
      if (beat === 0) inst.pad(chord.slice(1), at, spb * 4);
      const root = chord[0];
      inst.bass([root, root + 7, root + 3, root + 5][beat], at, spb * 0.9);
      if (intensity >= 2) {
        inst.brush(at + spb * SWING);
        if (beat % 2 === 1) inst.snare(at);
      }
      if (intensity >= 3 && Math.random() < 0.45) inst.piano(pick([-7, -5, -4, -2, 0, 1, 3, 5, 7, 8]) + 12, offbeat(at, spb));
    },
  },
  // Case closed: a warm, bright swing in Bb.
  solved: {
    bpm: 104,
    level: 0.18,
    bars: [
      [-23, -7, -4, 0], // Bbmaj7
      [-26, -11, -7, 0], // Gm9
      [-21, -6, -2, 1], // Cm9
      [-28, -6, 0, 5], // F13
    ],
    play({ at, beat, chord, spb }) {
      if (beat === 0) inst.pad(chord.slice(1), at, spb * 4, 0.016);
      const root = chord[0];
      inst.bass([root, root + 4, root + 7, root + 10][beat], at, spb * 0.85, 0.2);
      inst.brush(at + spb * SWING, 0.045);
      if (beat % 2 === 1) inst.snare(at, 0.04);
      if (Math.random() < 0.55) inst.vibes(pick([1, 3, 5, 8, 10, 13]) + 12, offbeat(at, spb), 0.05);
    },
  },
  // The culprit got away, or you gave up: slow and melancholy.
  unsolved: {
    bpm: 58,
    level: 0.2,
    bars: [
      [-19, -12, -7, -4], // Dm
      [-23, -12, -7, -4], // Bbmaj7
      [-26, -11, -7, -5], // Gm6
      [-24, -14, -8, 1], // A7b9
    ],
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        inst.pad(chord.slice(1), at, spb * 4, 0.016, true);
        inst.bass(chord[0], at, spb * 3.5, 0.18);
      }
      if (Math.random() < 0.3) inst.piano(pick([-7, -5, -4, -2, 0, 1, 4]), at, 0.045);
    },
  },
};

// ----- Radio (Case 002): late-night synth funk in A minor -------------------

const synth = (n: number, at: number, length: number, volume = 0.05, type: OscillatorType = "square") =>
  tone({ freq: NOTE(n), type, start: at, length, volume, bus: musicBus });
const gated = (at: number, volume = 0.07) => hiss({ start: at, length: 0.16, volume, from: 1800, to: 1200, bus: musicBus });
const hat = (at: number, volume = 0.02) => hiss({ start: at, length: 0.035, volume, from: 8000, to: 9000, type: "highpass", bus: musicBus });
const radioStatic = (at: number, length: number, volume = 0.02) => hiss({ start: at, length, volume, from: 2500, to: 3200, type: "lowpass", bus: musicBus });

const RADIO_MINOR = [
  [-24, -12, -9, -5, -2], // Am7
  [-28, -16, -12, -9, -5], // Fmaj7
  [-31, -19, -16, -12, -9], // Dm7
  [-29, -17, -13, -10, -7], // E7
];
const RADIO_MAJOR = [
  [-21, -9, -5, -2], // C
  [-24, -12, -9, -5], // Am
  [-28, -16, -12, -9], // F
  [-26, -14, -10, -7], // G
];

/** Octave-jumping synth bass, drum machine, and an arpeggio once things heat up. */
function radioGroove({ at, beat, chord, intensity, spb }: BeatInfo) {
  if (beat === 0) inst.pad(chord.slice(1), at, spb * 4, 0.012, true);
  const root = chord[0];
  synth(root, at, spb * 0.4, 0.06, "sawtooth");
  synth(root + 12, at + spb / 2, spb * 0.3, 0.05, "sawtooth");
  if (beat % 2 === 0) inst.kick(at, 0.26);
  else gated(at);
  if (intensity >= 2) {
    hat(at + spb / 2);
    if (intensity >= 3) [0.25, 0.75].forEach((f) => hat(at + spb * f, 0.012));
  }
  if (intensity >= 3) {
    const tones = chord.slice(1).map((n) => n + 24);
    for (let k = 0; k < 4; k++) synth(tones[(beat * 4 + k) % tones.length], at + (k * spb) / 4, spb / 5, 0.014);
  }
}

const RADIO: Record<Track, TrackDef> = {
  lobby: { bpm: 100, level: 0.14, bars: RADIO_MINOR, play: (b) => radioGroove({ ...b, intensity: 1 }) },
  // On-air silence: a soft pad, a slow arpeggio and a bed of static.
  briefing: {
    bpm: 76,
    level: 0.18,
    bars: RADIO_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        inst.pad(chord.slice(1), at, spb * 4, 0.014, true);
        radioStatic(at, spb * 1.5);
      }
      synth(chord.slice(1)[beat % (chord.length - 1)] + 12, at, spb * 0.8, 0.018);
    },
  },
  investigation: { bpm: 104, level: 0.17, bars: RADIO_MINOR, play: radioGroove },
  solved: { bpm: 112, level: 0.17, bars: RADIO_MAJOR, play: (b) => radioGroove({ ...b, intensity: 3 }) },
  unsolved: {
    bpm: 66,
    level: 0.18,
    bars: RADIO_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        inst.pad(chord.slice(1), at, spb * 4, 0.014, true);
        radioStatic(at, spb * 3, 0.03);
      }
      if (Math.random() < 0.3) synth(pick(chord.slice(1)) + 12, at, spb, 0.016);
    },
  },
};

// ----- Bistro (Case 003): a French café waltz in E minor ---------------------

/** Accordion: a square and a sawtooth tuned a hair apart, the musette wobble. */
function accordion(notes: number[], at: number, length: number, volume = 0.018) {
  notes.forEach((n) => {
    tone({ freq: NOTE(n), type: "square", start: at, length, volume, bus: musicBus });
    tone({ freq: NOTE(n) * 1.008, type: "sawtooth", start: at, length, volume: volume * 0.55, bus: musicBus });
  });
}

const BISTRO_MINOR = [
  [-29, -17, -14, -10], // Em
  [-24, -12, -9, -5], // Am
  [-22, -10, -6, -3], // B7
  [-29, -17, -14, -10], // Em
];
const BISTRO_MAJOR = [
  [-26, -14, -10, -7], // G
  [-21, -9, -5, -2], // C
  [-31, -19, -15, -12], // D7
  [-26, -14, -10, -7], // G
];
const E_HARMONIC_MINOR = [-5, -3, -2, 0, 2, 3, 6, 7]; // E F# G A B C D# E

/** Oom-pah-pah: bass on one, accordion chords on two and three, a tune from chapter 2. */
function waltz({ at, beat, chord, intensity, spb }: BeatInfo) {
  if (beat === 0) inst.bass(chord[0], at, spb * 0.9, 0.2);
  else accordion(chord.slice(1).map((n) => n + 12), at, spb * 0.55, 0.012);
  if (intensity >= 2 && Math.random() < 0.65) accordion([pick(E_HARMONIC_MINOR) + 12], at, spb * 0.9, 0.016);
  if (intensity >= 3 && beat !== 0) inst.piano(pick(chord.slice(1)) + 24, at + spb / 2, 0.03);
}

const BISTRO: Record<Track, TrackDef> = {
  lobby: { bpm: 140, level: 0.14, beatsPerBar: 3, bars: BISTRO_MAJOR, play: (b) => waltz({ ...b, intensity: 2 }) },
  // Candlelight: held accordion chords and a slow, lonely tune.
  briefing: {
    bpm: 84,
    level: 0.17,
    beatsPerBar: 3,
    bars: BISTRO_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) accordion(chord.slice(1), at, spb * 3, 0.01);
      if (beat !== 1 && Math.random() < 0.7) accordion([pick(E_HARMONIC_MINOR) + 12], at, spb * 1.1, 0.014);
    },
  },
  investigation: { bpm: 156, level: 0.15, beatsPerBar: 3, bars: BISTRO_MINOR, play: waltz },
  solved: { bpm: 168, level: 0.15, beatsPerBar: 3, bars: BISTRO_MAJOR, play: (b) => waltz({ ...b, intensity: 3 }) },
  unsolved: {
    bpm: 72,
    level: 0.17,
    beatsPerBar: 3,
    bars: BISTRO_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        accordion(chord.slice(1), at, spb * 3, 0.009);
        inst.bass(chord[0], at, spb * 2.8, 0.15);
      }
      if (Math.random() < 0.25) accordion([pick(E_HARMONIC_MINOR)], at, spb * 1.5, 0.012);
    },
  },
};

// ----- Frost (Case 004): a music-box waltz in B minor, wind and sleigh bells --

/** A music box: a pure tone with a faint metallic octave on top. */
function musicBox(n: number, at: number, volume = 0.04) {
  tone({ freq: NOTE(n), start: at, length: 1.1, volume, bus: musicBus });
  tone({ freq: NOTE(n) * 2.01, start: at, length: 0.35, volume: volume * 0.3, bus: musicBus });
}
const wind = (at: number, length: number, volume = 0.03) => hiss({ start: at, length, volume, from: 350, to: 750, type: "lowpass", bus: musicBus });
const bells = (at: number) => [0, 0.05].forEach((d) => hiss({ start: at + d, length: 0.07, volume: 0.022, from: 7000, to: 9500, type: "highpass", bus: musicBus }));

const FROST_MINOR = [
  [-22, -10, -7, -3], // Bm
  [-26, -14, -10, -7], // G
  [-31, -19, -15, -12], // D
  [-24, -12, -8, -5], // A
];
const FROST_MAJOR = [
  [-31, -19, -15, -12], // D
  [-24, -12, -8, -5], // A
  [-22, -10, -7, -3], // Bm
  [-26, -14, -10, -7], // G
];

/** The music box turns, the wind gusts; bells from chapter 2, low strings in the last. */
function musicBoxWaltz({ at, beat, chord, intensity, spb }: BeatInfo) {
  const tones = chord.slice(1).map((n) => n + 24);
  if (beat === 0) {
    inst.pad(chord.slice(1), at, spb * 3, 0.01, true);
    wind(at, spb * 3);
    if (intensity >= 2) inst.bass(chord[0], at, spb * 0.9, 0.14);
    if (intensity >= 3) chord.slice(1).forEach((n) => tone({ freq: NOTE(n), type: "sawtooth", start: at, length: spb * 3, volume: 0.008, bus: musicBus }));
  }
  musicBox(tones[(beat * 2) % tones.length], at);
  musicBox(tones[(beat * 2 + 1) % tones.length], at + spb / 2, 0.03);
  if (intensity >= 2 && beat !== 0) bells(at);
}

const FROST: Record<Track, TrackDef> = {
  lobby: { bpm: 100, level: 0.16, beatsPerBar: 3, bars: FROST_MAJOR, play: (b) => musicBoxWaltz({ ...b, intensity: 2 }) },
  // The storm outside: wind, and a music box winding down.
  briefing: {
    bpm: 66,
    level: 0.2,
    beatsPerBar: 3,
    bars: FROST_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        wind(at, spb * 3, 0.05);
        inst.pad(chord.slice(1), at, spb * 3, 0.01, true);
      }
      musicBox(chord.slice(1)[beat % (chord.length - 1)] + 24, at, 0.035);
    },
  },
  investigation: { bpm: 96, level: 0.18, beatsPerBar: 3, bars: FROST_MINOR, play: musicBoxWaltz },
  solved: { bpm: 108, level: 0.17, beatsPerBar: 3, bars: FROST_MAJOR, play: (b) => musicBoxWaltz({ ...b, intensity: 2 }) },
  unsolved: {
    bpm: 58,
    level: 0.2,
    beatsPerBar: 3,
    bars: FROST_MINOR,
    play({ at, beat, chord, spb }) {
      if (beat === 0) {
        wind(at, spb * 3, 0.06);
        inst.pad(chord.slice(1), at, spb * 3, 0.01, true);
      }
      if (Math.random() < 0.35) musicBox(pick(chord.slice(1)) + 12, at, 0.03);
    },
  },
};

const TRACKS: Record<ThemeId, Record<Track, TrackDef>> = { noir: NOIR, radio: RADIO, bistro: BISTRO, frost: FROST };

/**
 * Under a vote: a heartbeat and trembling strings, 1 for a checkpoint answer
 * and 2 for the final report. The bistro's is a kitchen timer ticking instead.
 */
function tensionLayer({ at, beat, chord, spb, per }: BeatInfo, level: number, set: ThemeId) {
  if (set === "bistro") {
    tone({ freq: 2200, start: at, length: 0.02, volume: 0.05 * level, bus: musicBus });
    if (level >= 2) tone({ freq: 2200, start: at + spb / 2, length: 0.02, volume: 0.04, bus: musicBus });
    if (beat === 0) inst.kick(at, 0.18 * level);
    return;
  }
  if (beat === 0 || (level >= 2 && beat === Math.floor(per / 2))) {
    inst.kick(at, 0.22 * level);
    inst.kick(at + 0.22, 0.16 * level);
  }
  const top = chord[chord.length - 1] + 12;
  for (let k = 0; k < 4; k++) {
    tone({ freq: NOTE(top), type: "sawtooth", start: at + (k * spb) / 4, length: (spb / 4) * 0.85, volume: 0.009 * level, bus: musicBus });
  }
}

const music = (() => {
  /** "set:track", so the same track in another case's set counts as a different piece. */
  let desired: string | null = null;
  let current: string | null = null;
  let intensity = 1;
  let tension = 0;
  let ducked = false;
  let timer = 0;
  let switching = 0;
  let nextBeat = 0;
  let beat = 0;

  const parse = (key: string) => key.split(":") as [ThemeId, Track];
  const defOf = (key: string) => {
    const [set, track] = parse(key);
    return TRACKS[set][track];
  };
  const level = () => (current ? defOf(current).level * (ducked ? 0.35 : 1) : 0);

  function fade(to: number, seconds: number) {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(to, t + seconds);
  }

  function tick() {
    if (!ctx || !current) return;
    const [set, name] = parse(current);
    const track = TRACKS[set][name];
    const per = track.beatsPerBar ?? 4;
    // The investigation quickens a little each chapter.
    const spb = (60 / track.bpm) * (name === "investigation" ? 1 - (intensity - 1) * 0.04 : 1);
    while (nextBeat < ctx.currentTime + 0.25) {
      const bar = Math.floor(beat / per) % track.bars.length;
      const info = { at: nextBeat - ctx.currentTime, beat: beat % per, bar, chord: track.bars[bar], intensity, spb, per };
      track.play(info);
      if (tension && name === "investigation") tensionLayer(info, tension, set);
      nextBeat += spb;
      beat++;
    }
  }

  function begin(key: string) {
    current = key;
    beat = 0;
    nextBeat = ctx!.currentTime + 0.05;
    if (!timer) timer = window.setInterval(tick, 50);
    fade(level(), 1.2);
  }

  function halt() {
    current = null;
    window.clearInterval(timer);
    timer = 0;
  }

  /** Brings what's playing in line with what the screen wants and the settings allow. */
  function apply() {
    load();
    if (!ctx) return;
    window.clearTimeout(switching);
    const target = settings.music ? desired : null;
    if (target === current) {
      if (current) fade(level(), 0.8);
      return;
    }
    if (!current) {
      if (target) begin(target);
      return;
    }
    fade(0, 0.9);
    switching = window.setTimeout(() => {
      halt();
      if (target) begin(target);
    }, 950);
  }

  return {
    set(track: Track | null, level_: number, set: ThemeId) {
      desired = track ? `${set}:${track}` : null;
      intensity = Math.max(1, Math.min(3, level_));
      apply();
    },
    tension(level_: number) {
      tension = level_;
    },
    duck(on: boolean) {
      ducked = on;
      if (current) fade(level(), 0.6);
    },
    apply,
  };
})();

export const Music = {
  /** The track this screen wants (null for silence) from a case's music set; `intensity` 1 to 3 grows the investigation. */
  want: (track: Track | null, intensity = 1, set: ThemeId = "noir") => music.set(track, intensity, set),
  /** Tension under the music while a vote is open: 0 off, 1 checkpoint, 2 final report. */
  tension: (level: number) => music.tension(level),
  /** Quieter while people talk in voice chat. */
  duck: (on: boolean) => music.duck(on),
};
