"use client";

/**
 * Shaking the phone, for developing photos. Android hands over motion freely;
 * iPhones ask first, and only from a tap, so the camera's tutorial asks once.
 * Phones that say no, and computers, rub the print with a finger or mouse
 * instead: the shake is a treat, never the only way.
 */
type Asking = { requestPermission?: () => Promise<"granted" | "denied"> };

const KEY = "omc-motion";

/** True on phones that need a tap to allow motion (iPhones). */
export function motionNeedsAsking() {
  return typeof window !== "undefined" && typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as unknown as Asking).requestPermission === "function";
}

/** Asks to use the phone's motion. Call it from a tap. */
export async function askForMotion() {
  if (typeof DeviceMotionEvent === "undefined") return false;
  if (!motionNeedsAsking()) return true;
  try {
    const answer = await (DeviceMotionEvent as unknown as Required<Asking>).requestPermission();
    try {
      window.localStorage.setItem(KEY, answer);
    } catch {}
    return answer === "granted";
  } catch {
    return false;
  }
}

/** Whether shaking can work without asking again. */
export function motionReady() {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return false;
  if (!motionNeedsAsking()) return true;
  try {
    return window.localStorage.getItem(KEY) === "granted";
  } catch {
    return false;
  }
}

/** Calls back with how hard the phone is being shaken, a little at a time. Returns a stop function. */
export function listenForShake(onShake: (amount: number) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: DeviceMotionEvent) => {
    const a = e.acceleration;
    const g = e.accelerationIncludingGravity;
    const force = a && a.x !== null ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : g ? Math.abs(Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0) - 9.81) : 0;
    if (force > 6) onShake(Math.min(1, (force - 6) / 30));
  };
  window.addEventListener("devicemotion", handler);
  return () => window.removeEventListener("devicemotion", handler);
}
