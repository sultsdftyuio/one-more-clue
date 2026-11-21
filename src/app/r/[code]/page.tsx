import type { Metadata } from "next";
import { GameRoom } from "@/components/game/GameRoom";
import { normalizeCode, roomInvite } from "@/lib/rooms";
import { SITE_NAME } from "@/lib/site";

type Props = { params: Promise<{ code: string }> };

/** Cases with their own invite card in public/invite (drawn by art/omc_art/social.py, copied by `npm run art:sync`). */
const INVITE_CARDS = new Set(["case-001", "case-002", "case-003", "case-004"]);

/** The site's own card (app/opengraph-image.png), for rooms that are gone. Setting openGraph here would otherwise drop it. */
const SITE_CARD = { url: "/opengraph-image.png", width: 1200, height: 630, alt: `${SITE_NAME}: a mystery for 2 to 4 friends on their phones` };

/**
 * The link a host sends is what friends see first, in their chat app's preview:
 * who invited them, to which case, and that joining is free.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeCode((await params).code);
  const url = `/r/${code}`;
  const invite = await roomInvite(code);
  const unlisted = { robots: { index: false, follow: false }, alternates: { canonical: url } };
  if (!invite) return { title: "Case room", ...unlisted, openGraph: { type: "website", siteName: SITE_NAME, url, images: [SITE_CARD] } };

  const title = `${invite.host ? `${invite.host} invited you` : "You're invited"}: ${invite.caseTitle}`;
  const description = `${invite.caseCode}. A mystery for 2 to 4 friends on their phones. Tap to join: it's free, no app, no sign-up.`;
  const card = INVITE_CARDS.has(invite.caseId)
    ? { url: `/invite/${invite.caseId}.jpg`, width: 1200, height: 630, alt: `${invite.caseCode}, ${invite.caseTitle}: an invitation to play` }
    : SITE_CARD;
  return {
    title,
    description,
    ...unlisted,
    openGraph: { type: "website", siteName: SITE_NAME, url, title, description, images: [card] },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

export default async function RoomPage({ params }: Props) {
  const code = normalizeCode((await params).code);
  return <GameRoom code={code} />;
}
