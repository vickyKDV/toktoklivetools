"use client";

import { useEffect, useRef, useState } from "react";
import { getSampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlaySceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import { dummyOverlayData, type OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";
import { getRuntimeCanvasSize } from "@/features/overlay-builder/utils/runtimeCanvas";

type OverlayThumbnailProps = {
  schema: OverlayDesignSchema;
};

export function OverlayThumbnail({ schema }: OverlayThumbnailProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState({ width: 320, height: 150 });
  const runtimeCanvas = getRuntimeCanvasSize(schema);
  const designWidth = runtimeCanvas.width;
  const designHeight = runtimeCanvas.height;
  const sampleItems = schema.layout.mode === "list"
    ? getSampleChatRenderData(schema.layout.maxItems, getEnabledEventTypes(schema))
    : undefined;
  const sampleData = sampleItems?.[0] ?? dummyOverlayData;
  const padding = 18;
  const scale = Math.min(
    (frame.width - padding * 2) / designWidth,
    (frame.height - padding * 2) / designHeight
  );
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 0.1;
  const offsetX = (frame.width - designWidth * safeScale) / 2;
  const offsetY = (frame.height - designHeight * safeScale) / 2;

  useEffect(() => {
    function updateFrame() {
      const element = frameRef.current;

      if (!element) {
        return;
      }

      setFrame({
        width: element.clientWidth || 320,
        height: element.clientHeight || 150
      });
    }

    updateFrame();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFrame) : null;

    if (observer && frameRef.current) {
      observer.observe(frameRef.current);
    }

    window.addEventListener("resize", updateFrame);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateFrame);
    };
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative h-40 overflow-hidden rounded-md border bg-[radial-gradient(circle_at_center,rgba(148,163,184,.18),rgba(15,23,42,.08)_45%,rgba(15,23,42,.16))]"
    >
      <div
        className="pointer-events-none absolute"
        style={{
          left: offsetX,
          top: offsetY,
          width: designWidth,
          height: designHeight,
          transform: `scale(${safeScale})`,
          transformOrigin: "top left"
        }}
      >
        <OverlaySceneRenderer
          schema={schema}
          data={sampleData}
          items={sampleItems}
          renderRuntime
        />
      </div>
    </div>
  );
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
    const metric = schema.dataSource.filters?.metric;

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
