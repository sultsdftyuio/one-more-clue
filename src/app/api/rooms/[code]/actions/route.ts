import { NextResponse, type NextRequest } from "next/server";
import { actInGame } from "@/lib/rooms";
import { codeFrom, errorResponse, limit, NO_STORE, readJson, tokenFor } from "@/lib/rooms/http";
import type { Action } from "@/lib/game/types";

/** Runs one game action for the calling player. Body: { action }. Returns their updated view. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await limit(request, "act");
    const code = await codeFrom(params);
    const { action } = await readJson(request);
    if (!action || typeof action !== "object" || typeof (action as Action).type !== "string") {
      return NextResponse.json({ error: "Missing action." }, { status: 400, headers: NO_STORE });
    }
    const view = await actInGame(code, tokenFor(request, code), action as Action);
    return NextResponse.json({ view }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
