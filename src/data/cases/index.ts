import type { CaseFile } from "@/lib/game/types";
import { practiceTipJar } from "./practice-tip-jar.ts";

/** Every case the engine can run. Case 001 joins this list once it's written. */
export const cases: CaseFile[] = [practiceTipJar];

export function caseById(id: string) {
  return cases.find((c) => c.id === id);
}
