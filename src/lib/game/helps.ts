/**
 * Side jobs and the helps they win (W6 in docs/world-overhaul.md). Short games in the building help the team a
 * little and never name anyone:
 * - Coffee: the next move that would cost time (a question, or a shot, show or password that misses) costs none.
 * - Lightbulb: a room glows while it still holds something the team hasn't found this chapter. It lights a room,
 *   never the clue.
 * - Sore spot: the topic that makes one suspect uneasy. Every suspect has one, innocent ones too.
 *
 * Every job can be done once per chapter by anyone on the team (a sore spot, once won, stays won), and none can be
 * failed: a weak run just wins less. A team event (Lights out) fires once, at a story beat, for every phone at once.
 * Pure functions over the room state, like the engine that calls them. World rooms only.
 */
import type { CaseEvidence, CaseFile, Player, RoomState } from "./types.ts";

/** How long a team event lasts before the lights come back on their own. */
export const EVENT_MS = 20_000;
/** A team event fires once this many pieces have been found (not dealt) in its chapter. */
export const EVENT_AFTER_FINDS = 3;

export type Help = "coffee" | "lightbulb" | "sore-spot";
type Logger = (text: string, playerId?: string) => void;

const helpsOf = (state: RoomState) => (state.helps ??= { coffee: 0, lit: [], sore: [] });

/**
 * The rooms that still hold something nobody has turned up yet this chapter: a record at one of its spots still to
 * be pulled, asked or crossed, or a detail still to be spotted in a photo kept there.
 */
export function roomsWithSomethingLeft(state: Pick<RoomState, "found" | "chapter">, caseFile: CaseFile): string[] {
  const world = caseFile.world;
  if (!world) return [];
  const left = (e: CaseEvidence | undefined) => Boolean(e && e.chapter <= state.chapter && e.access.kind !== "desk" && !state.found[e.id]);
  const byId = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const rooms = new Set<string>();
  for (const spot of world.spots) {
    for (const id of spot.evidence ?? []) {
      const details = caseFile.evidence.filter((e) => e.access.kind === "inspect" && e.access.scene === id);
      if (left(byId.get(id)) || details.some(left)) rooms.add(spot.room);
    }
  }
  return world.rooms.filter((r) => rooms.has(r.id)).map((r) => r.id);
}

/** The rooms lit now: lit this chapter, and still holding something. A room searched out goes dark by itself. */
export function litRooms(state: RoomState, caseFile: CaseFile): string[] {
  const left = new Set(roomsWithSomethingLeft(state, caseFile));
  return [...new Set((state.helps?.lit ?? []).filter((l) => l.chapter === state.chapter && left.has(l.room)).map((l) => l.room))];
}

/** Lights the next room with something left that isn't lit yet; null when there's none. */
function lightARoom(state: RoomState, caseFile: CaseFile): string | null {
  const lit = new Set(litRooms(state, caseFile));
  const room = roomsWithSomethingLeft(state, caseFile).find((r) => !lit.has(r));
  if (!room) return null;
  helpsOf(state).lit.push({ room, chapter: state.chapter });
  return room;
}

const roomName = (caseFile: CaseFile, id: string) => caseFile.world?.rooms.find((r) => r.id === id)?.name ?? id;

/** Takes a coffee for a move that would cost time, if the team has one. */
export function drinkCoffee(state: RoomState): boolean {
  const helps = state.helps;
  if (!helps?.coffee) return false;
  helps.coffee -= 1;
  return true;
}

/** Whether a job is done for the team: this chapter, or ever for a sore spot already won. */
export function jobDone(state: RoomState, caseFile: CaseFile, jobId: string) {
  const job = caseFile.world?.sideJobs.find((j) => j.id === jobId);
  if (!job) return null;
  if (job.help === "sore-spot" && job.suspect && state.helps?.sore.includes(job.suspect)) {
    return Object.values(state.jobs ?? {}).find((d) => d.job === jobId) ?? { job: jobId, by: "", at: 0, stars: 3, chapter: 0 };
  }
  return state.jobs?.[`${state.chapter}:${jobId}`] ?? null;
}

