"use client";

import { useState } from "react";
import { evidenceFonts } from "@/components/game/evidence/fonts";
import { themeOf } from "@/components/game/themes";
import { GAMES } from "@/components/world/jobs/SideJob";
import { SideJobFrame } from "@/components/world/jobs/frame";
import { case001 } from "@/data/cases/case-001";
import { cx } from "@/lib/cx";
import { shortName } from "@/lib/world/cast";

/** Every side game in a list; pick one to play it in its frame. Finishing just shows the stars. */
export function JobsLab({ game }: { game: string }) {
  const [open, setOpen] = useState(game);
  const theme = themeOf(case001.theme);
  const job = case001.world?.sideJobs.find((j) => j.game === open);
  const spec = GAMES[open];
  const suspect = job?.suspect ? case001.suspects.find((s) => s.id === job.suspect) : undefined;
  const short = suspect ? shortName(suspect.name) : null;
  return (
    <div className={cx(theme.font, evidenceFonts, theme.className, "min-h-dvh bg-night p-6 text-cream")}>
      <h1 className="mb-4 font-display text-3xl">Side games</h1>
      <ul className="flex flex-wrap gap-3">
        {Object.keys(GAMES).map((id) => (
          <li key={id}>
            <button type="button" onClick={() => setOpen(id)} className="rounded-full border-[3px] border-ink bg-mustard px-4 py-2 font-bold text-ink">
              {id}
            </button>
          </li>
        ))}
      </ul>
      {spec && (
        <SideJobFrame
          key={open}
          title={spec.title(short)}
          place={short ? `Favour · ${short}` : "Odd job · Lab"}
          help={job?.help ?? "lightbulb"}
          helpText={() => "Test"}
          backdrop={spec.backdrop}
          prompt={spec.prompt}
          onFinish={async () => true}
          onClose={() => setOpen("")}
        >
          {(done) => <spec.Game onDone={done} who={suspect} />}
        </SideJobFrame>
      )}
    </div>
  );
}
