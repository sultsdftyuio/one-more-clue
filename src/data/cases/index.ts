import type { CaseFile } from "@/lib/game/types";
import { case001 } from "./case-001.ts";
import { case002 } from "./case-002.ts";
import { case003 } from "./case-003.ts";
import { case004 } from "./case-004.ts";
import { practiceTipJar } from "./practice-tip-jar.ts";

/** Every case the engine can run, in the order the host sees them. */
export const cases: CaseFile[] = [case001, case002, case003, case004, practiceTipJar];

export function caseById(id: string) {
  return cases.find((c) => c.id === id);
}
