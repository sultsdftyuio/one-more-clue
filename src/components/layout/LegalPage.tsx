import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Where people reach the team about their data or the terms. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "[contact email: set NEXT_PUBLIC_CONTACT_EMAIL]";

/** Shared layout for the privacy policy and terms: readable prose on cream paper. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const reviewed = process.env.LEGAL_REVIEWED === "1";
  return (
    <>
      <SiteHeader />
      <main className="bg-night px-4 pt-28 pb-20 sm:px-6">
        <article className="mx-auto max-w-2xl rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-card sm:p-10">
          {!reviewed && (
            <p className="mb-6 rounded-2xl border-[3px] border-coral bg-coral/10 p-3 text-sm font-bold">
              Draft: this page hasn&apos;t been reviewed yet. It describes how the site works today, but it isn&apos;t legal
              advice. Have it checked before launch, then set LEGAL_REVIEWED=1.
            </p>
          )}
          <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-2 text-sm font-bold text-ink/55">Last updated {updated}</p>
          <div className="mt-6 space-y-4 leading-relaxed font-semibold [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
