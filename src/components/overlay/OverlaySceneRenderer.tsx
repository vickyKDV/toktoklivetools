"use client";

import { memo, useEffect, useMemo, type CSSProperties } from "react";
import { SceneViewport } from "@/components/overlay/SceneViewport";
import {
  migrateSceneToOverlayDesign,
  normalizeSceneSchema,
  type OverlaySceneSchema
} from "@/components/overlay/sceneSchema";
import { ChatStyleRenderer, getSampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlayRenderer as LegacyOverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import {
  dummyOverlayData,
  type OverlayComponentSchema,
  type OverlayDesignSchema,
  type OverlayRenderData
} from "@/core/overlay/schema";
import { getRuntimeCanvasSize } from "@/core/overlay/runtimeCanvas";

type SceneInput = OverlaySceneSchema | OverlayDesignSchema | unknown;

type OverlaySceneRendererProps = {
  schema?: SceneInput;
  scene?: SceneInput;
  data?: OverlayRenderData;
  items?: OverlayRenderData[];
  debug?: boolean;
  scale?: number;
  className?: string;
  style?: CSSProperties;
  selectedElementId?: string | null;
  renderEditorOverlay?: (component: OverlayComponentSchema) => React.ReactNode;
  getComponentProps?: (component: OverlayComponentSchema) => React.HTMLAttributes<HTMLDivElement>;
  renderDropIndicator?: (component: OverlayComponentSchema) => React.ReactNode;
  enableRuntimeLayout?: boolean;
  renderRuntime?: boolean;
};

type OverlayViewportSceneRendererProps = Omit<OverlaySceneRendererProps, "scale" | "className" | "style"> & {
  transparent?: boolean;
  fit?: "contain" | "none";
  verticalAnchor?: "top" | "center" | "bottom";
};

export const OverlaySceneRenderer = memo(function OverlaySceneRenderer({
  schema,
  scene: sceneInput,
  data = dummyOverlayData,
  items,
  debug = false,
  scale = 1,
  className,
  style,
  selectedElementId,
  renderEditorOverlay,
  getComponentProps,
  renderDropIndicator,
  enableRuntimeLayout = true,
  renderRuntime = true
}: OverlaySceneRendererProps) {
  const normalizedScene = useMemo(() => normalizeSceneSchema(sceneInput ?? schema), [sceneInput, schema]);
  const legacyDesign = useMemo(() => migrateSceneToOverlayDesign(normalizedScene), [normalizedScene]);
  const isList = renderRuntime && isListSchema(legacyDesign);
  const runtimeCanvas = useMemo(() => {
    if (!renderRuntime) {
      return {
        width: normalizedScene.canvas.width,
        height: normalizedScene.canvas.height
      };
    }

    return getRuntimeCanvasSize(legacyDesign);
  }, [legacyDesign, normalizedScene.canvas.height, normalizedScene.canvas.width, renderRuntime]);
  const renderItems = useMemo(
    () => isList ? items ?? getSampleChatRenderData(legacyDesign.layout.maxItems, getEnabledEventTypes(legacyDesign)) : undefined,
    [isList, items, legacyDesign]
  );

  useEffect(() => {
    if (!debug) {
      return;
    }

    const selectedElement = selectedElementId ? findSceneElement(normalizedScene.elements, selectedElementId) : null;

    console.table({
      mode: isList ? "list" : "single",
      baseCanvasWidth: normalizedScene.canvas.width,
      baseCanvasHeight: normalizedScene.canvas.height,
      renderWidth: runtimeCanvas.width,
      renderHeight: runtimeCanvas.height,
      scale,
      maxItems: legacyDesign.layout.maxItems,
      renderedItems: renderItems?.length ?? 1,
      selectedElementId: selectedElement?.id ?? "",
      selectedX: selectedElement?.layout.x ?? "",
      selectedY: selectedElement?.layout.y ?? "",
      selectedWidth: selectedElement?.layout.width ?? "",
      selectedHeight: selectedElement?.layout.height ?? "",
      selectedRotate: selectedElement?.layout.rotate ?? "",
      selectedZIndex: selectedElement?.layout.zIndex ?? ""
    });
  }, [
    debug,
    isList,
    legacyDesign.layout.maxItems,
    normalizedScene.canvas.height,
    normalizedScene.canvas.width,
    normalizedScene.elements,
    renderItems?.length,
    runtimeCanvas.height,
    runtimeCanvas.width,
    scale,
    selectedElementId
  ]);

  const renderedScene = isList ? (
    <ChatStyleRenderer
      designJson={legacyDesign}
      items={renderItems}
      gap={legacyDesign.layout.gap}
      align={legacyDesign.layout.align}
      height={runtimeCanvas.height}
      debug={debug}
    />
  ) : (
    <LegacyOverlayRenderer
      designJson={legacyDesign}
      data={data}
      debug={debug}
      renderEditorOverlay={renderEditorOverlay}
      getComponentProps={getComponentProps}
      renderDropIndicator={renderDropIndicator}
      enableRuntimeLayout={enableRuntimeLayout}
    />
  );

  return (
    <div
      className={className}
      style={{
        width: runtimeCanvas.width * scale,
        height: runtimeCanvas.height * scale,
        overflow: "visible",
        ...style
      }}
    >
      <div
        style={{
          width: runtimeCanvas.width,
          height: runtimeCanvas.height,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "visible"
        }}
      >
        {renderedScene}
      </div>
    </div>
  );
});

export function OverlayViewportSceneRenderer({
  schema,
  scene,
  data,
  items,
  debug = false,
  transparent = true,
  fit = "contain",
  verticalAnchor
}: OverlayViewportSceneRendererProps) {
  const normalizedScene = normalizeSceneSchema(scene ?? schema);
  const legacyDesign = migrateSceneToOverlayDesign(normalizedScene);
  const runtimeAnchor = verticalAnchor ?? getRuntimeVerticalAnchor(legacyDesign);

  return (
    <SceneViewport
      scene={{ ...normalizedScene, canvas: { ...normalizedScene.canvas, ...getRuntimeCanvasSize(legacyDesign) } }}
      debug={debug}
      transparent={transparent}
      fit={fit}
      verticalAnchor={runtimeAnchor}
    >
      <OverlaySceneRenderer scene={normalizedScene} data={data} items={items} debug={debug} />
    </SceneViewport>
  );
}

export function isListSchema(schema: OverlayDesignSchema | OverlaySceneSchema) {
  return schema.layout.mode === "list";
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

function getRuntimeVerticalAnchor(schema: OverlayDesignSchema): "top" | "center" | "bottom" {
  if (isListSchema(schema) && schema.layout.direction !== "horizontal") {
    return schema.layout.reverse ? "bottom" : "top";
  }

  return "center";
}

function findSceneElement(elements: OverlaySceneSchema["elements"], id: string): OverlaySceneSchema["elements"][number] | null {
  for (const element of elements) {
    if (element.id === id) {
      return element;
    }

    const child = findSceneElement(element.children, id);

    if (child) {
      return child;
    }
  }

  return null;
}
