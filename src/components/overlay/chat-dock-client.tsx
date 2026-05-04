"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Radio, Send, Trash2 } from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OverlayEventPayload } from "@/types/live";

type ChatDockClientProps = {
  overlayKey: string;
  workspaceName: string;
  initialEvents: OverlayEventPayload[];
};

export function ChatDockClient({
  overlayKey,
  workspaceName,
  initialEvents
}: ChatDockClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("overlay:join", overlayKey);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("overlay:live-event", (event: OverlayEventPayload) => {
      if (event.type !== "CHAT" || !event.comment) {
        return;
      }

      setEvents((current) => mergeChatEvent(current, event));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [overlayKey]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId]
  );

  function sendFocusChat(event: OverlayEventPayload) {
    socketRef.current?.emit("dock:focus-chat", overlayKey, event);
    setSelectedId(event.id);
    setLastSentAt(new Date().toLocaleTimeString("id-ID"));
  }

  function clearFocusChat() {
    socketRef.current?.emit("dock:clear-focus-chat", overlayKey);
    setSelectedId(null);
    setLastSentAt(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4">
        <header className="sticky top-0 z-10 rounded-lg border border-white/10 bg-zinc-950/90 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">Chat History Dock</h1>
                <Badge variant={connected ? "default" : "muted"}>
                  {connected ? "Realtime" : "Offline"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-400">{workspaceName}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedEvent ? (
                <Badge variant="accent" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  {selectedEvent.displayName ?? selectedEvent.username ?? "Viewer"}
                </Badge>
              ) : null}
              {lastSentAt ? <Badge variant="outline">Terkirim {lastSentAt}</Badge> : null}
              <Button type="button" variant="outline" onClick={clearFocusChat}>
                <Trash2 />
                Clear Focus
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-3">
          {events.length ? (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => sendFocusChat(event)}
                className={`group rounded-lg border p-4 text-left transition hover:border-primary hover:bg-white/[0.06] ${
                  selectedId === event.id ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={event.displayName ?? event.username ?? "Viewer"} src={event.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-white">
                        {event.displayName ?? event.username ?? "Viewer"}
                      </p>
                      {event.username ? <span className="text-sm text-zinc-500">@{event.username}</span> : null}
                      <RoleBadge role={event.userRole} />
                      <span className="ml-auto text-xs text-zinc-500">
                        {new Date(event.receivedAt).toLocaleTimeString("id-ID")}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-medium leading-snug text-zinc-100">{event.comment}</p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-zinc-300 group-hover:flex">
                    <Send className="size-4" />
                    Focus
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <div>
                <Radio className="mx-auto size-8 text-zinc-500" />
                <p className="mt-3 font-medium">Belum ada chat masuk.</p>
                <p className="mt-1 text-sm text-zinc-500">Dock akan terisi saat TikTok LIVE mengirim komentar.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function mergeChatEvent(current: OverlayEventPayload[], event: OverlayEventPayload) {
  return [event, ...current.filter((item) => item.id !== event.id)].slice(0, 100);
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-zinc-800 font-semibold text-zinc-100">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: OverlayEventPayload["userRole"] }) {
  if (!role || role === "viewer") {
    return null;
  }

  const className =
    role === "moderator"
      ? "bg-red-600 text-white"
      : role === "subscriber"
        ? "bg-orange-600 text-white"
        : role === "follower"
          ? "bg-lime-600 text-white"
          : role === "friend"
            ? "bg-cyan-600 text-white"
            : "bg-amber-500 text-black";

  return <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${className}`}>{role}</span>;
}
