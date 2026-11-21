/**
 * Presence over Supabase Realtime (W0.5 spike): one channel per room.
 * Positions, statuses and pings are Broadcast messages; Presence only says
 * who is here and their last room and status, for late joiners. Presence is
 * limited to 5 updates per client per 30 s on every plan, so it is throttled
 * here and never carries positions.
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { byteLength, encode, type Member, type PresenceMessage, type PresenceTransport, type TransportEvents } from "./protocol.ts";

/**
 * Presence allows "5 calls per client per 30 s"; going over closes the channel
 * with "Client presence rate limit exceeded" and supabase-js doesn't rejoin.
 * In the bench even 4 in any 30 s tripped it now and then, so allow 2, counted
 * across reconnects. Positions carry the room anyway; this is for late joiners.
 */
const MEMBER_WINDOW_MS = 30_000;
const MEMBER_MAX_IN_WINDOW = 2;

export class SupabaseTransport implements PresenceTransport {
  readonly name = "supabase" as const;
  private readonly url: string;
  private readonly key: string;
  private readonly topic: string;
  private readonly id: string;
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private live = false;
  private member: Member | null = null;
  private memberSentAt: number[] = [];
  private memberTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: { url: string; anonKey: string; room: string; id: string }) {
    this.url = options.url;
    this.key = options.anonKey;
    this.topic = `omc-presence:${options.room}`;
    this.id = options.id;
  }

  async connect(events: TransportEvents) {
    this.client = createClient(this.url, this.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: {
        logger: (kind: string, message: string, data?: unknown) => {
          if (kind === "transport" && /close|error/i.test(message)) events.onLog(`socket ${message} ${describe(data)}`.trim());
        },
      },
    });
    const channel = this.client.channel(this.topic, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.id, enabled: true } },
    });
    this.channel = channel;

    channel.on("broadcast", { event: "m" }, ({ payload }) => {
      if (payload && typeof payload === "object") events.onMessage(payload as PresenceMessage, byteLength(JSON.stringify(payload)));
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Member>();
      const members = Object.values(state)
        .map((metas) => metas[metas.length - 1])
        .filter(Boolean)
        .map(({ id, name, x, r, s }) => ({ id, name, x, r, s }));
      events.onMembers(members);
    });
    channel.on("system", {}, (payload: unknown) => events.onLog(`system ${describe(payload)}`));

    events.onState("connecting");
    channel.subscribe((status, error) => {
      this.live = status === "SUBSCRIBED";
      if (status === "SUBSCRIBED") {
        events.onState("live");
        this.flushMember();
      } else if (status === "CHANNEL_ERROR") events.onState("error", error?.message ?? "channel error");
      else if (status === "TIMED_OUT") events.onState("reconnecting", "timed out");
      else if (status === "CLOSED") events.onState("closed");
    });
  }

  send(message: PresenceMessage) {
    // Only over the open socket: supabase-js would otherwise fall back to one
    // HTTP request per message, which is the last thing a 10 Hz stream wants.
    if (!this.live || !this.channel) return 0;
    void this.channel.send({ type: "broadcast", event: "m", payload: message });
    return byteLength(encode(message));
  }

  setMember(member: Member) {
    this.member = member;
    if (!this.memberTimer) this.flushMember();
  }

  private flushMember() {
    if (!this.live || !this.channel || !this.member) return;
    const now = Date.now();
    this.memberSentAt = this.memberSentAt.filter((at) => now - at < MEMBER_WINDOW_MS);
    if (this.memberSentAt.length >= MEMBER_MAX_IN_WINDOW) {
      this.memberTimer ??= setTimeout(() => {
        this.memberTimer = null;
        this.flushMember();
      }, this.memberSentAt[0] + MEMBER_WINDOW_MS - now + 50);
      return;
    }
    this.memberSentAt.push(now);
    void this.channel.track(this.member);
  }

  async close() {
    if (this.memberTimer) clearTimeout(this.memberTimer);
    this.live = false;
    if (this.channel) await this.client?.removeChannel(this.channel);
    this.channel = null;
    this.client?.realtime.disconnect();
  }
}

function describe(data: unknown) {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return data;
  const event = data as { code?: number; reason?: string; message?: string; type?: string };
  if (event.code !== undefined || event.reason) return `code=${event.code ?? "?"} ${event.reason ?? ""}`.trim();
  try {
    return JSON.stringify(data).slice(0, 300);
  } catch {
    return String(data);
  }
}
