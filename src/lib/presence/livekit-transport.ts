/**
 * Presence over LiveKit data messages (W0.5 spike), the approved fallback.
 * Positions go "lossy" (unreliable, unordered, like UDP: a late position is
 * useless anyway); statuses, pings and hellos go reliable. LiveKit has no
 * presence state of its own here, so members come from the participant list
 * plus each phone's hello. Browser only (WebRTC).
 */
import type { Room } from "livekit-client";
import { byteLength, decode, encode, type Member, type PresenceMessage, type PresenceTransport, type TransportEvents } from "./protocol.ts";

const TOPIC = "presence";

export class LiveKitTransport implements PresenceTransport {
  readonly name = "livekit" as const;
  private readonly passUrl: string;
  private room: Room | null = null;
  private live = false;
  private closed = false;
  private members = new Map<string, Member>();
  private me: Member | null = null;

  /** `passUrl` returns `{ url, token }` for this room, with data publishing allowed. */
  constructor(options: { passUrl: string }) {
    this.passUrl = options.passUrl;
  }

  async connect(events: TransportEvents) {
    const { Room, RoomEvent } = await import("livekit-client");
    events.onState("connecting");
    const pass = await fetch(this.passUrl, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (this.closed) return; // closed while fetching (React runs effects twice in dev)
    if (!pass?.token) {
      events.onState("error", "no LiveKit pass (is LiveKit set up?)");
      return;
    }
    const room = new Room({ adaptiveStream: false, dynacast: false });
    this.room = room;
    const decoder = new TextDecoder();
    const emitMembers = () => {
      const here = new Set([...room.remoteParticipants.values()].map((p) => p.identity));
      for (const id of this.members.keys()) if (!here.has(id)) this.members.delete(id);
      events.onMembers([...this.members.values()]);
    };

    room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
      if (topic !== TOPIC) return;
      const message = decode(decoder.decode(payload));
      if (!message || (participant && participant.identity !== message.id)) return;
      if (message.k === "hello") {
        this.members.set(message.id, { id: message.id, name: message.name, x: message.x, r: message.r, s: message.s, z: message.z });
        emitMembers();
      }
      events.onMessage(message, payload.byteLength);
    });
    // A newcomer missed every hello so far: greet them (everyone does, reliably).
    room.on(RoomEvent.ParticipantConnected, () => {
      if (this.me) this.send({ k: "hello", ...this.me });
    });
    room.on(RoomEvent.ParticipantDisconnected, emitMembers);
    room.on(RoomEvent.Reconnecting, () => {
      this.live = false;
      events.onState("reconnecting");
    });
    room.on(RoomEvent.Reconnected, () => {
      this.live = true;
      events.onState("live");
    });
    room.on(RoomEvent.Disconnected, (reason) => {
      this.live = false;
      events.onState("closed", reason === undefined ? undefined : `reason ${reason}`);
    });

    try {
      await room.connect(pass.url, pass.token, { autoSubscribe: false });
      if (this.closed) {
        await room.disconnect();
        return;
      }
      this.live = true;
      events.onState("live");
    } catch (error) {
      if (!this.closed) events.onState("error", error instanceof Error ? error.message : String(error));
    }
  }

  send(message: PresenceMessage) {
    if (!this.live || !this.room) return 0;
    const text = encode(message);
    const data = new TextEncoder().encode(text);
    this.room.localParticipant.publishData(data, { reliable: message.k !== "pos", topic: TOPIC }).catch(() => undefined);
    return byteLength(text);
  }

  setMember(member: Member) {
    this.me = member;
  }

  async close() {
    this.closed = true;
    this.live = false;
    await this.room?.disconnect();
    this.room = null;
  }
}
