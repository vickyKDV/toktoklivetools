"use client";

import { useEffect, type CSSProperties } from "react";
import { ChatStyleRenderer, getSampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import { OverlayViewport } from "@/features/overlay-builder/components/OverlayViewport";
import {
  dummyOverlayData,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";

type OverlaySceneRendererProps = {
  schema: OverlayDesignSchema;
  data?: OverlayRenderData;
  items?: OverlayRenderData[];
  debug?: boolean;
  scale?: number;
  className?: string;
  style?: CSSProperties;
};

type OverlayViewportSceneRendererProps = Omit<OverlaySceneRendererProps, "scale" | "className" | "style">;

export function OverlaySceneRenderer({
  schema,
  data = dummyOverlayData,
  items,
  debug = false,
  scale = 1,
  className,
  style
}: OverlaySceneRendererProps) {
  const isList = isListSchema(schema);
  const renderItems = isList ? items ?? getSampleChatRenderData(schema.layout.maxItems, getEnabledEventTypes(schema)) : undefined;

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      mode: isList ? "list" : "single",
      designWidth: schema.canvas.width,
      designHeight: schema.canvas.height,
      scale,
      maxItems: schema.layout.maxItems,
      renderedItems: renderItems?.length ?? 1
    });
  }, [debug, isList, renderItems?.length, scale, schema.canvas.height, schema.canvas.width, schema.layout.maxItems]);

  const scene = isList ? (
    <ChatStyleRenderer
      designJson={schema}
      items={renderItems}
      gap={schema.layout.gap}
      alignRight={schema.layout.align === "end"}
      height={schema.canvas.height}
      debug={debug}
    />
  ) : (
    <OverlayRenderer designJson={schema} data={data} debug={debug} />
  );

  return (
    <div
      className={className}
      style={{
        width: schema.canvas.width * scale,
        height: schema.canvas.height * scale,
        overflow: "visible",
        ...style
      }}
    >
      <div
        style={{
          width: schema.canvas.width,
          height: schema.canvas.height,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "visible"
        }}
      >
        {scene}
      </div>
    </div>
  );
}

export function OverlayViewportSceneRenderer({ schema, data, items, debug = false }: OverlayViewportSceneRendererProps) {
  return (
    <OverlayViewport schema={schema} debug={debug}>
      <OverlaySceneRenderer schema={schema} data={data} items={items} debug={debug} />
    </OverlayViewport>
  );
}

export function isListSchema(schema: OverlayDesignSchema) {
  return schema.layout.mode === "list" || schema.kind === "CHAT" || schema.kind === "LEADERBOARD" || schema.kind === "DOCK";
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
