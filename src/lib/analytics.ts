import { track } from "@vercel/analytics";

/**
 * The funnel from the business plan: try the warm-up -> solve it -> share or
 * sign up. Names are a fixed union so dashboards don't fragment across typos.
 * Properties must never identify a person (no emails).
 */
export type ProductEvent =
  | "warmup_accused"
  | "warmup_solved"
  | "share_clicked"
  | "notify_signup";

export type EventProps = Record<string, string | number | boolean | null>;

export function trackEvent(name: ProductEvent, props?: EventProps) {
  try {
    track(name, props);
  } catch {
    // Analytics must never break the thing it is measuring.
  }
}
