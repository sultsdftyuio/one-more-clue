/**
 * The Phaser side of the world screen (W0.3): the painted building, its people and the camera.
 * Only ever loaded in the browser, through a dynamic import in WorldCanvas, so Phaser stays out of
 * every other page and out of server rendering.
 *
 * The camera's numbers live in the shared store (src/lib/world/store.ts) in CSS px; this scene
 * draws them at the canvas's pixel density, which is the screen's capped at `maxDpr`.
 */
import * as Phaser from "phaser";
import {
  clampCamera,
  closeUpOn,
  easeCamera,
  glide,
  isZoomedOut,
  onRoom,
  panBy,
  pinchSettle,
  screenToPlate,
  swipeTarget,
  wholeBuilding,
  zoomAt,
  zoomRange,
  type Camera,
  type Viewport,
  type ZoomRange,
} from "@/lib/world/camera";
import { drawOrder, FEET, fromPlate, lightAt, outlineBox, personAt, spriteOf, toPlate, walkTarget, type Spot } from "@/lib/world/geometry";
import { Gestures, type GestureEvent } from "@/lib/world/gestures";
import type { WorldPerson, WorldPlate } from "@/lib/world/plates";
import { frameOf, poseAt, SHEET_GAP, SHEETS, TILE, WALK_CM_PER_S, type Pose } from "@/lib/world/sprites";
import type { CameraTarget, WorldStore } from "@/lib/world/store";
import { Ambience } from "./ambience";

/** Where the case's pictures are served from (see assets.ts). */
export type WorldArt = { plate: string; plateMap: string; sheets: string[]; occluders: Record<string, string> };

export type WorldOptions = {
  store: WorldStore;
  plate: WorldPlate;
  art: WorldArt;
  /** The highest pixel density to draw at. Dense phones draw at 2x: the plate holds 2 px per cm, so more only costs speed. */
  maxDpr: number;
};

/** Below this many canvas pixels per plate pixel the small, mipmapped copy of the plate is drawn instead; the two cross-fade. */
const MAP_FROM = 0.45;
const MAP_TO = 0.6;
/** How much bigger a tap target is than the art, in CSS px. */
const TAP_SLACK = 14;
/** Mouse wheel zoom speed. */
const WHEEL = 0.0015;
/** A selected person grows by this much. */
const SELECTED_GROWTH = 0.06;
/**
 * A contact shadow: two ellipses, a wide faint one and a small dark one inside it, which reads as a soft shadow.
 * Widths are a share of the sprite's tile; SHADOW_FLAT is height over width.
 */
const SHADOW_WIDTH = 0.8;
const SHADOW_CORE = 0.6;
const SHADOW_FLAT = 0.17;
const SHADOW_ALPHA = { rim: 0.3, core: 0.45 };
const SHADOW_COLOUR = 0x06040e;
/** How quickly someone's colour follows the room light they walk into, in ms. */
const TINT_MS = 260;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Someone in the building. `height` is the sprite's height in plate px before breathing and growing, so following
 * them doesn't wobble. `at` is where their feet are in world cm; `target` the x they're walking to, if any.
 */
type Person = {
  id: string;
  def: WorldPerson;
  image: Phaser.GameObjects.Image;
  shadow: { rim: Phaser.GameObjects.Ellipse; core: Phaser.GameObjects.Ellipse };
  scale: number;
  height: number;
  phase: number;
  grow: number;
  at: Spot;
  target: number | null;
  walkingSince: number | null;
  facing: 1 | -1;
  pose: Pose | null;
  tint: [number, number, number];
};

const rgb = (c: number): [number, number, number] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

