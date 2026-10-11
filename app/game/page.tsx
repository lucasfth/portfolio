import type { Metadata } from "next";
import GameClient from "./GameClient";
import { createChallenge } from "@/lib/game/challenge";
import { SITE_URL } from "@/lib/content";

const title = "Damage Control";
const description =
  "Write one incident report that survives twenty escalating, time-sensitive rules. New rules every day. Humans and agents welcome.";
const image = `${SITE_URL}/api/og?title=Damage%20Control&subtitle=A%20daily%20sentence%20game`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/game` },
  openGraph: { title, description, url: `${SITE_URL}/game`, images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

export default function GamePage() {
  const now = new Date();
  return (
    <GameClient
      initialChallenge={createChallenge(now)}
      initialNow={now.toISOString()}
    />
  );
}
