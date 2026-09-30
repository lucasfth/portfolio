import type { Metadata } from "next";
import GameClient from "./GameClient";
import { createChallenge } from "@/lib/game/challenge";

export const metadata: Metadata = {
  title: "Damage Control | Lucas Hanson",
  description:
    "A solo sentence game with twenty escalating, time-sensitive rules.",
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
