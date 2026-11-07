import type { PropName } from "@/lib/art";

/** Teaser copy for the launch case. Names stay redacted on the landing page. */
export const case001 = {
  code: "Case 001",
  title: "The Last Message",
  // No play time until a real playtest gives us one.
  meta: ["Free", "2–4 players", "Co-op", "Opens with a film"],
  premise:
    "At 9:17 PM, a university innovation lab reports that its prototype has disappeared. Four people were inside the building that evening, and all four have an explanation.",
  redactedNames: 4,
  twist:
    "A final message seems to settle it. But its timestamp, a visitor record and one person's story don't agree.",
  // One find per role, then the face-off. Hints at the tools, never at the answer.
  evidence: [
    { who: "Photographer", prop: "polaroid", label: "A lab photo worth zooming into" },
    { who: "Interviewer", prop: "question", label: "Four suspects with stories to crack" },
    { who: "Tech", prop: "keycard", label: "Badge logs, laptops and number plates" },
    { who: "Archivist", prop: "phone", label: "A group chat with one edited message" },
    { who: "Everyone", prop: "fingerprint", label: "One culprit to corner with proof" },
  ] satisfies { who: string; prop: PropName; label: string }[],
};
