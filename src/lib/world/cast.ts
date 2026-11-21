/**
 * Who wears which detective in the building. The four detective stickers carry their role's kit
 * (Mei the camera, Jo the headset, Ali the notebook, Sam the scarf), so once roles are dealt each
 * player wears their first role's sticker; before that, in the lobby, they go by seat.
 * Pure, so `node --test` covers it.
 */

/** The sticker that carries each role's kit. */
export const STICKER_FOR_ROLE: Record<string, string> = {
  photographer: "mei",
  tech: "jo",
  interviewer: "ali",
  archivist: "sam",
};

/** Lobby seats, left to right. */
const SEAT_STICKERS = ["sam", "mei", "ali", "jo"];

type Seated = { id: string; roles: string[]; seat: number };

/** Each detective sticker's player, keyed by sticker id. Stickers nobody wears are left out. */
export function stickersFor<P extends Seated>(players: P[]): Record<string, P> {
  const worn: Record<string, P> = {};
  const placed = new Set<string>();
  const wear = (sticker: string | undefined, player: P) => {
    if (!sticker || worn[sticker] || placed.has(player.id)) return;
    worn[sticker] = player;
    placed.add(player.id);
  };
  const bySeat = [...players].sort((a, b) => a.seat - b.seat);
  for (const player of bySeat) for (const role of player.roles) wear(STICKER_FOR_ROLE[role], player);
  for (const player of bySeat) wear(SEAT_STICKERS[player.seat], player);
  for (const player of bySeat) wear(SEAT_STICKERS.find((s) => !worn[s]), player);
  return worn;
}

/** The sticker a player wears, if any. */
export function stickerOf<P extends Seated>(players: P[], playerId: string): string | null {
  const worn = stickersFor(players);
  return Object.keys(worn).find((sticker) => worn[sticker].id === playerId) ?? null;
}

/** What a name tag says: first names, or the surname after a title ("Prof. Edmund Squires" is "Squires"). */
export function shortName(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length > 1 && words[0].endsWith(".") ? words[words.length - 1] : words[0];
}

/** The parts of the player's view the cast needs (PlayerView has them all). */
export type CastView = {
  me: { id: string };
  players: (Seated & { name: string })[];
  case: { suspects: { id: string; name: string; role?: string; blurb: string }[]; roles: { id: string; name: string }[] };
};

/** Who a person in the building is, for their name tag and the card that opens when they're tapped. */
export type CastMember = {
  id: string;
  /** The name tag; null for a detective nobody wears. */
  tag: string | null;
  name: string;
  line: string;
  blurb: string | null;
  me: boolean;
};

/** Everyone in the building by person id, from the player's view (no view yet: nobody is named). */
export function castOf(people: { id: string; detective?: boolean; suspect?: string }[], view: CastView | null): Record<string, CastMember> {
  if (!view) return {};
  const worn = stickersFor(view.players);
  const roleName = (id: string) => view.case.roles.find((r) => r.id === id)?.name ?? id;
  const cast: Record<string, CastMember> = {};
  for (const person of people) {
    if (person.detective) {
      const player = worn[person.id];
      cast[person.id] = player
        ? {
            id: person.id,
            tag: player.name,
            name: player.id === view.me.id ? `${player.name} (you)` : player.name,
            line: player.roles.length ? player.roles.map(roleName).join(" · ") : "Roles are dealt when the case starts",
            blurb: null,
            me: player.id === view.me.id,
          }
        : { id: person.id, tag: null, name: "Free detective", line: "Invite a friend to play this one", blurb: null, me: false };
      continue;
    }
    const suspect = view.case.suspects.find((s) => s.id === person.suspect);
    if (suspect) cast[person.id] = { id: person.id, tag: shortName(suspect.name), name: suspect.name, line: suspect.role ?? "Suspect", blurb: suspect.blurb, me: false };
  }
  return cast;
}
