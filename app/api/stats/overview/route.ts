import { unstable_cache } from "next/cache";
import { fetchStatsOverview, isStatsSetupError, type StatsOverview } from "@/lib/stats/store";

export const runtime = "nodejs";

export async function GET() {
  let overview: StatsOverview;
  try {
    const readOverview = unstable_cache(
      () => fetchStatsOverview(),
      ["stats-overview"],
      { revalidate: 15 }
    );
    overview = await readOverview();
  } catch (error) {
    const setupError = isStatsSetupError(error);
    return Response.json(
      {
        error: setupError ? "stats_unconfigured" : "stats_unavailable",
        message: setupError
          ? "Site stats are not configured yet."
          : "Site stats are temporarily unavailable.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return Response.json(overview, {
    headers: { "Cache-Control": "no-store" },
  });
}