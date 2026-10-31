"use client";

import { createContext, useContext } from "react";
import type { PlayerView, VisibleEvidence } from "@/lib/game/engine";
import type { Action } from "@/lib/game/types";

export type Act = (action: Action, options?: { quiet?: boolean }) => Promise<boolean>;

type Game = {
  view: PlayerView;
  act: Act;
  busy: boolean;
  /** Opens a piece of evidence full size. */
  open: (evidenceId: string) => void;
};

const GameContext = createContext<Game | null>(null);
export const GameProvider = GameContext.Provider;

export function useGame() {
  const game = useContext(GameContext);
  if (!game) throw new Error("useGame outside a game");
  return game;
}

export const nameOf = (view: PlayerView, playerId?: string) =>
  !playerId ? "Someone" : playerId === view.me.id ? "You" : (view.players.find((p) => p.id === playerId)?.name ?? "Someone who left");

export const roleNames = (view: PlayerView, roleIds: string[]) =>
  roleIds.map((id) => view.case.roles.find((r) => r.id === id)?.name ?? id);

export const evidenceIn = (view: PlayerView, id: string): VisibleEvidence | undefined => view.evidence.find((e) => e.id === id);

/** Around one table, phones a beat apart turn a film or a tune into an echo, so only the host's plays them. */
export const carriesSound = (view: Pick<PlayerView, "mode" | "me">) => view.mode !== "together" || view.me.isHost;

/** Hotspots of a scene whose details this player can see. */
export const foundHotspots = (view: PlayerView, sceneId: string) =>
  view.evidence.flatMap((e) => (e.spot?.scene === sceneId ? [e.spot.hotspot] : []));
