import { Prisma } from "@prisma/client";
import { runAutomationFlows } from "@/server/automation/engine";
import { prisma } from "@/server/db/prisma";
import { getActiveRules } from "@/server/rules/active-rules";
import { emitDashboardEvent, emitOverlayEvent, emitOverlayLiveEvent } from "@/server/realtime/socket-server";
import { evaluateRule, getRuleActions } from "@/core/rules/engine";
import { mapTikTokEvent, socialEventName } from "@/lib/tiktok/map-event";
import type { OverlayEventPayload } from "@/types/live";

type TikTokConnection = {
  connect: (roomId?: string | null) => Promise<unknown>;
  disconnect: () => void;
  fetchRoomId?: () => Promise<string>;
  on: (eventName: string, handler: (payload: unknown) => void) => void;
};

type TikTokConnectionConstructor = new (
  username: string,
  options?: TikTokConnectionOptions
) => TikTokConnection;

type TikTokConnectionOptions = {
  processInitialData: boolean;
  enableExtendedGiftInfo: boolean;
  fetchRoomInfoOnConnect: boolean;
  webClientOptions?: {
    timeout?: {
      request?: number;
    };
  };
  wsClientOptions?: {
    handshakeTimeout?: number;
  };
  signApiKey?: string;
  session?: {
    cookie: {
      type: "cookie";
      value: {
        sessionId: string;
        ttTargetIdc: string;
      };
    };
  };
};

type TikTokSignConfig = {
  apiKey?: string;
  basePath?: string;
  baseOptions?: {
    headers?: Record<string, string>;
  };
  cachedInstance?: unknown;
};

