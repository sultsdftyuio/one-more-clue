/**
 * Browsers only start audio from a real tap: a click, a lifted finger or a key
 * press. A finger touching down doesn't count on phones, so listening for
 * pointerdown alone leaves every phone silent. iPhones also mute web audio
 * while the ringer switch is on silent, unless the page asks to play through it.
 */
const GESTURES = ["pointerup", "touchend", "click", "keydown"] as const;

/** Asks iOS to treat this page's sound like a video's, so the silent switch doesn't mute it. */
export function playThroughSilentSwitch() {
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!session) return;
  try {
    session.type = "playback";
  } catch {}
}

/**
 * Runs `start` on every tap until it reports that audio is running, then stops
 * listening. Returns a function that stops listening early.
 */
export function onTapsUntil(start: () => boolean) {
  const handler = () => {
    if (start()) stop();
  };
  const stop = () => GESTURES.forEach((g) => window.removeEventListener(g, handler, true));
  GESTURES.forEach((g) => window.addEventListener(g, handler, { capture: true, passive: true }));
  return stop;
}
