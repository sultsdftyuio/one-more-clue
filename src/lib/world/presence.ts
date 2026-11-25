/**
 * Live presence in the world (W3.1, W3.2): what this phone tells teammates about its detective, and what it does with
 * what they say. It rides any PresenceTransport (LiveKit in the game, a fake in tests) and talks to the world store.
 *
 * Walks travel as intentions. When I start walking, teammates hear where I'm going and play the same walk at the
 * same pace (WALK_CM_PER_S), so it looks smooth without a stream of positions; while I walk, a correction goes out a
 * few times a second (lossy), and when I stop, my final spot (reliable enough: it's repeated in hellos). A receiver
 * that finds a teammate far from where they say they are moves them there at once.
 *
 * No React, no Phaser and no `@/` imports, so `node --test` can load it.
 */
import type { PresenceMessage, PresenceTransport, TransportState } from "../presence/protocol.ts";
import type { Spot } from "./geometry.ts";
import type { WorldStore } from "./store.ts";

/** Corrections while walking: at most this many a second. */
export const MOVE_HZ = 4;
/** A ping shows this long. */
export const PING_MS = 4000;

export type PresenceOptions = {
  transport: PresenceTransport;
  store: WorldStore;
  /** This player's id and name. */
  me: { id: string; name: string };
  /** The detective a player wears, by player id (null for someone the store doesn't draw). */
  stickerOf: (playerId: string) => string | null;
  /** The room at a point, for the room field on each message. */
  roomAt: (x: number, z: number) => string;
  /** Milliseconds, for throttling (performance.now in the browser, a fake clock in tests). */
  now: () => number;
  /** Where my detective stands before they've walked anywhere. */
  whereAmI: () => Spot;
};

export class WorldPresence {
  private readonly o: PresenceOptions;
  private seq = 0;
  private lastSent = -Infinity;
  private walkingTo: number | null = null;
  private status = "";
  private here: Spot | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(options: PresenceOptions) {
    this.o = options;
  }

  async start() {
    const { transport, store } = this.o;
    // Follow my own detective: walks starting and stopping, and where they are while they walk.
    this.unsubscribe = store.subscribe((s, prev) => {
      const sticker = s.me;
      if (!sticker) return;
      if (s.myWalk !== prev.myWalk && s.myWalk) this.walked(s.myWalk);
      else if (s.positions !== prev.positions && s.positions[sticker]) this.moving(s.positions[sticker]);
    });
    try {
      await transport.connect({
        onMessage: (message) => this.receive(message),
        onMembers: (members) => {
          // Late joiners: put everyone already here where their hello says they stand.
          for (const m of members) this.place(m.id, m.x, m.z, null, true);
        },
        onState: (state) => this.state(state),
        onLog: () => undefined,
      });
    } catch {
      // The connection code itself didn't load (a flaky network): the same as losing the channel, so it's retried.
      this.state("error");
    }
  }

  async stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    await this.o.transport.close();
  }

  /** What I'm doing, shown on my name tag on other phones ("at Priya's laptop"); empty for nothing. */
  setStatus(status: string) {
    if (status === this.status) return;
    this.status = status;
    this.o.transport.send({ k: "status", id: this.o.me.id, s: status });
    this.remember();
  }

  /** I held a spot: everyone sees a ping on it for a few seconds. */
  ping(spot: { id: string; x: number; z: number }) {
    const { me, transport, store, roomAt } = this.o;
    store.getState().addPing({ by: me.id, spot: spot.id, x: spot.x, z: spot.z, at: Date.now() });
    transport.send({ k: "ping", id: me.id, x: spot.x, z: spot.z, r: roomAt(spot.x, spot.z), spot: spot.id });
  }

  private walked(walk: { x: number; z: number; to: number | null }) {
    this.walkingTo = walk.to;
    this.here = { x: walk.x, z: walk.z };
    this.send(walk.x, walk.z, walk.to);
    this.remember();
  }

  private moving(at: Spot) {
    this.here = at;
    if (this.walkingTo === null) return;
    if (this.o.now() - this.lastSent < 1000 / MOVE_HZ) return;
    this.send(at.x, at.z, this.walkingTo);
  }

  private send(x: number, z: number, to: number | null) {
    const { me, transport, roomAt, now } = this.o;
    this.lastSent = now();
    transport.send({ k: "pos", id: me.id, n: ++this.seq, t: now(), x, z, r: roomAt(x, z), ...(to === null ? {} : { to }) });
  }

  /** What late joiners get in my hello. */
  private remember() {
    const { me, transport, roomAt } = this.o;
    const at = this.here ?? this.o.whereAmI();
    transport.setMember({ id: me.id, name: me.name, x: at.x, z: at.z, r: roomAt(at.x, at.z), s: this.status });
  }

  private receive(message: PresenceMessage) {
    const { store, me } = this.o;
    if (message.id === me.id) return;
    const sticker = this.o.stickerOf(message.id);
    if (!sticker) return;
    if (message.k === "pos" || message.k === "hello") {
      if (message.k === "hello") store.getState().setPresenceStatus(sticker, message.s);
      this.place(message.id, message.x, message.z, message.k === "pos" ? (message.to ?? null) : null, message.k === "hello");
    } else if (message.k === "status") {
      store.getState().setPresenceStatus(sticker, message.s);
    } else if (message.k === "ping" && message.z !== undefined) {
      store.getState().addPing({ by: message.id, spot: message.spot ?? null, x: message.x, z: message.z, at: Date.now() });
    }
  }

  private place(playerId: string, x: number, z: number | undefined, to: number | null, snap: boolean) {
    const sticker = this.o.stickerOf(playerId);
    if (!sticker || playerId === this.o.me.id || z === undefined) return;
    this.o.store.getState().pushRemote({ id: sticker, x, z, to, snap });
  }

  private state(state: TransportState) {
    const s = this.o.store.getState();
    s.setPresence(state === "live" ? "live" : state === "connecting" ? "connecting" : state === "reconnecting" ? "reconnecting" : "lost");
    // Back on the channel: say hello again, so everyone knows where I am.
    if (state === "live") {
      const at = this.here ?? this.o.whereAmI();
      this.remember();
      this.o.transport.send({ k: "hello", id: this.o.me.id, name: this.o.me.name, x: at.x, z: at.z, r: this.o.roomAt(at.x, at.z), s: this.status });
    }
  }
}

/** Reconnect waits, in ms, after the channel is lost: quick at first, then every half minute. */
export const RETRY_MS = [2000, 5000, 10000, 30000];
export const retryDelay = (attempt: number) => RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
