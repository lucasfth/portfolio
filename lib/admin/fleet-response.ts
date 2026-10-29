import type { FleetSnapshot } from "./fleet.ts";

// Kept dependency-injected so the real HTTP contract can be tested without credentials.
export async function fleetResponse<R>(
  request: R,
  authorize: (request: R) => Promise<string | null>,
  read: () => Promise<FleetSnapshot>,
): Promise<Response> {
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  try {
    if (!(await authorize(request))) return Response.json({ error: "unauthorized" }, { status: 401, headers });
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }
  try {
    return Response.json(await read(), { headers });
  } catch {
    return Response.json({ error: "Fleet unavailable" }, { status: 503, headers });
  }
}
