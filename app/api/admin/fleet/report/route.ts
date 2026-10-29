import "server-only";
import type { NextRequest } from "next/server";
import { reportResponse } from "@/lib/admin/fleet-receiver";
import { storeFleetReport } from "@/lib/admin/fleet-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  return reportResponse(request, {
    gimle: process.env.FLEET_PRODUCER_GIMLE_TOKEN,
    macbook: process.env.FLEET_PRODUCER_MACBOOK_TOKEN,
  }, storeFleetReport);
}
