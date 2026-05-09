"use client";

import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { createRealtimeSocket } from "@/lib/realtime/client";
import {
  getOverlayAnimationName,
  getSampleChatRenderData,
  overlayListExitDelayMs,
  overlayAnimationCss
} from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlaySceneRenderer, OverlayViewportSceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import { OverlayViewport } from "@/features/overlay-builder/components/OverlayViewport";
import {
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/core/overlay/schema";
import { getRuntimeComponentBounds } from "@/core/overlay/runtimeLayout";
import type { OverlayEventPayload } from "@/types/live";

type OverlayRuntimeClientProps = {
  schema: OverlayDesignSchema;
  overlayKey: string;
  initialGoalMetrics?: OverlayRenderData["goal"];
  preview?: boolean;
  debug?: boolean;
};

let runtimeItemSequence = 0;

type SingleRuntimeItem = {
  data: OverlayRenderData;
  exiting: boolean;
  instanceId: string;
};

type GoalMetrics = {
  likes: number;
  gifts: number;
  viewers: number;
  comments: number;
  shares: number;
  custom: number;
};

const emptyGoalMetrics: GoalMetrics = {
  likes: 0,
  gifts: 0,
  viewers: 0,
  comments: 0,
  shares: 0,
  custom: 0
};

const goalMetricKeys = ["likes", "gifts", "viewers", "comments", "shares", "custom"] as const;

export function OverlayRuntimeClient({
  schema,
  overlayKey,
  initialGoalMetrics,
  preview = false,
  debug = false
}: OverlayRuntimeClientProps) {
  const [singleItem, setSingleItem] = useState<SingleRuntimeItem | null>(null);
  const [queuedSingleData, setQueuedSingleData] = useState<OverlayRenderData | null>(null);
  const [items, setItems] = useState<OverlayRenderData[]>([]);
  const [goalMetrics, setGoalMetrics] = useState<GoalMetrics>(() => createInitialGoalMetrics(schema, initialGoalMetrics));
  const layout = schema.layout;
  const isList = layout.mode === "list" || schema.kind === "LEADERBOARD" || schema.kind === "DOCK";
  const isStaticOverlay = schema.kind === "STATIC" || schema.dataSource.type === "static";
  const isGoalOverlay = schema.kind === "GOAL" || schema.dataSource.type === "goal";
  const animationDurationMs = layout.animationDurationMs ?? 620;
  const listExitDurationMs = Math.max(animationDurationMs, 720);
  const autoCloseMs = layout.autoCloseMs ?? 0;
  const enterAnimation = getOverlayAnimationName(layout.enterAnimation, "in");
  const exitAnimation = getOverlayAnimationName(layout.exitAnimation, "out");
  const showSingleItem = useCallback((data: OverlayRenderData) => {
    setSingleItem((current) => {
      if (current && !current.exiting) {
        const mergedGift = mergeGiftRenderData(current.data, data);

        if (mergedGift) {
          return { ...current, data: mergedGift };
        }
      }

      if (current) {
        setQueuedSingleData(data);

        return current.exiting ? current : { ...current, exiting: true };
      }

      return createSingleItem(data);
    });
  }, []);

  useEffect(() => {
    setGoalMetrics(createInitialGoalMetrics(schema, initialGoalMetrics));
  }, [initialGoalMetrics, schema]);

  useEffect(() => {
    if (preview || isStaticOverlay) {
      return;
    }
    const socket: Socket = createRealtimeSocket();

    socket.emit("overlay:join", overlayKey);
    socket.on("connect", () => socket.emit("overlay:join", overlayKey));
    socket.on("overlay:live-event", (event: OverlayEventPayload) => {
      if (isGoalOverlay) {
        setGoalMetrics((current) => updateGoalMetrics(current, event));
        return;
      }

      if (!liveEventMatchesSchema(event, schema)) {
        return;
      }

      if (schema.dataSource.type === "leaderboard") {
        setItems((current) => updateLeaderboardItems(current, event, layout.maxItems, getLeaderboardMetric(schema)));
        return;
      }

      const data = eventToRenderData(event);
      if (debug) {
        console.log("incoming event", data);
      }
      if (!isList) {
        showSingleItem(data);
      }
      setItems((current) => {
        const next = appendRuntimeItem(current, data, layout.maxItems);

        if (debug) {
          console.log("items length after update", next.length);
          console.log("maxItems", layout.maxItems);
          console.log("reverseOrder", layout.reverse);
        }

        return next;
      });
    });
    socket.on("overlay:focus-chat", (event: OverlayEventPayload) => {
      if (!acceptsFocusDock(schema) || event.type !== "CHAT" || !event.comment) {
        return;
      }

      const data = eventToRenderData(event);
      showSingleItem(data);
    });
    socket.on("overlay:clear-focus-chat", () => {
      if (acceptsFocusDock(schema)) {
        setSingleItem((current) => current ? { ...current, exiting: true } : null);
        setQueuedSingleData(null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [debug, isGoalOverlay, isList, isStaticOverlay, layout.maxItems, layout.reverse, overlayKey, preview, schema, showSingleItem]);

  useEffect(() => {
    const hasExitingItems = items.some((item) => item.meta?.exiting);

    if (!hasExitingItems) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setItems((current) => current.filter((item) => !item.meta?.exiting));
    }, listExitDurationMs + overlayListExitDelayMs + 120);

    return () => window.clearTimeout(timeout);
  }, [items, listExitDurationMs]);

  useEffect(() => {
    if (!singleItem?.exiting) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSingleItem(queuedSingleData ? createSingleItem(queuedSingleData) : null);
      setQueuedSingleData(null);
    }, animationDurationMs);

    return () => window.clearTimeout(timeout);
  }, [animationDurationMs, queuedSingleData, singleItem]);

  useEffect(() => {
    if (!singleItem || singleItem.exiting || autoCloseMs <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSingleItem((current) => current ? { ...current, exiting: true } : null);
    }, autoCloseMs);

    return () => window.clearTimeout(timeout);
  }, [autoCloseMs, singleItem]);

  if (isList) {
    return (
      <OverlayViewportSceneRenderer
        schema={schema}
        items={preview ? getSampleChatRenderData(layout.maxItems, getEnabledEventTypes(schema)) : items}
        debug={debug}
      />
    );
  }

  if (isStaticOverlay || isGoalOverlay) {
    const staticData = getSampleChatRenderData(1, ["CHAT"])[0];
    const runtimeData = isGoalOverlay
      ? {
        ...staticData,
        goal: goalMetrics
      }
      : staticData;

    return (
      <OverlayViewport schema={schema} debug={debug}>
        <OverlaySceneRenderer schema={schema} data={runtimeData} debug={debug} />
      </OverlayViewport>
    );
  }

  if (!preview && !singleItem) {
    return null;
  }

  const previewData = getSampleChatRenderData(1, getEnabledEventTypes(schema))[0];
  const runtimeItem = singleItem ?? createSingleItem(previewData);
  const runtimeData = preview ? previewData : runtimeItem.data;
  const runtimeSchema = createVerticallyCenteredSingleSchema(schema, runtimeData);

  return (
    <OverlayViewport schema={runtimeSchema} debug={debug}>
      <div
        key={runtimeItem.instanceId}
        style={{
          width: runtimeSchema.canvas.width,
          height: runtimeSchema.canvas.height,
          animation: `${runtimeItem.exiting ? exitAnimation : enterAnimation} ${animationDurationMs}ms cubic-bezier(.22, 1, .36, 1) both`
        }}
      >
        <OverlaySceneRenderer schema={runtimeSchema} data={runtimeData} debug={debug} />
        <style dangerouslySetInnerHTML={{ __html: overlayAnimationCss }} />
      </div>
    </OverlayViewport>
  );
}

function createSingleItem(data: OverlayRenderData): SingleRuntimeItem {
  return {
    data,
    exiting: false,
    instanceId: `${data.meta?.id ?? "single"}-${Date.now()}-${runtimeItemSequence += 1}`
  };
}

function createVerticallyCenteredSingleSchema(schema: OverlayDesignSchema, data: OverlayRenderData): OverlayDesignSchema {
  if (schema.layout.mode !== "single") {
    return schema;
  }

  const bounds = getRuntimeComponentBounds(schema.components, data, schema.canvas.width, schema.canvas.height);
  const offsetY = Math.round((schema.canvas.height - bounds.height) / 2 - bounds.top);

  if (!Number.isFinite(offsetY) || offsetY === 0) {
    return schema;
  }

  return {
    ...schema,
    components: schema.components.map((component) => ({
      ...component,
      y: component.y + offsetY
    }))
  };
}

function acceptsFocusDock(schema: OverlayDesignSchema) {
  return schema.kind === "CUSTOM" && schema.layout.mode === "single" && schema.dataSource.type === "manual";
}

function createInitialGoalMetrics(
  schema: OverlayDesignSchema,
  initialGoalMetrics?: OverlayRenderData["goal"]
): GoalMetrics {
  const schemaMetrics = schema.components.reduce<GoalMetrics>((metrics, component) => {
    if (component.type !== "goal_progress_bar" && component.type !== "goal_progress_ring") {
      return metrics;
    }

    const metricKey = getGoalMetricKey(component.props.metricType);
    const currentValue = toPositiveNumber(component.props.currentValue, 0);

    return {
      ...metrics,
      [metricKey]: Math.max(metrics[metricKey], currentValue)
    };
  }, { ...emptyGoalMetrics });

  if (!initialGoalMetrics) {
    return schemaMetrics;
  }

  return goalMetricKeys.reduce<GoalMetrics>((metrics, key) => ({
    ...metrics,
    [key]: Math.max(metrics[key], toPositiveNumber(initialGoalMetrics[key], 0))
  }), schemaMetrics);
}

function updateGoalMetrics(current: GoalMetrics, event: OverlayEventPayload): GoalMetrics {
  const type = normalizeEventType(event);
  const next = { ...current };

  if (type === "CHAT" && event.comment) {
    next.comments += 1;
    return next;
  }

  if (type === "GIFT") {
    next.gifts += getEventAmount(event.giftCount);
    return next;
  }

  if (type === "LIKE") {
    next.likes += getEventAmount(event.likeCount);
    return next;
  }

  if (type === "SHARE") {
    next.shares += getEventAmount(event.shareCount);
    return next;
  }

  if (type === "VIEWER_COUNT" || type === "VIEW") {
    const viewerCount = toFiniteNumber(event.viewerCount);

    if (viewerCount != null && viewerCount >= 0) {
      next.viewers = viewerCount;
    }

    return next;
  }

  if (type === "JOIN") {
    next.viewers += 1;
  }

  return next;
}

function getGoalMetricKey(value: unknown): keyof GoalMetrics {
  if (value === "like" || value === "likes" || value === "heart") return "likes";
  if (value === "gift" || value === "gifts") return "gifts";
  if (value === "viewer" || value === "viewers" || value === "view" || value === "views") return "viewers";
  if (value === "comment" || value === "comments" || value === "chat") return "comments";
  if (value === "share" || value === "shares") return "shares";
  return "custom";
}

function getEventAmount(value: number | null | undefined) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0 ? amount : 1;
}

