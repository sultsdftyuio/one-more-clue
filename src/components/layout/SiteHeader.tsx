import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { brandArt } from "@/lib/art";
import { gameOpen, playCta } from "@/lib/game-open";
import { authEnabled } from "@/lib/supabase/env";
import { AccountLink } from "./AccountLink";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src={brandArt.logo} alt="" sizes="48px" priority className="size-11 sm:size-12" />
          <span className="font-display text-2xl text-cream text-pop">One More Clue</span>
        </Link>
        <nav className="flex items-center gap-5">
          {authEnabled() && <AccountLink />}
          {gameOpen() && (
            <Link href="/host#join" className="font-extrabold whitespace-nowrap text-cream hover:text-mustard">
              <span className="sm:hidden">Join</span>
              <span className="max-sm:hidden">Have a code?</span>
            </Link>
          )}
          <ButtonLink href={playCta().href} className="px-5 py-2 text-base max-sm:hidden">
            {playCta().label}
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
