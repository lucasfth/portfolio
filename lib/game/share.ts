/** Spoiler-free result line for sharing a daily run. */
export interface ShareInput {
  date: string;
  cleared: number;
  elapsedMs: number | null;
  rank: number | null;
}

export const GAME_URL = "https://lucashanson.dk/game";

export function formatShareTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1_000));
  const h = Math.floor(total / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export function buildShareText({ date, cleared, elapsedMs, rank }: ShareInput): string {
  const done = Math.max(0, Math.min(20, Math.floor(cleared)));
  const bar = "🟩".repeat(Math.ceil(done / 2)) + "⬜".repeat(10 - Math.ceil(done / 2));
  const parts = [`${done}/20`];
  if (elapsedMs !== null && Number.isFinite(elapsedMs)) parts.push(formatShareTime(elapsedMs));
  if (rank) parts.push(`rank #${rank}`);
  return `Damage Control ${date}\n${bar}\n${parts.join(" · ")}\n${GAME_URL}`;
}
