"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { brandArt } from "@/lib/art";
import "./game.css";
import { Briefing } from "./Briefing";
import { Investigation } from "./Investigation";
import { Lobby } from "./Lobby";
import { Panel } from "./parts";
import { Reveal } from "./Reveal";
import { useRoom } from "./useRoom";

function JoinForm({ code, onJoin }: { code: string; onJoin: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    await onJoin(name);
    setSending(false);
  };
  return (
    <Panel className="mx-auto max-w-md">
      <p className="text-sm font-extrabold tracking-widest text-mustard uppercase">Room {code}</p>
      <h1 className="font-display text-4xl text-cream">Join the case</h1>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-1.5 font-bold text-cream">
          Your detective name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoFocus
            autoComplete="nickname"
            placeholder="e.g. Sam"
            className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink outline-none focus:border-mustard"
          />
        </label>
        <Button type="submit" disabled={sending || !name.trim()}>
          {sending ? "Joining…" : "Join"}
        </Button>
      </form>
    </Panel>
  );
}

/** The whole game for one room: joining, then lobby → briefing → investigation → reveal. */
export function GameRoom({ code }: { code: string }) {
  const { status, error, busy, act, join } = useRoom(code);
  const phase = status.kind === "ready" ? status.view.phase : status.kind;

  // Each phase is a new screen: start it from the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [phase]);

  let content;
  if (status.kind === "loading") {
    content = <p className="text-center font-bold text-cream/70">Opening the case file…</p>;
  } else if (status.kind === "needsJoin") {
    content = <JoinForm code={code} onJoin={join} />;
  } else if (status.kind === "closed") {
    content = (
      <Panel className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl text-cream">Can&apos;t open this room</h1>
        <p className="mt-3 font-bold text-cream/80">{status.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/host">Host a case</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </Panel>
    );
  } else {
    const { view } = status;
    const props = { view, act, busy };
    content =
      view.phase === "lobby" ? (
        <Lobby {...props} />
      ) : view.phase === "briefing" ? (
        <Briefing {...props} />
      ) : view.phase === "investigation" ? (
        <Investigation {...props} />
      ) : (
        <Reveal {...props} />
      );
  }

  // The investigation brings its own full-width layout and top bar.
  const fullBleed = status.kind === "ready" && status.view.phase === "investigation";

  return (
    <div className={fullBleed ? "min-h-[100svh]" : "min-h-[100svh] px-4 pt-5 pb-16 sm:px-6"}>
      {!fullBleed && (
        <Link href="/" className="mx-auto mb-6 flex max-w-3xl items-center gap-2 font-display text-xl text-cream text-pop">
          <Image src={brandArt.logo} alt="" sizes="40px" className="size-9" />
          One More Clue
        </Link>
      )}
      {content}
      {error && (
        <p
          role="alert"
          className="fixed inset-x-0 top-4 z-[60] mx-auto w-fit max-w-[calc(100%-2rem)] animate-pop-in rounded-2xl border-[3px] border-ink bg-coral px-4 py-2 text-center font-bold text-cream shadow-pop-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
