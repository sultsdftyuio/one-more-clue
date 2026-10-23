import { NextResponse, type NextRequest } from "next/server";
import { getGameView } from "@/lib/rooms";
import { codeFrom, errorResponse, NO_STORE, tokenFor } from "@/lib/rooms/http";

export const dynamic = "force-dynamic";

/**
 * The room as the calling player may see it. Clients poll this with
 * ?v=<version they have> (204 when nothing changed) and &beat=1 now and then
 * to show they're still online.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = await codeFrom(params);
    const query = request.nextUrl.searchParams;
    const known = query.has("v") ? Number(query.get("v")) : undefined;
    const view = await getGameView(code, tokenFor(request, code), {
      known: Number.isFinite(known) ? known : undefined,
      heartbeat: query.get("beat") === "1",
    });
    if (!view) return new NextResponse(null, { status: 204, headers: NO_STORE });
    return NextResponse.json(view, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
