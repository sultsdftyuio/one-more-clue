import { ButtonLink } from "@/components/ui/Button";
import { authCopy } from "@/data/auth";
import { AuthShell } from "./AuthShell";

/** Shown on every auth page until a Supabase project is connected. */
export function AuthDisabled() {
  const copy = authCopy.disabled;
  return (
    <AuthShell eyebrow={copy.eyebrow} title={copy.title}>
      <p className="text-lg leading-relaxed font-semibold text-ink/80">{copy.text}</p>
      <ButtonLink href="/play" variant="coral" className="mt-6">
        {copy.cta}
      </ButtonLink>
    </AuthShell>
  );
}
