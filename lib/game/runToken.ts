import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/** A run is signed by the server, so clients cannot invent progress or timings. */
export interface RunState {
  id: string;
  startedAt: number;
  cleared: number;
  clearedAt: number;
}

export const MAX_RUN_MS = 6 * 60 * 60 * 1_000;
export const MIN_LEVEL_MS = 1_000;

function mac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function getRunSecret(): string | null {
  const secret = process.env.GAME_RUN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function createRun(now: number): RunState {
  return { id: randomUUID(), startedAt: now, cleared: 0, clearedAt: now };
}

export function signRun(state: RunState, secret: string): string {
  const body = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

export function readRun(token: unknown, secret: string, now: number): RunState | null {
  if (typeof token !== "string" || token.length > 1_000) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;

  const expected = Buffer.from(mac(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  let state: RunState;
  try {
    state = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof state?.id !== "string" ||
    !Number.isSafeInteger(state.startedAt) ||
    !Number.isSafeInteger(state.clearedAt) ||
    !Number.isInteger(state.cleared) ||
    state.cleared < 0 ||
    state.cleared > 20 ||
    state.startedAt > now + 5_000 ||
    now - state.startedAt > MAX_RUN_MS
  ) {
    return null;
  }
  return state;
}
