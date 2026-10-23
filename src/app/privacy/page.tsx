import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What One More Clue collects, why, and how long it keeps it.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="23 October 2026">
      <p>
        One More Clue is a mystery game you play with friends in the browser. We collect as little as we can to run it.
        This page says what that is, who helps us run the site, and what you can ask us to do.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Playing a case.</strong> The nickname you pick, your moves in the game (searches, questions, pins, votes)
          and, in remote rooms, chat messages. Rooms are deleted automatically one day after their last change.
        </li>
        <li>
          <strong>A cookie per room</strong> that remembers which player you are, so a refresh doesn&apos;t kick you out. It
          expires after a day. We don&apos;t use advertising or tracking cookies.
        </li>
        <li>
          <strong>Voice chat</strong> (remote rooms, only if you join it). Your microphone audio is sent live to the other
          players through our voice provider. We never record it.
        </li>
        <li>
          <strong>Ratings.</strong> If you rate a case, we keep the rating, your optional comment, and how the case went
          (stars, number of players). It isn&apos;t linked to your name.
        </li>
        <li>
          <strong>The waitlist.</strong> If you ask to be notified, your email address and where you came from (for example a
          video link), only to tell you when cases open.
        </li>
        <li>
          <strong>Accounts and purchases</strong> (when they&apos;re available). Your email and password for your account,
          and which cases you bought. Payments are handled by our payment provider; we never see your card details.
        </li>
        <li>
          <strong>Usage statistics.</strong> Anonymous counts of things like pages visited and cases finished. They
          don&apos;t use cookies and can&apos;t identify you.
        </li>
      </ul>

      <h2>Who helps us run the site</h2>
      <ul>
        <li>Vercel hosts the site and provides the anonymous usage statistics.</li>
        <li>Upstash stores game rooms, ratings and the waitlist.</li>
        <li>LiveKit relays voice chat and live game updates.</li>
        <li>Supabase stores accounts, when accounts are on.</li>
        <li>Dodo Payments processes payments, when purchases are on.</li>
      </ul>
      <p>They only process data to provide their service to us.</p>

      <h2>Children</h2>
      <p>One More Clue isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data.</p>

      <h2>Your choices</h2>
      <p>
        You can ask us what we hold about you, ask us to correct or delete it, or leave the waitlist at any time. Email{" "}
        <strong>{CONTACT_EMAIL}</strong> and we&apos;ll answer within 30 days.
      </p>

      <h2>Changes</h2>
      <p>If we change how we handle data, we&apos;ll update this page and the date at the top.</p>
    </LegalPage>
  );
}
