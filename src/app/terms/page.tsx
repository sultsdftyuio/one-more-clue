import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using One More Clue.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="23 October 2026">
      <p>By playing One More Clue you agree to these terms. They&apos;re short on purpose.</p>

      <h2>Playing fair</h2>
      <ul>
        <li>Pick nicknames and write chat messages you&apos;d be happy for anyone in the room to see. No harassment, hate or anything illegal.</li>
        <li>Don&apos;t try to break, overload or get around the site&apos;s limits, or read other players&apos; private evidence by any means other than playing.</li>
        <li>We can remove names or messages, or close rooms, that break these rules.</li>
      </ul>

      <h2>Voice chat</h2>
      <p>
        Voice chat is live and isn&apos;t recorded by us. Only join it with people you&apos;re comfortable talking to, and
        don&apos;t record others without their permission.
      </p>

      <h2>The cases</h2>
      <p>
        The cases, characters, art and writing belong to One More Clue. You can play them, stream them and share your
        reactions, but please don&apos;t publish full solutions or copy the cases.
      </p>

      <h2>Purchases</h2>
      <p>
        When paid cases are available, a purchase gives you the right to host that case for your groups. Prices and refund
        terms are shown before you pay. If something goes wrong with a purchase, email <strong>{CONTACT_EMAIL}</strong>.
      </p>

      <h2>No guarantees</h2>
      <p>
        We work hard to keep the game running, but we provide it as it is, without guarantees that it will always be
        available or free of mistakes. As far as the law allows, we aren&apos;t liable for losses from using it.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If the change matters, we&apos;ll say so on the site. Playing after that means you accept them.</p>

      <h2>Contact</h2>
      <p>
        Questions: <strong>{CONTACT_EMAIL}</strong>
      </p>
    </LegalPage>
  );
}
