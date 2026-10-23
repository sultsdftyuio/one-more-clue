import { NextResponse, type NextRequest } from "next/server";
import { createGame } from "@/lib/rooms";
import { errorResponse, NO_STORE, readJson, withPlayerCookie } from "@/lib/rooms/http";
import type { Mode } from "@/lib/game/types";

/** Creates a room; the caller becomes its host. Body: { caseId, name, mode }. */
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    const { code, token } = await createGame({
      caseId: String(body.caseId ?? ""),
      name: String(body.name ?? ""),
      mode: body.mode as Mode,
    });
    return withPlayerCookie(NextResponse.json({ code }, { status: 201, headers: NO_STORE }), code, token);
  } catch (error) {
    return errorResponse(error);
  }
}
