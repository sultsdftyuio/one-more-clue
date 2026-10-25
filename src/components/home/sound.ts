/**
 * The landing page's sound, all synthesised (no audio files): soft rain, a
 * power-down at 9:17, the lights coming back, and a stamp thud. Off until the
 * visitor turns it on; the choice is remembered on this device.
 */
const STORAGE_KEY = "omc-sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let rain: AudioBufferSourceNode | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return { ctx, master: master! };
}

function startRain() {
  const { ctx, master } = audio();
  if (rain) return;
  // Two seconds of noise, loop it, and shape it into rain.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 3 + white * 0.15;
  }
  rain = ctx.createBufferSource();
  rain.buffer = buffer;
  rain.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "lowpass";
  band.frequency.value = 1800;
  const level = ctx.createGain();
  level.gain.value = 0.35;
  rain.connect(band).connect(level).connect(master);
  rain.start();
}

function tone(from: number, to: number, seconds: number, type: OscillatorType = "sine", volume = 0.25) {
  if (!enabled) return;
  const { ctx, master } = audio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + seconds);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  osc.connect(gain).connect(master);
  osc.start();
  osc.stop(ctx.currentTime + seconds + 0.05);
}

export const sfx = {
  powerDown: () => tone(320, 40, 1.1, "sawtooth", 0.12),
  powerUp: () => tone(60, 520, 0.9, "triangle", 0.14),
  stamp: () => tone(140, 45, 0.25, "square", 0.22),
  buzz: () => tone(180, 170, 0.35, "square", 0.05),
};

export function soundEnabled() {
  return enabled;
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
    master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
  } else if (ctx && master) {
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }
  listeners.forEach((fn) => fn(on));
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
