import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string };

export function Field({ label, name, hint, ...input }: Props) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-extrabold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-describedby={hintId}
        className="mt-1.5 w-full rounded-2xl border-[3px] border-ink bg-white px-4 py-3 text-lg font-bold placeholder:text-ink/35 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-mustard"
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm font-semibold text-ink/60">
          {hint}
        </p>
      )}
    </div>
  );
}
