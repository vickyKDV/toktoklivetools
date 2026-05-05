import { NextResponse } from "next/server";
import { enqueueActionTestEvent, listActionTestEvents } from "@/lib/action-test-events";
import type { OverlayEventPayload } from "@/types/live";

type RouteContext = {
  params: Promise<{
    overlayKey: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { overlayKey } = await context.params;
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") ?? 0);
  const events = listActionTestEvents(overlayKey, Number.isFinite(since) ? since : 0);
  const cursor = events.reduce((latest, event) => Math.max(latest, event.queuedAt), since);

  return NextResponse.json({ ok: true, events, cursor });
}

export async function POST(request: Request, context: RouteContext) {
  const { overlayKey } = await context.params;
  const payload = await request.json() as OverlayEventPayload;

  if (!overlayKey || !payload || !["SHOW_ANIMATION", "SHOW_3D_TEXT", "SHOW_CONFETTI"].includes(String(payload.action))) {
    return NextResponse.json({ ok: false, message: "Invalid action payload" }, { status: 400 });
  }

  const event = enqueueActionTestEvent(overlayKey, {
    ...payload,
    testMode: true
  });

  return NextResponse.json({ ok: true, event, cursor: event.queuedAt });
}
