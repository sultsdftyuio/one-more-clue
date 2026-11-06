"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Reveal } from "@/components/fx/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { roles, rolesDemo, type RoleId } from "@/data/roles";
import { propArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import { CameraDemo } from "./roles/CameraDemo";
import { ComputerDemo } from "./roles/ComputerDemo";
import { RoomDemo } from "./roles/RoomDemo";
import { tintOf } from "./roles/shared";
import { WallDemo } from "./roles/WallDemo";

type Pin = { id: string; role: RoleId; title: string };

/** The team board: eight pins, the only way everyone sees what you found. */
function Board({ pins }: { pins: Pin[] }) {
  return (
    <div className="mt-10 rounded-3xl border-[0.1875rem] border-ink bg-[#b98a5a] p-4 shadow-card [background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1.5px)] [background-size:9px_9px] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl text-ink">Team board</p>
        <p className="text-sm font-extrabold text-ink/75">{pins.length} of 8 pins · the only way everyone sees what you found</p>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => {
          const pin = pins[i];
          return (
            <li key={i} className="relative aspect-[3/4]">
              {pin ? (
                <m.div
                  className={cx("flex size-full items-center rounded-lg border-2 border-ink p-1.5 text-center shadow-pop-sm", tintOf(pin.role), i % 2 ? "rotate-2" : "-rotate-2")}
                  initial={{ scale: 1.6, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  <Image src={propArt.pushpin} alt="" sizes="24px" className="absolute -top-2.5 left-1/2 w-6 -translate-x-1/2" />
                  <span className="w-full text-[0.65rem] leading-tight font-extrabold sm:text-xs">{pin.title}</span>
                </m.div>
              ) : (
                <span className="block size-full rounded-lg border-2 border-dashed border-ink/25" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Who are you tonight?": the four roles, each with a small working copy of its tool, and one lead passed round the table. */
export function Roles() {
  const [active, setActive] = useState<RoleId>("photographer");
  const [pins, setPins] = useState<Pin[]>([]);
  const [autoType, setAutoType] = useState(false);
  const role = roles.find((r) => r.id === active)!;
  const has = (id: string) => pins.some((p) => p.id === id);
  const pin = (p: Pin) => setPins((all) => (all.some((x) => x.id === p.id) ? all : [...all, p]));
  const done: Record<RoleId, boolean> = {
    photographer: has("jar") || has("reader"),
    interviewer: has("ollie"),
    tech: has("scanner"),
    archivist: has("checked"),
  };

  return (
    <section className="relative overflow-hidden bg-dusk px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading eyebrow="Pick a role" title="Who are you tonight?">
          Everyone gets their own tool and their own evidence. Try all four with one lead from the practice case, and watch it travel round the table.
        </SectionHeading>
      </Reveal>

      <div className="mx-auto mt-14 max-w-5xl">
        <div role="tablist" aria-label="Roles" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roles.map((r, i) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              id={`role-tab-${r.id}`}
              aria-selected={active === r.id}
              aria-controls="role-panel"
              onClick={() => setActive(r.id)}
              className={cx(
                "relative flex items-center gap-3 rounded-2xl border-[0.1875rem] border-ink p-3 text-left transition-[translate,box-shadow,opacity] duration-200",
                r.tint,
                active === r.id ? "-translate-y-1.5 shadow-card" : "opacity-75 shadow-pop-sm hover:-translate-y-0.5 hover:opacity-100",
              )}
            >
              <Image src={propArt[r.prop]} alt="" sizes="56px" className={cx("w-11 shrink-0 sm:w-12", i % 2 ? "rotate-6" : "-rotate-6")} />
              <span className="min-w-0">
                <span className="block font-display text-xl leading-none sm:text-2xl">{r.name}</span>
                <span className="mt-1 block text-xs font-extrabold opacity-80 sm:text-sm">{r.verb}</span>
              </span>
              {done[r.id] && (
                <span aria-label="done" className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-ink bg-cream text-sm font-extrabold text-ink">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div id="role-panel" role="tabpanel" aria-labelledby={`role-tab-${active}`} className="mt-6 rounded-3xl border-[0.1875rem] border-ink bg-night p-5 text-cream shadow-card sm:p-8">
          <AnimatePresence mode="wait">
            <m.div key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
                <div>
                  <p className="font-display text-3xl leading-none">The {role.name}</p>
                  <p className="mt-3 leading-relaxed font-semibold text-cream/80">{role.power}</p>
                </div>
                <div>
                  {active === "photographer" && (
                    <CameraDemo
                      found={pins.map((p) => p.id)}
                      onFind={(id) => pin({ id, role: "photographer", title: rolesDemo.photo.spots.find((s) => s.id === id)!.title })}
                      next={() => setActive("interviewer")}
                    />
                  )}
                  {active === "interviewer" && (
                    <RoomDemo
                      asked={has("ollie")}
                      onAsk={() => pin({ id: "ollie", role: "interviewer", title: "Ollie: next door" })}
                      next={() => {
                        setAutoType(!has("scanner"));
                        setActive("tech");
                      }}
                    />
                  )}
                  {active === "tech" && (
                    <ComputerDemo
                      asked={has("ollie")}
                      autoType={autoType}
                      onTyped={() => setAutoType(false)}
                      unlocked={pins.map((p) => p.id)}
                      onFound={(id) => pin({ id, role: "tech", title: id === "scanner" ? "Ollie's scanner" : "Tri's call log" })}
                      go={() => setActive("interviewer")}
                      next={() => setActive("archivist")}
                    />
                  )}
                  {active === "archivist" && (
                    <WallDemo
                      statement={has("ollie")}
                      record={has("scanner")}
                      jar={has("jar")}
                      tied={has("checked")}
                      onTie={() => pin({ id: "checked", role: "archivist", title: "Ollie checks out" })}
                      go={setActive}
                    />
                  )}
                </div>
              </div>
            </m.div>
          </AnimatePresence>
        </div>

        <Board pins={pins} />
      </div>
    </section>
  );
}
