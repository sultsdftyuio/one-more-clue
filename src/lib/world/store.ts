/**
 * The small client store the world screen shares between the Phaser scene and the React overlays
 * (W0.4 in docs/world-overhaul.md):
 * - React writes the player's view from the server and camera requests ("show the whole building");
 * - the scene writes the camera every frame it moves, the screen size and how drawing is going;
 * - both write the selection (tap someone in the building, or close their card).
 *
 * It's a zustand vanilla store, one per world screen: React reads it with `useStore`, the scene
 * reads it with `getState()` and `subscribe()`. No React or Phaser in here, so `node --test` covers it.
 */
import { createStore } from "zustand/vanilla";
import type { PlayerView } from "../game/engine.ts";
import { sameCamera, type Camera, type Viewport, type ZoomRange } from "./camera.ts";
import type { Spot } from "./geometry.ts";
import type { Ghost } from "./rewind.ts";
import type { Mood } from "./sprites.ts";

/** Where React can ask the camera to go. The scene works out the numbers, since it knows the screen. */
export type CameraTarget =
  | { kind: "whole" }
  | { kind: "closeUp" }
  /** A close-up on someone, which then follows them until a finger moves the camera. */
  | { kind: "person"; id: string }
  /** Centred on a room, in close-up or nearer. */
  | { kind: "room"; id: string };

export type WorldStatus = {
  stage: "loading" | "ready" | "failed";
  renderer: "WebGL" | "Canvas" | null;
  /** Frames drawn in the last second, and the slowest of them in ms. */
  fps: number;
  slowest: number;
  /** The pixel density the canvas draws at (capped below the screen's on dense phones). */
  dpr: number;
  error: string | null;
};

export type WorldState = {
  view: PlayerView | null;
  viewport: Viewport;
  camera: Camera;
  range: ZoomRange;
  /** A camera move React asked for and the scene hasn't picked up yet. */
  request: { target: CameraTarget; id: number } | null;
  /** The person (later, any object) the player tapped. */
  selected: string | null;
  /** Whoever the camera is following, set by the scene. */
  following: string | null;
  /** The detective this player wears, so a tap on the floor walks them there. */
  me: string | null;
  /** Where people stand who have moved from their places, in world cm, written by the scene while they walk. */
  positions: Record<string, Spot>;
  /** Moods that differ from the case's, by person id. */
  moods: Record<string, Mood>;
  /** A walk asked for and not yet taken by the scene: who, and the x (cm) to walk to on their floor. */
  walkRequest: { id: string; x: number } | null;
  /** My detective started (`to` set) or finished (`to` null) a walk: the scene reports it, presence sends it. */
  myWalk: { x: number; z: number; to: number | null; n: number } | null;
  /** Teammates' moves heard on the live channel, waiting for the scene. `snap` moves them there at once. */
  remote: RemoteMove[];
  /** What teammates are doing, by detective ("at Priya's laptop"). */
  statuses: Record<string, string>;
  /** Spots someone held to point at, for a few seconds each. */
  pings: Ping[];
  /** The live channel: off until it starts, then how it's going. */
  presence: "off" | "connecting" | "live" | "reconnecting" | "lost";
  /**
   * The rewind (W4): whether it's open, the minute of the night it shows, who froze it for the team (a player id;
   * nobody else can move it then) and whose slider it's following. `cursor` is this phone's own slider for the live
   * channel to send, when this player is the Archivist.
   */
  rewind: { open: boolean; minute: number; frozenBy: string | null; following: string | null };
  cursor: { minute: number | null; frozen: boolean; n: number } | null;
  /** The ghosts the scene is drawing right now, for their tags and the clash lines. */
  ghosts: Ghost[];
  /** Who is talking right now (a speech bubble is up), by person id, until when (Date.now ms): they bob as they talk. */
  talking: Record<string, number>;
  /** The thing my detective is standing at and can use, for the glow on it and the key bubble over it. */
  near: { kind: "spot" | "job" | "person"; id: string } | null;
  /** Walking with keys or the on-screen buttons: -1 left, 1 right, 0 standing (held, so it lasts while held). */
  steer: number;
  /** Take the stairs here: up (1) or down (-1), once, waiting for the scene. */
  climb: { dir: 1 | -1; n: number } | null;
  /** The Photographer's last flash (W5.1): the room it lit, who fired it, and when (Date.now). */
  flash: { room: string; by: string; at: number } | null;
  /** "Then and now" (W5.1): an old photo held over the live room it was taken in, on this phone. */
  thenNow: { evidenceId: string; room: string } | null;
  status: WorldStatus;
};

