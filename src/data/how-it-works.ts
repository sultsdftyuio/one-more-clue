import type { PropName } from "@/lib/art";

export type Step = { prop: PropName; title: string; text: string };

export const steps: Step[] = [
  {
    prop: "phone",
    title: "Open the link",
    text: "No app, no sign-up. Drop one link in your group chat and everyone's in the case.",
  },
  {
    prop: "magnifier",
    title: "Investigate together",
    text: "Dig through chats, access logs, photos and alibis. Compare notes. Argue a little.",
  },
  {
    prop: "fingerprint",
    title: "Make the accusation",
    text: "Lock in your verdict and watch the reveal rebuild what really happened, clue by clue.",
  },
];

export const facts = [
  { value: "15–25", label: "minutes a case" },
  { value: "2–4", label: "detectives" },
  { value: "0", label: "apps to install" },
  { value: "1st", label: "case free" },
];
