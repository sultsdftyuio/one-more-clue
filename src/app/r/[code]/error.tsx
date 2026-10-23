"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

/** If something breaks mid-case, say so kindly and offer a way back in. */
export default function RoomError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[100svh] place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-dusk p-6 text-center shadow-card">
        <p className="font-display text-5xl">🕵️</p>
        <h1 className="mt-3 font-display text-3xl text-cream">Something went missing</h1>
        <p className="mt-2 font-semibold text-cream/75">
          The case file hit a snag. Your room and your evidence are safe: reload and you&apos;ll be right back where you were.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Reload the case</Button>
          <ButtonLink href="/" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