export type RemoteMove = { id: string; x: number; z: number; to: number | null; snap: boolean };
/** `note` is a ping this phone made for itself (a hand-off, W5.5), with what to say instead of "look here". */
export type Ping = { by: string; spot: string | null; x: number; z: number; at: number; note?: string };

export type WorldActions = {
  setView(view: PlayerView | null): void;
  /** Called by the scene whenever the picture moves. Changes too small to see are dropped. */
  setCamera(camera: Camera): void;
  setViewport(viewport: Viewport, range: ZoomRange): void;
  /** Asks the scene to move the camera; a newer request replaces one not yet taken. */
  look(target: CameraTarget): void;
  /** The scene takes the waiting request, if any. */
  takeRequest(): CameraTarget | null;
  select(id: string | null): void;
  setFollowing(id: string | null): void;
  setMe(id: string | null): void;
  /** The scene reports everyone who has moved. Only real changes notify. */
  setPositions(positions: Record<string, Spot>): void;
  setMood(id: string, mood: Mood): void;
  /** Asks the scene to walk someone along their floor to x; a newer request replaces one not yet taken. */
  walk(id: string, x: number): void;
  takeWalk(): { id: string; x: number } | null;
  reportWalk(walk: { x: number; z: number; to: number | null }): void;
  pushRemote(move: RemoteMove): void;
  takeRemote(): RemoteMove[];
  setPresenceStatus(id: string, status: string): void;
  /** Adds a ping and drops ones older than `PING_MS`. */
  addPing(ping: Ping): void;
  setPresence(state: WorldState["presence"]): void;
  /** Opens or closes the rewind on this phone (closing leaves a freeze in place: it reopens). */
  openRewind(open: boolean): void;
  /** This player moved the slider: `me` is their player id; `share` sends it to the team (the Archivist). */
  dragRewind(minute: number, me: string, share: boolean): void;
  /** The Archivist freezes the night on the current minute for everyone, or lets it go. */
  freezeRewind(me: string, frozen: boolean): void;
  /** Someone's slider arrived on the live channel. */
  receiveCursor(by: string, minute: number | null, frozen: boolean): void;
  setGhosts(ghosts: Ghost[]): void;
  addFlash(flash: { room: string; by: string; at: number }): void;
  setSteer(dx: number): void;
  setTalking(id: string, until: number): void;
  setNear(near: WorldState["near"]): void;
  requestClimb(dir: 1 | -1): void;
  takeClimb(): 1 | -1 | null;
  setThenNow(thenNow: WorldState["thenNow"]): void;
  setStatus(patch: Partial<WorldStatus>): void;
};

export type WorldStore = ReturnType<typeof createWorldStore>;

const INITIAL_STATUS: WorldStatus = { stage: "loading", renderer: null, fps: 0, slowest: 0, dpr: 1, error: null };

