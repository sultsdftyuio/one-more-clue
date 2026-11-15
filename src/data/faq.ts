import type { IconName } from "@/components/game/ui/Icon";

export type Question = { icon: IconName; q: string; a: string };

/**
 * What people ask before their first case. Every answer is how the game works today
 * (modes from the lobby's booth, roles from dealRoles, hints from the engine), so keep
 * them in step if those change. These also go into the page's FAQ structured data.
 */
export const faq: Question[] = [
  {
    icon: "headset",
    q: "Do we need to be in the same room?",
    a: "No. Together, the film and music play on the host's phone, so nothing echoes. Apart, everyone watches on their own phone and talks over the voice chat built into the game.",
  },
  {
    icon: "share",
    q: "Does everyone need to buy it?",
    a: "No. Case 001 is free for everyone. For the other cases only the host buys; friends join free with the link.",
  },
  {
    icon: "users",
    q: "What if there are only two or three of us?",
    a: "Cases are for 2 to 4 players. Every case has four roles, and they go round the table, so in a smaller group some of you hold two.",
  },
  {
    icon: "desk",
    q: "Do we have to download anything?",
    a: "No app and no sign-up to play. Each of you needs a phone with a browser, and the host sends the link.",
  },
  {
    icon: "bulb",
    q: "What if we get stuck?",
    a: "Every chapter has hints, and the team votes to open one. They cost no time on the night's clock. Only the star for a sharp run asks you to use one at most.",
  },
  {
    icon: "clock",
    q: "What happens if we guess wrong?",
    a: "You lose a big chunk of the night's clock and carry on. If the night runs out, the case is lost, so talk it through before you vote.",
  },
];
