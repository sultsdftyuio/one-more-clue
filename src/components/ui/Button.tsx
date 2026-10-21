import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "coral";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-ink px-6 py-3 " +
  "font-display text-lg tracking-wide shadow-pop transition-[translate,box-shadow] duration-150 " +
  "hover:-translate-y-0.5 active:translate-y-1 active:shadow-pop-sm disabled:pointer-events-none disabled:opacity-60 " +
  "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-mustard";

const variants: Record<Variant, string> = {
  primary: "bg-mustard text-ink",
  secondary: "bg-cream text-ink",
  coral: "bg-coral text-cream",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cx(base, variants[variant], className);
}

type LinkProps = { href: string; variant?: Variant; className?: string; children: ReactNode };

export function ButtonLink({ href, variant, className, children }: LinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant };

export function Button({ variant, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}
