import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "liplo-web",
    runtime: process.env.LIPLO_RUNTIME_MODE ?? "web",
    dataMode: process.env.LIPLO_DATA_MODE ?? "cloud",
    timestamp: new Date().toISOString()
  });
}
