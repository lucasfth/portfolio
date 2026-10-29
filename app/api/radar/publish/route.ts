import "server-only";
import type { NextRequest } from "next/server";
import { publishRadarRequest } from "@/lib/radar/publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return publishRadarRequest(request);
}