function toPositiveNumber(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function liveEventMatchesSchema(event: OverlayEventPayload, schema: OverlayDesignSchema) {
  const sourceType = schema.dataSource.type;

  if (sourceType === "manual") {
    return false;
  }

  if (sourceType === "chat") {
    return getEnabledEventTypes(schema).includes(normalizeEventType(event)) && eventHasDisplayPayload(event);
  }

  if (sourceType === "gift") {
    return event.type === "GIFT";
  }

  if (sourceType === "leaderboard") {
    return eventMatchesLeaderboardMetric(event, getLeaderboardMetric(schema));
  }

  if (sourceType === "dock") {
    return false;
  }

  if (sourceType === "goal") {
    return true;
  }

  return true;
}

function getEnabledEventTypes(schema: OverlayDesignSchema) {
  const value = schema.dataSource.filters?.eventTypes;

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (schema.dataSource.type === "gift") {
    return ["GIFT"];
  }

  if (schema.dataSource.type === "leaderboard") {
    const metric = getLeaderboardMetric(schema);

    if (metric === "like") {
      return ["LEADERBOARD_LIKE"];
    }

    if (metric === "view") {
      return ["LEADERBOARD_VIEW"];
    }

    if (metric === "comment" || metric === "chat") {
      return ["LEADERBOARD_CHAT"];
    }

    return ["LEADERBOARD_GIFT"];
  }

  return ["CHAT"];
}

function normalizeEventType(event: OverlayEventPayload) {
  return event.type === "MEMBER" ? "JOIN" : event.type;
}

function eventHasDisplayPayload(event: OverlayEventPayload) {
  switch (normalizeEventType(event)) {
    case "CHAT":
      return Boolean(event.comment);
    case "GIFT":
      return Boolean(event.giftName);
    case "LIKE":
      return true;
    case "SHARE":
      return true;
    case "JOIN":
      return Boolean(event.displayName || event.username);
    case "FOLLOW":
      return Boolean(event.displayName || event.username);
    default:
      return false;
  }
}

export function eventToRenderData(event: OverlayEventPayload): OverlayRenderData {
  return {
    meta: {
      id: event.id
    },
    viewer: {
      name: event.displayName ?? event.username ?? "Viewer",
      username: event.username ?? "",
      avatar: event.avatarUrl ?? "",
      badge: event.userRole && event.userRole !== "viewer" ? roleLabel(event.userRole) : ""
    },
    comment: {
      text: event.comment ?? getEventText(event),
      createdAt: new Date(event.receivedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      })
    },
    gift: {
      name: event.giftName ?? "",
      count: event.giftCount ?? "",
      image: event.giftImageUrl ?? ""
    }
  };
}

