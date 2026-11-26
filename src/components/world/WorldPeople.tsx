"use client";

import type { CastMember } from "@/lib/world/cast";
import type { WorldPlate } from "@/lib/world/plates";
import { useWorld } from "./useWorld";

/**
 * Everyone in the building as a list of buttons (W7.2), for keyboards and screen readers: people are drawn on the
 * canvas, which nobody can tab to. It's hidden until it gets focus, then shows as a strip at the top. Choosing
 * someone does what tapping them does: the camera goes to them and their card opens.
 */
export function WorldPeople({ plate, cast }: { plate: WorldPlate; cast: Record<string, CastMember> }) {
  const select = useWorld((s) => s.select);
  const look = useWorld((s) => s.look);
  const people = plate.people.filter((p) => cast[p.id]?.tag);
  if (!people.length) return null;
  return (
    <nav aria-label="People in the building" className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-3 focus-within:top-3 focus-within:z-30">
      <ul className="flex flex-wrap gap-2 rounded-2xl border-2 border-ink bg-night/95 p-2">
        {people.map((p) => {
          const member = cast[p.id];
          const room = plate.rooms.find((r) => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1)?.name;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  select(p.id);
                  look({ kind: "person", id: p.id });
                }}
                className="rounded-full border-2 border-ink bg-cream px-3 py-1 text-sm font-extrabold text-ink"
              >
                {member.name}
                {room ? <span className="font-semibold text-ink/70">, {room}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
