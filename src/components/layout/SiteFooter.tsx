import Image from "next/image";
import Link from "next/link";
import { brandArt } from "@/lib/art";

const links = [
  { href: "/#mini-case", label: "30-second case" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <Link href="/" className="flex items-center gap-2">
          <Image src={brandArt.logo} alt="" sizes="40px" className="size-10" />
          <span className="font-display text-xl text-cream">One More Clue</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-bold text-cream/80">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-mustard">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm font-semibold text-cream/50">
          © {new Date().getFullYear()} One More Clue · All suspects are fictional. Mostly.
        </p>
      </div>
    </footer>
  );
}
