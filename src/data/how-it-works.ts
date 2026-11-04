import type { PropName } from "@/lib/art";

export type Step = { prop: PropName; title: string; text: string };

export const steps: Step[] = [
  {
    prop: "phone",
    title: "Open the link",
    text: "No app, no sign-up. Drop one link in your group chat, play in the same room or on a call, and everyone gets a role.",
  },
  {
    prop: "magnifier",
    title: "Work your role",
    text: "Pull records, question suspects, zoom into photos, hold two stories side by side. Your find opens a teammate's next move, and the best of it goes on the team board.",
  },
  {
    prop: "fingerprint",
    title: "Prove it to their face",
    text: "Each chapter ends with the team showing its proof. Then the culprit lies to you, and you break every lie with evidence. Objection!",
  },
];

// No play time here until a real playtest gives us one.
export const facts = [
  { value: "4", label: "roles, each with a power" },
  { value: "2–4", label: "detectives" },
  { value: "0", label: "apps to install" },
  { value: "1st", label: "case free" },
];
