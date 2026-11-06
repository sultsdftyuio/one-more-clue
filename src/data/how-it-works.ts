import type { PropName } from "@/lib/art";

/** The small piece of evidence each step carries beside its words. */
export type Clue = "invite" | "film" | "roles" | "vote" | "objection" | "stars";

export type Step = {
  prop: PropName;
  title: string;
  text: string;
  clue: Clue;
  /** A real screen from the game at this moment, shown on the phone. */
  screen: { src: string; alt: string };
};

/**
 * How a night plays, in six moments. The screens are real game screens from
 * test rooms (the practice case and Case 001), with anything that would give
 * a case away blacked out.
 */
export const steps: Step[] = [
  {
    prop: "phone",
    title: "Open the link",
    text: "No app, no sign-up. Drop one link in your group chat, play in the same room or on a call, and everyone gets a role.",
    clue: "invite",
    screen: { src: "/screens/night-lobby.webp", alt: "The lobby: the room code to share and the detectives who've joined" },
  },
  {
    prop: "clock",
    title: "Watch it open",
    text: "Every case starts with a short film: the night, the crime, the people who were there. In the same room it plays on the host's phone, so you watch it together.",
    clue: "film",
    screen: { src: "/screens/night-film.webp", alt: "Case 001's opening film: a lab clock at 9:17 PM" },
  },
  {
    prop: "magnifier",
    title: "Work your role",
    text: "Every phone becomes a different tool: a camera, an interrogation room, an evidence wall, a hacked computer. Your find opens a teammate's next move.",
    clue: "roles",
    screen: { src: "/screens/night-camera.webp", alt: "The Photographer's camera, zoomed in on the café counter, with a Shoot button" },
  },
  {
    prop: "folder",
    title: "Show your proof",
    text: "Each chapter ends with a question. Pin your best evidence and put it to a vote. Real proof opens the next chapter; a wrong answer costs time on the night's clock.",
    clue: "vote",
    screen: { src: "/screens/night-vote.webp", alt: "A teammate presents a piece from the board and the team votes on it, over the interrogation room" },
  },
  {
    prop: "fingerprint",
    title: "Catch the lie",
    text: "The culprit tells their story one claim at a time. Call the lie with evidence from the board, and anyone who isn't sure has five seconds to shout Objection!",
    clue: "objection",
    screen: { src: "/screens/night-objection.webp", alt: "The confrontation: a teammate calls a lie, with an Objection! button for everyone else" },
  },
  {
    prop: "sparkle",
    title: "Close the case",
    text: "Up to five stars: for naming the culprit, the motive, breaking their story, and a sharp run with no wrong answers.",
    clue: "stars",
    screen: { src: "/screens/night-stars.webp", alt: "The reveal: case closed with five stars, the culprit's name blacked out" },
  },
];

// No play time here until a real playtest gives us one.
export const facts = [
  { value: "4", label: "roles, each with its own tool" },
  { value: "2–4", label: "detectives" },
  { value: "0", label: "apps to install" },
  { value: "1st", label: "case free" },
];
