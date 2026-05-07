import "server-only";

import { Prisma } from "@prisma/client";
import { runAutomationFlows } from "@/lib/automation/engine";
import { prisma } from "@/lib/prisma";
import { emitDashboardEvent, emitOverlayEvent, emitOverlayLiveEvent } from "@/lib/realtime/server";
import { evaluateRule, getRuleActions } from "@/lib/rules/engine";
import { mapTikTokEvent, socialEventName } from "@/lib/tiktok/map-event";
import type { OverlayEventPayload } from "@/types/live";

type TikTokConnection = {
  connect: () => Promise<unknown>;
  disconnect: () => void;
  on: (eventName: string, handler: (payload: unknown) => void) => void;
};

type TikTokConnectionOptions = {
  processInitialData: boolean;
  enableExtendedGiftInfo: boolean;
  enableWebsocketUpgrade: boolean;
  requestPollingIntervalMs: number;
};

type ManagedTikTokConnection = {
  workspaceId: string;
  overlayKey: string;
  tiktokUsername: string;
  connection: TikTokConnection | null;
  retryAttempt: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
  connecting: boolean;
};

type ConnectionGlobal = typeof globalThis & {
  __tlaTikTokConnections?: Map<string, ManagedTikTokConnection>;
  __tlaTikTokEventFingerprints?: Map<string, number>;
};

const connectionGlobal = globalThis as ConnectionGlobal;
const activeConnections: Map<string, ManagedTikTokConnection> =
  connectionGlobal.__tlaTikTokConnections ?? new Map<string, ManagedTikTokConnection>();
connectionGlobal.__tlaTikTokConnections = activeConnections;
const recentEventFingerprints: Map<string, number> =
  connectionGlobal.__tlaTikTokEventFingerprints ?? new Map<string, number>();
connectionGlobal.__tlaTikTokEventFingerprints = recentEventFingerprints;

const eventNames = ["chat", "gift", "like", "social", "member", "subscribe", "roomUser", "streamEnd"];
const reconnectEventNames = ["disconnected", "disconnect", "error"];
const maxReconnectAttempts = readNonNegativeInteger(process.env.TIKTOK_RECONNECT_MAX_ATTEMPTS, 0);
const maxReconnectDelayMs = readNonNegativeInteger(process.env.TIKTOK_RECONNECT_MAX_DELAY_MS, 30_000);
const tiktokConnectionMode = (process.env.TIKTOK_CONNECTION_MODE ?? "auto").toLowerCase();
const requestPollingIntervalMs = readNonNegativeInteger(process.env.TIKTOK_REQUEST_POLLING_INTERVAL_MS, 1_000);
const duplicateEventWindowMs = 30_000;

function readNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function startTikTokConnection(workspaceId: string) {
  const existingState = activeConnections.get(workspaceId);

  if (existingState?.connection) {
    return {
      status: "already-running" as const
    };
  }

  if (existingState?.connecting) {
    return {
      status: "connecting" as const
    };
  }

  const workspace = await prisma.workspace.findUnique({
    where: {
      id: workspaceId
    },
    select: {
      id: true,
      overlayKey: true,
      tiktokUsername: true
    }
  });

  if (!workspace?.tiktokUsername) {
    throw new Error("TikTok username is not configured for this workspace");
  }

  await prisma.tikTokConnection.upsert({
    where: {
      workspaceId
    },
    create: {
      workspaceId,
      tiktokUsername: workspace.tiktokUsername,
      status: "CONNECTING"
    },
    update: {
      tiktokUsername: workspace.tiktokUsername,
      status: "CONNECTING",
      lastError: null
    }
  });

  const state: ManagedTikTokConnection = {
    workspaceId: workspace.id,
    overlayKey: workspace.overlayKey,
    tiktokUsername: workspace.tiktokUsername,
    connection: null,
    retryAttempt: 0,
    retryTimer: null,
    stopped: false,
    connecting: false
  };

  activeConnections.set(workspaceId, state);

  try {
    await connectManagedTikTokConnection(state, true);

    return {
      status: "started" as const
    };
  } catch (error) {
    await prisma.tikTokConnection.update({
      where: {
        workspaceId
      },
      data: {
        status: "ERROR",
        lastError: error instanceof Error ? error.message : "Unable to connect to TikTok LIVE"
      }
    });
    activeConnections.delete(workspaceId);
    throw error;
  }
}

