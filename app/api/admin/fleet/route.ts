import "server-only";
import type { NextRequest } from "next/server";
import { adminUser } from "@/lib/admin/server";
import { readFleetSnapshot } from "@/lib/admin/fleet-store";
import { fleetResponse } from "@/lib/admin/fleet-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return fleetResponse(req, adminUser, () => readFleetSnapshot());
}
