"use client";

import { useEffect, type CSSProperties } from "react";
import { OverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import {
  dummyOverlayData,
  type OverlayComponentSchema,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";

type ChatStyleRendererProps = {
  designJson: OverlayDesignSchema;
  items?: OverlayRenderData[];
  gap?: number;
  debug?: boolean;
  alignRight?: boolean;
  height?: CSSProperties["height"];
};

export function ChatStyleRenderer({
  designJson,
  items = sampleChatRenderData,
  gap = 12,
  debug = false,
  alignRight = false,
  height
}: ChatStyleRendererProps) {
  const bounds = getListItemBounds(designJson.components, designJson.canvas.width, designJson.canvas.height);
  const viewportWidth = designJson.canvas.width;
  const viewportHeight = typeof height === "number" ? height : designJson.canvas.height;
  const renderedItemWidth = bounds.width;
  const renderedItemHeight = bounds.height;
  const enterAnimation = getOverlayAnimationName(designJson.layout.enterAnimation, "in");
  const exitAnimation = getOverlayAnimationName(designJson.layout.exitAnimation, "out");
  const animationDurationMs = designJson.layout.animationDurationMs ?? 620;
  const listHeight = Math.max(renderedItemHeight, viewportHeight - bounds.top);

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      mode: "list",
      designWidth: designJson.canvas.width,
      designHeight: designJson.canvas.height,
      elementX: bounds.left,
      elementY: bounds.top,
      elementWidth: bounds.width,
      elementHeight: bounds.height,
      maxItems: designJson.layout.maxItems,
      renderedItems: items.length,
      reverseOrder: designJson.layout.reverse
    });
  }, [
    bounds.height,
    bounds.left,
    bounds.top,
    bounds.width,
    debug,
    designJson.canvas.height,
    designJson.canvas.width,
    designJson.layout.maxItems,
    designJson.layout.reverse,
    items.length
  ]);

  return (
    <div
      style={{
        position: "relative",
        width: viewportWidth,
        height: viewportHeight,
        overflow: "visible"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bounds.left,
          top: bounds.top,
          width: renderedItemWidth,
          height: listHeight,
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: alignRight ? "flex-end" : "flex-start",
          gap
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.meta?.instanceId ?? `${item.meta?.id ?? item.viewer?.username ?? "viewer"}-${item.comment?.createdAt ?? index}-${index}`}
            data-exiting={item.meta?.exiting ? "true" : "false"}
            style={{
              position: "relative",
              width: renderedItemWidth,
              height: renderedItemHeight,
              minWidth: renderedItemWidth,
              minHeight: renderedItemHeight,
              maxWidth: renderedItemWidth,
              maxHeight: renderedItemHeight,
              flex: "0 0 auto",
              overflow: "visible",
              transform: "none",
              animation: `${item.meta?.exiting ? exitAnimation : enterAnimation} ${animationDurationMs}ms cubic-bezier(.22, 1, .36, 1) both`
            }}
          >
            <div
              style={{
                width: renderedItemWidth,
                height: renderedItemHeight,
                overflow: "visible"
              }}
            >
              <div
                style={{
                  width: designJson.canvas.width,
                  height: designJson.canvas.height,
                  transform: `translate(${-bounds.left}px, ${-bounds.top}px)`,
                  transformOrigin: "top left"
                }}
              >
                <OverlayRenderer designJson={designJson} data={item} debug={debug} />
              </div>
            </div>
          </div>
        ))}
        <style dangerouslySetInnerHTML={{ __html: overlayAnimationCss }} />
      </div>
    </div>
  );
}

export const sampleChatRenderData: OverlayRenderData[] = [
  { ...dummyOverlayData, meta: { id: "sample-1" } },
  {
    meta: { id: "sample-2" },
    viewer: {
      name: "Nana Moderator",
      username: "nana",
      avatar: "",
      badge: "Moderator"
    },
    comment: {
      text: "Chat style dirender berulang untuk setiap komentar.",
      createdAt: "12.35"
    }
  },
  {
    meta: { id: "sample-3" },
    viewer: {
      name: "Raka Gifter",
      username: "raka",
      avatar: "",
      badge: "Top Gifter"
    },
    comment: {
      text: "Di OBS ini tampil sebagai list, bukan single static overlay.",
      createdAt: "12.36"
    }
  }
];

