import type { PropName } from "@/lib/art";

/** The small piece of evidence each step carries beside its words. */
export type Clue = "seats" | "film" | "roles" | "vote" | "objection" | "stars";

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
 * test rooms of Case 001, with anything that would give
 * a case away hidden behind question marks or a CLASSIFIED stamp.
 */
export const steps: Step[] = [
  {
    prop: "phone",
    title: "Take your seats",
    text: "Pick a case and watch its trailer, then drop one link in your group chat: no app, no sign-up. Friends take a seat in the lobby, and the host pulls the lever to roll the film.",
    clue: "seats",
    screen: { src: "/screens/night-lobby.webp", alt: "The lobby's projection booth: Case 001's trailer playing over four friends in their seats, and a lever to pull down to start" },
  },
  {
    prop: "clock",
    title: "Watch it open",
    text: "Every case starts with a short film about the night, the crime and the people who were there. In the same room it plays on the host's phone, so you watch it together.",
    clue: "film",
    screen: { src: "/screens/night-film.webp", alt: "Case 001's opening film: a lab clock at 9:17 PM" },
  },
  {
    prop: "magnifier",
    title: "Work your role",
    text: "Every phone becomes a different tool: a camera, an interrogation room, an evidence wall, a hacked computer. Your find opens a teammate's next move.",
    clue: "roles",
    screen: { src: "/screens/night-camera.webp", alt: "The Photographer's camera, zoomed in on a workbench in Case 001's lab, with a Shoot button" },
  },
  {
    prop: "folder",
    title: "Show your proof",
    text: "Each chapter ends with a question. Pin your best evidence and put it to a vote. Real proof opens the next chapter; a wrong answer costs time on the night's clock.",
    clue: "vote",
    screen: { src: "/screens/night-proof.webp", alt: "A player presents a piece from the board and the team votes on it, over the Tech's computer. The piece is blurred." },
  },
  {
    prop: "fingerprint",
    title: "Catch the lie",
    text: "The culprit tells their story one claim at a time. Call the lie with evidence from the board, and anyone who isn't sure has five seconds to shout Objection!",
    clue: "objection",
    screen: { src: "/screens/night-confront.webp", alt: "The confrontation: Mei calls a lie, with an Objection! button for everyone else. The culprit is hidden behind question marks." },
  },
  {
    prop: "sparkle",
    title: "Close the case",
    text: "Up to five stars: for naming the culprit, the motive, breaking their story, and a sharp run with no wrong answers.",
    clue: "stars",
    screen: { src: "/screens/night-reveal.webp", alt: "The reveal: case closed with five stars. The culprit is a question mark and the explanation is stamped classified." },
  },
];
