import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { brandArt } from "@/lib/art";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src={brandArt.logo} alt="" sizes="48px" priority className="size-11 sm:size-12" />
          <span className="font-display text-2xl text-cream text-pop">One More Clue</span>
        </Link>
        <ButtonLink href="/play" className="px-5 py-2 text-base max-sm:hidden">
          Play now
        </ButtonLink>
      </div>
    </header>
  );
}
