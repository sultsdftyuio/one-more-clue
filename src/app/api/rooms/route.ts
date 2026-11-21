import { NextResponse, type NextRequest } from "next/server";
import { createGame } from "@/lib/rooms";
import { errorResponse, limit, NO_STORE, readJson, withPlayerCookie } from "@/lib/rooms/http";
import type { Mode } from "@/lib/game/types";

/** Creates a room; the caller becomes its host. Body: { caseId, name, mode, world? } (`world: true` only from the hidden world page). */
export async function POST(request: NextRequest) {
  try {
    await limit(request, "create");
    const body = await readJson(request);
    const { code, token } = await createGame({
      caseId: String(body.caseId ?? ""),
      name: String(body.name ?? ""),
      mode: body.mode as Mode,
      world: body.world === true,
    });
    return withPlayerCookie(NextResponse.json({ code }, { status: 201, headers: NO_STORE }), code, token);
  } catch (error) {
    return errorResponse(error);
  }
}
