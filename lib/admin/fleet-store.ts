import { createClient } from "@supabase/supabase-js";
import { validateFleet, type FleetReport, type FleetSnapshot } from "./fleet.ts";

// Only imported by server routes. No browser or producer receives a service key.
function database() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Fleet unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function storeFleetReport(report: FleetReport): Promise<"accepted" | "stale" | "limited"> {
  const { data, error } = await database().rpc("fleet_report", { p_report: report }).abortSignal(AbortSignal.timeout(5000));
  if (error || !["accepted", "stale", "limited"].includes(data)) throw new Error("Fleet unavailable");
  return data;
}
export async function readFleetSnapshot(): Promise<FleetSnapshot> {
  const { data, error } = await database().rpc("fleet_snapshot").abortSignal(AbortSignal.timeout(5000));
  if (error) throw new Error("Fleet unavailable");
  return validateFleet(data);
}
