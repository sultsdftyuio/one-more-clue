import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, OPERATOR_ADDRESS, OPERATOR_NAME } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for playing One More Clue, buying cases, refunds, and how disputes are handled under UAE law.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="25 October 2026">
      <p>
        These terms are an agreement between you and <strong>{OPERATOR_NAME}</strong>, {OPERATOR_ADDRESS}{" "}
        (&quot;we&quot;, &quot;us&quot;), which runs One More Clue at playonemoreclue.com. By playing, creating an
        account or buying a case, you agree to them. Our{" "}
        <Link href="/privacy" className="underline decoration-coral decoration-[3px] underline-offset-4">
          privacy policy
        </Link>{" "}
        explains how we handle your data.
      </p>

      <h2>1. Who can play</h2>
      <ul>
        <li>You must be at least 13 years old.</li>
        <li>
          If you&apos;re under 18, you need a parent&apos;s or guardian&apos;s permission to create an account. If
          you&apos;re not old enough to make a binding contract where you live, a parent or guardian must make any purchase
          for you.
        </li>
      </ul>

      <h2>2. Your account</h2>
      <ul>
        <li>You can create an account with your email and a password, or with Google. Give us a real email address you can access.</li>
        <li>Keep your login to yourself. You&apos;re responsible for what happens on your account. Tell us straight away if you think someone else has used it.</li>
        <li>An account is for one person. You can ask us to delete yours at any time.</li>
      </ul>

      <h2>3. Playing fair</h2>
      <p>When you use One More Clue, you agree not to:</p>
      <ul>
        <li>
          use nicknames, chat or voice to harass, threaten, insult or discriminate against anyone, or to share anything
          obscene, hateful or illegal, or that breaks the laws of the UAE;
        </li>
        <li>share other people&apos;s personal information, or impersonate anyone;</li>
        <li>
          try to break, overload, scrape or get around the site&apos;s limits or security, or read evidence meant for
          other players by any means other than playing;
        </li>
        <li>use bots, scripts or exploits, except the test bots the game provides;</li>
        <li>resell, share or transfer access to paid cases outside of hosting games as these terms allow.</li>
      </ul>
      <p>We can remove names or messages, close rooms, or suspend accounts that break these rules (see section 10).</p>

      <h2>4. What you write</h2>
      <p>
        Your nicknames and chat messages stay yours. You allow us to show them to the other players in your room and to
        store them for as long as the room exists, which is one day after its last activity. Only post things
        you&apos;re happy for everyone in the room to see.
      </p>

      <h2>5. Voice chat</h2>
      <p>
        Voice chat is live, and we don&apos;t record it. Only join with people you&apos;re comfortable talking to, and
        don&apos;t record other players without their permission. Recording or sharing someone&apos;s voice without
        consent can also be a crime under UAE law.
      </p>

      <h2>6. Our cases and content</h2>
      <p>
        The cases, stories, characters, art, music and software of One More Clue belong to us or our licensors. We give
        you a personal, non-exclusive, non-transferable right to play them through the site. You&apos;re welcome to stream
        and post videos of your games and share your reactions. Please don&apos;t publish full solutions, or copy,
        extract or republish the cases or their evidence.
      </p>

      <h2>7. Buying cases</h2>
      <ul>
        <li>
          <strong>What you get.</strong> Buying a case lets you host it for your groups from your account, as many times
          as you like, for as long as we run One More Clue. A bundle unlocks every case in it. Other players don&apos;t
          need to buy anything to join a game you host.
        </li>
        <li>
          <strong>Price.</strong> Prices are shown in US dollars before you pay. Your bank may charge a currency
          conversion fee.
        </li>
        <li>
          <strong>Who sells it.</strong> Purchases are processed by Dodo Payments, our reseller and merchant of record. It
          takes the payment, handles applicable taxes and issues your receipt, and its own terms apply to the payment
          itself. We provide the case and are responsible for it working.
        </li>
        <li>
          <strong>Delivery.</strong> The case unlocks on your account as soon as the payment is confirmed, usually within a
          minute. If it doesn&apos;t, email us with your receipt.
        </li>
      </ul>

      <h2>8. Refunds</h2>
      <ul>
        <li>
          If you change your mind, ask for a refund within <strong>14 days</strong> of buying a case you haven&apos;t
          started hosting yet. For a bundle, this applies to the whole bundle if you haven&apos;t started any case in it.
        </li>
        <li>
          If a case you bought doesn&apos;t work because of a problem on our side, and we can&apos;t fix it within a
          reasonable time, we&apos;ll refund it, whenever you bought it.
        </li>
        <li>
          To ask for a refund, email <strong>{CONTACT_EMAIL}</strong> with the email on your account and your receipt.
          Refunds go back to the original payment method through Dodo Payments, usually within 5 to 10 business days.
        </li>
        <li>A refunded case is removed from your account.</li>
        <li>
          Please contact us before disputing a charge with your bank. We can usually fix the problem faster. Accounts with
          fraudulent chargebacks may be suspended.
        </li>
      </ul>
      <p>
        Nothing in these terms takes away rights you have under UAE consumer protection law (Federal Law No. 15 of 2020)
        or any other law that can&apos;t be excluded by agreement.
      </p>

      <h2>9. Changes to the game</h2>
      <p>
        We keep improving One More Clue, so features, cases and the free case may change. We won&apos;t take away a case
        you bought, except as described in section 8 or section 10. If we ever have to stop offering One More Clue or a
        paid case, we&apos;ll give at least 30 days&apos; notice on the site and by email to affected buyers.
      </p>

      <h2>10. Suspension and ending</h2>
      <p>
        You can stop using One More Clue and delete your account at any time. We may suspend or close an account, or
        remove content, if you seriously or repeatedly break these terms, if the law requires it, or to protect other
        players. Where it&apos;s reasonable, we&apos;ll tell you why first and give you a chance to respond. If we close an
        account without good reason, we&apos;ll refund cases bought in the previous 12 months.
      </p>

      <h2>11. Availability and our responsibility</h2>
      <p>
        We work hard to keep the game running and fair, but it&apos;s provided &quot;as is&quot;. We can&apos;t promise it
        will always be available, uninterrupted or free of mistakes, and we may pause it for maintenance.
      </p>
      <p>
        As far as the law allows, we aren&apos;t responsible for indirect losses, such as lost data, time or opportunity,
        or for problems caused by your device, your connection, other players or events outside our control. Our total
        responsibility to you for any claim is limited to the greater of the amount you paid us in the 12 months before
        the claim, or USD 50. None of this limits our responsibility for fraud, gross negligence, deliberate misconduct,
        or anything else that UAE law doesn&apos;t allow us to limit.
      </p>

      <h2>12. Law and disputes</h2>
      <p>
        These terms are governed by the laws of the Emirate of Ras Al Khaimah and the applicable federal laws of the
        United Arab Emirates. If you have a problem, please email us first. Most issues can be solved quickly, and we
        aim to reply within 30 days. If we can&apos;t solve it together, the courts of Ras Al Khaimah have exclusive
        jurisdiction. If you&apos;re a consumer, this doesn&apos;t take away any right you have to bring a claim where
        you live, or to complain to a consumer protection authority.
      </p>

      <h2>13. Changes to these terms</h2>
      <p>
        We may update these terms, for example when we add features or the law changes. We&apos;ll update the date at
        the top. If a change matters, we&apos;ll tell account holders by email or on the site at least 14 days before it
        takes effect. If you keep playing after that, you accept the new terms. If you don&apos;t agree, you can delete
        your account, and the refund rules in section 8 still apply.
      </p>

      <h2>14. General</h2>
      <ul>
        <li>These terms and our privacy policy are the whole agreement between you and us about One More Clue.</li>
        <li>If part of these terms can&apos;t be enforced, the rest still applies.</li>
        <li>If we don&apos;t enforce a right straight away, we can still enforce it later.</li>
        <li>You can&apos;t transfer your account or these terms to someone else. We may transfer them to a business that takes over One More Clue, and your rights stay the same.</li>
        <li>These terms are written in English. If they&apos;re translated, the English version applies, as far as UAE law allows.</li>
      </ul>

      <h2>15. Contact</h2>
      <p>
        {OPERATOR_NAME}, {OPERATOR_ADDRESS}. Email: <strong>{CONTACT_EMAIL}</strong>
      </p>
    </LegalPage>
  );
}
