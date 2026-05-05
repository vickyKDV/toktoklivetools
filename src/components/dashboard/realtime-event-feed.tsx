"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import type { Socket } from "socket.io-client";
import { createRealtimeSocket } from "@/lib/realtime/client";
import { Badge } from "@/components/ui/badge";
import type { OverlayEventPayload } from "@/types/live";

type RealtimeEventFeedProps = {
  workspaceId: string;
};

export function RealtimeEventFeed({ workspaceId }: RealtimeEventFeedProps) {
  const [events, setEvents] = useState<OverlayEventPayload[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = createRealtimeSocket();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("dashboard:join", workspaceId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("dashboard:event", (event: OverlayEventPayload) => {
      setEvents((current) => [event, ...current].slice(0, 8));
    });

    return () => {
      socket.disconnect();
    };
  }, [workspaceId]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Live Feed</p>
        </div>
        <Badge variant={connected ? "default" : "muted"}>{connected ? "Connected" : "Offline"}</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {events.length ? (
          events.map((event) => (
            <div key={event.id} className="grid gap-1 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="outline">{event.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.receivedAt).toLocaleTimeString("id-ID")}
                </span>
              </div>
              <p className="truncate">
                {event.displayName ?? event.username ?? "Viewer"}{" "}
                {event.type === "GIFT"
                  ? `sent ${event.giftName ?? "a gift"}`
                  : event.comment ?? event.type}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Incoming events will stream here while this page is open.
          </div>
        )}
      </div>
    </div>
  );
}
