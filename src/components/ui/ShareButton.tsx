"use client";

import { useState } from "react";
import { Button } from "./Button";

type Props = {
  message: string;
  variant?: "primary" | "secondary" | "coral";
  className?: string;
};

/** Opens the native share sheet, or copies the link where sharing isn't available. */
export function ShareButton({ message, variant = "secondary", className }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "One More Clue", text: message, url });
        return;
      }
      await navigator.clipboard.writeText(`${message} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // The viewer closed the share sheet; nothing to do.
    }
  }

  return (
    <Button variant={variant} className={className} onClick={share}>
      <span aria-live="polite">{copied ? "Link copied!" : "Send to your group"}</span>
    </Button>
  );
}