function getEventText(event: OverlayEventPayload) {
  switch (normalizeEventType(event)) {
    case "GIFT":
      return event.giftCount ? `sent ${event.giftName} x${event.giftCount}` : `sent ${event.giftName ?? "a gift"}`;
    case "LIKE":
      return event.likeCount ? `liked the LIVE x${event.likeCount}` : "liked the LIVE";
    case "SHARE":
      return "shared the LIVE";
    case "JOIN":
      return "joined the LIVE";
    case "FOLLOW":
      return "followed";
    default:
      return "";
  }
}

function appendRuntimeItem(current: OverlayRenderData[], next: OverlayRenderData, maxItems: number) {
  const nextId = next.meta?.id;
  const active = current.filter((item) => !item.meta?.exiting);
  const mergeIndex = active.findIndex((item) => Boolean(mergeGiftRenderData(item, next)));

  if (mergeIndex >= 0) {
    return active.map((item, index) => {
      if (index !== mergeIndex) {
        return item;
      }

      return mergeGiftRenderData(item, next) ?? item;
    });
  }

  const uniqueNext = {
    ...next,
    meta: {
      ...next.meta,
      instanceId: `${nextId ?? "event"}-${Date.now()}-${runtimeItemSequence += 1}`
    }
  };
  const combined = [uniqueNext, ...active];
  const overflowCount = Math.max(0, combined.length - maxItems);
  const nextItems = overflowCount === 0
    ? combined
    : combined.map((item, index) => {
      const shouldExit = index >= maxItems;

      return shouldExit ? { ...item, meta: { ...item.meta, exiting: true } } : item;
    });

  return nextItems;
}