export function getSampleChatRenderData(count: number, enabledTypes: string[] = ["CHAT"]) {
  const eventTypes = enabledTypes.length ? enabledTypes : ["CHAT"];
  const samples = Array.from({ length: Math.max(1, count) }, (_, index) => {
    const type = eventTypes[index % eventTypes.length];
    const base = sampleChatRenderData[index % sampleChatRenderData.length];
    const sequence = index + 1;

    if (type === "LIKE") {
      return {
        meta: { id: `sample-like-${sequence}`, instanceId: `sample-like-${sequence}` },
        viewer: { name: `Like Viewer ${sequence}`, username: `like_${sequence}`, avatar: "", badge: "" },
        comment: { text: "liked the LIVE", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: "", count: "", image: "" }
      };
    }

    if (type === "SHARE") {
      return {
        meta: { id: `sample-share-${sequence}`, instanceId: `sample-share-${sequence}` },
        viewer: { name: `Share Viewer ${sequence}`, username: `share_${sequence}`, avatar: "", badge: "" },
        comment: { text: "shared the LIVE", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: "", count: "", image: "" }
      };
    }

    if (type === "JOIN") {
      return {
        meta: { id: `sample-join-${sequence}`, instanceId: `sample-join-${sequence}` },
        viewer: { name: `Join Viewer ${sequence}`, username: `join_${sequence}`, avatar: "", badge: "" },
        comment: { text: "joined the LIVE", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: "", count: "", image: "" }
      };
    }

    if (type === "GIFT") {
      return {
        meta: { id: `sample-gift-${sequence}`, instanceId: `sample-gift-${sequence}` },
        viewer: { name: `Gift Viewer ${sequence}`, username: `gift_${sequence}`, avatar: "", badge: "Top Gifter" },
        comment: { text: "sent Rose x3", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: "Rose", count: 3, image: "" }
      };
    }

    if (type === "FOLLOW") {
      return {
        meta: { id: `sample-follow-${sequence}`, instanceId: `sample-follow-${sequence}` },
        viewer: { name: `Follow Viewer ${sequence}`, username: `follow_${sequence}`, avatar: "", badge: "Follower" },
        comment: { text: "followed", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: "", count: "", image: "" }
      };
    }

    return {
      ...base,
      meta: { id: `sample-chat-${sequence}`, instanceId: `sample-chat-${sequence}` },
      viewer: {
        ...base.viewer,
        name: sequence === 1 ? base.viewer?.name : `${base.viewer?.name ?? "Viewer"} ${sequence}`,
        username: `${base.viewer?.username ?? "viewer"}_${sequence}`
      },
      comment: {
        ...base.comment,
        createdAt: `12.${String(30 + sequence).padStart(2, "0")}`
      }
    };
  });

  return samples;
}

