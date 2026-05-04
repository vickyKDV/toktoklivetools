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

type ConnectionGlobal = typeof globalThis & {
  __tlaTikTokConnections?: Map<string, TikTokConnection>;
};

const connectionGlobal = globalThis as ConnectionGlobal;
const activeConnections =
  connectionGlobal.__tlaTikTokConnections ?? new Map<string, TikTokConnection>();
connectionGlobal.__tlaTikTokConnections = activeConnections;

const eventNames = ["chat", "gift", "like", "social", "member", "subscribe", "roomUser", "streamEnd"];

export async function startTikTokConnection(workspaceId: string) {
  if (activeConnections.has(workspaceId)) {
    return {
      status: "already-running" as const
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

  try {
    const connector = (await import("tiktok-live-connector")) as {
      WebcastPushConnection: new (username: string) => TikTokConnection;
    };
    const connection = new connector.WebcastPushConnection(workspace.tiktokUsername);

    eventNames.forEach((eventName) => {
      connection.on(eventName, (payload) => {
        const mappedEventName = eventName === "social" ? socialEventName(payload) : eventName;
        void persistAndBroadcastEvent(workspace.id, workspace.overlayKey, mappedEventName, payload);
      });
    });

    await connection.connect();
    activeConnections.set(workspaceId, connection);

    await prisma.tikTokConnection.update({
      where: {
        workspaceId
      },
      data: {
        status: "LIVE",
        startedAt: new Date(),
        stoppedAt: null,
        lastError: null
      }
    });

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
  const connection = activeConnections.get(workspaceId);

  if (connection) {
    connection.disconnect();
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

async function persistAndBroadcastEvent(
  workspaceId: string,
  overlayKey: string,
  eventName: string,
  payload: unknown
) {
  const mapped = mapTikTokEvent(eventName, payload);

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
