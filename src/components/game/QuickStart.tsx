"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";
import { myName } from "./names";
import { Panel } from "./parts";

/**
 * One tap to a room: opens a room for this case with this device's detective
 * name and goes straight to its lobby. Locked cases send you to buy them.
 */
export function QuickStart({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId, name: myName(), mode: "together" }),
      }).catch(() => null);
      const body = await res?.json().catch(() => ({}));
      if (res?.ok) {
        trackEvent("room_created", { case: caseId, mode: "together" });
        router.replace(`/r/${body.code}`);
        return;
      }
      setError(body?.error ?? "Couldn't open the case. Try again.");
    })();
  }, [caseId, router]);

  if (error) {
    return (
      <Panel className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl text-cream">Can&apos;t open this case</h1>
        <p className="mt-3 font-bold text-cream/80">{error}</p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/host">See all cases</ButtonLink>
        </div>
      </Panel>
    );
  }
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <p className="flex items-center gap-3 font-display text-2xl text-cream">
        <span className="size-3 animate-pulse rounded-full bg-mustard" /> Opening the case file…
      </p>
    </div>
  );
}
