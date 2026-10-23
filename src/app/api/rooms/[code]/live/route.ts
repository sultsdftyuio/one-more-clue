import { NextResponse, type NextRequest } from "next/server";
import { getLivePass } from "@/lib/rooms";
import { codeFrom, errorResponse, limit, NO_STORE, tokenFor } from "@/lib/rooms/http";

/** This player's pass into the room's live channel: { enabled: false } until LiveKit is set up. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await limit(request, "live");
    const code = await codeFrom(params);
    return NextResponse.json(await getLivePass(code, tokenFor(request, code)), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
