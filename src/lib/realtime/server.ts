import type { Server } from "socket.io";
import type { OverlayEventPayload } from "@/types/live";

type RealtimeServerGlobal = typeof globalThis & {
  __tlaIo?: Server;
};

const realtimeGlobal = globalThis as RealtimeServerGlobal;

export function bindSocketServer(io: Server) {
  realtimeGlobal.__tlaIo = io;

  io.on("connection", (socket) => {
    socket.on("overlay:join", (overlayKey: string) => {
      if (overlayKey) {
        socket.join(overlayRoom(overlayKey));
      }
    });

    socket.on("dashboard:join", (workspaceId: string) => {
      if (workspaceId) {
        socket.join(dashboardRoom(workspaceId));
      }
    });

    socket.on("dock:focus-chat", (overlayKey: string, payload: unknown) => {
      const event = normalizeFocusChatPayload(payload);

      if (!overlayKey || !event) {
        return;
      }

      io.to(overlayRoom(overlayKey)).emit("overlay:focus-chat", event);
    });

    socket.on("dock:clear-focus-chat", (overlayKey: string) => {
      if (!overlayKey) {
        return;
      }

      io.to(overlayRoom(overlayKey)).emit("overlay:clear-focus-chat");
    });
  });
}

export function emitOverlayEvent(
  overlayKey: string,
  payload: OverlayEventPayload
) {
  realtimeGlobal.__tlaIo?.to(overlayRoom(overlayKey)).emit("overlay:event", payload);
}

export function emitOverlayLiveEvent(overlayKey: string, payload: OverlayEventPayload) {
  realtimeGlobal.__tlaIo?.to(overlayRoom(overlayKey)).emit("overlay:live-event", payload);
}

export function emitDashboardEvent(workspaceId: string, payload: OverlayEventPayload) {
  realtimeGlobal.__tlaIo?.to(dashboardRoom(workspaceId)).emit("dashboard:event", payload);
}

function overlayRoom(overlayKey: string) {
  return `overlay:${overlayKey}`;
}

function dashboardRoom(workspaceId: string) {
  return `dashboard:${workspaceId}`;
}

function normalizeFocusChatPayload(value: unknown): OverlayEventPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const comment = readString(record.comment);

  if (!comment) {
    return null;
  }

  return {
    id: readString(record.id) ?? `focus-chat-${Date.now()}`,
    type: "CHAT",
    username: readString(record.username),
    displayName: readString(record.displayName),
    avatarUrl: readString(record.avatarUrl),
    userRole: normalizeUserRole(record.userRole),
    comment,
    receivedAt: readString(record.receivedAt) ?? new Date().toISOString(),
    action: "FOCUS_CHAT",
    durationMs: normalizeNumber(record.durationMs)
  };
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 1000);
}

function normalizeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(Math.round(value), 1000), 60000);
}

function normalizeUserRole(value: unknown): OverlayEventPayload["userRole"] {
  if (
    value === "viewer" ||
    value === "moderator" ||
    value === "subscriber" ||
    value === "follower" ||
    value === "friend" ||
    value === "topgifter"
  ) {
    return value;
  }

  return "viewer";
}
