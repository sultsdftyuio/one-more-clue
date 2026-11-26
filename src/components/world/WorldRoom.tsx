"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useStore } from "zustand";
import { myName, randomName, rememberName } from "@/components/game/names";
import { useRoom } from "@/components/game/useRoom";
import type { Panel } from "@/components/game/Investigation";
import type { WorldSpotView } from "@/lib/game/world";
import { castOf, stickersFor } from "@/lib/world/cast";
import { roomAt, toPlate as pointOnPlate } from "@/lib/world/geometry";
import { worldOf } from "@/lib/world/plates";
import { createWorldStore } from "@/lib/world/store";
import { worldArt } from "./assets";
import { WorldCanvas } from "./WorldCanvas";
import { WorldHud } from "./WorldHud";
import { WorldMinimap } from "./WorldMinimap";
import { WorldBubbles } from "./WorldBubbles";
import { WorldFlash } from "./WorldFlash";
import { WorldGame, type WorldTool } from "./WorldGame";
import { IconButton } from "./WorldHud";
import { WorldThenNow } from "./WorldThenNow";
import { useHandOffs } from "./useHandOffs";
import { useWorldSound } from "./useWorldSound";
import { WorldPeople } from "./WorldPeople";
import { WorldControls } from "./WorldControls";
import { SideJob } from "./jobs/SideJob";
import { LightsOut, WorldGlow, WorldJobs } from "./WorldJobs";
import type { SideJobView } from "@/lib/game/helps";
import { WorldPings } from "./WorldPings";
import { RewindOverlay, RewindScreen } from "./WorldRewind";
import { usePresence } from "./usePresence";
import { WorldSpots } from "./WorldSpots";
import { WorldRoomTags } from "./WorldRoomTags";
import { WorldTags } from "./WorldTags";
import { WorldContext } from "./useWorld";
import { WorldConfrontation } from "./WorldConfrontation";
import { WorldLobby, WorldPhaseLayer } from "./WorldPhases";
import { evidenceFonts } from "@/components/game/evidence/fonts";
import { themeOf } from "@/components/game/themes";
import { cx } from "@/lib/cx";

const card = "pointer-events-auto mx-auto w-full max-w-sm rounded-3xl border-[3px] border-ink bg-dusk p-5 text-center shadow-card";

/** Joins under this device's detective name, as the classic room does; asks for a name only if that fails. */
function WorldJoin({ onJoin }: { onJoin: (name: string) => Promise<boolean> }) {
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    void onJoin(myName()).then((ok) => {
      if (ok) return;
      setName(randomName());
      setAsking(true);
    });
  }, [onJoin]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    if (await onJoin(name)) rememberName(name.trim());
    setSending(false);
  };

  if (!asking) return null;
  return (
    <form onSubmit={submit} className={`${card} select-text`}>
      <h2 className="font-display text-2xl text-cream">Join the case</h2>
      <label className="mt-3 grid gap-1.5 text-left font-bold text-cream">
        Your detective name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
          className="rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink outline-none focus:border-mustard"
        />
      </label>
      <button
        type="submit"
        disabled={sending || !name.trim()}
        className="mt-4 w-full rounded-2xl border-[3px] border-ink bg-mustard px-4 py-3 font-display text-xl text-ink shadow-pop-sm disabled:opacity-60"
      >
        {sending ? "Joining…" : "Join"}
      </button>
    </form>
  );
}

/**
 * A world room on the hidden route: the painted building (Phaser) under React overlays, sharing one
 * store. The room itself still runs on today's engine and polling, so the classic screens at
 * /r/<code> keep working for the same room.
 */
