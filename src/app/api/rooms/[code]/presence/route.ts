import { NextResponse, type NextRequest } from "next/server";
import { getPresencePass } from "@/lib/rooms";
import { codeFrom, errorResponse, limit, NO_STORE, tokenFor } from "@/lib/rooms/http";

/** This player's pass into the world's presence channel (W3.1): { enabled: false } without LiveKit or outside a world room. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await limit(request, "live");
    const code = await codeFrom(params);
    return NextResponse.json(await getPresencePass(code, tokenFor(request, code)), { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
