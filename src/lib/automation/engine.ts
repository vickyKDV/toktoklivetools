import { Prisma, type LiveEvent, type LiveEventType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { emitOverlayEvent } from "@/server/realtime/socket-server";
import { parseAutomationEdges, parseAutomationNodes } from "@/core/automation/flow";
import type {
  AutomationFlowEdge,
  AutomationFlowNode,
  AutomationNodeData,
  AutomationTriggerType
} from "@/types/automation";
import type { OverlayEventPayload } from "@/types/live";

type RunAutomationFlowsInput = {
  workspaceId: string;
  overlayKey: string;
  event: LiveEvent;
  overlayPayload: OverlayEventPayload;
};

type ActionResult = {
  nodeId: string;
  type: string;
  payload: Record<string, unknown>;
};

type FlowRunResult = {
  matched: boolean;
  actions: ActionResult[];
  reason?: string;
};

export async function runAutomationFlows({
  workspaceId,
  overlayKey,
  event,
  overlayPayload
}: RunAutomationFlowsInput) {
  const flows = await prisma.automationFlow.findMany({
    where: {
      workspaceId,
      isActive: true
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  for (const flow of flows) {
    const nodes = parseAutomationNodes(flow.nodes);
    const edges = parseAutomationEdges(flow.edges);
    const triggers = nodes.filter((node) => isMatchingTrigger(node, event.type));

    if (!triggers.length) {
      continue;
    }

    for (const trigger of triggers) {
      try {
        const result = await runFlowFromNode({
          flowId: flow.id,
          nodes,
          edges,
          node: trigger,
          event,
          overlayKey,
          overlayPayload,
          visited: new Set<string>()
        });

        await prisma.automationExecution.create({
          data: {
            workspaceId,
            flowId: flow.id,
            eventType: event.type,
            status: result.matched ? "SUCCESS" : "SKIPPED",
            payload: {
              eventId: event.id,
              triggerNodeId: trigger.id,
              reason: result.reason,
              actions: result.actions
            } as Prisma.InputJsonValue
          }
        });
      } catch (error) {
        await prisma.automationExecution.create({
          data: {
            workspaceId,
            flowId: flow.id,
            eventType: event.type,
            status: "ERROR",
            payload: {
              eventId: event.id,
              triggerNodeId: trigger.id,
              error: error instanceof Error ? error.message : "Automation execution failed"
            } as Prisma.InputJsonValue
          }
        });
      }
    }
  }
}

async function runFlowFromNode({
  flowId,
  nodes,
  edges,
  node,
  event,
  overlayKey,
  overlayPayload,
  visited
}: {
  flowId: string;
  nodes: AutomationFlowNode[];
  edges: AutomationFlowEdge[];
  node: AutomationFlowNode;
  event: LiveEvent;
  overlayKey: string;
  overlayPayload: OverlayEventPayload;
  visited: Set<string>;
}): Promise<FlowRunResult> {
  if (visited.has(node.id)) {
    return {
      matched: false,
      actions: [],
      reason: "Loop detected"
    };
  }

  visited.add(node.id);

  if (node.type === "condition" && !evaluateCondition(node.data, event)) {
    return {
      matched: false,
      actions: [],
      reason: `${node.data.field ?? "field"} did not match`
    };
  }

  const actions = await executeAutomationAction(node, flowId, overlayKey, overlayPayload);
  const nextNodes = getOutgoingNodes(node.id, nodes, edges);

  if (!nextNodes.length) {
    return {
      matched: actions.length > 0 || node.type !== "condition",
      actions
    };
  }

  const downstreamResults = await Promise.all(
    nextNodes.map((nextNode) =>
      runFlowFromNode({
        flowId,
        nodes,
        edges,
        node: nextNode,
        event,
        overlayKey,
        overlayPayload,
        visited: new Set(visited)
      })
    )
  );

  const downstreamActions = downstreamResults.flatMap((result) => result.actions);
  const matched = downstreamResults.some((result) => result.matched) || actions.length > 0;
  const failedReason = downstreamResults.find((result) => result.reason)?.reason;

  return {
    matched,
    actions: [...actions, ...downstreamActions],
    reason: matched ? undefined : failedReason
  };
}

function isMatchingTrigger(node: AutomationFlowNode, eventType: LiveEventType) {
  if (node.type === "giftTrigger") {
    return eventType === "GIFT";
  }

  if (node.type === "commentTrigger") {
    return eventType === "CHAT";
  }

  if (node.type === "likeTrigger") {
    return eventType === "LIKE";
  }

  if (node.type === "followTrigger") {
    return eventType === "FOLLOW";
  }

  return normalizeTriggerType(node.data.eventType) === eventType;
}

function normalizeTriggerType(value: unknown): AutomationTriggerType | null {
  if (
    value === "GIFT" ||
    value === "CHAT" ||
    value === "LIKE" ||
    value === "FOLLOW" ||
    value === "SHARE" ||
    value === "SUBSCRIBE"
  ) {
    return value;
  }

  return null;
}

function evaluateCondition(data: AutomationNodeData, event: LiveEvent) {
  const field = typeof data.field === "string" ? data.field : "";
  const operator = data.operator ?? "equals";
  const expected = String(data.value ?? "");
  const value = getEventFieldValue(event, field);
  const normalizedValue = normalizeComparable(value);
  const expectedValues = getExpectedComparables(field, expected);

  switch (operator) {
    case "equals":
      return expectedValues.some((expectedValue) => normalizedValue === expectedValue);
    case "contains":
      return expectedValues.some((expectedValue) => normalizedValue.includes(expectedValue));
    case "greaterThan":
      return Number(value ?? 0) > Number(expected);
    case "lessThan":
      return Number(value ?? 0) < Number(expected);
    case "exists":
      return value !== null && value !== undefined && value !== "";
    default:
      return false;
  }
}

function getEventFieldValue(event: LiveEvent, field: string) {
  switch (field) {
    case "username":
      return event.username;
    case "displayName":
      return event.displayName;
    case "giftName":
      return event.giftName;
    case "giftId":
      return event.giftId;
    case "giftCount":
      return event.giftCount;
    case "repeatCount":
      return event.repeatCount;
    case "comment":
      return event.comment;
    case "likeCount":
      return event.likeCount;
    case "shareCount":
      return event.shareCount;
    case "viewerCount":
      return event.viewerCount;
    default:
      return null;
  }
}

function normalizeComparable(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getExpectedComparables(field: string, expected: string) {
  const values = expected
    .split(/[|,\n]/)
    .map((value) => normalizeComparable(value))
    .filter(Boolean);

  if (field !== "giftName") {
    return values;
  }

  return Array.from(new Set(values.flatMap(expandGiftNameAliases)));
}

function expandGiftNameAliases(value: string) {
  const aliases: Record<string, string[]> = {
    mawar: ["mawar", "rose"],
    rose: ["rose", "mawar"],
    donat: ["donat", "donut", "doughnut"],
    donut: ["donut", "donat", "doughnut"],
    doughnut: ["doughnut", "donut", "donat"],
    heart: ["heart", "finger heart", "hati", "love"],
    hati: ["hati", "heart", "finger heart", "love"],
    love: ["love", "heart", "finger heart"],
    "finger heart": ["finger heart", "heart", "hati", "love"]
  };

  return aliases[value] ?? [value];
}

async function executeAutomationAction(
  node: AutomationFlowNode,
  flowId: string,
  overlayKey: string,
  overlayPayload: OverlayEventPayload
): Promise<ActionResult[]> {
  if (node.type === "showAnimation") {
    const durationMs = toNumber(node.data.durationMs, 3000);
    const useMediaDuration = node.data.useMediaDuration === true;
    const payload = {
      action: "SHOW_ANIMATION",
      animationUrl: stringValue(node.data.animationUrl),
      animationPosition: stringValue(node.data.position) || "center",
      animationSize: toNumber(node.data.size, 420),
      animationFit: stringValue(node.data.mediaFit) || "auto",
      mediaFrame: stringValue(node.data.mediaFrame) || "square",
      mediaWidth: toNumber(node.data.mediaWidth, 420),
      mediaHeight: toNumber(node.data.mediaHeight, 420),
      actionLayer: stringValue(node.data.actionLayer) || "back",
      soundUrl: stringValue(node.data.soundUrl),
      volume: toNumber(node.data.volume, 1),
      durationMs,
      useMediaDuration
    };

    emitOverlayEvent(overlayKey, {
      ...overlayPayload,
      id: createActionEventId(overlayPayload, node),
      flowId,
      ...payload
    });

    return [
      {
        nodeId: node.id,
        type: "SHOW_ANIMATION",
        payload
      }
    ];
  }

  if (node.type === "show3dText") {
    const durationMs = toNumber(node.data.durationMs, 4500);
    const payload = {
      action: "SHOW_3D_TEXT",
      animationPosition: stringValue(node.data.position) || "center",
      animationSize: toNumber(node.data.size, 560),
      actionLayer: stringValue(node.data.actionLayer) || "front",
      text3dTemplate: stringValue(node.data.text3dTemplate) || "Terima kasih {{displayName}}!",
      text3dSubtitle: stringValue(node.data.text3dSubtitle) || "{{giftName}} x{{giftCount}}",
      text3dEffect: stringValue(node.data.text3dEffect) || "neon",
      text3dColor: stringValue(node.data.text3dColor) || "#f8fafc",
      text3dAccentColor: stringValue(node.data.text3dAccentColor) || "#22d3ee",
      text3dDepth: toNumber(node.data.text3dDepth, 0.22),
      text3dBevel: toNumber(node.data.text3dBevel, 0.035),
      text3dMetalness: toNumber(node.data.text3dMetalness, 0.45),
      text3dRoughness: toNumber(node.data.text3dRoughness, 0.2),
      text3dSpin: node.data.text3dSpin !== false,
      text3dFloat: node.data.text3dFloat !== false,
      text3dOffsetX: toNumber(node.data.text3dOffsetX, 0),
      text3dOffsetY: toNumber(node.data.text3dOffsetY, 0),
      soundUrl: stringValue(node.data.soundUrl),
      volume: toNumber(node.data.volume, 1),
      durationMs
    };

    emitOverlayEvent(overlayKey, {
      ...overlayPayload,
      id: createActionEventId(overlayPayload, node),
      flowId,
      ...payload
    });

    return [
      {
        nodeId: node.id,
        type: "SHOW_3D_TEXT",
        payload
      }
    ];
  }

  if (node.type === "showConfetti") {
    const payload = {
      action: "SHOW_CONFETTI",
      confettiEnabled: true,
      confettiMode: stringValue(node.data.confettiMode) || "once",
      confettiPresets: readStringArray(node.data.confettiPresets, ["basicCannon"]),
      confettiLayer: stringValue(node.data.confettiLayer) || "front",
      confettiParticleCount: toNumber(node.data.confettiParticleCount, 140),
      confettiSpread: toNumber(node.data.confettiSpread, 85),
      confettiStartVelocity: toNumber(node.data.confettiStartVelocity, 45),
      confettiScalar: toNumber(node.data.confettiScalar, 1),
      confettiIntervalMs: toNumber(node.data.confettiIntervalMs, 900),
      confettiOriginY: toNumber(node.data.confettiOriginY, 0.55),
      confettiDurationMs: toNumber(node.data.confettiDurationMs, 4500),
      confettiEmoji: stringValue(node.data.confettiEmoji) || "🎁"
    };

    emitOverlayEvent(overlayKey, {
      ...overlayPayload,
      id: createActionEventId(overlayPayload, node),
      flowId,
      ...payload
    });

    return [
      {
        nodeId: node.id,
        type: "SHOW_CONFETTI",
        payload
      }
    ];
  }

  if (node.type === "playSound") {
    const payload = {
      action: "PLAY_SOUND",
      soundUrl: stringValue(node.data.soundUrl),
      volume: toNumber(node.data.volume, 1)
    };

    emitOverlayEvent(overlayKey, {
      ...overlayPayload,
      id: createActionEventId(overlayPayload, node),
      flowId,
      ...payload
    });

    return [
      {
        nodeId: node.id,
        type: "PLAY_SOUND",
        payload
      }
    ];
  }

  if (node.type === "replyComment") {
    return [
      {
        nodeId: node.id,
        type: "REPLY_COMMENT",
        payload: {
          message: stringValue(node.data.message)
        }
      }
    ];
  }

  return [];
}

function getOutgoingNodes(
  nodeId: string,
  nodes: AutomationFlowNode[],
  edges: AutomationFlowEdge[]
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => nodeById.get(edge.target))
    .filter((node): node is AutomationFlowNode => Boolean(node));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function createActionEventId(overlayPayload: OverlayEventPayload, node: AutomationFlowNode) {
  return `${overlayPayload.id}-${node.id}`;
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  return strings.length ? strings : fallback;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}
