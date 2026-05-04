"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getSampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlayViewportSceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import {
  dummyOverlayData,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import type { OverlayEventPayload } from "@/types/live";

let outputItemSequence = 0;

type OverlayOutputClientProps = {
  designJson: OverlayDesignSchema;
  overlayType?: "CUSTOM_OVERLAY" | "CHAT_STYLE";
  overlayKey: string;
  preview?: boolean;
  debug?: boolean;
};

export function OverlayOutputClient({
  designJson,
  overlayType = "CUSTOM_OVERLAY",
  overlayKey,
  preview = false,
  debug = false
}: OverlayOutputClientProps) {
  const [data, setData] = useState<OverlayRenderData>(dummyOverlayData);
  const [chatItems, setChatItems] = useState<OverlayRenderData[]>([]);

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
      const nextData = eventToRenderData(event);
      setData(nextData);

      if (event.type === "CHAT" || event.comment) {
        setChatItems((current) => appendOutputItem(current, nextData, designJson.layout.maxItems, designJson.layout.reverse));
      }
    });
    socket.on("overlay:focus-chat", (event: OverlayEventPayload) => {
      if (!acceptsFocusDock(designJson) || event.type !== "CHAT" || !event.comment) {
        return;
      }

      const nextData = eventToRenderData(event);
      setData(nextData);
    });
    socket.on("overlay:clear-focus-chat", () => {
      if (acceptsFocusDock(designJson)) {
        setData(dummyOverlayData);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [designJson, overlayKey, preview]);

  if (overlayType === "CHAT_STYLE") {
    const items = preview ? getSampleChatRenderData(designJson.layout.maxItems) : chatItems;

    return <OverlayViewportSceneRenderer schema={designJson} items={items} debug={debug} />;
  }

  return <OverlayViewportSceneRenderer schema={designJson} data={data} debug={debug} />;
}

function appendOutputItem(current: OverlayRenderData[], next: OverlayRenderData, maxItems: number, reverseOrder: boolean) {
  const itemWithId = {
    ...next,
    meta: {
      ...next.meta,
      instanceId: `${next.meta?.id ?? "event"}-${Date.now()}-${outputItemSequence += 1}`
    }
  };
  const nextItems = reverseOrder ? [itemWithId, ...current] : [...current, itemWithId];
  const sliced = reverseOrder ? nextItems.slice(0, maxItems) : nextItems.slice(-maxItems);

  return sliced;
}

function acceptsFocusDock(schema: OverlayDesignSchema) {
  return schema.kind === "CUSTOM" && schema.layout.mode === "single" && schema.dataSource.type === "manual";
}

function eventToRenderData(event: OverlayEventPayload): OverlayRenderData {
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
      text: event.comment ?? event.giftName ?? "",
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