function updateLeaderboardItems(current: OverlayRenderData[], event: OverlayEventPayload, maxItems: number, metric: string) {
  const active = current.filter((item) => !item.meta?.exiting);
  const username = event.username || event.displayName || "viewer";
  const eventScore = getLeaderboardEventScore(event, metric);
  const existingIndex = active.findIndex((item) => (item.viewer?.username || item.viewer?.name) === username);
  const nextItems = existingIndex >= 0
    ? active.map((item, index) => {
      if (index !== existingIndex) {
        return item;
      }

      const score = toGiftCount(item.gift?.count) + eventScore;

      return createLeaderboardRenderData(event, metric, score, item.meta?.instanceId);
    })
    : [
      createLeaderboardRenderData(event, metric, eventScore, `leader-${metric}-${username}-${Date.now()}-${runtimeItemSequence += 1}`),
      ...active
    ];
  const sorted = nextItems
    .sort((a, b) => toGiftCount(b.gift?.count) - toGiftCount(a.gift?.count))
    .map((item, index) => ({
      ...item,
      viewer: {
        ...item.viewer,
        badge: `#${index + 1}`
      }
    }));
  const limit = Math.min(50, Math.max(3, maxItems));

  return sorted.slice(0, limit);
}

function createLeaderboardRenderData(event: OverlayEventPayload, metric: string, score: number, instanceId?: string | null): OverlayRenderData {
  return {
    meta: {
      id: `leader-${metric}-${event.username || event.displayName || "viewer"}`,
      instanceId
    },
    viewer: {
      name: event.displayName ?? event.username ?? "Viewer",
      username: event.username ?? event.displayName ?? "viewer",
      avatar: event.avatarUrl ?? "",
      badge: "#1"
    },
    comment: {
      text: formatLeaderboardMetric(score, metric),
      createdAt: new Date(event.receivedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      })
    },
    gift: {
      name: metric,
      count: score,
      image: event.giftImageUrl ?? ""
    }
  };
}

