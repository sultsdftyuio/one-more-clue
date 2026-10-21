import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

type Props = {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  /** Background the heading sits on. */
  surface?: "dark" | "light";
  className?: string;
};

/** Eyebrow chip, big display title and an optional intro paragraph, centred. */
export function SectionHeading({ eyebrow, title, children, surface = "dark", className }: Props) {
  const dark = surface === "dark";
  return (
    <div className={cx("mx-auto max-w-2xl text-center", className)}>
      <p
        className={cx(
          "inline-block -rotate-2 rounded-full border-[3px] border-ink px-4 py-1 text-sm font-extrabold tracking-widest uppercase",
          dark ? "bg-mustard text-ink" : "bg-ink text-cream",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cx(
          "mt-5 font-display text-5xl leading-none sm:text-6xl",
          dark ? "text-cream text-pop" : "text-ink",
        )}
      >
        {title}
      </h2>
      {children && (
        <p className={cx("mt-5 text-lg leading-relaxed", dark ? "text-cream/85" : "text-ink/80")}>
          {children}
        </p>
      )}
    </div>
  );
}
