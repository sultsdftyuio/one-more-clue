import { caseById } from "@/data/cases";

const file = caseById("case-001")!;

/**
 * Case 001 on the landing page: its poster, its one-line hook from the game,
 * and its four suspects by job, with their names kept classified.
 * Server-only: the case file holds the answer, so this never goes to a client component.
 */
export const case001 = {
  code: "Case 001",
  title: file.title,
  /** The same line the game's lobby shows. */
  tagline: file.tagline,
  // No play time until a real playtest gives us one.
  meta: ["Free", "2–4 players", "Co-op", "Opens with a film"],
  suspects: file.suspects.map((s) => ({ look: s.look!, role: s.role })),
};