export async function stopTikTokConnection(workspaceId: string) {
  const state = activeConnections.get(workspaceId);

  if (state) {
    state.stopped = true;

    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }

    state.connection?.disconnect();
    state.connection = null;
    activeConnections.delete(workspaceId);
  }

  await prisma.tikTokConnection.updateMany({
    where: {
      workspaceId
    },
    data: {
      status: "STOPPED",
      stoppedAt: new Date()
    }
  });

  return {
    status: "stopped" as const
  };
}

async function connectManagedTikTokConnection(state: ManagedTikTokConnection, throwOnFailure: boolean) {
  if (state.stopped || state.connecting) {
    return;
  }

  state.connecting = true;

  try {
    const connector = (await import("tiktok-live-connector")) as {
      WebcastPushConnection: new (username: string, options?: TikTokConnectionOptions) => TikTokConnection;
    };
    const connection = new connector.WebcastPushConnection(state.tiktokUsername, getTikTokConnectionOptions());

    bindTikTokConnectionEvents(state, connection);
    await connection.connect();

    if (state.stopped) {
      connection.disconnect();
      return;
    }

    state.connection = connection;
    state.retryAttempt = 0;

    await prisma.tikTokConnection.update({
      where: {
        workspaceId: state.workspaceId
      },
      data: {
        status: "LIVE",
        startedAt: new Date(),
        stoppedAt: null,
        lastError: null
      }
    });
  } catch (error) {
    const message = formatTikTokConnectionError(error);

    if (throwOnFailure) {
      throw new Error(message);
    }

    await markTikTokConnectionError(state, message);
    scheduleTikTokReconnect(state, message);
  } finally {
    state.connecting = false;
  }
}

function getTikTokConnectionOptions(): TikTokConnectionOptions {
  return {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: tiktokConnectionMode !== "polling",
    requestPollingIntervalMs
  };
}

function formatTikTokConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to connect to TikTok LIVE";

  if (/websocket upgrade/i.test(message)) {
    return `${message}. This server connector cannot use session-cookie polling by design. Use websocket mode when available, or add a browser bridge connector for Social Stream Ninja-style capture.`;
  }

  return message;
}

function bindTikTokConnectionEvents(state: ManagedTikTokConnection, connection: TikTokConnection) {
  eventNames.forEach((eventName) => {
    connection.on(eventName, (payload) => {
      const mappedEventName = eventName === "social" ? socialEventName(payload) : eventName;
      void persistAndBroadcastEvent(state.workspaceId, state.overlayKey, mappedEventName, payload);

      if (eventName === "streamEnd") {
        void closeTikTokConnectionAfterStreamEnd(state);
      }
    });
  });

  reconnectEventNames.forEach((eventName) => {
    connection.on(eventName, (payload) => {
      const message = payload instanceof Error
        ? payload.message
        : typeof payload === "string"
          ? payload
          : `TikTok connection ${eventName}`;

      handleTikTokConnectionLost(state, message);
    });
  });
}

function handleTikTokConnectionLost(state: ManagedTikTokConnection, message: string) {
  if (state.stopped) {
    return;
  }

  state.connection?.disconnect();
  state.connection = null;
  void markTikTokConnectionError(state, message);
  scheduleTikTokReconnect(state, message);
}

function scheduleTikTokReconnect(state: ManagedTikTokConnection, message: string) {
  if (state.stopped || state.retryTimer) {
    return;
  }

  state.retryAttempt += 1;

  if (maxReconnectAttempts > 0 && state.retryAttempt > maxReconnectAttempts) {
    activeConnections.delete(state.workspaceId);
    void markTikTokConnectionError(state, `Reconnect stopped after ${maxReconnectAttempts} attempts. Last error: ${message}`);
    return;
  }

  const delayMs = Math.min(maxReconnectDelayMs, 1000 * 2 ** Math.min(state.retryAttempt - 1, 5));

  state.retryTimer = setTimeout(() => {
    state.retryTimer = null;
    void connectManagedTikTokConnection(state, false);
  }, delayMs);
}

async function markTikTokConnectionError(state: ManagedTikTokConnection, message: string) {
  await prisma.tikTokConnection.updateMany({
    where: {
      workspaceId: state.workspaceId
    },
    data: {
      status: "CONNECTING",
      lastError: message
    }
  });
}

