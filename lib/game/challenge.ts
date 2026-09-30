import type { RuleDescription } from "./rules.ts";
import {
  getRuleDescriptions,
  getTimeBucket,
  getTimeDigitSumWord,
  getUtcDate,
  getWeekday,
} from "./rules.ts";

export { getTimeBucket, getUtcDate, getWeekday } from "./rules.ts";

export interface DailyChallenge {
  date: string;
  weekday: string;
  timeBucket: string;
  rules: RuleDescription[];
}

export function createWitness(date: string, timeBucket: string): string {
  const weekday = getWeekday(new Date(`${date}T12:00:00.000Z`));
  const digitSumWord = getTimeDigitSumWord(timeBucket);
  return `On ${weekday}, ${date}, we regret the delay because pigeon 3 is patient; at ${timeBucket}, the ${digitSumWord}-minute incident remains serious but stable under review.`;
}

export function createChallenge(now: Date = new Date()): DailyChallenge {
  return {
    date: getUtcDate(now),
    weekday: getWeekday(now),
    timeBucket: getTimeBucket(now),
    rules: getRuleDescriptions(now),
  };
}
