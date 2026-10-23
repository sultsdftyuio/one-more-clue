import { NextResponse, type NextRequest } from "next/server";
import { normalizeCode, playerCookie, RoomError } from ".";
import { allowed, type Bucket } from "./limits";
import { ROOM_TTL_SECONDS } from "./types";

export const NO_STORE = { "Cache-Control": "no-store" };

export function errorResponse(error: unknown) {
  if (error instanceof RoomError) return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: NO_STORE });
}

export const readJson = (request: NextRequest): Promise<Record<string, unknown>> =>
  request
    .json()
    .then((body) => (body && typeof body === "object" ? body : {}))
    .catch(() => ({}));

export async function codeFrom(params: Promise<{ code: string }>) {
  const code = normalizeCode((await params).code);
  if (!code) throw new RoomError("That isn't a room code.", 400);
  return code;
}

export const tokenFor = (request: NextRequest, code: string) => request.cookies.get(playerCookie(code))?.value;

/** The caller's address as Vercel reports it. */
export function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Throws a 429 when this caller has hit the limit for `bucket`. */
export async function limit(request: NextRequest, bucket: Bucket) {
  if (!(await allowed(bucket, clientIp(request)))) throw new RoomError("Slow down a little and try again in a minute.", 429);
}

export function withPlayerCookie(response: NextResponse, code: string, token: string) {
  response.cookies.set(playerCookie(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ROOM_TTL_SECONDS,
  });
  return response;
}
