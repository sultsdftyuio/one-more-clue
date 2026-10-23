"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { Mode } from "@/lib/game/types";
import { ModePicker } from "./Lobby";
import { Panel } from "./parts";

type CaseOption = { id: string; code: string; title: string; players: string };

const field =
  "rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink outline-none focus:border-mustard";

/** Start a room as host, or jump into a friend's room by code. */
export function HostForm({ cases }: { cases: CaseOption[] }) {
  const router = useRouter();
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("together");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const host = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId, name, mode }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (res?.ok) {
      router.push(`/r/${body.code}`);
      return;
    }
    setError(body?.error ?? "Couldn't create the room. Try again.");
    setSending(false);
  };

  const joinByCode = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) router.push(`/r/${clean}`);
  };

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6">
      <Panel>
        <h1 className="font-display text-4xl text-cream sm:text-5xl">Host a case</h1>
        <form onSubmit={host} className="mt-5 grid gap-5">
          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-2 font-bold text-cream">Case</legend>
            {cases.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3 text-ink has-[:checked]:bg-mustard"
              >
                <input type="radio" name="case" value={c.id} checked={caseId === c.id} onChange={() => setCaseId(c.id)} className="sr-only" />
                <span className="flex-1">
                  <span className="block text-xs font-extrabold tracking-widest uppercase opacity-70">{c.code}</span>
                  <span className="font-display text-xl">{c.title}</span>
                </span>
                <span className="text-sm font-extrabold">{c.players}</span>
              </label>
            ))}
          </fieldset>

          <label className="grid gap-1.5 font-bold text-cream">
            Your detective name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="nickname"
              placeholder="e.g. Sam"
              className={field}
            />
          </label>

          <div>
            <p className="mb-2 font-bold text-cream">Where are you playing?</p>
            <ModePicker value={mode} onChange={setMode} />
          </div>

          {error && <p className="font-bold text-coral">{error}</p>}
          <Button type="submit" disabled={sending || !name.trim() || !caseId}>
            {sending ? "Opening the room…" : "Create room"}
          </Button>
        </form>
      </Panel>

      <Panel title="Got a code?">
        <form onSubmit={joinByCode} className="flex gap-2">
          <label className="sr-only" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="ABCD"
            autoCapitalize="characters"
            className={`${field} min-w-0 flex-1 font-display tracking-[0.3em] uppercase`}
          />
          <Button type="submit" variant="secondary" disabled={!code.trim()}>
            Join
          </Button>
        </form>
      </Panel>
    </div>
  );
}