function getListItemBounds(components: OverlayComponentSchema[] | undefined, canvasWidth: number, canvasHeight: number) {
  const bounds = collectBounds(components ?? [], 0, 0, canvasWidth, canvasHeight);

  if (!bounds) {
    return { left: 0, top: 0, width: canvasWidth, height: canvasHeight };
  }

  const padding = 10;
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(canvasWidth, bounds.right + padding);
  const bottom = Math.min(canvasHeight, bounds.bottom + padding);

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

function collectBounds(
  components: OverlayComponentSchema[],
  parentX: number,
  parentY: number,
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number; right: number; bottom: number } | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const component of components) {
    if (!component.visible) {
      continue;
    }

    const absoluteX = parentX + component.x;
    const absoluteY = parentY + component.y;
    const blur = component.style.shadow?.enabled ? component.style.shadow.blur : 0;
    const x = absoluteX - blur;
    const y = absoluteY - blur;
    const componentRight = absoluteX + component.width + blur;
    const componentBottom = absoluteY + component.height + blur;
    const isFullCanvasFrame = parentX === 0
      && parentY === 0
      && component.x <= 2
      && component.y <= 2
      && component.width >= canvasWidth * 0.9
      && component.height >= canvasHeight * 0.9
      && ["container", "bubble_card", "glass_card", "gradient_card"].includes(component.type);

    if (!isFullCanvasFrame) {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, componentRight);
      bottom = Math.max(bottom, componentBottom);
    }

    if (component.children?.length) {
      const childBounds = collectBounds(component.children, absoluteX, absoluteY, canvasWidth, canvasHeight);

      if (childBounds) {
        left = Math.min(left, childBounds.left);
        top = Math.min(top, childBounds.top);
        right = Math.max(right, childBounds.right);
        bottom = Math.max(bottom, childBounds.bottom);
      }
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(right) || !Number.isFinite(bottom)) {
    return null;
  }

  return { left, top, right, bottom };
}

export function getOverlayAnimationName(value: string, direction: "in" | "out") {
  const normalized = value.toLowerCase();

  if (normalized.includes("zoom")) {
    return direction === "in" ? "overlayZoomIn" : "overlayZoomOut";
  }

  if (normalized.includes("left")) {
    return direction === "in" ? "overlaySlideLeftIn" : "overlaySlideLeftOut";
  }

  if (normalized.includes("right")) {
    return direction === "in" ? "overlaySlideRightIn" : "overlaySlideRightOut";
  }

  if (normalized.includes("up")) {
    return direction === "in" ? "overlaySlideUpIn" : "overlaySlideUpOut";
  }

  if (normalized.includes("down")) {
    return direction === "in" ? "overlaySlideDownIn" : "overlaySlideDownOut";
  }

  if (normalized.includes("pop")) {
    return direction === "in" ? "overlayPopIn" : "overlayZoomOut";
  }

  return direction === "in" ? "overlayFadeIn" : "overlayFadeOut";
}

export const overlayAnimationCss = `
@keyframes overlayFadeIn { from { opacity: 0; filter: blur(2px); } to { opacity: 1; filter: blur(0); } }
@keyframes overlayFadeOut { from { opacity: 1; filter: blur(0); } to { opacity: 0; filter: blur(2px); } }
@keyframes overlayZoomIn { from { opacity: 0; transform: scale(.92); filter: blur(2px); } to { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes overlayZoomOut { from { opacity: 1; transform: scale(1); filter: blur(0); } to { opacity: 0; transform: scale(.92); filter: blur(2px); } }
@keyframes overlayPopIn { 0% { opacity: 0; transform: scale(.86); } 68% { opacity: 1; transform: scale(1.025); } 100% { opacity: 1; transform: scale(1); } }
@keyframes overlaySlideLeftIn { from { opacity: 0; transform: translate3d(-36px, 0, 0); filter: blur(2px); } to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideLeftOut { from { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } to { opacity: 0; transform: translate3d(-36px, 0, 0); filter: blur(2px); } }
@keyframes overlaySlideRightIn { from { opacity: 0; transform: translate3d(36px, 0, 0); filter: blur(2px); } to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideRightOut { from { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } to { opacity: 0; transform: translate3d(36px, 0, 0); filter: blur(2px); } }
@keyframes overlaySlideUpIn { from { opacity: 0; transform: translate3d(0, 28px, 0); filter: blur(2px); } to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideUpOut { from { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } to { opacity: 0; transform: translate3d(0, -28px, 0); filter: blur(2px); } }
@keyframes overlaySlideDownIn { from { opacity: 0; transform: translate3d(0, -28px, 0); filter: blur(2px); } to { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideDownOut { from { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } to { opacity: 0; transform: translate3d(0, 28px, 0); filter: blur(2px); } }
`;
