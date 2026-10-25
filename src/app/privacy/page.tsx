import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage, OPERATOR_ADDRESS, OPERATOR_NAME } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What One More Clue collects, why, who helps us run the site, how long we keep it, and your rights under UAE law.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="25 October 2026">
      <p>
        One More Clue is a cooperative mystery game you play with friends in the browser. We collect as little personal
        data as we can to run it. This policy explains what we collect, why, who helps us, how long we keep it, and the
        rights you have under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021).
      </p>

      <h2>1. Who we are</h2>
      <p>
        The site at playonemoreclue.com is run by <strong>{OPERATOR_NAME}</strong>, {OPERATOR_ADDRESS} (&quot;we&quot;,
        &quot;us&quot;). We decide how your personal data is used, so we are its controller. For anything about your data,
        email <strong>{CONTACT_EMAIL}</strong>.
      </p>

      <h2>2. What we collect and why</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your email address and a securely hashed password. If you sign in with Google,
          Google shares your name, email address and profile picture with us. We never get your Google password, contacts
          or anything else in your Google account. We use this to sign you in and to keep the cases you bought tied to
          you.
        </li>
        <li>
          <strong>Purchases.</strong> Which cases you bought, when, the amount and currency, and the payment reference. We
          use this to unlock your cases, handle refunds and keep the records the law requires. Card and billing details go
          straight to our payment provider. We never see or store them (see section 5).
        </li>
        <li>
          <strong>Playing a case.</strong> The nickname you choose, your moves in the game (searches, questions, pins and
          votes) and, in remote rooms, chat messages. We need these to run the game for everyone in your room.
        </li>
        <li>
          <strong>Voice chat</strong>, only in remote rooms and only if you choose to join it. Your microphone audio is
          sent live to the other players through our voice provider. We never record or store it. Your browser asks your
          permission before the microphone is used.
        </li>
        <li>
          <strong>Ratings.</strong> If you rate a case, we keep the rating, your optional comment and how the case went
          (stars and number of players). Ratings aren&apos;t linked to your name or account.
        </li>
        <li>
          <strong>The waitlist.</strong> If you ask to be told when cases open, we keep your email address and where you
          found us (for example a video link). We use it only for that.
        </li>
        <li>
          <strong>Technical data.</strong> Your IP address, briefly, to stop abuse such as too many requests at once, and
          standard server logs (time, page, error messages) to keep the site working and secure. Logs show emails only
          partly hidden, like jo***@example.com.
        </li>
        <li>
          <strong>Usage statistics.</strong> Anonymous counts, like pages visited and cases finished. They use no cookies
          and can&apos;t identify you.
        </li>
      </ul>
      <p>
        We process data because it&apos;s needed to provide the service you asked for (your account, the game and your
        purchases), because the law requires it (for example tax and accounting records), or because you agreed (the
        waitlist and voice chat). You can withdraw your consent at any time. That doesn&apos;t affect anything we did
        before you withdrew it. We don&apos;t sell your data, show ads, or make decisions about you using automated
        processing alone.
      </p>

      <h2>3. Cookies</h2>
      <p>We only use cookies the site needs to work. There are no advertising or tracking cookies, so there&apos;s no cookie banner.</p>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> keep you logged in. They&apos;re removed when you log out.
        </li>
        <li>
          <strong>A room cookie</strong> remembers which player you are in a room, so refreshing the page doesn&apos;t kick
          you out. It expires after one day.
        </li>
        <li>
          <strong>A short-lived password-reset cookie</strong> is used only while you choose a new password.
        </li>
      </ul>

      <h2>4. Who helps us run the site</h2>
      <p>
        These providers process data for us, only to provide their service and under contracts that require them to
        protect it:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> hosts the site and provides the anonymous usage statistics.
        </li>
        <li>
          <strong>Supabase</strong> stores accounts and purchase records (servers in Australia).
        </li>
        <li>
          <strong>Upstash</strong> stores game rooms, ratings, the waitlist and the short-lived abuse counters.
        </li>
        <li>
          <strong>LiveKit</strong> relays voice chat and live game updates.
        </li>
        <li>
          <strong>Google</strong> provides &quot;Continue with Google&quot; sign-in, if you choose it.
        </li>
        <li>
          <strong>Dodo Payments</strong> sells paid cases and handles payments (see section 5).
        </li>
      </ul>
      <p>
        We may also disclose data if the law requires it, for example at the lawful request of a UAE court or authority.
      </p>

      <h2>5. Payments</h2>
      <p>
        Paid cases are sold through Dodo Payments, which acts as the merchant of record: it is the seller on your receipt,
        it takes your payment, and it handles sales tax. Dodo collects your payment and billing details directly, under
        its own privacy policy. It tells us only what we need to unlock your case: that the payment succeeded or was
        refunded, the amount, and the reference.
      </p>

      <h2>6. Data outside the UAE</h2>
      <p>
        Our providers store and process data outside the UAE, including in the United States, the European Union and
        Australia. When we transfer your data abroad, we do it as the Personal Data Protection Law allows. We use
        established providers bound by contracts with data protection commitments, and we send only what each one needs.
      </p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>
          <strong>Game rooms</strong>, with nicknames, moves and chat, are deleted automatically one day after their last
          activity.
        </li>
        <li>
          <strong>Abuse counters</strong> holding IP addresses expire within minutes to hours.
        </li>
        <li>
          <strong>Your account</strong> stays until you ask us to delete it.
        </li>
        <li>
          <strong>Purchase records</strong> are kept for as long as UAE tax and accounting law requires, usually five
          years after the purchase. This is true even if you delete your account.
        </li>
        <li>
          <strong>Waitlist entries</strong> are kept until cases open and we&apos;ve told you, or until you ask to be
          removed.
        </li>
        <li>
          <strong>Ratings</strong> are kept as anonymous feedback, with only the most recent ones retained.
        </li>
        <li>
          <strong>Server logs</strong> are kept for a short period by our hosting provider, then deleted.
        </li>
      </ul>

      <h2>8. Security</h2>
      <p>
        All traffic is encrypted (HTTPS). Passwords are stored only as secure hashes. Access to data is limited to what
        each part of the site needs, and payment details never touch our servers. No system is perfectly secure. If a
        breach puts your data at risk, we&apos;ll tell you and the UAE Data Office as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>Under the UAE Personal Data Protection Law, you can ask us to:</p>
      <ul>
        <li>tell you what personal data we hold about you, why, and who we share it with, and give you a copy;</li>
        <li>send your data to you or another provider in a commonly used format;</li>
        <li>correct data that&apos;s wrong or incomplete;</li>
        <li>delete your data, including your account, where we no longer need to keep it;</li>
        <li>limit or stop processing your data in certain cases, and stop using it for anything you didn&apos;t agree to.</li>
      </ul>
      <p>
        Email <strong>{CONTACT_EMAIL}</strong> from the address linked to your account, so we can confirm it&apos;s you.
        We&apos;ll reply within 30 days. It&apos;s free unless a request is clearly excessive or repeated. If you&apos;re
        unhappy with our answer, you can complain to the UAE Data Office.
      </p>

      <h2>10. Children</h2>
      <p>
        One More Clue isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data. If you&apos;re
        under 18, ask a parent or guardian before creating an account or buying anything. If you think a child under 13
        has given us data, email us and we&apos;ll delete it.
      </p>

      <h2>11. Changes</h2>
      <p>
        If we change how we handle data, we&apos;ll update this page and the date at the top. For significant changes,
        we&apos;ll also tell account holders by email or on the site before they take effect.
      </p>

      <h2>12. Contact</h2>
      <p>
        {OPERATOR_NAME}, {OPERATOR_ADDRESS}. Email: <strong>{CONTACT_EMAIL}</strong>
      </p>
    </LegalPage>
  );
}