class BuildingScene extends Phaser.Scene {
  private readonly options: WorldOptions;
  private readonly dpr: () => number;
  private readonly gestures = new Gestures();
  private view: Viewport = { w: 1, h: 1 };
  private range: ZoomRange = { min: 1, max: 1, closeUp: 1 };
  private cam: Camera = { x: 0, y: 0, zoom: 1 };
  private goal: Camera | null = null;
  private fling = { vx: 0, vy: 0 };
  /** Whoever the camera keeps in the middle of the close-up, until a finger, the wheel or another target takes over. */
  private following: string | null = null;
  /** A pinch happened since the fingers last all came up. */
  private pinched = false;
  private plateImage: Phaser.GameObjects.Image | null = null;
  private mapImage: Phaser.GameObjects.Image | null = null;
  /** Set when the GPU can't hold the full plate, so the small copy is always drawn. */
  private mapOnly = false;
  private people: Person[] = [];
  private ambience: Ambience | null = null;
  private glow: Phaser.GameObjects.Ellipse | null = null;
  private frames: number[] = [];
  private statsAt = 0;

  constructor(options: WorldOptions, dpr: () => number) {
    super("building");
    this.options = options;
    this.dpr = dpr;
  }

  preload() {
    const { art, plate, store } = this.options;
    this.load.image("plate", art.plate);
    this.load.image("plate-map", art.plateMap);
    for (let i = 0; i < SHEETS; i++) {
      this.load.spritesheet(`cast-${i}`, art.sheets[i], { frameWidth: TILE.w, frameHeight: TILE.h, margin: SHEET_GAP, spacing: SHEET_GAP });
    }
    for (const o of plate.occluders) this.load.image(`occluder-${o.id}`, art.occluders[o.id]);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, () =>
      store.getState().setStatus({ stage: "failed", error: "The building's pictures didn't load. Check your connection and reload." }),
    );
  }

  create() {
    const { plate, store } = this.options;
    const renderer = this.game.renderer;
    const webgl = renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;
    this.mapOnly = webgl && renderer.getMaxTextureSize() < Math.max(plate.size.w, plate.size.h);

    // Back to front: the zoomed-out copy, the plate, a glow under whoever is selected, the people
    // behind furniture, the furniture cut out of the plate, then everyone else.
    this.mapImage = this.add.image(0, 0, "plate-map").setOrigin(0).setDisplaySize(plate.size.w, plate.size.h);
    this.plateImage = this.add.image(0, 0, "plate").setOrigin(0).setVisible(!this.mapOnly);
    // Rain, flickers, steam, LEDs, clocks and clouds, over the plate and under the people.
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.ambience = new Ambience(this, plate, Boolean(reduced));
    this.glow = this.add.ellipse(0, 0, 10, 10, 0xffe6a7, 0.32).setVisible(false);
    let furnished = false;
    const furnish = () => {
      furnished = true;
      for (const o of plate.occluders) {
        const box = outlineBox(plate, o.outline);
        this.add.image(box.x, box.y, `occluder-${o.id}`).setOrigin(0).setDisplaySize(box.w, box.h);
      }
    };
    for (const person of drawOrder(plate)) {
      if (!person.behind && !furnished) furnish();
      const sprite = spriteOf(plate, person);
      // Each person's shadow goes just before them, so furniture covers both alike.
      // Made 100 px wide, then scaled each frame: re-shaping an ellipse rebuilds its outline, scaling doesn't.
      const shadow = {
        rim: this.add.ellipse(sprite.feet.x, sprite.feet.y, 100, 100 * SHADOW_FLAT, SHADOW_COLOUR, SHADOW_ALPHA.rim),
        core: this.add.ellipse(sprite.feet.x, sprite.feet.y, 100 * SHADOW_CORE, 100 * SHADOW_CORE * SHADOW_FLAT, SHADOW_COLOUR, SHADOW_ALPHA.core),
      };
      const image = this.add.image(sprite.feet.x, sprite.feet.y, "cast-0", 0).setOrigin(0.5, FEET).setScale(sprite.scale);
      const light = rgb(lightAt(plate, person.x, person.z));
      this.people.push({
        id: person.id,
        def: person,
        image,
        shadow,
        scale: sprite.scale,
        height: sprite.box.h,
        phase: person.delay * 1000,
        grow: 1,
        at: { x: person.x, z: person.z },
        target: null,
        walkingSince: null,
        facing: 1,
        pose: null,
        tint: light,
      });
    }
    if (!furnished) furnish();

    this.measure();
    this.cam = wholeBuilding(this.view, plate);
    store.getState().setStatus({ stage: "ready", renderer: webgl ? "WebGL" : "Canvas", dpr: this.dpr() });
  }

  /** The canvas changed size or density: keep looking at the same place, at the same zoom if it still fits. */
  resized() {
    if (!this.plateImage) return;
    const wasWhole = this.cam.zoom <= this.range.min * 1.001;
    this.measure();
    this.cam = clampCamera(wasWhole ? { ...this.cam, zoom: this.range.min } : this.cam, this.view, this.options.plate, this.range);
    if (this.goal) this.goal = clampCamera(this.goal, this.view, this.options.plate, this.range);
  }

  update(time: number) {
    const { store, plate } = this.options;
    const state = store.getState();
    // Phaser's own delta is smoothed; the frame meter wants the real one.
    const dt = Math.min(this.game.loop.rawDelta, 100);

    const target = state.takeRequest();
    if (target) {
      this.follow(target.kind === "person" ? target.id : null);
      this.goal = this.cameraFor(target);
      this.fling = { vx: 0, vy: 0 };
    }
    if (this.gestures.active === 0) {
      // Keep whoever we follow in the middle, wherever they go.
      if (this.following) this.goal = this.followCamera(this.following) ?? this.goal;
      if (this.goal) {
        this.cam = easeCamera(this.cam, this.goal, dt);
        if (this.cam === this.goal) this.goal = null;
      } else if (this.fling.vx || this.fling.vy) {
        const step = glide(this.fling.vx, this.fling.vy, dt);
        const moved = panBy(this.cam, step.dx, step.dy);
        this.cam = clampCamera(moved, this.view, plate, this.range);
        // Stop at an edge instead of pushing against it.
        this.fling = { vx: this.cam.x === moved.x ? step.vx : 0, vy: this.cam.y === moved.y ? step.vy : 0 };
      }
    }

    const dpr = this.dpr();
    const main = this.cameras.main;
    main.setZoom(this.cam.zoom * dpr);
    main.centerOn(this.cam.x, this.cam.y);

    // Close up, the full plate; further out, its mipmapped copy, which stays smooth when shrunk.
    if (this.plateImage && this.mapImage && !this.mapOnly) {
      const sharp = clamp((this.cam.zoom * dpr - MAP_FROM) / (MAP_TO - MAP_FROM), 0, 1);
      this.plateImage.setVisible(sharp > 0).setAlpha(sharp);
      this.mapImage.setVisible(sharp < 1);
    }

    this.ambience?.update(time, dt);
    const walk = state.takeWalk();
    if (walk) this.walkTo(walk.id, walk.x, time);
    this.animatePeople(time, dt, state);
    state.setCamera(this.cam);
    this.countFrame(time, dt);
  }

  /**
   * Everyone, every frame: walkers move along their floor with their walk playing and face the way they go; those
   * standing breathe a little, out of step, in their mood. Each takes on the colour of the room's light, has a soft
   * shadow at their feet, and whoever is selected grows and stands in a pool of light.
   */
  private animatePeople(time: number, dt: number, state: ReturnType<WorldStore["getState"]>) {
    const { plate } = this.options;
    const ease = 1 - Math.exp(-dt / 90);
    const tintEase = 1 - Math.exp(-dt / TINT_MS);
    let lit: Person | null = null;
    let moved = false;
    for (const p of this.people) {
      if (p.target !== null) {
        const step = (WALK_CM_PER_S * dt) / 1000;
        const left = p.target - p.at.x;
        p.facing = left < 0 ? -1 : 1;
        if (Math.abs(left) <= step) {
          p.at = { x: p.target, z: p.at.z };
          p.target = null;
          p.walkingSince = null;
        } else {
          p.at = { x: p.at.x + Math.sign(left) * step, z: p.at.z };
        }
        moved = true;
      }
      const mood = state.moods[p.id] ?? p.def.mood ?? "idle";
      const pose = poseAt(mood, p.walkingSince === null ? null : time - p.walkingSince);
      if (pose !== p.pose) {
        const frame = frameOf(p.id, pose);
        if (frame) p.image.setTexture(`cast-${frame.sheet}`, frame.frame);
        p.pose = pose;
      }
      p.image.setFlipX(p.facing < 0);

      const feet = toPlate(plate, p.at.x, p.at.z);
      const want = p.id === state.selected ? 1 + SELECTED_GROWTH : 1;
      p.grow += (want - p.grow) * ease;
      // Breathing only while standing: the walk has its own rise and fall.
      const breath = p.walkingSince === null ? Math.sin(((time + p.phase) / 1700) * Math.PI * 2) : 0;
      p.image.setPosition(feet.x, feet.y);
      p.image.setScale(p.scale * p.grow * (1 - 0.004 * breath), p.scale * p.grow * (1 + 0.012 * breath));

      // A foot off the floor makes the shadow a touch smaller and lighter.
      const footUp = pose === "walk-b" || pose === "walk-c";
      const w = p.height * (TILE.w / TILE.h) * SHADOW_WIDTH * p.grow * (footUp ? 0.9 : 1);
      const fade = footUp ? 0.8 : 1;
      for (const part of [p.shadow.rim, p.shadow.core]) part.setPosition(feet.x, feet.y - p.height * 0.01).setScale(w / 100);
      p.shadow.rim.setAlpha(SHADOW_ALPHA.rim * fade);
      p.shadow.core.setAlpha(SHADOW_ALPHA.core * fade);

      const light = rgb(lightAt(plate, p.at.x, p.at.z));
      p.tint = p.tint.map((c, k) => c + (light[k] - c) * tintEase) as [number, number, number];
      p.image.setTint((Math.round(p.tint[0]) << 16) | (Math.round(p.tint[1]) << 8) | Math.round(p.tint[2]));

      if (p.id === state.selected) lit = p;
    }
    if (moved) {
      const positions: Record<string, Spot> = {};
      for (const p of this.people) if (p.at.x !== p.def.x || p.at.z !== p.def.z) positions[p.id] = p.at;
      state.setPositions(positions);
    }
    if (!this.glow) return;
    this.glow.setVisible(Boolean(lit));
    if (lit) {
      // Re-shaping an ellipse rebuilds its outline, so only do it when the size really changes.
      const w = Math.round(lit.image.displayWidth * 0.8);
      if (Math.abs(this.glow.width - w) >= 1) this.glow.setSize(w, w * 0.22);
      this.glow.setPosition(lit.image.x, lit.image.y);
    }
  }

  /** Starts someone walking along their floor to x (cm). */
  private walkTo(id: string, x: number, time: number) {
    const p = this.people.find((q) => q.id === id);
    if (!p || Math.abs(x - p.at.x) < 2) return;
    p.target = x;
    if (p.walkingSince === null) p.walkingSince = time;
  }

  /** Frames drawn over the last second, and the slowest, for the frame meter. */
  private countFrame(time: number, dt: number) {
    this.frames.push(dt);
    if (time - this.statsAt < 1000) return;
    const fps = Math.round((this.frames.length * 1000) / Math.max(1, time - this.statsAt));
    const slowest = Math.round(Math.max(...this.frames));
    this.statsAt = time;
    this.frames = [];
    this.options.store.getState().setStatus({ fps, slowest, dpr: this.dpr() });
  }

  private measure() {
    const dpr = this.dpr();
    this.view = { w: this.scale.width / dpr, h: this.scale.height / dpr };
    this.range = zoomRange(this.view, this.options.plate);
    this.options.store.getState().setViewport(this.view, this.range);
  }

  private cameraFor(target: CameraTarget): Camera {
    const { plate } = this.options;
    if (target.kind === "whole") return wholeBuilding(this.view, plate);
    if (target.kind === "closeUp") return closeUpOn(this.view, plate, this.cam.x, this.cam.y);
    if (target.kind === "person") return this.followCamera(target.id) ?? this.cam;
    return onRoom(this.view, plate, target.id, this.cam.zoom, this.range) ?? this.cam;
  }

  /** A close-up on someone, from where their sprite is now (so it keeps up once people walk). */
  private followCamera(id: string): Camera | null {
    const p = this.people.find((x) => x.id === id);
    return p ? closeUpOn(this.view, this.options.plate, p.image.x, p.image.y - p.height * 0.45) : null;
  }

  private follow(id: string | null) {
    if (this.following === id) return;
    this.following = id;
    this.options.store.getState().setFollowing(id);
  }

  /**
   * A finger or mouse button, in CSS px on the canvas (see startWorld). Ignored until the building
   * is drawn, since there's no camera to move before that.
   */
  pointer(kind: "down" | "move" | "up" | "cancel", id: number, x: number, y: number, t: number) {
    if (!this.plateImage) return;
    if (kind === "down") this.apply(this.gestures.down(id, x, y, t));
    else if (kind === "move") this.apply(this.gestures.move(id, x, y, t));
    else if (kind === "up") this.apply(this.gestures.up(id, t));
    else this.gestures.cancel(id);
    // The last finger is up after a pinch out past halfway: settle on the whole building.
    if (this.pinched && this.gestures.active === 0) {
      this.pinched = false;
      const settle = pinchSettle(this.cam, this.view, this.options.plate, this.range);
      if (settle) {
        this.goal = settle;
        this.fling = { vx: 0, vy: 0 };
      }
    }
  }

  /** A mouse wheel turn at (x, y): zoom around the cursor. */
  wheel(x: number, y: number, dy: number) {
    if (!this.plateImage) return;
    this.goal = null;
    this.fling = { vx: 0, vy: 0 };
    this.follow(null);
    const zoom = clamp(this.cam.zoom * Math.exp(-dy * WHEEL), this.range.min, this.range.max);
    this.cam = clampCamera(zoomAt(this.cam, this.view, zoom, x, y), this.view, this.options.plate, this.range);
  }

  private apply(events: GestureEvent[]) {
    const { plate, store } = this.options;
    for (const e of events) {
      if (e.kind === "grab") {
        this.goal = null;
        this.fling = { vx: 0, vy: 0 };
        this.follow(null);
      } else if (e.kind === "pan") {
        this.cam = panBy(this.cam, e.dx, e.dy);
      } else if (e.kind === "pinch") {
        this.pinched = true;
        const panned = panBy(this.cam, e.dx, e.dy);
        const zoom = clamp(panned.zoom * e.scale, this.range.min, this.range.max);
        this.cam = zoomAt(panned, this.view, zoom, e.x, e.y);
      } else if (e.kind === "fling") {
        // In close-up a quick swipe pages to the next room; otherwise the picture glides.
        const page = swipeTarget(this.cam, this.view, plate, e.vx, e.vy, this.range);
        if (page) this.goal = page;
        else this.fling = { vx: e.vx, vy: e.vy };
      } else if (e.kind === "tap") {
        const spot = screenToPlate(this.cam, this.view, e.x, e.y);
        const at = Object.fromEntries(this.people.map((p) => [p.id, p.at]));
        const hit = personAt(plate, spot.x, spot.y, TAP_SLACK / this.cam.zoom, at);
        store.getState().select(hit);
        // A tap on the floor walks your detective there (on this phone only, until W3 shares it).
        const me = store.getState().me;
        const mine = me ? this.people.find((p) => p.id === me) : undefined;
        if (!hit && mine) {
          const point = fromPlate(plate, spot.x, spot.y);
          const x = walkTarget(plate, mine.at, point.x, point.z);
          if (x !== null) {
            this.walkTo(mine.id, x, this.time.now);
            // Close up, the camera goes along with you.
            if (this.cam.zoom >= this.range.closeUp * 0.9) this.follow(mine.id);
          }
        }
      } else if (e.kind === "doubleTap") {
        // Zoomed out: dive in where you tapped. Zoomed in: back out to the whole building.
        const spot = screenToPlate(this.cam, this.view, e.x, e.y);
        this.goal = isZoomedOut(this.cam, this.range) || this.cam.zoom < this.range.closeUp * 0.95
          ? closeUpOn(this.view, plate, spot.x, spot.y)
          : wholeBuilding(this.view, plate);
      }
    }
    this.cam = clampCamera(this.cam, this.view, plate, this.range);
  }
}

