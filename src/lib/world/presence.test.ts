// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Member, PresenceMessage, PresenceTransport, TransportEvents } from "../presence/protocol.ts";
import { MOVE_HZ, retryDelay, WorldPresence } from "./presence.ts";
import { createWorldStore } from "./store.ts";

/** A transport that records what's sent and lets the test play the other phones. */
class FakeTransport implements PresenceTransport {
  readonly name = "livekit" as const;
  sent: PresenceMessage[] = [];
  member: Member | null = null;
  events: TransportEvents | null = null;
  async connect(events: TransportEvents) {
    this.events = events;
  }
  send(message: PresenceMessage) {
    this.sent.push(message);
    return 1;
  }
  setMember(member: Member) {
    this.member = member;
  }
  async close() {}
}

function setup() {
  const transport = new FakeTransport();
  const store = createWorldStore();
  store.getState().setMe("sam");
  let clock = 0;
  const presence = new WorldPresence({
    transport,
    store,
    me: { id: "p1", name: "Ana" },
    stickerOf: (id) => ({ p1: "sam", p2: "mei" })[id] ?? null,
    roomAt: (x) => (x < 440 ? "lab4" : "corridor"),
    now: () => clock,
    whereAmI: () => ({ x: 630, z: 306 }),
  });
  return { transport, store, presence, tick: (ms: number) => (clock += ms) };
}

test("my walks go out as where I'm heading, a few corrections while I walk, then where I stopped", async () => {
  const { transport, store, presence, tick } = setup();
  await presence.start();
  store.getState().reportWalk({ x: 630, z: 306, to: 400 });
  assert.deepEqual(transport.sent.at(-1), { k: "pos", id: "p1", n: 1, t: 0, x: 630, z: 306, r: "corridor", to: 400 });
  // Positions every frame, but corrections at most MOVE_HZ a second.
  for (let i = 0; i < 30; i++) {
    tick(1000 / 60);
    store.getState().setPositions({ sam: { x: 630 - i * 2.25, z: 306 } });
  }
  const corrections = transport.sent.filter((m) => m.k === "pos").length - 1;
  assert.ok(corrections >= 1 && corrections <= Math.ceil(MOVE_HZ * 0.5) + 1, `${corrections} corrections in half a second`);
  store.getState().reportWalk({ x: 400, z: 306, to: null });
  const last = transport.sent.at(-1);
  assert.ok(last?.k === "pos" && last.x === 400 && last.to === undefined && last.r === "lab4");
  assert.deepEqual(transport.member, { id: "p1", name: "Ana", x: 400, z: 306, r: "lab4", s: "" }, "late joiners get where I stopped");
});

test("teammates' moves reach the scene for their detective, and nobody else's do", async () => {
  const { transport, store, presence } = setup();
  await presence.start();
  transport.events!.onMessage({ k: "pos", id: "p2", n: 1, t: 0, x: 200, z: 306, r: "lab4", to: 100 }, 1);
  transport.events!.onMessage({ k: "pos", id: "p1", n: 1, t: 0, x: 9, z: 306, r: "lab4" }, 1);
  transport.events!.onMessage({ k: "pos", id: "stranger", n: 1, t: 0, x: 9, z: 306, r: "lab4" }, 1);
  assert.deepEqual(store.getState().takeRemote(), [{ id: "mei", x: 200, z: 306, to: 100, snap: false }]);
  // A hello puts them in place at once, with what they're doing.
  transport.events!.onMessage({ k: "hello", id: "p2", name: "Bo", x: 50, z: 306, r: "lab4", s: "at Cabinet B" }, 1);
  assert.deepEqual(store.getState().takeRemote(), [{ id: "mei", x: 50, z: 306, to: null, snap: true }]);
  assert.equal(store.getState().statuses.mei, "at Cabinet B");
  transport.events!.onMessage({ k: "status", id: "p2", s: "" }, 1);
  assert.equal(store.getState().statuses.mei, "");
});

test("status and pings go to everyone, and teammates' pings show here", async () => {
  const { transport, store, presence } = setup();
  await presence.start();
  presence.setStatus("at Priya's laptop");
  presence.setStatus("at Priya's laptop");
  assert.equal(transport.sent.filter((m) => m.k === "status").length, 1, "only changes are sent");
  presence.ping({ id: "laptop", x: 228, z: 431 });
  assert.deepEqual(transport.sent.at(-1), { k: "ping", id: "p1", x: 228, z: 431, r: "lab4", spot: "laptop" });
  assert.equal(store.getState().pings.length, 1, "my own ping shows here too");
  transport.events!.onMessage({ k: "ping", id: "p2", x: 945, z: 130, r: "lobby", spot: "lobby-reader" }, 1);
  assert.deepEqual(store.getState().pings.map((p) => [p.by, p.spot]), [["p1", "laptop"], ["p2", "lobby-reader"]]);
});

test("the channel's state reaches the store; back on it, I say hello again", async () => {
  const { transport, store, presence } = setup();
  await presence.start();
  transport.events!.onState("connecting");
  assert.equal(store.getState().presence, "connecting");
  transport.events!.onState("live");
  assert.equal(store.getState().presence, "live");
  assert.deepEqual(transport.sent.at(-1), { k: "hello", id: "p1", name: "Ana", x: 630, z: 306, r: "corridor", s: "" });
  transport.events!.onState("closed");
  assert.equal(store.getState().presence, "lost");
  assert.deepEqual([0, 1, 2, 3, 9].map(retryDelay), [2000, 5000, 10000, 30000, 30000]);
});

test("if the connection can't even start, the channel counts as lost, so it's tried again", async () => {
  const { transport, store, presence } = setup();
  transport.connect = async () => {
    throw new Error("chunk failed to load");
  };
  await presence.start();
  assert.equal(store.getState().presence, "lost");
});
