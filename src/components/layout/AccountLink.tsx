"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Supabase keeps the session in cookies named sb-<project>-auth-token (split into .0, .1 when large). */
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

/**
 * "Log in", or "Account" once signed in. Read in the browser so every page
 * that shows the header can stay static.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(SESSION_COOKIE.test(document.cookie)), []);

  return (
    <Link href={signedIn ? "/account" : "/login"} className="font-extrabold whitespace-nowrap text-cream hover:text-mustard">
      {signedIn ? "Account" : "Log in"}
    </Link>
  );
}
