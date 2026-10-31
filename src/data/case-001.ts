import type { PropName } from "@/lib/art";

/** Teaser copy for the launch case. Names stay redacted on the landing page. */
export const case001 = {
  code: "Case 001",
  title: "The Last Message",
  meta: ["Free", "15–20 min", "2–4 players", "Co-op"],
  premise:
    "At 9:17 PM, a university innovation lab reports that its prototype has disappeared. Four people were inside the building that evening, and all four have an explanation.",
  redactedNames: 4,
  twist:
    "A final message seems to settle it. But its timestamp, a visitor record and one person's story don't agree.",
  evidence: [
    { prop: "phone", label: "A group chat with one edited message" },
    { prop: "keycard", label: "The building's access log" },
    { prop: "polaroid", label: "A photo with a detail nobody noticed" },
    { prop: "question", label: "Two statements that can't both be true" },
    { prop: "folder", label: "One last clue that changes everything" },
  ] satisfies { prop: PropName; label: string }[],
};
