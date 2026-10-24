"use client";

/**
 * Every sound in the game, synthesised with the Web Audio API: no files to
 * load or license. Sound effects and music each have an on/off setting kept on
 * this device. Browsers only allow audio after a tap, so `unlock()` runs on the
 * first one.
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
  | "type";

type Settings = { sound: boolean; music: boolean };

const KEY = "omc-audio";
const listeners = new Set<() => void>();
let settings: Settings = { sound: true, music: true };
let loaded = false;

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
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
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }
  if (ctx.state === "suspended" && !document.hidden) ctx.resume();
  music.apply();
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
    case "reveal":
      hiss({ length: 1.4, volume: 0.1, from: 300, to: 6000 });
      tone({ freq: 55, start: 1.35, length: 1.2, volume: 0.5 });
      [-21, -14, -9, -5].forEach((n) => tone({ freq: NOTE(n), type: "sawtooth", start: 1.35, length: 1.6, volume: 0.05 }));
      break;
  }
}

// ---------------------------------------------------------------------------
// Music: generated tracks for each part of a case, crossfading between them.

export type Track = "lobby" | "briefing" | "investigation" | "solved" | "unsolved";

/** What a track's player gets for each beat. `at` is seconds from now. */
type BeatInfo = { at: number; beat: number; bar: number; chord: number[]; intensity: number; spb: number };
type TrackDef = { bpm: number; level: number; bars: number[][]; play: (b: BeatInfo) => void };

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

const TRACKS: Record<Track, TrackDef> = {
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

/** Under a vote: a heartbeat and trembling strings. 1 for a checkpoint answer, 2 for the final report. */
function tensionLayer({ at, beat, chord, spb }: BeatInfo, level: number) {
  if (beat === 0 || (level >= 2 && beat === 2)) {
    inst.kick(at, 0.22 * level);
    inst.kick(at + 0.22, 0.16 * level);
  }
  const top = chord[chord.length - 1] + 12;
  for (let k = 0; k < 4; k++) {
    tone({ freq: NOTE(top), type: "sawtooth", start: at + (k * spb) / 4, length: (spb / 4) * 0.85, volume: 0.009 * level, bus: musicBus });
  }
}

const music = (() => {
  let desired: Track | null = null;
  let current: Track | null = null;
  let intensity = 1;
  let tension = 0;
  let ducked = false;
  let timer = 0;
  let switching = 0;
  let nextBeat = 0;
  let beat = 0;

  const level = () => (current ? TRACKS[current].level * (ducked ? 0.35 : 1) : 0);

  function fade(to: number, seconds: number) {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(to, t + seconds);
  }

  function tick() {
    if (!ctx || !current) return;
    const track = TRACKS[current];
    // The investigation quickens a little each chapter.
    const spb = (60 / track.bpm) * (current === "investigation" ? 1 - (intensity - 1) * 0.04 : 1);
    while (nextBeat < ctx.currentTime + 0.25) {
      const bar = Math.floor(beat / 4) % track.bars.length;
      const info = { at: nextBeat - ctx.currentTime, beat: beat % 4, bar, chord: track.bars[bar], intensity, spb };
      track.play(info);
      if (tension && current === "investigation") tensionLayer(info, tension);
      nextBeat += spb;
      beat++;
    }
  }

  function begin(track: Track) {
    current = track;
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
    set(track: Track | null, level_ = intensity) {
      desired = track;
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
  /** The track this screen wants (null for silence); `intensity` 1 to 3 grows the investigation. */
  want: (track: Track | null, intensity = 1) => music.set(track, intensity),
  /** A heartbeat under the music while a vote is open: 0 off, 1 checkpoint, 2 final report. */
  tension: (level: number) => music.tension(level),
  /** Quieter while people talk in voice chat. */
  duck: (on: boolean) => music.duck(on),
};
