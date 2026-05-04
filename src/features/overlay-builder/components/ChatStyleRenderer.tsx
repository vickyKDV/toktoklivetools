"use client";

import { useEffect, type CSSProperties } from "react";
import { OverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import {
  dummyOverlayData,
  type OverlayListStyle,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import { getRuntimeComponentBounds } from "@/features/overlay-builder/utils/runtimeLayout";

type ChatStyleRendererProps = {
  designJson: OverlayDesignSchema;
  items?: OverlayRenderData[];
  gap?: number;
  debug?: boolean;
  alignRight?: boolean;
  height?: CSSProperties["height"];
};

export const overlayListExitDelayMs = 90;

export function ChatStyleRenderer({
  designJson,
  items = sampleChatRenderData,
  gap = 12,
  debug = false,
  alignRight = false,
  height
}: ChatStyleRendererProps) {
  const itemBounds = items.map((item) => getRuntimeComponentBounds(designJson.components, item, designJson.canvas.width, designJson.canvas.height));
  const bounds = itemBounds[0] ?? getRuntimeComponentBounds(designJson.components, dummyOverlayData, designJson.canvas.width, designJson.canvas.height);
  const viewportWidth = designJson.canvas.width;
  const viewportHeight = typeof height === "number" ? height : designJson.canvas.height;
  const renderedItemWidth = Math.max(bounds.width, ...itemBounds.map((item) => item.width));
  const enterAnimation = getOverlayAnimationName(designJson.layout.enterAnimation, "in");
  const exitAnimation = getOverlayAnimationName(designJson.layout.exitAnimation, "out");
  const animationDurationMs = designJson.layout.animationDurationMs ?? 620;
  const listStyle = designJson.layout.listStyle ?? "stacked_card";
  const renderGap = getListRenderGap(listStyle, gap);
  const listHeight = Math.max(bounds.height, viewportHeight - bounds.top);
  const smoothDurationMs = Math.max(animationDurationMs, 720);
  const fallbackItemHeight = bounds.height;
  const visibleStackHeight = getVisibleStackHeight(itemBounds, designJson.layout.maxItems, renderGap, fallbackItemHeight);

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
      listStyle,
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
    listStyle,
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
          overflow: "visible"
        }}
      >
        <div style={{ position: "relative", width: renderedItemWidth, height: listHeight, overflow: "visible" }}>
          {items.map((item, index) => {
            const currentBounds = itemBounds[index] ?? bounds;
            const renderedItemHeight = currentBounds.height;
            const isExiting = Boolean(item.meta?.exiting);
            const exitMaskDirection = designJson.layout.reverse ? "to bottom" : "to top";
            const exitMask = `linear-gradient(${exitMaskDirection}, transparent 0%, rgba(0, 0, 0, 0.2) 28%, #000 68%)`;
            const animationDelayMs = isExiting ? overlayListExitDelayMs : 0;
            const exitY = designJson.layout.reverse ? "-30px" : "30px";
            const visualStyle = getListVisualStyle(listStyle, index, designJson.layout.maxItems, alignRight);
            const targetY = designJson.layout.reverse
              ? getReverseItemY(itemBounds, index, visibleStackHeight, renderGap)
              : getNormalItemY(itemBounds, index, renderGap);

            return (
              <div
                key={item.meta?.instanceId ?? `${item.meta?.id ?? item.viewer?.username ?? "viewer"}-${item.comment?.createdAt ?? index}-${index}`}
                data-exiting={isExiting ? "true" : "false"}
                style={{
                  position: "absolute",
                  left: alignRight ? "auto" : 0,
                  right: alignRight ? 0 : "auto",
                  top: 0,
                  width: renderedItemWidth,
                  height: renderedItemHeight,
                  minWidth: renderedItemWidth,
                  minHeight: renderedItemHeight,
                  maxWidth: renderedItemWidth,
                  maxHeight: renderedItemHeight,
                  overflow: "visible",
                  transform: `translate3d(${visualStyle.x}px, ${targetY}px, 0) scale(${visualStyle.scale})`,
                  transformOrigin: alignRight ? "top right" : "top left",
                  opacity: visualStyle.opacity,
                  filter: visualStyle.filter,
                  zIndex: visualStyle.zIndex,
                  transition: `transform ${smoothDurationMs}ms cubic-bezier(.16, 1, .3, 1), opacity ${smoothDurationMs}ms cubic-bezier(.16, 1, .3, 1), filter ${smoothDurationMs}ms cubic-bezier(.16, 1, .3, 1)`,
                  willChange: "transform, opacity, filter",
                  pointerEvents: isExiting ? "none" : undefined
                }}
              >
                <div
                  style={{
                    width: renderedItemWidth,
                    height: renderedItemHeight,
                    overflow: "visible",
                    WebkitMaskImage: isExiting ? exitMask : undefined,
                    maskImage: isExiting ? exitMask : undefined,
                    "--overlay-list-exit-y": exitY,
                    animation: `${isExiting ? exitAnimation : enterAnimation} ${smoothDurationMs}ms cubic-bezier(.16, 1, .3, 1) ${animationDelayMs}ms both`,
                    willChange: "opacity, transform, filter"
                  } as CSSProperties}
                >
                  <div
                    style={{
                      width: designJson.canvas.width,
                      height: designJson.canvas.height,
                      transform: `translate(${-currentBounds.left}px, ${-currentBounds.top}px)`,
                      transformOrigin: "top left"
                    }}
                  >
                    <OverlayRenderer designJson={designJson} data={item} debug={debug} />
                  </div>
                </div>
              </div>
            );
          })}
          <style dangerouslySetInnerHTML={{ __html: overlayAnimationCss }} />
        </div>
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

function getVisibleStackHeight(bounds: Array<{ height: number }>, maxItems: number, gap: number, fallbackHeight: number) {
  const visibleBounds = Array.from({ length: maxItems }, (_, index) => bounds[index] ?? { height: fallbackHeight });

  return visibleBounds.reduce((height, item, index) => height + item.height + (index === 0 ? 0 : gap), 0);
}

function getNormalItemY(bounds: Array<{ height: number }>, index: number, gap: number) {
  return bounds.slice(0, index).reduce((top, item) => top + item.height + gap, 0);
}

function getReverseItemY(bounds: Array<{ height: number }>, index: number, visibleStackHeight: number, gap: number) {
  const heightThroughCurrent = bounds.slice(0, index + 1).reduce((height, item, itemIndex) => {
    return height + item.height + (itemIndex === 0 ? 0 : gap);
  }, 0);

  return visibleStackHeight - heightThroughCurrent;
}

function getListRenderGap(style: OverlayListStyle, gap: number) {
  if (style === "depth_list") {
    return Math.max(0, Math.round(gap * 0.25));
  }

  return gap;
}

function getListVisualStyle(style: OverlayListStyle, index: number, maxItems: number, alignRight: boolean) {
  const depth = Math.max(0, Math.min(index, Math.max(0, maxItems - 1)));
  const direction = alignRight ? -1 : 1;

  if (style === "layered_list") {
    return {
      x: direction * depth * 14,
      scale: Math.max(0.92, 1 - depth * 0.012),
      opacity: Math.max(0.72, 1 - depth * 0.035),
      filter: undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "card_stack") {
    return {
      x: direction * depth * 8,
      scale: Math.max(0.88, 1 - depth * 0.026),
      opacity: Math.max(0.66, 1 - depth * 0.05),
      filter: depth > 3 ? "saturate(.92)" : undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "focus_stack") {
    return {
      x: direction * depth * 5,
      scale: depth === 0 ? 1.02 : Math.max(0.9, 1 - depth * 0.03),
      opacity: depth === 0 ? 1 : Math.max(0.54, 0.86 - depth * 0.07),
      filter: depth > 0 ? `saturate(${Math.max(0.72, 1 - depth * 0.06)})` : undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "depth_list") {
    return {
      x: direction * depth * 18,
      scale: Math.max(0.58, 1 - depth * 0.085),
      opacity: Math.max(0.34, 1 - depth * 0.12),
      filter: depth > 0 ? `blur(${Math.min(2.6, depth * 0.38)}px) saturate(${Math.max(0.55, 1 - depth * 0.07)})` : undefined,
      zIndex: maxItems - depth
    };
  }

  return {
    x: direction * depth * 6,
    scale: Math.max(0.94, 1 - depth * 0.014),
    opacity: Math.max(0.78, 1 - depth * 0.03),
    filter: undefined,
    zIndex: maxItems - depth
  };
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
@keyframes overlayFadeIn { 0% { opacity: 0; transform: translate3d(0, 18px, 0) scale(.985); filter: blur(3px); } 60% { opacity: 1; filter: blur(.6px); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } }
@keyframes overlayFadeOut { 0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } 55% { opacity: .42; filter: blur(1.4px); } 100% { opacity: 0; transform: translate3d(0, var(--overlay-list-exit-y, -30px), 0) scale(.985); filter: blur(3px); } }
@keyframes overlayZoomIn { 0% { opacity: 0; transform: scale(.92); filter: blur(3px); } 64% { opacity: 1; transform: scale(1.012); filter: blur(.6px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes overlayZoomOut { 0% { opacity: 1; transform: scale(1); filter: blur(0); } 100% { opacity: 0; transform: scale(.94) translate3d(0, var(--overlay-list-exit-y, -18px), 0); filter: blur(3px); } }
@keyframes overlayPopIn { 0% { opacity: 0; transform: scale(.86); filter: blur(3px); } 68% { opacity: 1; transform: scale(1.025); filter: blur(.5px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes overlaySlideLeftIn { 0% { opacity: 0; transform: translate3d(-42px, 0, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideLeftOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(-42px, -12px, 0); filter: blur(3px); } }
@keyframes overlaySlideRightIn { 0% { opacity: 0; transform: translate3d(42px, 0, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideRightOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(42px, -12px, 0); filter: blur(3px); } }
@keyframes overlaySlideUpIn { 0% { opacity: 0; transform: translate3d(0, 34px, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideUpOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(0, -34px, 0); filter: blur(3px); } }
@keyframes overlaySlideDownIn { 0% { opacity: 0; transform: translate3d(0, -34px, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideDownOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(0, 34px, 0); filter: blur(3px); } }
`;
