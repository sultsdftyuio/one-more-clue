// Server only (it signs LiveKit passes).
import { AccessToken } from "livekit-server-sdk";
import { liveConfigured } from "@/lib/rooms/live";

/**
 * The W0.5 presence lab (/lab/presence) is a test page: on in local dev and
 * Vercel previews, off on the live site unless PRESENCE_LAB=1, so nobody
 * spends the free LiveKit minutes or Supabase messages through it.
 */
export const presenceLabOpen = () =>
  process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview" || process.env.PRESENCE_LAB === "1";

/** Lab rooms never share a LiveKit room with a game (those are `omc-<CODE>`). */
const labRoom = (room: string) => `omc-lab-${room}`;

export const cleanLabName = (value: string | null, fallback: string) =>
  (value ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 24) || fallback;

/** A LiveKit pass for the lab: data messages only, no microphone, one hour. */
export async function labLivePass(room: string, id: string) {
  if (!liveConfigured()) return { enabled: false as const };
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: id, ttl: "1h" });
  token.addGrant({ roomJoin: true, room: labRoom(room), canSubscribe: true, canPublish: false, canPublishData: true });
  return { enabled: true as const, url: process.env.LIVEKIT_URL!, token: await token.toJwt() };
}
