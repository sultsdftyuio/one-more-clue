import { NextResponse, type NextRequest } from "next/server";
import { joinGame } from "@/lib/rooms";
import { codeFrom, errorResponse, limit, NO_STORE, readJson, tokenFor, withPlayerCookie } from "@/lib/rooms/http";

/** Joins the room's lobby. Body: { name }. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await limit(request, "join");
    const code = await codeFrom(params);
    const body = await readJson(request);
    const { token } = await joinGame(code, String(body.name ?? ""), tokenFor(request, code));
    return withPlayerCookie(NextResponse.json({ code }, { headers: NO_STORE }), code, token);
  } catch (error) {
    return errorResponse(error);
  }
}