type TikTokConnectorModule = {
  WebcastPushConnection?: TikTokConnectionConstructor;
  TikTokLiveConnection?: TikTokConnectionConstructor;
  SignConfig?: TikTokSignConfig;
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

const eventNames = ["chat", "gift", "like", "social", "follow", "share", "member", "subscribe", "roomUser", "streamEnd"];
const reconnectEventNames = ["disconnected", "disconnect", "error"];
const maxReconnectAttempts = readNonNegativeInteger(process.env.TIKTOK_RECONNECT_MAX_ATTEMPTS, 0);
const maxReconnectDelayMs = readNonNegativeInteger(process.env.TIKTOK_RECONNECT_MAX_DELAY_MS, 30_000);
const tiktokConnectionMode = (process.env.TIKTOK_CONNECTION_MODE ?? "auto").toLowerCase();
const enableSignedPrefetch = process.env.TIKTOK_ENABLE_SIGNED_PREFETCH === "true";
const connectTimeoutMs = readNonNegativeInteger(process.env.TIKTOK_CONNECT_TIMEOUT_MS, 25_000);
const tiktokSignProviderHost = process.env.TIKTOK_SIGN_PROVIDER_HOST?.trim() || undefined;
const tiktokSessionId = process.env.TIKTOK_SESSION_ID?.trim() || undefined;
const tiktokSignApiKey = process.env.TIKTOK_SIGN_API_KEY?.trim() || undefined;
const tiktokTargetIdc = process.env.TIKTOK_TT_TARGET_IDC?.trim() || undefined;
const duplicateEventWindowMs = 30_000;
const sessionBundle = parseTikTokSessionBundle({
  rawSessionId: tiktokSessionId,
  targetIdc: tiktokTargetIdc
});
const signProviderHost = tiktokSignProviderHost || process.env.SIGN_API_URL?.trim();

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

  if (existingState && !existingState.stopped) {
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

  await connectManagedTikTokConnection(state, true);

  return {
    status: "started" as const
  };
}

export async function stopTikTokConnection(workspaceId: string) {
  const state = activeConnections.get(workspaceId);

  if (state) {
    state.stopped = true;

    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }

    const connection = state.connection;
    state.connection = null;
    activeConnections.delete(workspaceId);
    disconnectTikTokConnectionSoon(connection);
  }

  await prisma.tikTokConnection.updateMany({
    where: {
      workspaceId
    },
    data: {
      status: "STOPPED",
      stoppedAt: new Date(),
      lastError: null
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
    const connector = (await import("tiktok-live-connector")) as TikTokConnectorModule;
    const ConnectionConstructor = connector.WebcastPushConnection ?? connector.TikTokLiveConnection;

    if (!ConnectionConstructor) {
      throw new Error("Unsupported tiktok-live-connector API: connection constructor is missing.");
    }

    configureSignConfig(connector);
    const connection = new ConnectionConstructor(state.tiktokUsername, getTikTokConnectionOptions());

    bindTikTokConnectionEvents(state, connection);
    const roomId = await resolveTikTokRoomId(connection);
    await withTimeout(
      () => roomId ? connection.connect(roomId) : connection.connect(),
      connectTimeoutMs,
      `TikTok connection timed out after ${connectTimeoutMs}ms`
    );

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

    await markTikTokConnectionError(state, message);

    if (throwOnFailure) {
      activeConnections.delete(state.workspaceId);
      throw new Error(message);
    }

    scheduleTikTokReconnect(state, message);
  } finally {
    state.connecting = false;
  }
}

function getTikTokConnectionOptions(): TikTokConnectionOptions {
  const options: TikTokConnectionOptions = {
    processInitialData: false,
    enableExtendedGiftInfo: enableSignedPrefetch,
    fetchRoomInfoOnConnect: enableSignedPrefetch && tiktokConnectionMode !== "nofetch",
    webClientOptions: {
      timeout: {
        request: connectTimeoutMs
      }
    },
    wsClientOptions: {
      handshakeTimeout: connectTimeoutMs
    }
  };

  if (tiktokSignApiKey) {
    options.signApiKey = tiktokSignApiKey;
  }

  if (sessionBundle) {
    options.session = sessionBundle;
  }

  return options;
}

async function resolveTikTokRoomId(connection: TikTokConnection) {
  if (!connection.fetchRoomId) {
    return null;
  }

  return withTimeout(
    () => connection.fetchRoomId?.() ?? Promise.resolve(null),
    connectTimeoutMs,
    `TikTok room lookup timed out after ${connectTimeoutMs}ms`
  );
}

async function withTimeout<T>(task: () => Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function configureSignConfig(connector: TikTokConnectorModule) {
  const { SignConfig } = connector;
  if (!SignConfig) {
    return;
  }

  if (signProviderHost) {
    SignConfig.basePath = signProviderHost;
  }

  if (tiktokSignApiKey) {
    SignConfig.apiKey = tiktokSignApiKey;
  }

  if (typeof SignConfig.cachedInstance !== "undefined") {
    SignConfig.cachedInstance = undefined;
  }
}

function formatTikTokConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to connect to TikTok LIVE";

  if (/websocket upgrade/i.test(message)) {
    return `${message}. This server connector cannot use session-cookie polling by design. Use websocket mode when available, or add a browser bridge connector for Social Stream Ninja-style capture.`;
  }

  if (/Failed to sign request/i.test(message)) {
    return `${message} | TikTok signature service gagal sign request. Cek mode koneksi, aktifkan TIKTOK_SESSION_ID, atau set TIKTOK_SIGN_PROVIDER_HOST jika memakai host signer custom.`;
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

  disconnectTikTokConnectionSoon(state.connection);
  state.connection = null;
  void markTikTokConnectionError(state, message);
  scheduleTikTokReconnect(state, message);
}

function scheduleTikTokReconnect(state: ManagedTikTokConnection, message: string) {
  if (state.stopped || state.retryTimer) {
    return;
  }

  if (maxReconnectAttempts === 0) {
    activeConnections.delete(state.workspaceId);
    void markTikTokConnectionError(state, `Reconnect disabled. Last error: ${message}`);
    return;
  }

  state.retryAttempt += 1;

  if (state.retryAttempt > maxReconnectAttempts) {
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
      status: "ERROR",
      lastError: message
    }
  });
}

function parseTikTokSessionBundle({
  rawSessionId,
  targetIdc
}: {
  rawSessionId: string | undefined;
  targetIdc: string | undefined;
}): TikTokConnectionOptions["session"] | null {
  if (!rawSessionId) {
    return null;
  }

  const normalized = rawSessionId.trim();
  if (!normalized) {
    return null;
  }

  const cookiePairs = new Map<string, string>();
  if (rawSessionId.includes("=")) {
    for (const token of normalized.split(";")) {
      const trimmed = token.trim();
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }
      const rawKey = trimmed.slice(0, separatorIndex);
      const rest = trimmed.slice(separatorIndex + 1);
      const key = rawKey.trim().toLowerCase();
      const value = rest.trim();
      if (key && value) {
        cookiePairs.set(key, value);
      }
    }
  }

  const sessionId = cookiePairs.get("sessionid");
  if (!sessionId && rawSessionId.includes("=")) {
    return null;
  }

  const resolvedSessionId = sessionId || normalized;
  const resolvedTargetIdc = cookiePairs.get("tt-target-idc") || targetIdc;

  if (!resolvedSessionId || !resolvedTargetIdc) {
    return null;
  }

  return {
    cookie: {
      type: "cookie",
      value: {
        sessionId: resolvedSessionId,
        ttTargetIdc: resolvedTargetIdc
      }
    }
  };
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

  disconnectTikTokConnectionSoon(state.connection);
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

  const rules = await getActiveRules(workspaceId, liveEvent.type);

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

function disconnectTikTokConnectionSoon(connection: TikTokConnection | null) {
  if (!connection) {
    return;
  }

  const timer = setTimeout(() => {
    try {
      connection.disconnect();
    } catch (error) {
      console.error("TikTok disconnect failed", error);
    }
  }, 0);

  if (typeof timer === "object" && "unref" in timer && typeof timer.unref === "function") {
    timer.unref();
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
