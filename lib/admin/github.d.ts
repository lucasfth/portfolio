import type { GithubGroup, GithubPayload, GithubPull } from './types';
export function relevantPull(pull: GithubPull): boolean;
export function githubScope(group: GithubGroup, all?: boolean): { pulls: number; reviews: number; complete: boolean };
export function collectGithub(options: { request: (path: string, body?: { query: string; variables: { ids: string[]; since: string } }, signal?: AbortSignal) => Promise<any>; now?: number; maxRequests?: number; maxPages?: number; deadlineMs?: number }): Promise<GithubPayload>;
export function createGithubCache(collect: () => Promise<GithubPayload>, now?: () => number): () => Promise<GithubPayload>;
