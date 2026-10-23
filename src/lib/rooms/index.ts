import { randomBytes, randomInt } from "node:crypto";
import { caseById } from "@/data/cases";
import { BOT_NAMES, nextBotMove } from "@/lib/game/bots";
import { activePlayers, addPlayer, applyAction, cleanName, createRoom, viewFor, type PlayerView } from "@/lib/game/engine";
import type { Action, CaseFile, Mode, RoomState } from "@/lib/game/types";
import { redisConfigured } from "@/lib/waitlist/redis-store";
import { createFileStore } from "./file-store";
import { createRedisStore } from "./redis-store";
import type { RoomStore } from "./types";

/** A player counts as online if they checked in within this window (clients poll every few seconds). */
const ONLINE_MS = 15_000;
const WRITE_ATTEMPTS = 5;

/** No 0/O or 1/I, so codes survive being read out loud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 4;

/**
 * Redis in production. Local development uses JSON files so testing doesn't
 * spend the Upstash quota; set ROOMS_STORE=redis to try Redis locally.
 */
function getRoomStore(): RoomStore {
  const useRedis = process.env.NODE_ENV === "production" || process.env.ROOMS_STORE === "redis";
  if (!useRedis) return createFileStore();
  if (redisConfigured()) return createRedisStore();
  throw new Error("Room storage is not configured. Connect Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN).");
}

/** Bots are for testing: on locally and on Vercel previews, never on the live site (unless GAME_TEST_BOTS=1). */
const botsAllowed = () =>
  process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview" || process.env.GAME_TEST_BOTS === "1";

/** A problem to show the player, with the HTTP status to send. */
export class RoomError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const normalizeCode = (code: string) =>
  code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);

const newCode = () => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
const newToken = () => randomBytes(24).toString("base64url");
const newId = () => randomBytes(6).toString("base64url");

/** The cookie that remembers which player you are in a room. */
export const playerCookie = (code: string) => `omc_room_${code}`;

function caseOf(state: RoomState): CaseFile {
  const caseFile = caseById(state.caseId);
  if (!caseFile) throw new RoomError("This room's case no longer exists.", 410);
  return caseFile;
}

async function load(store: RoomStore, code: string) {
  const state = await store.get(code);
  if (!state) throw new RoomError("There's no room with that code. It may have expired.", 404);
  return state;
}

function playerByToken(state: RoomState, token: string | undefined) {
  return token ? state.players.find((p) => p.token === token && !p.left) : undefined;
}

async function viewOf(store: RoomStore, state: RoomState, playerId: string): Promise<PlayerView> {
  const now = Date.now();
  await store.touch(state.code, playerId, now);
  const seen = await store.seen(state.code);
  const online = new Set(Object.entries(seen).flatMap(([id, at]) => (now - at < ONLINE_MS ? [id] : [])));
  online.add(playerId);
  return { ...viewFor(state, caseOf(state), playerId, online), testBots: botsAllowed() };
}

/**
 * Lets one bot make its next move, if it's due. Players' polling is the clock,
 * so bots only move while someone has the room open.
 */
async function moveBots(store: RoomStore, state: RoomState): Promise<RoomState> {
  if (!state.players.some((p) => p.bot && !p.left)) return state;
  const caseFile = caseOf(state);
  if (!nextBotMove(state, caseFile, Date.now())) return state;
  try {
    return await update(store, state.code, (current) => {
      const now = Date.now();
      const move = nextBotMove(current, caseFile, now);
      if (!move) return current;
      const result = applyAction(current, caseFile, move.playerId, move.action, now, newId);
      return result.ok ? { ...result.state, botMovedAt: now } : { ...current, botMovedAt: now, version: current.version + 1 };
    });
  } catch {
    // A busy room just means the bot waits for the next poll.
    return state;
  }
}

function addBot(state: RoomState): RoomState {
  if (!botsAllowed()) throw new RoomError("Test players are only available on test builds.", 403);
  const taken = new Set(activePlayers(state).map((p) => p.name));
  const name = BOT_NAMES.find((n) => !taken.has(n)) ?? `Bot ${state.players.length + 1}`;
  const result = addPlayer(state, caseOf(state), { id: newId(), token: newToken(), name, bot: true }, Date.now());
  if (!result.ok) throw new RoomError(result.error, 400);
  return result.state;
}

/** Read, change, write; retried when someone else's write lands in between. */
async function update(store: RoomStore, code: string, change: (state: RoomState) => RoomState) {
  for (let attempt = 0; attempt < WRITE_ATTEMPTS; attempt++) {
    const current = await load(store, code);
    const next = change(current);
    if (next === current) return current;
    if (await store.replace(next, current.version)) return next;
  }
  throw new RoomError("The room is busy. Try again.", 409);
}

export async function createGame(input: { caseId: string; name: string; mode: Mode }) {
  const caseFile = caseById(input.caseId);
  if (!caseFile) throw new RoomError("Unknown case.", 400);
  const name = cleanName(input.name);
  if (!name) throw new RoomError("Pick a name first.", 400);
  const mode: Mode = input.mode === "remote" ? "remote" : "together";

  const store = getRoomStore();
  const token = newToken();
  for (let attempt = 0; attempt < 10; attempt++) {
    const state = createRoom({ code: newCode(), caseFile, host: { id: newId(), token, name }, mode, now: Date.now() });
    if (await store.create(state)) return { code: state.code, token };
  }
  throw new RoomError("Couldn't find a free room code. Try again.", 503);
}

/** Joining again with a valid token is a no-op, so refreshing the page never makes a second player. */
export async function joinGame(code: string, name: string, token: string | undefined) {
  const store = getRoomStore();
  const existing = playerByToken(await load(store, code), token);
  if (existing && token) return { token };

  const fresh = newToken();
  await update(store, code, (state) => {
    const result = addPlayer(state, caseOf(state), { id: newId(), token: fresh, name }, Date.now());
    if (!result.ok) throw new RoomError(result.error, 400);
    return result.state;
  });
  return { token: fresh };
}

/** The room as this player may see it, or a 403 when they still need to join. */
export async function getGameView(code: string, token: string | undefined) {
  const store = getRoomStore();
  const state = await load(store, code);
  const me = playerByToken(state, token);
  if (!me) throw new RoomError(state.phase === "lobby" ? "Join this room first." : "This case has already started.", 403);
  return viewOf(store, await moveBots(store, state), me.id);
}

export async function actInGame(code: string, token: string | undefined, action: Action) {
  const store = getRoomStore();
  let playerId = "";
  const state = await update(store, code, (current) => {
    const me = playerByToken(current, token);
    if (!me) throw new RoomError("You're not in this room.", 403);
    playerId = me.id;
    if (action.type === "addBot") {
      if (current.hostId !== me.id) throw new RoomError("Only the host can add test players.", 400);
      return addBot(current);
    }
    const result = applyAction(current, caseOf(current), me.id, action, Date.now(), newId);
    if (!result.ok) throw new RoomError(result.error, 400);
    return result.state;
  });
  // Someone who just left can't see the room any more.
  if (!playerByToken(state, token)) return null;
  return viewOf(store, state, playerId);
}
