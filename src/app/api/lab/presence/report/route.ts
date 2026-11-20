import { appendFile, mkdir } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { presenceLabOpen } from "@/lib/presence/lab";

/**
 * W0.5 spike: each phone posts its numbers at the end of a lab test. They go
 * to the server log ("[presence-lab]"), and in local dev to
 * .data/presence-lab.jsonl too, so a phone test needs no copy and paste.
 */
export async function POST(request: NextRequest) {
  if (!presenceLabOpen()) return new NextResponse(null, { status: 404 });
  const text = await request.text();
  if (text.length > 64_000) return new NextResponse(null, { status: 413 });
  let report: unknown;
  try {
    report = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const line = JSON.stringify({ receivedAt: new Date().toISOString(), report });
  console.log(`[presence-lab] ${line}`);
  if (process.env.NODE_ENV !== "production") {
    await mkdir(".data", { recursive: true });
    await appendFile(".data/presence-lab.jsonl", `${line}\n`);
  }
  return new NextResponse(null, { status: 204 });
}
