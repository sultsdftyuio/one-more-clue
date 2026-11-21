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
  panBy,
  screenToPlate,
  wholeBuilding,
  zoomAt,
  zoomRange,
  type Camera,
  type Viewport,
  type ZoomRange,
} from "@/lib/world/camera";
import { drawOrder, FEET, outlineBox, personAt, roomBox, spriteOf, TILE } from "@/lib/world/geometry";
import { Gestures, type GestureEvent } from "@/lib/world/gestures";
import type { WorldPlate } from "@/lib/world/plates";
import type { CameraTarget, WorldStore } from "@/lib/world/store";

/** Where the case's pictures are served from (see assets.ts). */
export type WorldArt = { plate: string; plateMap: string; sprites: string; occluders: Record<string, string> };

export type WorldOptions = {
  store: WorldStore;
  plate: WorldPlate;
  art: WorldArt;
  /** The highest pixel density to draw at. Dense phones draw at 2x: the plate holds 2 px per cm, so more only costs speed. */
  maxDpr: number;
};

/** Atlas tiles sit this far apart (scripts/world-assets.py). */
const ATLAS_GAP = 24;
/** Below this many canvas pixels per plate pixel the small, mipmapped copy of the plate is drawn instead; the two cross-fade. */
const MAP_FROM = 0.45;
const MAP_TO = 0.6;
/** How much bigger a tap target is than the art, in CSS px. */
const TAP_SLACK = 14;
/** Mouse wheel zoom speed. */
const WHEEL = 0.0015;
/** A selected person grows by this much. */
const SELECTED_GROWTH = 0.06;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Person = { id: string; image: Phaser.GameObjects.Image; scale: number; phase: number; grow: number };

class BuildingScene extends Phaser.Scene {
  private readonly options: WorldOptions;
  private readonly dpr: () => number;
  private readonly gestures = new Gestures();
  private view: Viewport = { w: 1, h: 1 };
  private range: ZoomRange = { min: 1, max: 1, closeUp: 1 };
  private cam: Camera = { x: 0, y: 0, zoom: 1 };
  private goal: Camera | null = null;
  private fling = { vx: 0, vy: 0 };
  private plateImage: Phaser.GameObjects.Image | null = null;
  private mapImage: Phaser.GameObjects.Image | null = null;
  /** Set when the GPU can't hold the full plate, so the small copy is always drawn. */
  private mapOnly = false;
  private people: Person[] = [];
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
    this.load.spritesheet("cast", art.sprites, { frameWidth: TILE.w, frameHeight: TILE.h, margin: ATLAS_GAP, spacing: ATLAS_GAP });
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
      const image = this.add.image(sprite.feet.x, sprite.feet.y, "cast", person.tile).setOrigin(0.5, FEET).setScale(sprite.scale);
      this.people.push({ id: person.id, image, scale: sprite.scale, phase: person.delay * 1000, grow: 1 });
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
      this.goal = this.cameraFor(target);
      this.fling = { vx: 0, vy: 0 };
    }
    if (this.gestures.active === 0) {
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

    this.animatePeople(time, dt, state.selected);
    state.setCamera(this.cam);
    this.countFrame(time, dt);
  }

  /** People breathe a little, out of step, and whoever is selected grows and stands in a pool of light. */
  private animatePeople(time: number, dt: number, selected: string | null) {
    const ease = 1 - Math.exp(-dt / 90);
    let lit: Person | null = null;
    for (const p of this.people) {
      const want = p.id === selected ? 1 + SELECTED_GROWTH : 1;
      p.grow += (want - p.grow) * ease;
      const breath = Math.sin(((time + p.phase) / 1700) * Math.PI * 2);
      p.image.setScale(p.scale * p.grow * (1 - 0.004 * breath), p.scale * p.grow * (1 + 0.012 * breath));
      if (p.id === selected) lit = p;
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
    if (target.kind === "person") {
      const person = plate.people.find((p) => p.id === target.id);
      if (!person) return this.cam;
      const { feet, box } = spriteOf(plate, person);
      return closeUpOn(this.view, plate, feet.x, feet.y - box.h * 0.45);
    }
    const room = plate.rooms.find((r) => r.id === target.id);
    if (!room) return this.cam;
    const box = roomBox(plate, room);
    const zoom = clamp(Math.min(this.view.w / box.w, this.view.h / box.h) * 0.96, this.range.min, this.range.max);
    return clampCamera({ x: box.x + box.w / 2, y: box.y + box.h / 2, zoom }, this.view, plate, this.range);
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
  }

  /** A mouse wheel turn at (x, y): zoom around the cursor. */
  wheel(x: number, y: number, dy: number) {
    if (!this.plateImage) return;
    this.goal = null;
    this.fling = { vx: 0, vy: 0 };
    const zoom = clamp(this.cam.zoom * Math.exp(-dy * WHEEL), this.range.min, this.range.max);
    this.cam = clampCamera(zoomAt(this.cam, this.view, zoom, x, y), this.view, this.options.plate, this.range);
  }

  private apply(events: GestureEvent[]) {
    const { plate, store } = this.options;
    for (const e of events) {
      if (e.kind === "grab") {
        this.goal = null;
        this.fling = { vx: 0, vy: 0 };
      } else if (e.kind === "pan") {
        this.cam = panBy(this.cam, e.dx, e.dy);
      } else if (e.kind === "pinch") {
        const panned = panBy(this.cam, e.dx, e.dy);
        const zoom = clamp(panned.zoom * e.scale, this.range.min, this.range.max);
        this.cam = zoomAt(panned, this.view, zoom, e.x, e.y);
      } else if (e.kind === "fling") {
        this.fling = { vx: e.vx, vy: e.vy };
      } else if (e.kind === "tap") {
        const spot = screenToPlate(this.cam, this.view, e.x, e.y);
        store.getState().select(personAt(plate, spot.x, spot.y, TAP_SLACK / this.cam.zoom));
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
