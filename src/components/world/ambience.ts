/**
 * The building's small motions (W2.5): rain outside and down the windows, a strip light that stutters, steam off a
 * drink, blinking LEDs, second hands going round, and clouds that drift slower than the building as the camera pans
 * (parallax). Drawn with Phaser shapes over the plate, each frame, from the plate's `ambience` data. With reduced
 * motion asked for, it draws one still frame: lights on, hands where they are, no rain moving.
 *
 * Only ever loaded with the scene (client only, like scene.ts).
 */
import * as Phaser from "phaser";
import { toPlate } from "@/lib/world/geometry";
import type { WorldPlate } from "@/lib/world/plates";

/** Rain: drops per square metre of open air, how fast they fall (cm/s) and how far the wind leans them. */
const RAIN_DENSITY = 0.42;
const RAIN_SPEED = 820;
const RAIN_LEAN = 0.18;
const RAIN_LENGTH = 16;

type Drop = { x: number; z: number; area: number };
type Run = { window: number; x: number; z: number; speed: number; length: number };
type Puff = { x: number; z: number; age: number; life: number; drift: number };
type Cloud = { x: number; z: number; w: number; speed: number };

/** A tiny repeatable random, so the same building always gets the same rain and clouds. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class Ambience {
  private readonly plate: WorldPlate;
  private readonly still: boolean;
  private readonly rnd = random(1717);
  private readonly back: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly sky: Phaser.GameObjects.Graphics;
  private drops: Drop[] = [];
  private runs: Run[] = [];
  private puffs: Puff[] = [];
  private clouds: Cloud[] = [];
  private flickerUntil = 0;
  private nextFlicker = 4000;
  private drawnStill = false;

  constructor(scene: Phaser.Scene, plate: WorldPlate, reducedMotion: boolean) {
    this.plate = plate;
    this.still = reducedMotion;
    const a = plate.ambience;
    // Clouds sit in their own layer that scrolls at 70% of the camera, which is the parallax.
    this.sky = scene.add.graphics().setScrollFactor(0.7);
    this.back = scene.add.graphics();
    this.glow = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);

    for (const [i, area] of a.rain.entries()) {
      const n = Math.round(((area.x1 - area.x0) * (area.z1 - area.z0) * RAIN_DENSITY) / 10000);
      for (let k = 0; k < n; k++) this.drops.push({ area: i, x: area.x0 + this.rnd() * (area.x1 - area.x0), z: area.z0 + this.rnd() * (area.z1 - area.z0) });
    }
    for (const [i, w] of a.windows.entries()) for (let k = 0; k < 5; k++) this.runs.push(this.newRun(i, w.z0 + this.rnd() * (w.z1 - w.z0)));
    if (a.clouds) {
      for (let k = 0; k < 7; k++) {
        this.clouds.push({
          x: plate.extent.x0 + this.rnd() * (plate.extent.x1 - plate.extent.x0),
          z: a.clouds.z0 + this.rnd() * (a.clouds.z1 - a.clouds.z0),
          w: 140 + this.rnd() * 220,
          speed: 4 + this.rnd() * 6,
        });
      }
    }
  }

  private newRun(window: number, z: number): Run {
    const w = this.plate.ambience.windows[window];
    return { window, x: w.x0 + 4 + this.rnd() * (w.x1 - w.x0 - 8), z, speed: 8 + this.rnd() * 26, length: 3 + this.rnd() * 7 };
  }

  update(time: number, dt: number) {
    if (this.still && this.drawnStill) {
      // Hold still, but the second hands still tick: they move once a second, not smoothly.
      this.drawClocks(time);
      return;
    }
    const s = Math.min(dt, 100) / 1000;
    const { plate } = this;
    const a = plate.ambience;
    const px = plate.pxPerCm;
    this.back.clear();
    this.glow.clear();

    // Rain outside: thin slanted streaks that wrap round their area.
    this.back.lineStyle(1.2 * px * 0.5, 0xbfd3ff, 0.32);
    for (const d of this.drops) {
      const area = a.rain[d.area];
      if (!this.still) {
        d.z -= RAIN_SPEED * s;
        d.x -= RAIN_SPEED * RAIN_LEAN * s;
        if (d.z < area.z0) d.z += area.z1 - area.z0;
        if (d.x < area.x0) d.x += area.x1 - area.x0;
      }
      const top = toPlate(plate, d.x, d.z);
      const end = toPlate(plate, d.x + RAIN_LENGTH * RAIN_LEAN, d.z + RAIN_LENGTH);
      this.back.lineBetween(top.x, top.y, end.x, end.y);
    }

    // Drops running down the window glass, slowly, then starting again at the top.
    this.back.lineStyle(1.4 * px * 0.5, 0xd9e6ff, 0.28);
    for (const [i, r] of this.runs.entries()) {
      const w = a.windows[r.window];
      if (!this.still) r.z -= r.speed * s;
      if (r.z < w.z0) this.runs[i] = this.newRun(r.window, w.z1);
      const p = toPlate(plate, r.x, r.z);
      this.back.lineBetween(p.x, p.y, p.x, p.y - r.length * px);
      this.back.fillStyle(0xe8f0ff, 0.4).fillCircle(p.x, p.y, 1.4 * px);
    }

    // Steam off the flask: soft puffs that rise, spread and fade.
    if (!this.still && this.rnd() < s * 2.2) for (const st of a.steam) this.puffs.push({ x: st.x, z: st.z, age: 0, life: 2.2 + this.rnd(), drift: (this.rnd() - 0.5) * 8 });
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    for (const p of this.puffs) {
      p.age += s;
      const k = p.age / p.life;
      const at = toPlate(plate, p.x + p.drift * k + Math.sin(p.age * 3) * 2, p.z + 46 * k);
      this.back.fillStyle(0xf4f1ea, 0.18 * (1 - k) * Math.min(1, k * 6)).fillCircle(at.x, at.y, (3 + 9 * k) * px);
    }

    // The strip light that stutters: on, then a few quick dips every so often, dimming its room.
    const f = a.flicker;
    if (f) {
      if (!this.still && time > this.nextFlicker) {
        this.flickerUntil = time + 450 + this.rnd() * 500;
        this.nextFlicker = time + 5000 + this.rnd() * 7000;
      }
      const dipping = time < this.flickerUntil && Math.sin(time / 23) * Math.sin(time / 61) > 0.1;
      const c = toPlate(plate, f.x, f.z);
      if (!dipping) {
        this.glow.fillStyle(0xfff3da, 0.16).fillEllipse(c.x, c.y + 8 * px, f.w * px * 1.3, 34 * px);
        this.glow.fillStyle(0xfffbf0, 0.22).fillEllipse(c.x, c.y, f.w * px, 10 * px);
      } else {
        const room = plate.rooms.find((r) => r.id === f.room);
        if (room) {
          const top = toPlate(plate, room.x0, room.z1);
          this.back.fillStyle(0x05060f, 0.18).fillRect(top.x, top.y, (room.x1 - room.x0) * px, (room.z1 - room.z0) * px);
        }
      }
    }

    // LEDs: a soft blink each, out of step.
    for (const [i, led] of a.leds.entries()) {
      const phase = ((time / 1000 + i * 0.37) % led.every) / led.every;
      const on = this.still ? 1 : phase < 0.55 ? 1 : 0.25;
      const p = toPlate(plate, led.x, led.z);
      this.glow.fillStyle(led.colour, 0.35 * on).fillCircle(p.x, p.y, 5 * px);
      this.glow.fillStyle(led.colour, 0.9 * on).fillCircle(p.x, p.y, 1.6 * px);
    }

    // Clouds drifting through the sky band, behind nothing but drawn faint, so they read as far away.
    this.sky.clear();
    for (const c of this.clouds) {
      if (!this.still) {
        c.x += c.speed * s;
        if (c.x - c.w > plate.extent.x1) c.x = plate.extent.x0 - c.w;
      }
      const p = toPlate(plate, c.x, c.z);
      for (let k = 0; k < 4; k++) {
        this.sky.fillStyle(0x6a7398, 0.07).fillEllipse(p.x + (k - 1.5) * c.w * 0.28 * px, p.y + (k % 2) * 6 * px, c.w * 0.55 * px, c.w * 0.16 * px);
      }
    }

    this.drawClocks(time);
    this.drawnStill = true;
  }

  /** A thin red second hand on each wall clock, ticking once a second. */
  private hands: Phaser.GameObjects.Graphics | null = null;
  private lastSecond = -1;
  private drawClocks(time: number) {
    const second = Math.floor(time / 1000);
    if (second === this.lastSecond) return;
    this.lastSecond = second;
    if (!this.hands) this.hands = this.back.scene.add.graphics();
    const { plate } = this;
    const px = plate.pxPerCm;
    this.hands.clear();
    const angle = ((second % 60) / 60) * Math.PI * 2;
    for (const c of plate.ambience.clocks) {
      const p = toPlate(plate, c.x, c.z);
      const r = c.r * px;
      this.hands.lineStyle(0.9 * px, 0xd6312f, 0.95);
      this.hands.lineBetween(p.x - Math.sin(angle) * r * 0.22, p.y + Math.cos(angle) * r * 0.22, p.x + Math.sin(angle) * r, p.y - Math.cos(angle) * r);
      this.hands.fillStyle(0xd6312f, 1).fillCircle(p.x, p.y, 1.3 * px);
    }
  }
}
