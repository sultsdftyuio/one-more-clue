import { NextResponse, type NextRequest } from "next/server";
import { normalizeCode, playerCookie, RoomError } from ".";
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
