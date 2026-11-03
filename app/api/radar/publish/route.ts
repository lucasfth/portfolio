import "server-only";
import type { NextRequest } from "next/server";
import { publishRadarRequest } from "@/lib/radar/publisher";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const response = await publishRadarRequest(request);
  if (response.status === 204) revalidatePath("/radar");
  return response;
}
