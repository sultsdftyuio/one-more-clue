"use client";

import type { ReactNode } from "react";
import { MotionRoot } from "@/components/fx/MotionRoot";
import { PointerProvider } from "@/components/fx/pointer";
import { BlackoutProvider } from "./blackout";
import { Flashlight } from "./Flashlight";
import { SoundToggle } from "./SoundToggle";

/** Everything the landing page's motion shares: animation features, the pointer, the blackout story. */
export function HomeEffects({ children }: { children: ReactNode }) {
  return (
    <MotionRoot>
      <PointerProvider>
        <BlackoutProvider>
          {children}
          <Flashlight />
          <SoundToggle />
        </BlackoutProvider>
      </PointerProvider>
    </MotionRoot>
  );
}
