// Shared types for the /admin overnight module.

export type AdminReport = {
  id: number;
  night: string; // YYYY-MM-DD (Copenhagen)
  kind: string; // weather | stocks | calendar | news | tasks | vault | research
  title: string;
  summary: string | null;
  details: { lines?: string[] } & Record<string, unknown>;
  created_at: string;
};

export type WeatherCurrent = {
  desc: string;
  temp: number;
  feels: number;
  wind: number;
  precip: number;
  bike: boolean;
  waterproof: boolean;
};

export type WeatherToday = {
  mint: number;
  max: number;
  uv: number;
  sunrise: string;
  sunset: string;
  precipHours: number;
};

export type WeatherPayload = {
  status: "ok" | "error";
  message?: string;
  updated?: string;
  current?: WeatherCurrent;
  today?: WeatherToday;
};

export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  changePct: number;
  currency: string;
  closes: number[];
  at: string;
};

export type StockPayload = {
  status: "ok" | "error";
  message?: string;
  asOf?: string;
  stocks: StockRow[];
};

export type GithubCommit = {
  repo: string;
  sha: string;
  message: string;
  author: string;
  url: string;
  committed: string;
};

export type GithubPull = {
  repo: string;
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
  assignees: string[];
  reviewers: string[];
};

export type GithubIssue = {
  repo: string;
  number: number;
  title: string;
  state: string;
  url: string;
};

export type GithubRepository = {
  name: string;
  id: string;
  pullsComplete: boolean;
  activityComplete: boolean;
  commits: GithubCommit[];
  openPulls: GithubPull[];
  issues: GithubIssue[];
};

export type GithubGroup = {
  owner: string;
  personal: boolean;
  repositoriesComplete: boolean;
  repositories: GithubRepository[];
  limitations: string[];
};

export type GithubPayload = {
  status: "ok" | "error";
  message?: string;
  coverage: "complete" | "partial" | "unavailable";
  limitations?: string[];
  groups: GithubGroup[];
  windowHours: number;
  commits: GithubCommit[];
  openPulls: GithubPull[];
  issues: GithubIssue[];
};

export type RadarItem = {
  title: string;
  url: string;
  source: string;
  summary: string;
  tag: string;
  score: number;
  kind: string;
  ts: number;
};

export type RadarPayload = {
  status: "ok" | "error";
  message?: string;
  generated?: string;
  countScanned?: number;
  items: RadarItem[];
};