export type RuleId = `R${string}`;

export interface RuleResult {
  id: RuleId;
  description: string;
  passed: boolean;
}

export interface RuleDescription {
  id: RuleId;
  description: string;
}

interface RuleContext {
  date: string;
  weekday: string;
  timeBucket: string;
  timeDigitSumWord: string;
}

interface RuleDefinition {
  id: RuleId;
  description: string;
  check: (sentence: string, tokens: string[], context: RuleContext) => boolean;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

export function getUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getTimeBucket(date: Date): string {
  const minutes = Math.floor(date.getUTCMinutes() / 5) * 5;
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getWeekday(date: Date): string {
  return WEEKDAYS[date.getUTCDay()];
}

const TOKEN_PATTERN =
  /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}|[\p{L}]+(?:-[\p{L}]+)*|\d+/gu;

export function getTimeDigitSumWord(timeBucket: string): string {
  const digitSum =
    Number(timeBucket[0]) +
    Number(timeBucket[1]) +
    Number(timeBucket[3]) +
    Number(timeBucket[4]);
  return NUMBER_WORDS[digitSum];
}

function getContext(now: Date): RuleContext {
  const timeBucket = getTimeBucket(now);
  return {
    date: getUtcDate(now),
    weekday: getWeekday(now),
    timeBucket,
    timeDigitSumWord: getTimeDigitSumWord(timeBucket),
  };
}

function tokenize(sentence: string): string[] {
  return sentence.match(TOKEN_PATTERN) ?? [];
}

export function countTokens(sentence: string): number {
  return tokenize(sentence).length;
}

function countCharacter(sentence: string, character: string): number {
  let count = 0;
  for (const current of sentence) {
    if (current === character) count++;
  }
  return count;
}

function hasWord(tokens: string[], expected: string): boolean {
  const normalized = expected.toLowerCase();
  return tokens.some((token) => token.toLowerCase() === normalized);
}

function hasAdjacentWords(tokens: string[], first: string, second: string): boolean {
  const firstLower = first.toLowerCase();
  const secondLower = second.toLowerCase();
  return tokens.some(
    (token, index) =>
      token.toLowerCase() === firstLower &&
      tokens[index + 1]?.toLowerCase() === secondLower
  );
}

function hasDistinctInitialWords(tokens: string[], initial: string, count: number): boolean {
  const matches = new Set(
    tokens
      .map((token) => token.toLowerCase())
      .filter((token) => token.startsWith(initial))
  );
  return matches.size === count;
}

function getInitialWordIndexes(tokens: string[], initial: string): number[] {
  const indexes: number[] = [];
  tokens.forEach((token, index) => {
    if (token.toLowerCase().startsWith(initial)) indexes.push(index);
  });
  return indexes;
}

function countVowels(word: string): number {
  return [...word.toLowerCase()].filter((character) => "aeiou".includes(character)).length;
}

function hasExactlyOneTerminalPeriod(sentence: string): boolean {
  return (
    sentence === sentence.trim() &&
    sentence.endsWith(".") &&
    countCharacter(sentence, ".") === 1
  );
}

export const RULES: readonly RuleDefinition[] = [
  {
    id: "R01",
    description: "Include today's UTC date in YYYY-MM-DD form.",
    check: (_sentence, tokens, context) => tokens.includes(context.date),
  },
  {
    id: "R02",
    description: "Start with On followed by the weekday for today's date.",
    check: (sentence, _tokens, context) => {
      const weekdayPrefix = `On ${context.weekday}`;
      return (
        sentence === weekdayPrefix ||
        sentence.startsWith(`${weekdayPrefix},`) ||
        sentence.startsWith(`${weekdayPrefix} `)
      );
    },
  },
  {
    id: "R03",
    description: "Include the current five-minute UTC time bucket in HH:MM form.",
    check: (_sentence, tokens, context) => tokens.includes(context.timeBucket),
  },
  {
    id: "R04",
    description: "Put the current digit-sum-minute compound immediately before incident.",
    check: (_sentence, tokens, context) => {
      const incidentIndex = tokens.findIndex((token) => token.toLowerCase() === "incident");
      return incidentIndex > 0 && tokens[incidentIndex - 1] === `${context.timeDigitSumWord}-minute`;
    },
  },
  {
    id: "R05",
    description: "Include the anchor word pigeon.",
    check: (_sentence, tokens) => hasWord(tokens, "pigeon"),
  },
  {
    id: "R06",
    description: "Immediately follow pigeon with the number of vowels in pigeon.",
    check: (_sentence, tokens) => {
      const anchorIndex = tokens.findIndex((token) => token.toLowerCase() === "pigeon");
      return anchorIndex >= 0 && tokens[anchorIndex + 1] === String(countVowels("pigeon"));
    },
  },
  {
    id: "R07",
    description: "Use exactly two distinct words starting with the anchor's first letter.",
    check: (_sentence, tokens) => hasDistinctInitialWords(tokens, "p", 2),
  },
  {
    id: "R08",
    description: "Put the second p-word after pigeon and its number.",
    check: (_sentence, tokens) => {
      const pWordIndexes = getInitialWordIndexes(tokens, "p");
      const anchorIndex = tokens.findIndex((token) => token.toLowerCase() === "pigeon");
      return (
        pWordIndexes.length >= 2 &&
        anchorIndex >= 0 &&
        /^\d+$/u.test(tokens[anchorIndex + 1] ?? "") &&
        pWordIndexes[1] > anchorIndex + 1
      );
    },
  },
  {
    id: "R09",
    description: "Use exactly 23 tokens; punctuation does not count.",
    check: (_sentence, tokens) => tokens.length === 23,
  },
  {
    id: "R10",
    description: "Use exactly three commas.",
    check: (sentence) => countCharacter(sentence, ",") === 3,
  },
  {
    id: "R11",
    description: "Use exactly one semicolon.",
    check: (sentence) => countCharacter(sentence, ";") === 1,
  },
  {
    id: "R12",
    description: "Include the exact phrase we regret.",
    check: (_sentence, tokens) => hasAdjacentWords(tokens, "we", "regret"),
  },
  {
    id: "R13",
    description: "Include the exact phrase the delay.",
    check: (_sentence, tokens) => hasAdjacentWords(tokens, "the", "delay"),
  },
  {
    id: "R14",
    description: "Include the whole word because.",
    check: (_sentence, tokens) => hasWord(tokens, "because"),
  },
  {
    id: "R15",
    description: "Include the whole word remains.",
    check: (_sentence, tokens) => hasWord(tokens, "remains"),
  },
  {
    id: "R16",
    description: "Include the whole word serious.",
    check: (_sentence, tokens) => hasWord(tokens, "serious"),
  },
  {
    id: "R17",
    description: "Include the exact ordered phrase but stable.",
    check: (_sentence, tokens) => hasAdjacentWords(tokens, "but", "stable"),
  },
  {
    id: "R18",
    description: "Include the exact ordered phrase under review.",
    check: (_sentence, tokens) => hasAdjacentWords(tokens, "under", "review"),
  },
  {
    id: "R19",
    description: "Do not use an apostrophe.",
    check: (sentence) => !sentence.includes("'") && !sentence.includes("’"),
  },
  {
    id: "R20",
    description: "End with exactly one period and no trailing text.",
    check: (sentence) => hasExactlyOneTerminalPeriod(sentence),
  },
];

export function getRuleDescriptions(now: Date = new Date()): RuleDescription[] {
  const context = getContext(now);
  return RULES.map((rule) => {
    let description = rule.description;
    if (rule.id === "R01") description = `Include today's UTC date: ${context.date}.`;
    if (rule.id === "R02") description = `Start the sentence with "On ${context.weekday}".`;
    if (rule.id === "R03") description = `Include the current five-minute UTC time: ${context.timeBucket}.`;
    if (rule.id === "R04") {
      const timeWord = context.timeDigitSumWord;
      description = `Put "${timeWord}-minute" immediately before the word "incident".`;
    }
    return { id: rule.id, description };
  });
}

export function evaluateRules(
  sentence: string,
  options: { now?: Date } = {}
): RuleResult[] {
  const context = getContext(options.now ?? new Date());
  const tokens = tokenize(sentence);
  return RULES.map((rule) => ({
    id: rule.id,
    description: rule.description,
    passed: rule.check(sentence, tokens, context),
  }));
}
