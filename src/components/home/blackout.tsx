"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { sfx } from "./sound";

/**
 * The page's story: the street is lit, at 9:17 the whole block goes dark (the
 * warm-up case happens by flashlight), and catching the liar turns it back on.
 */
export type LightPhase = "lit" | "dark" | "restored";

type Blackout = {
  phase: LightPhase;
  /** True while the warm-up case is on screen, which is where the dark matters. */
  inCase: boolean;
  setInCase: (inCase: boolean) => void;
  cutLights: () => void;
  restoreLights: () => void;
};

const BlackoutContext = createContext<Blackout | null>(null);

export function BlackoutProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<LightPhase>("lit");
  const [inCase, setInCase] = useState(false);

  const cutLights = useCallback(() => {
    setPhase((p) => {
      if (p !== "lit") return p;
      sfx.powerDown();
      return "dark";
    });
  }, []);
  const restoreLights = useCallback(() => {
    setPhase((p) => {
      if (p === "restored") return p;
      sfx.powerUp();
      return "restored";
    });
  }, []);

  const value = useMemo(() => ({ phase, inCase, setInCase, cutLights, restoreLights }), [phase, inCase, cutLights, restoreLights]);
  return <BlackoutContext.Provider value={value}>{children}</BlackoutContext.Provider>;
}

export function useBlackout() {
  const blackout = useContext(BlackoutContext);
  if (!blackout) throw new Error("useBlackout needs a BlackoutProvider");
  return blackout;
}
