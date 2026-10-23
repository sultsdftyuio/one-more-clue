import { AccessToken, DataPacket_Kind, RoomServiceClient, TrackSource } from "livekit-server-sdk";

/**
 * LiveKit carries two things for a room: voice chat (remote rooms) and an
 * instant "the room changed" nudge after every write, so phones refetch
 * straight away instead of waiting for their next poll. Everything here is
 * off until LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set.
 */
export function liveConfigured() {
  const env = process.env;
  return Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
}

const liveRoom = (code: string) => `omc-${code}`;

/** A pass for one player into the room's LiveKit channel: microphone only, no video, no data from clients. */
export async function liveToken(code: string, player: { id: string; name: string }) {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: player.id,
    name: player.name,
    ttl: "6h",
  });
  token.addGrant({
    roomJoin: true,
    room: liveRoom(code),
    canSubscribe: true,
    canPublish: true,
    canPublishSources: [TrackSource.MICROPHONE],
    canPublishData: false,
  });
  return { url: process.env.LIVEKIT_URL!, token: await token.toJwt() };
}

let client: RoomServiceClient | null = null;

/** Tells everyone connected that the room is now at `version`. Never throws: polling is the fallback. */
export async function notifyRoom(code: string, version: number) {
  if (!liveConfigured()) return;
  try {
    client ??= new RoomServiceClient(
      process.env.LIVEKIT_URL!.replace(/^ws/, "http"),
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
    );
    const payload = new TextEncoder().encode(JSON.stringify({ v: version }));
    await client.sendData(liveRoom(code), payload, DataPacket_Kind.RELIABLE, { topic: "room" });
  } catch {
    // Nobody connected yet, or LiveKit is unreachable: clients still poll.
  }
}
