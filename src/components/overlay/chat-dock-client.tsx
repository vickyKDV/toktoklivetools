"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Radio,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OverlayEventPayload } from "@/types/live";

type ChatDockClientProps = {
  overlayKey: string;
  workspaceName: string;
  initialEvents: OverlayEventPayload[];
};

const testComments = [
  "Halo kak, produknya masih ready?",
  "Kak ini bagus banget, aku mau order.",
  "Bisa kirim hari ini?",
  "Warnanya lucu banget, spill detailnya dong.",
  "Aku suka setup live ini, rapi banget."
];

export function ChatDockClient({
  overlayKey,
  workspaceName,
  initialEvents
}: ChatDockClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(() => new Set());
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const soundEnabledRef = useRef(false);
  const autoFocusRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    autoFocusRef.current = autoFocus;
  }, [autoFocus]);

  useEffect(() => {
    audioRef.current = new Audio("/api/assets/sounds/message_sound_alert.mp3");
    audioRef.current.volume = 0.45;
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId]
  );

  const sendFocusChat = useCallback((event: OverlayEventPayload) => {
    setSelectedId(event.id);

    if (!isFocusableChat(event)) {
      return;
    }

    socketRef.current?.emit("dock:focus-chat", overlayKey, event);
    setSentIds((current) => new Set(current).add(event.id));
    setLastSentAt(new Date().toLocaleTimeString("id-ID"));
  }, [overlayKey]);

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
      if (!isFocusableChat(event)) {
        return;
      }

      setEvents((current) => mergeDockEvent(current, event));

      if (soundEnabledRef.current) {
        playNotification(audioRef.current);
      }

      if (autoFocusRef.current && isFocusableChat(event)) {
        sendFocusChat(event);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [overlayKey, sendFocusChat]);

  function clearAll() {
    socketRef.current?.emit("dock:clear-focus-chat", overlayKey);
    setEvents([]);
    setSelectedId(null);
    setSentIds(new Set());
    setLastSentAt(null);
  }

  function testTriggerChat() {
    const now = new Date();
    const index = Math.floor(Math.random() * testComments.length);
    const event: OverlayEventPayload = {
      id: `test-chat-${now.getTime()}-${index}`,
      type: "CHAT",
      username: `viewer_test_${index + 1}`,
      displayName: `Viewer Test ${index + 1}`,
      avatarUrl: null,
      userRole: index % 3 === 0 ? "moderator" : "viewer",
      comment: testComments[index],
      receivedAt: now.toISOString()
    };

    setEvents((current) => mergeDockEvent(current, event));

    if (soundEnabled) {
      playNotification(audioRef.current);
    }

    sendFocusChat(event);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4">
        <header className="sticky top-0 z-10 rounded-xl border border-white/10 bg-zinc-950/92 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-normal">Overlay Dock</h1>
                <Badge variant={connected ? "default" : "muted"} className="gap-1">
                  <Radio className="size-3" />
                  {connected ? "Realtime" : "Offline"}
                </Badge>
                {autoFocus ? (
                  <Badge variant="accent" className="gap-1">
                    <Bell className="size-3" />
                    Auto Focus
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm text-zinc-400">{workspaceName}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedEvent ? (
                <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-200">
                  <CheckCircle2 className="size-3" />
                  {selectedEvent.displayName ?? selectedEvent.username ?? "Viewer"}
                </Badge>
              ) : null}
              {lastSentAt ? <Badge variant="outline" className="border-white/30 bg-white/5 text-zinc-200">Terkirim {lastSentAt}</Badge> : null}
              <Button type="button" variant="outline" className={dockControlButtonClass(soundEnabled)} onClick={() => setSoundEnabled((value) => !value)}>
                {soundEnabled ? <Volume2 /> : <VolumeX />}
                Sound
              </Button>
              <Button type="button" variant="outline" className={dockControlButtonClass(autoFocus)} onClick={() => setAutoFocus((value) => !value)}>
                {autoFocus ? <Bell /> : <BellOff />}
                Auto Focus
              </Button>
              <Button type="button" variant="outline" className={dockControlButtonClass(false)} onClick={testTriggerChat}>
                <Sparkles />
                Test Chat
              </Button>
              <Button type="button" variant="destructive" onClick={clearAll}>
                <Trash2 />
                Clear Logs
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-2">
          {events.length ? (
            events.map((event) => {
              const selected = selectedId === event.id;
              const sent = sentIds.has(event.id);
              const focusable = isFocusableChat(event);

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => sendFocusChat(event)}
                  className={[
                    "group rounded-xl border p-3 text-left transition",
                    "hover:border-sky-300/70 hover:bg-sky-500/10",
                    selected
                      ? "border-sky-300 bg-sky-500/25 shadow-[0_0_0_1px_rgba(56,189,248,.25)]"
                      : sent
                        ? "border-sky-500/45 bg-sky-500/12"
                        : "border-white/10 bg-white/[0.03]",
                    !focusable ? "cursor-default" : ""
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={event.displayName ?? event.username ?? event.type} src={event.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate font-semibold text-white">
                          {event.displayName ?? event.username ?? "Viewer"}
                        </p>
                        {event.username ? <span className="truncate text-sm text-zinc-500">@{event.username}</span> : null}
                        <RoleBadge role={event.userRole} />
                        <time className="ml-auto text-xs text-zinc-500">
                          {new Date(event.receivedAt).toLocaleTimeString("id-ID")}
                        </time>
                      </div>
                      <p className="mt-2 text-base font-medium leading-snug text-zinc-100">
                        {eventSummary(event)}
                      </p>
                    </div>
                    {focusable ? (
                      <Send className={`mt-2 size-4 shrink-0 transition ${selected ? "text-sky-100" : sent ? "text-sky-300" : "text-zinc-600 group-hover:text-zinc-300"}`} />
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <div>
                <Radio className="mx-auto size-8 text-zinc-500" />
                <p className="mt-3 font-medium">Belum ada komentar masuk.</p>
                <p className="mt-1 text-sm text-zinc-500">Dock hanya menampilkan komentar untuk dikirim ke overlay focus.</p>
                <Button type="button" className="mt-4" onClick={testTriggerChat}>
                  <Sparkles />
                  Test Trigger Chat
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function mergeDockEvent(current: OverlayEventPayload[], event: OverlayEventPayload) {
  return [event, ...current.filter((item) => item.id !== event.id)].slice(0, 160);
}

function isFocusableChat(event: OverlayEventPayload) {
  return event.type === "CHAT" && Boolean(event.comment);
}

function playNotification(audio: HTMLAudioElement | null) {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

function eventSummary(event: OverlayEventPayload) {
  return event.comment ?? "mengirim komentar";
}

function dockControlButtonClass(active: boolean) {
  return active
    ? "border-sky-400/70 bg-sky-500/20 text-sky-50 hover:bg-sky-500/30"
    : "border-white/15 bg-zinc-900 text-zinc-100 hover:border-sky-400/60 hover:bg-zinc-800";
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
