import { NextResponse, type NextRequest } from "next/server";
import { cleanLabName, labLivePass, presenceLabOpen } from "@/lib/presence/lab";

/** W0.5 spike: a data-only LiveKit pass for the presence lab. 404 on the live site. */
export async function GET(request: NextRequest) {
  if (!presenceLabOpen()) return new NextResponse(null, { status: 404 });
  const params = request.nextUrl.searchParams;
  const room = cleanLabName(params.get("room"), "lab");
  const id = cleanLabName(params.get("id"), crypto.randomUUID().slice(0, 8));
  return NextResponse.json(await labLivePass(room, id), { headers: { "Cache-Control": "no-store" } });
}