function eventMatchesLeaderboardMetric(event: OverlayEventPayload, metric: string) {
  const type = normalizeEventType(event);

  if (metric === "gift") {
    return type === "GIFT";
  }

  if (metric === "like") {
    return type === "LIKE";
  }

  if (metric === "view") {
    return type === "VIEW" || type === "JOIN";
  }

  if (metric === "comment" || metric === "chat") {
    return type === "CHAT" && Boolean(event.comment);
  }

  return type === "GIFT";
}

function getLeaderboardMetric(schema: OverlayDesignSchema) {
  const metric = schema.dataSource.filters?.metric;

  if (metric === "chat") {
    return "comment";
  }

  return typeof metric === "string" ? metric : "gift";
}

function getLeaderboardEventScore(event: OverlayEventPayload, metric: string) {
  if (metric === "gift") {
    return Number(event.giftCount) > 0 ? Number(event.giftCount) : 1;
  }

  if (metric === "like") {
    return Number(event.likeCount) > 0 ? Number(event.likeCount) : 1;
  }

  if (metric === "view") {
    return Number(event.viewerCount) > 0 ? Number(event.viewerCount) : 1;
  }

  return 1;
}

function formatLeaderboardMetric(score: number, metric: string) {
  if (metric === "like") {
    return `${score.toLocaleString("id-ID")} likes`;
  }

  if (metric === "view") {
    return `${score.toLocaleString("id-ID")} views`;
  }

  if (metric === "comment" || metric === "chat") {
    return `${score.toLocaleString("id-ID")} comments`;
  }

  return `${score.toLocaleString("id-ID")} gifts`;
}

function mergeGiftRenderData(current: OverlayRenderData, next: OverlayRenderData) {
  const currentGiftName = current.gift?.name?.trim();
  const nextGiftName = next.gift?.name?.trim();
  const currentUser = current.viewer?.username || current.viewer?.name;
  const nextUser = next.viewer?.username || next.viewer?.name;

  if (!currentGiftName || !nextGiftName || currentGiftName !== nextGiftName || !currentUser || currentUser !== nextUser) {
    return null;
  }

  const mergedCount = toGiftCount(current.gift?.count) + toGiftCount(next.gift?.count);
  const giftName = next.gift?.name ?? current.gift?.name ?? "";

  return {
    ...current,
    viewer: {
      ...current.viewer,
      ...next.viewer
    },
    comment: {
      ...current.comment,
      createdAt: next.comment?.createdAt ?? current.comment?.createdAt,
      text: mergedCount > 0 ? `sent ${giftName} x${mergedCount}` : current.comment?.text
    },
    gift: {
      ...current.gift,
      ...next.gift,
      name: giftName,
      count: mergedCount || next.gift?.count || current.gift?.count,
      image: next.gift?.image || current.gift?.image || ""
    },
    meta: {
      ...current.meta,
      id: next.meta?.id ?? current.meta?.id,
      instanceId: current.meta?.instanceId ?? next.meta?.instanceId
    }
  } satisfies OverlayRenderData;
}

function toGiftCount(value: number | string | null | undefined) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : 0;
}

function roleLabel(role: string) {
  switch (role) {
    case "moderator":
      return "Moderator";
    case "subscriber":
      return "Subscriber";
    case "follower":
      return "Follower";
    case "friend":
      return "Friend";
    case "topgifter":
      return "Top Gifter";
    default:
      return "";
  }
}