/** A finished side job: the help it wins goes to the whole team. Returns a problem, or null when it's done. */
export function finishSideJob(state: RoomState, caseFile: CaseFile, me: Player, jobId: string, stars: number, now: number, log: Logger): string | null {
  const job = caseFile.world?.sideJobs.find((j) => j.id === jobId);
  if (!job) return "There's no job like that here.";
  if (job.event) return "That one happens to everyone at once.";
  if (jobDone(state, caseFile, jobId)) return "Someone on your team has done that one already.";
  const score = Math.min(3, Math.max(1, Math.round(Number(stars) || 1)));
  state.jobs = { ...state.jobs, [`${state.chapter}:${jobId}`]: { job: jobId, by: me.id, at: now, stars: score, chapter: state.chapter } };
  const where = caseFile.world!.spots.find((s) => s.id === job.spot)?.name ?? "a side job";
  const helps = helpsOf(state);
  if (job.help === "coffee") {
    const cups = score === 3 ? 2 : 1;
    helps.coffee += cups;
    log(`${me.name} made ${cups === 2 ? "two coffees" : "a coffee"} at ${where}. The team's next ${cups === 2 ? "two moves" : "move"} that would cost time won't.`, me.id);
  } else if (job.help === "lightbulb") {
    const room = lightARoom(state, caseFile);
    log(room ? `${me.name} won a Lightbulb at ${where}. ${roomName(caseFile, room)} is glowing: something there is still to be found.` : `${me.name} won a Lightbulb at ${where}, but every room is searched out for now.`, me.id);
  } else {
    const suspect = caseFile.suspects.find((s) => s.id === job.suspect);
    const sore = job.suspect ? caseFile.world!.soreSpots[job.suspect] : undefined;
    if (!suspect || !sore) return "That favour has no one to do it for.";
    helps.sore = [...new Set([...helps.sore, suspect.id])];
    log(`${me.name} did ${suspect.name} a favour. Sore spot: ${suspect.name} gets uneasy about ${sore.topic}.`, me.id);
  }
  return null;
}

/** Starts the chapter's team event once its story beat comes (enough finds), for world rooms. */
export function startEventIfDue(state: RoomState, caseFile: CaseFile, now: number, log: Logger) {
  if (!state.world || state.phase !== "investigation" || state.event) return;
  const job = caseFile.world?.sideJobs.find((j) => j.event && !(state.events ?? []).includes(j.id));
  if (!job || state.chapter !== 1) return;
  const finds = caseFile.evidence.filter((e) => e.chapter === state.chapter && e.access.kind !== "desk" && state.found[e.id]).length;
  if (finds < EVENT_AFTER_FINDS) return;
  state.event = { job: job.id, at: now, endsAt: now + EVENT_MS, flipped: [] };
  state.events = [...(state.events ?? []), job.id];
  log("The storm knocks the power out. Everyone, flip your fuse!");
}

/** Ends a team event that's run its time or that everyone has done: one Lightbulb for each player who did their part. */
export function closeEventIfOver(state: RoomState, caseFile: CaseFile, now: number, log: Logger) {
  const event = state.event;
  if (!event) return;
  const players = state.players.filter((p) => !p.left);
  const everyone = players.every((p) => event.flipped.includes(p.id));
  if (now < event.endsAt && !everyone) return;
  state.event = undefined;
  const lit = event.flipped.map(() => lightARoom(state, caseFile)).filter((r): r is string => r !== null);
  const who = event.flipped.length === players.length ? "Everyone" : event.flipped.length ? `${event.flipped.length} of you` : "Nobody";
  log(
    `The lights are back. ${who} flipped a fuse${lit.length ? `: ${lit.map((r) => roomName(caseFile, r)).join(" and ")} ${lit.length === 1 ? "is" : "are"} glowing.` : "."}`,
  );
}

/** My part of the team event. */
export function flipFuse(state: RoomState, me: Player, now: number): string | null {
  const event = state.event;
  if (!event || now >= event.endsAt) return "The lights are already on.";
  if (event.flipped.includes(me.id)) return "Your fuse is already flipped.";
  event.flipped = [...event.flipped, me.id];
  return null;
}

/** A side job as a player's phone gets it. */
export type SideJobView = {
  id: string;
  game: string;
  help: Help;
  spot: { id: string; name: string; room: string; x: number; z: number };
  suspect: { id: string; name: string } | null;
  done: { by: string; stars: number } | null;
};

/** The team's helps as everyone sees them: cups of coffee, glowing rooms, and the sore spots won so far. */
export type HelpsView = { coffee: number; lit: string[]; sore: { suspect: string; name: string; topic: string; about: string[] }[] };

export function jobsFor(state: RoomState, caseFile: CaseFile): SideJobView[] {
  const world = caseFile.world;
  if (!world || !state.world || state.phase !== "investigation") return [];
  return world.sideJobs.flatMap((job) => {
    if (job.event) return [];
    const spot = world.spots.find((s) => s.id === job.spot);
    if (!spot) return [];
    const suspect = job.suspect ? caseFile.suspects.find((s) => s.id === job.suspect) : undefined;
    const done = jobDone(state, caseFile, job.id);
    return [
      {
        id: job.id,
        game: job.game,
        help: job.help,
        spot: { id: spot.id, name: spot.name, room: spot.room, x: spot.x, z: spot.z },
        suspect: suspect ? { id: suspect.id, name: suspect.name } : null,
        done: done ? { by: done.by, stars: done.stars } : null,
      },
    ];
  });
}

export function helpsFor(state: RoomState, caseFile: CaseFile): HelpsView {
  const world = caseFile.world;
  return {
    coffee: state.helps?.coffee ?? 0,
    lit: state.world ? litRooms(state, caseFile) : [],
    sore: (state.helps?.sore ?? []).flatMap((id) => {
      const suspect = caseFile.suspects.find((s) => s.id === id);
      const sore = world?.soreSpots[id];
      return suspect && sore ? [{ suspect: id, name: suspect.name, topic: sore.topic, about: sore.about }] : [];
    }),
  };
}
