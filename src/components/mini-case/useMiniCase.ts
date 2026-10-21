"use client";

import { useState } from "react";
import type { SuspectId } from "@/data/suspects";

export type Verdict = "cleared" | "busted";

/** Accusation state: who has been accused, whether the liar was caught, and the latest wrong guess. */
export function useMiniCase(liar: SuspectId) {
  const [verdicts, setVerdicts] = useState<Partial<Record<SuspectId, Verdict>>>({});
  const [lastWrong, setLastWrong] = useState<SuspectId | null>(null);

  const wrongGuesses = Object.values(verdicts).filter((v) => v === "cleared").length;
  const solved = verdicts[liar] === "busted";

  function accuse(id: SuspectId) {
    if (solved || verdicts[id]) return;
    const verdict: Verdict = id === liar ? "busted" : "cleared";
    setVerdicts((prev) => ({ ...prev, [id]: verdict }));
    setLastWrong(verdict === "cleared" ? id : null);
  }

  function reset() {
    setVerdicts({});
    setLastWrong(null);
  }

  return { verdicts, solved, wrongGuesses, lastWrong, accuse, reset };
}
