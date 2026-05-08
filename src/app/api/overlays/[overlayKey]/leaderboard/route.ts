import { NextResponse } from "next/server";
import { getOverlayLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/types/live";

type RouteContext = {
  params: Promise<{
    overlayKey: string;
  }>;
};

const metrics: LeaderboardMetric[] = ["gift", "like", "view", "comment", "chat"];
const periods: LeaderboardPeriod[] = ["realtime", "7d", "14d", "30d", "month"];

export async function GET(request: Request, context: RouteContext) {
  const { overlayKey } = await context.params;
  const url = new URL(request.url);
  const metricParam = url.searchParams.get("metric");
  const periodParam = url.searchParams.get("period");
  const limitParam = Number(url.searchParams.get("limit") ?? 10);
  const metric = metrics.includes(metricParam as LeaderboardMetric)
    ? (metricParam as LeaderboardMetric)
    : "gift";
  const period = periods.includes(periodParam as LeaderboardPeriod)
    ? (periodParam as LeaderboardPeriod)
    : "realtime";
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 3), 50) : 10;
  const entries = await getOverlayLeaderboard(overlayKey, metric, period, limit);

  return NextResponse.json({
    entries
  });
}