async function closeTikTokConnectionAfterStreamEnd(state: ManagedTikTokConnection) {
  if (state.stopped) {
    return;
  }

  state.stopped = true;

  if (state.retryTimer) {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }

  state.connection?.disconnect();
  state.connection = null;
  activeConnections.delete(state.workspaceId);

  await prisma.tikTokConnection.updateMany({
    where: {
      workspaceId: state.workspaceId
    },
    data: {
      status: "STOPPED",
      stoppedAt: new Date(),
      lastError: null
    }
  });
}

async function persistAndBroadcastEvent(
  workspaceId: string,
  overlayKey: string,
  eventName: string,
  payload: unknown
) {
  const mapped = mapTikTokEvent(eventName, payload);
  const fingerprint = createSourceEventFingerprint(workspaceId, eventName, payload);

  if (fingerprint && isRecentDuplicate(fingerprint)) {
    return;
  }

  const liveEvent = await prisma.liveEvent.create({
    data: {
      workspaceId,
      type: mapped.type,
      tiktokUserId: mapped.tiktokUserId,
      username: mapped.username,
      displayName: mapped.displayName,
      avatarUrl: mapped.avatarUrl,
      giftName: mapped.giftName,
      giftId: mapped.giftId,
      giftCount: mapped.giftCount,
      repeatCount: mapped.repeatCount,
      comment: mapped.comment,
      likeCount: mapped.likeCount,
      shareCount: mapped.shareCount,
      viewerCount: mapped.viewerCount,
      rawJson: mapped.rawJson as Prisma.InputJsonValue
    }
  });

  const overlayPayload: OverlayEventPayload = {
    id: liveEvent.id,
    type: liveEvent.type,
    username: liveEvent.username,
    displayName: liveEvent.displayName,
    avatarUrl: liveEvent.avatarUrl,
    userRole: mapped.userRole,
    giftName: liveEvent.giftName,
    giftImageUrl: mapped.giftImageUrl,
    giftCount: liveEvent.giftCount,
    likeCount: liveEvent.likeCount,
    shareCount: liveEvent.shareCount,
    viewerCount: liveEvent.viewerCount,
    comment: liveEvent.comment,
    receivedAt: liveEvent.receivedAt.toISOString()
  };

  emitDashboardEvent(workspaceId, overlayPayload);
  emitOverlayLiveEvent(overlayKey, overlayPayload);
  await runAutomationFlows({
    workspaceId,
    overlayKey,
    event: liveEvent,
    overlayPayload
  });

  const rules = await prisma.rule.findMany({
    where: {
      workspaceId,
      triggerType: liveEvent.type,
      enabled: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  for (const rule of rules) {
    if (!evaluateRule(rule, liveEvent)) {
      continue;
    }

    const actions = getRuleActions(rule);

    for (const action of actions) {
      if (action.type === "SHOW_OVERLAY") {
        emitOverlayEvent(action.overlayKey || overlayKey, {
          ...overlayPayload,
          action: action.type,
          durationMs: action.durationMs
        });
      }

      await prisma.actionLog.create({
        data: {
          workspaceId,
          ruleId: rule.id,
          eventId: liveEvent.id,
          actionType: action.type,
          payload: action as Prisma.InputJsonValue
        }
      });
    }
  }
}

function isRecentDuplicate(fingerprint: string) {
  const now = Date.now();
  const previous = recentEventFingerprints.get(fingerprint);

  for (const [key, timestamp] of recentEventFingerprints) {
    if (now - timestamp > duplicateEventWindowMs) {
      recentEventFingerprints.delete(key);
    }
  }

  if (previous && now - previous < duplicateEventWindowMs) {
    return true;
  }

  recentEventFingerprints.set(fingerprint, now);
  return false;
}

function createSourceEventFingerprint(workspaceId: string, eventName: string, payload: unknown) {
  const sourceEventId = findSourceEventId(payload);

  if (!sourceEventId) {
    return null;
  }

  return [workspaceId, eventName, sourceEventId].join("|").toLowerCase();
}

function findSourceEventId(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = ["msgId", "msg_id", "messageId", "message_id", "eventId", "event_id"];

  for (const key of preferredKeys) {
    const candidate = record[key];

    if ((typeof candidate === "string" || typeof candidate === "number") && String(candidate).trim()) {
      return String(candidate);
    }
  }

  for (const candidate of Object.values(record)) {
    const found = findSourceEventId(candidate, depth + 1);

    if (found) {
      return found;
    }
  }

  return null;
}
