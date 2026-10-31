"use client";

import type { EvidenceBody } from "@/lib/game/types";
import { useGame } from "../../context";
import { SuspectPortrait } from "../../parts";
import { caseRef } from "./ref";

type Statement = Extract<EvidenceBody, { type: "statement" }>;

/** A signed witness statement, with the speaker's photo clipped to the corner. */
export function StatementForm({ id, body }: { id: string; body: Statement }) {
  const { view } = useGame();
  const suspect = view.case.suspects.find((s) => s.name === body.speaker);
  return (
    <div className="obj-form relative rounded-sm border-2 border-ink px-4 pt-3 pb-4 text-ink">
      <header className="flex items-baseline justify-between gap-3 border-b-2 border-ink pb-1.5">
        <p className="font-typed text-lg leading-tight">Witness statement</p>
        <p className="font-typed text-xs whitespace-nowrap text-ink/60">Ref. {caseRef(view.case.code, id)}</p>
      </header>
      <div className="mt-3 flex items-start gap-3">
        <dl className="min-w-0 flex-1 text-sm">
          <dt className="text-[0.7rem] font-extrabold text-ink/50">Name</dt>
          <dd className="truncate border-b border-dotted border-ink/40 font-typed text-base">{body.speaker}</dd>
          {suspect?.role && (
            <>
              <dt className="mt-1.5 text-[0.7rem] font-extrabold text-ink/50">Occupation</dt>
              <dd className="truncate border-b border-dotted border-ink/40 font-typed text-base">{suspect.role}</dd>
            </>
          )}
        </dl>
        <span className="obj-mugshot relative -mt-1 w-[4.5rem] shrink-0 rotate-2 border-2 border-ink bg-white p-1">
          <span aria-hidden className="obj-clip absolute -top-2.5 left-2" />
          {suspect ? (
            <SuspectPortrait suspect={suspect} className="mx-auto w-full" />
          ) : (
            <span className="grid aspect-square place-items-center bg-cream-dk font-display text-2xl">{body.speaker[0]}</span>
          )}
        </span>
      </div>
      <p className="obj-ruled mt-3 font-typed text-[1.05rem]">&ldquo;{body.text}&rdquo;</p>
      <footer className="mt-3 flex items-end gap-2">
        <span className="text-[0.7rem] font-extrabold text-ink/50">Signed</span>
        <span className="flex-1 -rotate-1 border-b-2 border-ink/50 font-hand text-2xl leading-none text-[#26408b]">{body.speaker}</span>
      </footer>
    </div>
  );
}
