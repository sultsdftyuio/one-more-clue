"use client";

import type { EvidenceBody } from "@/lib/game/types";
import { useGame } from "../../context";
import { caseRef } from "./ref";

type Document = Extract<EvidenceBody, { type: "document" }>;

/** A typed sheet from the file: hole-punched, paper-clipped and stamped when it was logged. */
export function TypedSheet({ id, body }: { id: string; body: Document }) {
  const { view } = useGame();
  return (
    <div className="obj-sheet relative border-2 border-ink pt-5 pr-4 pb-12 pl-9 text-ink">
      <span aria-hidden className="obj-clip absolute -top-2.5 right-8" />
      <span aria-hidden className="obj-punch absolute top-[18%] left-3" />
      <span aria-hidden className="obj-punch absolute bottom-[18%] left-3" />
      <p className="font-typed text-[1.05rem] leading-7 whitespace-pre-line">{body.text}</p>
      <span aria-hidden className="absolute right-3 bottom-2 -rotate-[9deg] rounded-md border-[3px] border-[#26408b]/55 px-2 py-0.5 text-center font-typed text-xs leading-tight text-[#26408b]/70">
        Filed
        <span className="block">{caseRef(view.case.code, id)}</span>
      </span>
    </div>
  );
}
