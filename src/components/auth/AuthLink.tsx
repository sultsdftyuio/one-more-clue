import Link from "next/link";

/** "New here? Create an account" style line under a form. */
export function AuthLink({ prompt, href, label }: { prompt?: string; href: string; label: string }) {
  return (
    <p className="mt-5 text-center font-semibold text-ink/75">
      {prompt}{" "}
      <Link href={href} className="font-extrabold text-ink underline decoration-coral decoration-[3px] underline-offset-4">
        {label}
      </Link>
    </p>
  );
}