export function createWorldStore(initial: Partial<WorldState> = {}) {
  return createStore<WorldState & WorldActions>()((set, get) => ({
    view: null,
    viewport: { w: 0, h: 0 },
    camera: { x: 0, y: 0, zoom: 1 },
    range: { min: 1, max: 1, closeUp: 1 },
    request: null,
    selected: null,
    following: null,
    me: null,
    positions: {},
    moods: {},
    walkRequest: null,
    myWalk: null,
    remote: [],
    statuses: {},
    pings: [],
    presence: "off",
    rewind: { open: false, minute: 0, frozenBy: null, following: null },
    cursor: null,
    ghosts: [],
    flash: null,
    thenNow: null,
    steer: 0,
    climb: null,
    talking: {},
    near: null,
    status: INITIAL_STATUS,
    ...initial,

    setView: (view) => set({ view }),
    setCamera: (camera) => {
      if (!sameCamera(get().camera, camera)) set({ camera });
    },
    setViewport: (viewport, range) => set({ viewport, range }),
    look: (target) => set({ request: { target, id: (get().request?.id ?? 0) + 1 } }),
    takeRequest: () => {
      const request = get().request;
      if (!request) return null;
      set({ request: null });
      return request.target;
    },
    select: (selected) => {
      if (get().selected !== selected) set({ selected });
    },
    setFollowing: (following) => {
      if (get().following !== following) set({ following });
    },
    setMe: (me) => {
      if (get().me !== me) set({ me });
    },
    setPositions: (positions) => {
      const before = get().positions;
      const keys = Object.keys(positions);
      const same =
        keys.length === Object.keys(before).length &&
        keys.every((k) => before[k] && Math.abs(before[k].x - positions[k].x) < 0.05 && Math.abs(before[k].z - positions[k].z) < 0.05);
      if (!same) set({ positions });
    },
    setMood: (id, mood) => {
      if (get().moods[id] !== mood) set({ moods: { ...get().moods, [id]: mood } });
    },
    walk: (id, x) => set({ walkRequest: { id, x } }),
    takeWalk: () => {
      const request = get().walkRequest;
      if (request) set({ walkRequest: null });
      return request;
    },
    reportWalk: (walk) => set({ myWalk: { ...walk, n: (get().myWalk?.n ?? 0) + 1 } }),
    pushRemote: (move) => set({ remote: [...get().remote, move] }),
    takeRemote: () => {
      const moves = get().remote;
      if (moves.length) set({ remote: [] });
      return moves;
    },
    setPresenceStatus: (id, status) => {
      if ((get().statuses[id] ?? "") !== status) set({ statuses: { ...get().statuses, [id]: status } });
    },
    addPing: (ping) => set({ pings: [...get().pings.filter((p) => ping.at - p.at < 4000 && !(p.by === ping.by)), ping] }),
    setPresence: (presence) => {
      if (get().presence !== presence) set({ presence });
    },
    openRewind: (open) => {
      const r = get().rewind;
      if (!open && r.frozenBy) return;
      set({ rewind: { ...r, open, following: open ? r.following : null } });
    },
    dragRewind: (minute, me, share) => {
      const r = get().rewind;
      if (r.frozenBy && r.frozenBy !== me) return;
      set({ rewind: { ...r, open: true, minute, following: null }, cursor: share ? { minute, frozen: Boolean(r.frozenBy), n: (get().cursor?.n ?? 0) + 1 } : get().cursor });
    },
    freezeRewind: (me, frozen) => {
      const r = get().rewind;
      set({
        rewind: { ...r, open: true, frozenBy: frozen ? me : null },
        cursor: { minute: r.minute, frozen, n: (get().cursor?.n ?? 0) + 1 },
      });
    },
    receiveCursor: (by, minute, frozen) => {
      const r = get().rewind;
      if (frozen) {
        set({ rewind: { open: true, minute: minute ?? r.minute, frozenBy: by, following: by } });
        return;
      }
      const thawed = r.frozenBy === by ? null : r.frozenBy;
      // While open, the Archivist's slider pulls everyone's along ("everyone sees").
      if (minute !== null && r.open && !thawed) set({ rewind: { ...r, minute, frozenBy: thawed, following: by } });
      else if (thawed !== r.frozenBy) set({ rewind: { ...r, frozenBy: thawed } });
    },
    setGhosts: (ghosts) => set({ ghosts }),
    addFlash: (flash) => set({ flash }),
    setSteer: (dx) => {
      const steer = Math.sign(dx);
      if (get().steer !== steer) set({ steer });
    },
    setTalking: (id, until) => set({ talking: { ...get().talking, [id]: until } }),
    setNear: (near) => {
      const now = get().near;
      if (now?.kind !== near?.kind || now?.id !== near?.id) set({ near });
    },
    requestClimb: (dir) => set({ climb: { dir, n: (get().climb?.n ?? 0) + 1 } }),
    takeClimb: () => {
      const climb = get().climb;
      if (climb) set({ climb: null });
      return climb?.dir ?? null;
    },
    setThenNow: (thenNow) => set({ thenNow }),
    setStatus: (patch) => set({ status: { ...get().status, ...patch } }),
  }));
}
