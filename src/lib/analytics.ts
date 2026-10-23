import { track } from "@vercel/analytics";

/**
 * The funnels: try the warm-up -> solve it -> share or sign up, and host a
 * room -> start -> each chapter -> finish -> rate it. Names are a fixed union so dashboards don't fragment across typos.
 * Properties must never identify a person (no emails).
 */
export type ProductEvent =
  | "warmup_accused"
  | "warmup_solved"
  | "share_clicked"
  | "notify_signup"
  // The game, from hosting a room to rating the case
  | "room_created"
  | "game_started"
  | "chapter_opened"
  | "case_finished"
  | "voice_joined"
  | "feedback_sent";

export type EventProps = Record<string, string | number | boolean | null>;

export function trackEvent(name: ProductEvent, props?: EventProps) {
  try {
    track(name, props);
  } catch {
    // Analytics must never break the thing it is measuring.
  }
}
