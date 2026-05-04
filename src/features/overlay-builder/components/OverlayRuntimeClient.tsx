"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
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
} from "@/features/overlay-builder/schema/overlaySchema";
import type { OverlayEventPayload } from "@/types/live";

type OverlayRuntimeClientProps = {
  schema: OverlayDesignSchema;
  overlayKey: string;
  preview?: boolean;
  debug?: boolean;
};

let runtimeItemSequence = 0;

type SingleRuntimeItem = {
  data: OverlayRenderData;
  exiting: boolean;
  instanceId: string;
};

export function OverlayRuntimeClient({ schema, overlayKey, preview = false, debug = false }: OverlayRuntimeClientProps) {
  const [singleItem, setSingleItem] = useState<SingleRuntimeItem | null>(null);
  const [queuedSingleData, setQueuedSingleData] = useState<OverlayRenderData | null>(null);
  const [items, setItems] = useState<OverlayRenderData[]>([]);
  const layout = schema.layout;
  const isList = layout.mode === "list" || schema.kind === "CHAT" || schema.kind === "LEADERBOARD" || schema.kind === "DOCK";
  const animationDurationMs = layout.animationDurationMs ?? 620;
  const listExitDurationMs = Math.max(animationDurationMs, 720);
  const autoCloseMs = layout.autoCloseMs ?? 0;
  const enterAnimation = getOverlayAnimationName(layout.enterAnimation, "in");
  const exitAnimation = getOverlayAnimationName(layout.exitAnimation, "out");
  const showSingleItem = useCallback((data: OverlayRenderData) => {
    setSingleItem((current) => {
      if (current) {
        setQueuedSingleData(data);

        return current.exiting ? current : { ...current, exiting: true };
      }

      return createSingleItem(data);
    });
  }, []);

  useEffect(() => {
    if (preview) {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.emit("overlay:join", overlayKey);
    socket.on("connect", () => socket.emit("overlay:join", overlayKey));
    socket.on("overlay:live-event", (event: OverlayEventPayload) => {
      if (!liveEventMatchesSchema(event, schema)) {
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
  }, [debug, isList, layout.maxItems, layout.reverse, overlayKey, preview, schema, showSingleItem]);

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

  if (!preview && !singleItem) {
    return null;
  }

  const previewData = getSampleChatRenderData(1, getEnabledEventTypes(schema))[0];
  const runtimeItem = singleItem ?? createSingleItem(previewData);

  return (
    <OverlayViewport schema={schema} debug={debug}>
      <div
        key={runtimeItem.instanceId}
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          animation: `${runtimeItem.exiting ? exitAnimation : enterAnimation} ${animationDurationMs}ms cubic-bezier(.22, 1, .36, 1) both`
        }}
      >
        <OverlaySceneRenderer schema={schema} data={preview ? previewData : runtimeItem.data} debug={debug} />
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
function acceptsFocusDock(schema: OverlayDesignSchema) {
  return schema.kind === "CUSTOM" && schema.layout.mode === "single" && schema.dataSource.type === "manual";
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
    return event.type === "GIFT" || event.type === "LIKE" || event.type === "SHARE";
  }

  if (sourceType === "dock") {
    return false;
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
    return ["GIFT", "LIKE", "SHARE"];
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
      image: ""
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
      return index >= maxItems ? { ...item, meta: { ...item.meta, exiting: true } } : item;
    });

  return nextItems;
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
