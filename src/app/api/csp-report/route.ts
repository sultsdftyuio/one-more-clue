import type { NextRequest } from "next/server";

const cut = (v: unknown) => String(v ?? "").slice(0, 200);

/**
 * Browsers post here when a page breaks the Content-Security-Policy (see
 * src/middleware.ts). One short line per report lands in the Vercel logs, so
 * we can see what a stricter policy would block before turning it on.
 */
export async function POST(request: NextRequest) {
  const text = (await request.text().catch(() => "")).slice(0, 8_000);
  try {
    const body = JSON.parse(text);
    // report-uri sends { "csp-report": {...} }; the Reporting API sends [{ body: {...} }].
    const reports = Array.isArray(body) ? body.map((r) => r?.body) : [body?.["csp-report"]];
    for (const r of reports.slice(0, 5)) {
      if (!r) continue;
      const directive = r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"];
      const blocked = r["blocked-uri"] ?? r.blockedURL;
      const page = r["document-uri"] ?? r.documentURL;
      console.warn(`[csp] ${cut(directive)} blocked ${cut(blocked)} on ${cut(page)}`);
    }
  } catch {
    // Not a report; ignore it.
  }
  return new Response(null, { status: 204 });
}
