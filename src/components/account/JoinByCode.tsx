"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";

/** Jump into a friend's room by its code. */
export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const join = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) router.push(`/r/${clean}`);
  };
  return (
    <form onSubmit={join}>
      <h2 className="font-display text-2xl text-cream">{accountCopy.join.heading}</h2>
      <p className="mt-1 text-sm font-bold text-cream/65">{accountCopy.join.sub}</p>
      <div className="mt-4 flex gap-2">
        <label htmlFor="account-room-code" className="sr-only">
          {accountCopy.join.label}
        </label>
        <input
          id="account-room-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          placeholder="ABCD"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-cream px-4 py-2.5 font-display text-xl tracking-[0.3em] text-ink uppercase outline-none focus:border-mustard"
        />
        <Button type="submit" variant="secondary" disabled={!code.trim()} className="px-5 py-2.5 text-base">
          {accountCopy.join.button}
        </Button>
      </div>
    </form>
  );
}
