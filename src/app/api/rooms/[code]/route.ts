import { NextResponse, type NextRequest } from "next/server";
import { getGameView } from "@/lib/rooms";
import { codeFrom, errorResponse, NO_STORE, tokenFor } from "@/lib/rooms/http";

export const dynamic = "force-dynamic";

/** The room as the calling player may see it. Clients poll this. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeFrom(params);
    const view = await getGameView(code, tokenFor(request, code));
    return NextResponse.json(view, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
