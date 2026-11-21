/**
 * W0.5 presence spike (throwaway). What phones say to each other on the live
 * presence channel: where they stand, what they're doing, and pings. None of
 * this goes through the engine; it's cosmetic and can be lost.
 * See docs/world-overhaul.md, sections 4 and 7.
 */

/** A player's position, sent at most `hz` times a second, and only while it changes. */
export type PosMessage = {
  k: "pos";
  /** Sender id (one per page load). */
  id: string;
  /** Sequence number, so receivers can count gaps. */
  n: number;
  /** Sender's clock in ms (performance.now), only compared with the sender's own earlier values. */
  t: number;
  /** Centimetres along the building. */
  x: number;
  /** Room id. */
  r: string;
  /**
   * Round-trip echoes, RTCP style: for each peer heard recently, the last
   * sequence number received from them and how many ms ago it arrived. The
   * peer subtracts that hold time from its own clock to get a round trip
   * through the relay without any extra messages or synced clocks.
   */
  a?: Record<string, [seq: number, heldMs: number]>;
};

/** "Jo · searching the laptop". */
export type StatusMessage = { k: "status"; id: string; s: string };

/** A tap on a spot that everyone should look at. */
export type PingMessage = { k: "ping"; id: string; x: number; r: string };

/** Sent when a phone (re)joins, so others learn its name, room and status before it moves. */
export type HelloMessage = { k: "hello"; id: string; name: string; x: number; r: string; s: string };

/** Lab only: one tap starts a timed walk on every phone, so round trips get measured both ways. */
export type TestMessage = { k: "test"; id: string; seconds: number };

export type PresenceMessage = PosMessage | StatusMessage | PingMessage | HelloMessage | TestMessage;

/** Who is on the channel, as presence reports it (Supabase), or as hellos report it (LiveKit). */
export type Member = { id: string; name: string; x: number; r: string; s: string };

export type TransportName = "supabase" | "livekit";

export type TransportState = "connecting" | "live" | "reconnecting" | "closed" | "error";

export type TransportEvents = {
  onMessage: (message: PresenceMessage, bytes: number) => void;
  /** The full member list whenever it changes. */
  onMembers: (members: Member[]) => void;
  onState: (state: TransportState, detail?: string) => void;
  /** Anything the service says that we'd want in a report: rate-limit errors, system messages. */
  onLog: (line: string) => void;
};

export interface PresenceTransport {
  readonly name: TransportName;
  connect(events: TransportEvents): Promise<void>;
  /** Returns the payload size in bytes, or 0 if it wasn't sent (not connected). Never falls back to HTTP. */
  send(message: PresenceMessage): number;
  /** Updates what late joiners see. The transport may throttle it. */
  setMember(member: Member): void;
  close(): Promise<void>;
}

export const encode = (message: PresenceMessage) => JSON.stringify(message);

export function decode(text: string): PresenceMessage | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && typeof value.k === "string" && typeof value.id === "string" ? value : null;
  } catch {
    return null;
  }
}

export const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