export function WorldRoom({ code, caseId }: { code: string; caseId: string }) {
  const plate = worldOf(caseId);
  const art = worldArt(caseId);
  const [store] = useState(() => createWorldStore());
  const { status, error, join, act, busy } = useRoom(code, false);
  const [spot, setSpot] = useState<WorldSpotView | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [tool, setTool] = useState<WorldTool | null>(null);
  const [job, setJob] = useState<SideJobView | null>(null);
  const view = status.kind === "ready" ? status.view : null;

  useEffect(() => {
    store.getState().setView(view);
  }, [store, view]);

  const cast = useMemo(() => (plate ? castOf(plate.people, view) : {}), [plate, view]);
  const stickers = useMemo(() => {
    const worn = view ? stickersFor(view.players) : {};
    return Object.fromEntries(Object.entries(worn).map(([sticker, player]) => [player.id, sticker]));
  }, [view]);
  const mine = view ? (stickers[view.me.id] ?? null) : null;

  useEffect(() => {
    store.getState().setMe(mine);
  }, [store, mine]);

  // The live channel (W3.1): teammates walking, what they're doing, and pings.
  const presence = usePresence({ code, store, plate, view, stickers });
  const doing = job
    ? `on a side job at ${job.spot.name}`
    : spot
      ? `at ${spot.name}`
      : tool?.kind === "interview"
        ? `questioning ${tool.who.split(" ")[0]}`
        : tool?.kind === "camera"
          ? "with the camera"
          : panel === "evidence"
            ? "reading the evidence"
            : panel === "board"
              ? "at the board"
              : panel === "solve"
                ? "solving"
                : "";
  useEffect(() => {
    presence.current?.setStatus(doing);
  }, [presence, doing]);

  // Walk into a new room and the game remembers where you are (W3.3), for late joiners and when the channel drops.
  const myPlace = view?.players.find((p) => p.id === view.me.id)?.place?.room ?? null;
  const saved = useRef<string | null>(null);
  saved.current = myPlace;
  useEffect(() => {
    if (!plate) return;
    return store.subscribe((s, prev) => {
      const walk = s.myWalk;
      if (!walk || walk === prev.myWalk || walk.to !== null) return;
      const room = roomAt(plate, walk.x, walk.z);
      if (room && room !== saved.current) {
        saved.current = room;
        void act({ type: "move", room, x: walk.x }, { quiet: true });
      }
    });
  }, [store, plate, act]);

  // Until the live channel says otherwise, teammates stand where they were last saved.
  const live = useStore(store, (s) => s.presence === "live");
  const places = view
    ? view.players
        .filter((p) => p.id !== view.me.id && p.place)
        .map((p) => `${p.id}:${p.place!.room}:${Math.round(p.place!.x)}`)
        .join("|")
    : "";
  useEffect(() => {
    if (!plate || !view || live) return;
    for (const p of view.players) {
      const sticker = stickers[p.id];
      const room = p.place && plate.rooms.find((r) => r.id === p.place!.room);
      if (p.id === view.me.id || !sticker || !room || !p.place) continue;
      store.getState().pushRemote({ id: sticker, x: p.place.x, z: room.z0 + 6, to: null, snap: true });
    }
    // `places` stands in for the parts of the view this reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plate, places, live, stickers, store]);

  // Once the building is drawn and we know who you are, the camera flies in to your detective.
  const ready = useStore(store, (s) => s.status.stage === "ready");
  const arrived = useRef(false);
  useEffect(() => {
    if (!ready || !mine || arrived.current) return;
    arrived.current = true;
    store.getState().look({ kind: "person", id: mine });
  }, [ready, mine, store]);
  // And again when the briefing ends and the night starts, wherever the game put you, so a player who starts
  // downstairs isn't left looking at someone else's room.
  const playing = view?.phase === "investigation";
  useEffect(() => {
    if (ready && mine && playing) store.getState().look({ kind: "person", id: mine });
  }, [ready, mine, playing, store]);

  // A teammate's find opens something for you (W5.5): the spot lights up and gets a ping on this phone.
  useHandOffs(store, view);
  // Music, room tone, footsteps and pings (W7.1).
  useWorldSound(store, plate, view);

  // What the Interviewer can do with someone they walked up to (W5.3), and the team's view of who's waiting.
  const questions = view?.questions ?? null;
  const marks = useMemo(() => {
    if (!plate || !questions) return {};
    const out: Record<string, string> = {};
    for (const person of plate.people) {
      const name = view?.case.suspects.find((s) => s.id === person.suspect)?.name;
      const waiting = name ? questions.filter((q) => q.suspect === name && !q.asked) : [];
      if (waiting.length) out[person.id] = waiting.some((q) => q.lead) ? "!" : "?";
    }
    return out;
  }, [plate, questions, view?.case.suspects]);
  const interviewer = view?.players.find((p) => p.roles.some((r) => view.case.roles.find((x) => x.id === r)?.ability === "interview"));
  const personActions = (member: { suspect?: string; name: string }) => {
    if (!view || !member.suspect) return null;
    const sore = view.helps.sore.find((s) => s.suspect === member.suspect);
    return (
      <>
        {sore && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-[#bfe0ff] px-2.5 py-0.5 text-sm font-extrabold">Sore spot: {sore.topic}</p>
        )}
        {questionFor(member)}
      </>
    );
  };
  const questionFor = (member: { suspect?: string; name: string }) => {
    if (!view || !member.suspect) return null;
    if (view.me.abilities.includes("interview")) {
      const waiting = questions?.filter((q) => q.suspect === member.name && !q.asked).length ?? 0;
      return (
        <button
          type="button"
          onClick={() => {
            store.getState().select(null);
            setTool({ kind: "interview", who: member.name });
          }}
          className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-lilac px-4 py-2.5 font-display text-lg text-ink shadow-pop-sm"
        >
          Question {member.name.split(" ")[0] === "Prof." ? member.name : member.name.split(" ")[0]}
          {waiting > 0 && <span className="ml-2 font-sans text-sm font-extrabold">{waiting === 1 ? "1 question" : `${waiting} questions`} waiting</span>}
        </button>
      );
    }
    return interviewer ? (
      <p className="mt-2 text-sm font-bold text-ink/70">Only the Interviewer can question them. Ask {interviewer.id === view.me.id ? "yourself" : interviewer.name}.</p>
    ) : null;
  };
  // The Photographer's flash (W5.1): lights up the room their detective is in, on every phone.
  const flash = () => {
    if (!plate || !mine) return;
    const s = store.getState();
    const me = plate.people.find((p) => p.id === mine);
    const at = s.positions[mine] ?? me;
    const room = at ? roomAt(plate, at.x, at.z) : null;
    if (!room) return;
    if (presence.current) presence.current.flash(room);
    else s.addFlash({ room, by: view?.me.id ?? "", at: Date.now() });
  };
  const roleButtons = view?.me.abilities.includes("inspect") ? <IconButton icon="bolt" label="Flash: light up this room for everyone" onClick={flash} /> : null;

  const theme = themeOf(view?.case.theme);

  if (!plate || !art) {
    return (
      <div className="grid min-h-[100svh] place-items-center p-6">
        <p className="font-bold text-cream/80">This case has no building yet.</p>
      </div>
    );
  }

  return (
    <WorldContext.Provider value={store}>
      {/* The case's own type and look, and the faces evidence is made with, as on the classic screens. */}
      <div className={cx(theme.font, evidenceFonts, theme.className)}>
        <div className="fixed inset-0 touch-none overflow-hidden bg-[linear-gradient(#030820,#141829)] text-cream select-none">
          <WorldCanvas store={store} plate={plate} art={art} />
          {view && <WorldGlow plate={plate} view={view} />}
          <WorldFlash plate={plate} />
          {view && <WorldThenNow plate={plate} view={view} onShoot={() => setTool({ kind: "camera" })} />}
          <WorldPings plate={plate} view={view} />
          {view && <WorldJobs plate={plate} view={view} onOpen={setJob} />}
          {view && <WorldSpots plate={plate} view={view} onOpen={setSpot} onPing={(s) => presence.current?.ping(s)} />}
          <WorldRoomTags plate={plate} />
          {view && <RewindScreen view={view} />}
          {view && <RewindOverlay plate={plate} view={view} act={act} />}
          <WorldTags plate={plate} cast={cast} marks={marks} />
          {view && <WorldBubbles plate={plate} view={view} quiet={tool?.kind === "interview"} />}
          <WorldPeople plate={plate} cast={cast} />
          {view && (
            <WorldControls
              plate={plate}
              view={view}
              cast={cast}
              mine={mine}
              onSpot={setSpot}
              onJob={setJob}
              onPerson={(id) => {
                const member = cast[id];
                if (member?.suspect && view.me.abilities.includes("interview")) {
                  store.getState().select(null);
                  setTool({ kind: "interview", who: member.name });
                } else store.getState().select(id);
              }}
            />
          )}
          {view && <WorldConfrontation plate={plate} view={view} act={act} busy={busy} quiet={panel === "solve"} onCallLie={() => setPanel("solve")} />}
          {view?.phase === "lobby" && <WorldLobby view={view} act={act} busy={busy} />}
          <WorldHud
            code={code}
            view={view}
            cast={cast}
            stickers={stickers}
            minimap={<WorldMinimap plate={plate} picture={art.plateMap} mine={mine} />}
            onSolve={() => setPanel("solve")}
            personActions={personActions}
            roleButtons={roleButtons}
          />

          {status.kind === "needsJoin" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <WorldJoin onJoin={join} />
            </div>
          )}
          {status.kind === "closed" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className={card}>
                <h2 className="font-display text-2xl text-cream">Can&apos;t open this room</h2>
                <p className="mt-2 font-semibold text-cream/80">{status.message}</p>
                <Link href="/" className="mt-4 inline-block rounded-full border-2 border-ink bg-cream px-4 py-1.5 font-extrabold text-ink">
                  Home
                </Link>
              </div>
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="fixed inset-x-0 top-24 z-[60] mx-auto w-fit max-w-[calc(100%-2rem)] animate-pop-in rounded-2xl border-[3px] border-ink bg-coral px-4 py-2 text-center font-bold text-cream shadow-pop-sm"
            >
              {error}
            </p>
          )}
        </div>
        {view && (
          <WorldGame
            view={view}
            act={act}
            busy={busy}
            spot={spot}
            onCloseSpot={() => setSpot(null)}
            panel={panel}
            onPanel={setPanel}
            tool={tool}
            onCloseTool={() => setTool(null)}
            picture={(x, z) => {
              const at = pointOnPlate(plate, x, z - 25);
              return { src: art.plate, w: plate.size.w, h: plate.size.h, px: at.x, py: at.y };
            }}
          />
        )}
        {view && job && view.phase === "investigation" && (
          <SideJob key={job.id} job={job} view={view} act={act} roomName={plate.rooms.find((r) => r.id === job.spot.room)?.name ?? ""} onClose={() => setJob(null)} />
        )}
        {view && view.phase === "investigation" && <LightsOut view={view} act={act} />}
        {view && <WorldPhaseLayer view={view} act={act} busy={busy} />}
      </div>
    </WorldContext.Provider>
  );
}