/** Starts the world inside `parent` (which sets its size) and returns how to stop it. */
export function startWorld(parent: HTMLElement, options: WorldOptions) {
  const density = () => clamp(window.devicePixelRatio || 1, 1, options.maxDpr);
  let dpr = density();
  const cssSize = () => ({ w: Math.max(1, parent.clientWidth), h: Math.max(1, parent.clientHeight) });
  const first = cssSize();
  const scene = new BuildingScene(options, () => dpr);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    canvasStyle: "display: block",
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    // Phaser's own input is off: it drops a finger's moves while it's over any page element on top of
    // the canvas (the HUD), and looks up the element under every finger on every move. Each kind has
    // to be turned off by name: `input: false` alone leaves touch on.
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    render: { antialias: true, roundPixels: false, mipmapFilter: "LINEAR_MIPMAP_LINEAR" },
    // The canvas holds dpr× as many pixels as it covers, and Phaser shows it at 1/dpr of that.
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(first.w * dpr),
      height: Math.round(first.h * dpr),
      zoom: 1 / dpr,
      autoRound: false,
      expandParent: false,
    },
    scene,
  });

  // Fingers and the mouse come straight from the DOM. Capturing each pointer keeps its moves coming
  // while it slides over the HUD, and touch-action: none on `parent` keeps the browser from scrolling.
  let box = parent.getBoundingClientRect();
  const at = (e: PointerEvent | WheelEvent) => ({ x: e.clientX - box.left, y: e.clientY - box.top });
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    box = parent.getBoundingClientRect();
    try {
      parent.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; its up or cancel follows.
    }
    const { x, y } = at(e);
    scene.pointer("down", e.pointerId, x, y, e.timeStamp);
  };
  const onMove = (e: PointerEvent) => {
    const { x, y } = at(e);
    scene.pointer("move", e.pointerId, x, y, e.timeStamp);
  };
  const onUp = (e: PointerEvent) => scene.pointer("up", e.pointerId, 0, 0, e.timeStamp);
  const onCancel = (e: PointerEvent) => scene.pointer("cancel", e.pointerId, 0, 0, e.timeStamp);
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    box = parent.getBoundingClientRect();
    const { x, y } = at(e);
    scene.wheel(x, y, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
  };
  const onMenu = (e: Event) => e.preventDefault();
  parent.addEventListener("pointerdown", onDown);
  parent.addEventListener("pointermove", onMove);
  parent.addEventListener("pointerup", onUp);
  parent.addEventListener("pointercancel", onCancel);
  parent.addEventListener("wheel", onWheel, { passive: false });
  parent.addEventListener("contextmenu", onMenu);

  const observer = new ResizeObserver(() => {
    const { w, h } = cssSize();
    dpr = density();
    const width = Math.round(w * dpr);
    const height = Math.round(h * dpr);
    if (game.scale.width === width && game.scale.height === height && game.scale.zoom === 1 / dpr) return;
    game.scale.setZoom(1 / dpr);
    game.scale.resize(width, height);
    scene.resized();
  });
  observer.observe(parent);

  return {
    stop() {
      observer.disconnect();
      parent.removeEventListener("pointerdown", onDown);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerup", onUp);
      parent.removeEventListener("pointercancel", onCancel);
      parent.removeEventListener("wheel", onWheel);
      parent.removeEventListener("contextmenu", onMenu);
      game.destroy(true);
    },
  };
}
