import { NextResponse, type NextRequest } from "next/server";
import { rateGame } from "@/lib/rooms";
import { codeFrom, errorResponse, limit, NO_STORE, readJson, tokenFor } from "@/lib/rooms/http";

/** Rates the finished case. Body: { rating: 1-5, comment?: string }. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await limit(request, "feedback");
    const code = await codeFrom(params);
    const body = await readJson(request);
    await rateGame(code, tokenFor(request, code), Number(body.rating), String(body.comment ?? ""));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return errorResponse(error);
  }
}
