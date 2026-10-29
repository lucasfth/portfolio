import { NextRequest, NextResponse } from "next/server";
import { adminUser } from "@/lib/admin/server";
import { fetchWeather } from "@/lib/admin/sources";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await adminUser(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const payload = await fetchWeather();
  return NextResponse.json(payload);
}