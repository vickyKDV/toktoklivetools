"use client";

import { useEffect, type CSSProperties } from "react";
import { OverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import {
  dummyOverlayData,
  type OverlayListStyle,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import { getRuntimeCanvasSize } from "@/features/overlay-builder/utils/runtimeCanvas";
import { getRuntimeComponentBounds } from "@/features/overlay-builder/utils/runtimeLayout";

type ChatStyleRendererProps = {
  designJson: OverlayDesignSchema;
  items?: OverlayRenderData[];
  gap?: number;
  debug?: boolean;
  align?: OverlayDesignSchema["layout"]["align"];
  alignRight?: boolean;
  height?: CSSProperties["height"];
};

export const overlayListExitDelayMs = 90;

export function ChatStyleRenderer({
  designJson,
  items = sampleChatRenderData,
  gap = 12,
  debug = false,
  align,
  alignRight = false,
  height
}: ChatStyleRendererProps) {
  const runtimeCanvas = getRuntimeCanvasSize(designJson);
  const isHorizontal = designJson.layout.direction === "horizontal";
  const listAlign = align ?? (alignRight ? "end" : designJson.layout.align ?? "start");
  const itemBounds = items.map((item) => getRuntimeComponentBounds(designJson.components, item, runtimeCanvas.width, runtimeCanvas.height));
  const bounds = itemBounds[0] ?? getRuntimeComponentBounds(designJson.components, dummyOverlayData, runtimeCanvas.width, runtimeCanvas.height);
  const viewportWidth = runtimeCanvas.width;
  const viewportHeight = typeof height === "number" ? Math.max(height, runtimeCanvas.height) : runtimeCanvas.height;
  const renderedItemWidth = Math.max(bounds.width, ...itemBounds.map((item) => item.width));
  const renderedItemHeight = Math.max(bounds.height, ...itemBounds.map((item) => item.height));
  const enterAnimation = getOverlayAnimationName(designJson.layout.enterAnimation, "in");
  const exitAnimation = getOverlayAnimationName(designJson.layout.exitAnimation, "out");
  const animationDurationMs = designJson.layout.animationDurationMs ?? 620;
  const listStyle = designJson.layout.listStyle ?? "default";
  const renderGap = getListRenderGap(listStyle, gap);
  const listWidth = Math.max(renderedItemWidth, viewportWidth - bounds.left);
  const listHeight = Math.max(renderedItemHeight, viewportHeight - bounds.top);
  const smoothDurationMs = Math.max(animationDurationMs, 720);

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      mode: "list",
      designWidth: runtimeCanvas.width,
      designHeight: runtimeCanvas.height,
      elementX: bounds.left,
      elementY: bounds.top,
      elementWidth: bounds.width,
      elementHeight: bounds.height,
      maxItems: designJson.layout.maxItems,
      listStyle,
      direction: designJson.layout.direction,
      align: listAlign,
      renderedItems: items.length,
      reverseOrder: designJson.layout.reverse
    });
  }, [
    bounds.height,
    bounds.left,
    bounds.top,
    bounds.width,
    debug,
    designJson.layout.maxItems,
    designJson.layout.direction,
    listAlign,
    listStyle,
    designJson.layout.reverse,
    items.length,
    runtimeCanvas.height,
    runtimeCanvas.width
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
          width: listWidth,
          height: listHeight,
          overflow: "visible"
        }}
      >
        <div
          style={{
            position: "relative",
            width: listWidth,
            height: listHeight,
            overflow: "visible"
          }}
        >
          {items.map((item, index) => {
            const currentBounds = itemBounds[index] ?? bounds;
            const currentRenderedItemHeight = currentBounds.height;
            const isExiting = Boolean(item.meta?.exiting);
            const exitMaskDirection = getExitMaskDirection(designJson.layout.reverse, isHorizontal);
            const exitMask = `linear-gradient(${exitMaskDirection}, transparent 0%, rgba(0, 0, 0, 0.2) 28%, #000 68%)`;
            const animationDelayMs = isExiting ? overlayListExitDelayMs : 0;
            const exitY = isHorizontal ? "0px" : designJson.layout.reverse ? "-30px" : "30px";
            const exitX = isHorizontal ? designJson.layout.reverse ? "-30px" : "30px" : "0px";
            const visualStyle = getListVisualStyle(listStyle, index, designJson.layout.maxItems, listAlign === "end", isHorizontal);
            const itemWidth = !isHorizontal && listAlign === "stretch" ? listWidth : renderedItemWidth;
            const itemHeight = isHorizontal && listAlign === "stretch" ? listHeight : currentRenderedItemHeight;
            const crossAxisOffset = getCrossAxisOffset(listAlign, isHorizontal ? listHeight : listWidth, isHorizontal ? itemHeight : itemWidth);
            const targetX = isHorizontal
              ? designJson.layout.reverse
                ? getReverseItemX(itemBounds, index, listWidth, renderGap)
                : getNormalItemX(itemBounds, index, renderGap)
              : crossAxisOffset;
            const targetY = designJson.layout.reverse
              ? getReverseItemY(itemBounds, index, listHeight, renderGap)
              : getNormalItemY(itemBounds, index, renderGap);
            const translateX = targetX + visualStyle.x;
            const translateY = (isHorizontal ? crossAxisOffset : targetY) + visualStyle.y;

            return (
              <div
                key={item.meta?.instanceId ?? `${item.meta?.id ?? item.viewer?.username ?? "viewer"}-${item.comment?.createdAt ?? index}-${index}`}
                data-exiting={isExiting ? "true" : "false"}
                style={{
                  position: "absolute",
                  left: 0,
                  right: "auto",
                  top: 0,
                  width: itemWidth,
                  height: itemHeight,
                  minWidth: itemWidth,
                  minHeight: itemHeight,
                  maxWidth: itemWidth,
                  maxHeight: itemHeight,
                  overflow: "visible",
                  transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${visualStyle.scale})`,
                  transformOrigin: getTransformOrigin(listAlign, isHorizontal),
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
                    width: itemWidth,
                    height: itemHeight,
                    overflow: "visible",
                    WebkitMaskImage: isExiting ? exitMask : undefined,
                    maskImage: isExiting ? exitMask : undefined,
                    "--overlay-list-exit-x": exitX,
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
    const rawType = eventTypes[index % eventTypes.length];
    const isLeaderboardSample = rawType.startsWith("LEADERBOARD_");
    const type = isLeaderboardSample ? rawType.replace("LEADERBOARD_", "") : rawType;
    const base = sampleChatRenderData[index % sampleChatRenderData.length];
    const sequence = index + 1;

    if (type === "LIKE") {
      const score = isLeaderboardSample ? 9800 - sequence * 470 : 0;

      return {
        meta: { id: `sample-like-${sequence}`, instanceId: `sample-like-${sequence}` },
        viewer: { name: `Like Viewer ${sequence}`, username: `like_${sequence}`, avatar: "", badge: isLeaderboardSample ? `#${sequence}` : "" },
        comment: { text: isLeaderboardSample ? `${score.toLocaleString("id-ID")} likes` : "liked the LIVE", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: isLeaderboardSample ? "like" : "", count: isLeaderboardSample ? score : "", image: "" }
      };
    }

    if (type === "SHARE") {
      const score = isLeaderboardSample ? 420 - sequence * 18 : 0;

      return {
        meta: { id: `sample-share-${sequence}`, instanceId: `sample-share-${sequence}` },
        viewer: { name: `Share Viewer ${sequence}`, username: `share_${sequence}`, avatar: "", badge: isLeaderboardSample ? `#${sequence}` : "" },
        comment: { text: isLeaderboardSample ? `${score.toLocaleString("id-ID")} shares` : "shared the LIVE", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: isLeaderboardSample ? "share" : "", count: isLeaderboardSample ? score : "", image: "" }
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
      const score = isLeaderboardSample ? 1200 - sequence * 83 : 3;

      return {
        meta: { id: `sample-gift-${sequence}`, instanceId: `sample-gift-${sequence}` },
        viewer: { name: `Gift Viewer ${sequence}`, username: `gift_${sequence}`, avatar: "", badge: isLeaderboardSample ? `#${sequence}` : "Top Gifter" },
        comment: { text: isLeaderboardSample ? `${score.toLocaleString("id-ID")} gifts` : "sent Rose x3", createdAt: `12.${String(30 + sequence).padStart(2, "0")}` },
        gift: { name: isLeaderboardSample ? "gift" : "Rose", count: score, image: "" }
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
        username: `${base.viewer?.username ?? "viewer"}_${sequence}`,
        badge: isLeaderboardSample ? `#${sequence}` : base.viewer?.badge
      },
      comment: {
        ...base.comment,
        text: isLeaderboardSample ? `${(320 - sequence * 9).toLocaleString("id-ID")} comments` : base.comment?.text,
        createdAt: `12.${String(30 + sequence).padStart(2, "0")}`
      },
      gift: isLeaderboardSample ? { name: "chat", count: 320 - sequence * 9, image: "" } : base.gift
    };
  });

  return samples;
}

function getNormalItemY(bounds: Array<{ height: number }>, index: number, gap: number) {
  return bounds.slice(0, index).reduce((top, item) => top + item.height + gap, 0);
}

function getNormalItemX(bounds: Array<{ width: number }>, index: number, gap: number) {
  return bounds.slice(0, index).reduce((left, item) => left + item.width + gap, 0);
}

function getReverseItemY(bounds: Array<{ height: number }>, index: number, listHeight: number, gap: number) {
  const heightThroughCurrent = bounds.slice(0, index + 1).reduce((height, item, itemIndex) => {
    return height + item.height + (itemIndex === 0 ? 0 : gap);
  }, 0);

  return listHeight - heightThroughCurrent;
}

function getReverseItemX(bounds: Array<{ width: number }>, index: number, listWidth: number, gap: number) {
  const widthThroughCurrent = bounds.slice(0, index + 1).reduce((width, item, itemIndex) => {
    return width + item.width + (itemIndex === 0 ? 0 : gap);
  }, 0);

  return listWidth - widthThroughCurrent;
}

function getExitMaskDirection(reverseOrder: boolean, isHorizontal: boolean) {
  if (isHorizontal) {
    return reverseOrder ? "to right" : "to left";
  }

  return reverseOrder ? "to bottom" : "to top";
}

function getListRenderGap(style: OverlayListStyle, gap: number) {
  if (style === "depth_list") {
    return Math.round(gap * 0.25);
  }

  return gap;
}

function getCrossAxisOffset(align: OverlayDesignSchema["layout"]["align"], containerSize: number, itemSize: number) {
  if (align === "center") {
    return Math.max(0, (containerSize - itemSize) / 2);
  }

  if (align === "end") {
    return Math.max(0, containerSize - itemSize);
  }

  return 0;
}

function getTransformOrigin(align: OverlayDesignSchema["layout"]["align"], isHorizontal: boolean) {
  if (align === "center") {
    return isHorizontal ? "left center" : "center top";
  }

  if (align === "end") {
    return isHorizontal ? "left bottom" : "right top";
  }

  return "top left";
}

function getListVisualStyle(style: OverlayListStyle, index: number, maxItems: number, alignRight: boolean, isHorizontal: boolean) {
  const depth = Math.max(0, Math.min(index, Math.max(0, maxItems - 1)));
  const direction = alignRight ? -1 : 1;
  const axis = (amount: number) => ({
    x: isHorizontal ? 0 : direction * amount,
    y: isHorizontal ? amount : 0
  });

  if (style === "default") {
    return {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      filter: undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "layered_list") {
    const offset = axis(depth * 14);

    return {
      ...offset,
      scale: Math.max(0.92, 1 - depth * 0.012),
      opacity: Math.max(0.72, 1 - depth * 0.035),
      filter: undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "card_stack") {
    const offset = axis(depth * 8);

    return {
      ...offset,
      scale: Math.max(0.88, 1 - depth * 0.026),
      opacity: Math.max(0.66, 1 - depth * 0.05),
      filter: depth > 3 ? "saturate(.92)" : undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "focus_stack") {
    const offset = axis(depth * 5);

    return {
      ...offset,
      scale: depth === 0 ? 1.02 : Math.max(0.9, 1 - depth * 0.03),
      opacity: depth === 0 ? 1 : Math.max(0.54, 0.86 - depth * 0.07),
      filter: depth > 0 ? `saturate(${Math.max(0.72, 1 - depth * 0.06)})` : undefined,
      zIndex: maxItems - depth
    };
  }

  if (style === "depth_list") {
    const offset = axis(depth * 18);

    return {
      ...offset,
      scale: Math.max(0.58, 1 - depth * 0.085),
      opacity: Math.max(0.34, 1 - depth * 0.12),
      filter: depth > 0 ? `blur(${Math.min(2.6, depth * 0.38)}px) saturate(${Math.max(0.55, 1 - depth * 0.07)})` : undefined,
      zIndex: maxItems - depth
    };
  }

  const offset = axis(depth * 6);

  return {
    ...offset,
    scale: Math.max(0.94, 1 - depth * 0.014),
    opacity: Math.max(0.78, 1 - depth * 0.03),
    filter: undefined,
    zIndex: maxItems - depth
  };
}

export function getOverlayAnimationName(value: string, direction: "in" | "out") {
  const normalized = value.toLowerCase();

  if (normalized.includes("bounce")) {
    return direction === "in" ? "overlayBounceIn" : "overlayBounceOut";
  }

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
@keyframes overlayFadeOut { 0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } 55% { opacity: .42; filter: blur(1.4px); } 100% { opacity: 0; transform: translate3d(var(--overlay-list-exit-x, 0), var(--overlay-list-exit-y, -30px), 0) scale(.985); filter: blur(3px); } }
@keyframes overlayZoomIn { 0% { opacity: 0; transform: scale(.92); filter: blur(3px); } 64% { opacity: 1; transform: scale(1.012); filter: blur(.6px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes overlayZoomOut { 0% { opacity: 1; transform: scale(1); filter: blur(0); } 100% { opacity: 0; transform: scale(.94) translate3d(var(--overlay-list-exit-x, 0), var(--overlay-list-exit-y, -18px), 0); filter: blur(3px); } }
@keyframes overlayPopIn { 0% { opacity: 0; transform: scale(.86); filter: blur(3px); } 68% { opacity: 1; transform: scale(1.025); filter: blur(.5px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
@keyframes overlayBounceIn { 0% { opacity: 0; transform: translate3d(0, 38px, 0) scale(.86); filter: blur(3px); } 48% { opacity: 1; transform: translate3d(0, -10px, 0) scale(1.045); filter: blur(.5px); } 68% { transform: translate3d(0, 5px, 0) scale(.985); filter: blur(0); } 84% { transform: translate3d(0, -2px, 0) scale(1.008); } 100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } }
@keyframes overlayBounceOut { 0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); } 22% { opacity: 1; transform: translate3d(0, -8px, 0) scale(1.035); filter: blur(.2px); } 42% { transform: translate3d(0, 4px, 0) scale(.985); } 100% { opacity: 0; transform: translate3d(var(--overlay-list-exit-x, 0), var(--overlay-list-exit-y, -34px), 0) scale(.84); filter: blur(3px); } }
@keyframes overlaySlideLeftIn { 0% { opacity: 0; transform: translate3d(-42px, 0, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideLeftOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(-42px, -12px, 0); filter: blur(3px); } }
@keyframes overlaySlideRightIn { 0% { opacity: 0; transform: translate3d(42px, 0, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideRightOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(42px, -12px, 0); filter: blur(3px); } }
@keyframes overlaySlideUpIn { 0% { opacity: 0; transform: translate3d(0, 34px, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideUpOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(0, -34px, 0); filter: blur(3px); } }
@keyframes overlaySlideDownIn { 0% { opacity: 0; transform: translate3d(0, -34px, 0); filter: blur(3px); } 100% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } }
@keyframes overlaySlideDownOut { 0% { opacity: 1; transform: translate3d(0, 0, 0); filter: blur(0); } 100% { opacity: 0; transform: translate3d(0, 34px, 0); filter: blur(3px); } }
`;
