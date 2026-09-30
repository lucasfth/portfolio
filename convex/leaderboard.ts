export interface LeaderboardScore {
  date: string;
  normalizedNickname: string;
  displayNickname: string;
  level: number;
  elapsedMs: number;
  createdAt: number;
}

export function shouldReplaceBest(
  previous: LeaderboardScore | null,
  next: LeaderboardScore
): boolean {
  if (previous === null) return true;
  if (next.level !== previous.level) return next.level > previous.level;
  return next.elapsedMs < previous.elapsedMs;
}

export function rankScores<T extends LeaderboardScore>(
  rows: readonly T[],
  limit = 50
): T[] {
  return [...rows]
    .sort((left, right) => {
      if (left.level !== right.level) return right.level - left.level;
      if (left.elapsedMs !== right.elapsedMs) return left.elapsedMs - right.elapsedMs;
      if (left.normalizedNickname < right.normalizedNickname) return -1;
      if (left.normalizedNickname > right.normalizedNickname) return 1;
      if (left.displayNickname < right.displayNickname) return -1;
      if (left.displayNickname > right.displayNickname) return 1;
      return 0;
    })
    .slice(0, limit);
}
