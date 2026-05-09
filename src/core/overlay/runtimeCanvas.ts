import {
  dummyOverlayData,
  type OverlayDesignSchema
} from "@/core/overlay/schema";
import { getRuntimeComponentBounds } from "@/core/overlay/runtimeLayout";

export const defaultObsCanvas = {
  width: 1080,
  height: 1920
};

export function getRuntimeCanvasSize(schema: OverlayDesignSchema) {
  if (schema.kind === "CHAT" && schema.layout.mode === "list") {
    const bounds = getRuntimeComponentBounds(schema.components, dummyOverlayData, schema.canvas.width, schema.canvas.height);
    const maxItems = Math.max(1, schema.layout.maxItems ?? 1);
    const gap = schema.layout.gap ?? 0;
    const fadeOutSlots = 1;
    const renderedSlots = maxItems + fadeOutSlots;
    const listWidth = schema.layout.direction === "horizontal"
      ? bounds.width * renderedSlots + gap * Math.max(0, renderedSlots - 1)
      : bounds.width;
    const listHeight = schema.layout.direction === "horizontal"
      ? bounds.height
      : bounds.height * renderedSlots + gap * Math.max(0, renderedSlots - 1);
    const safeListWidth = Math.max(bounds.width, listWidth);
    const safeListHeight = Math.max(bounds.height, listHeight);
    const paddingX = 48;
    const paddingY = 48;

    if (schema.layout.direction === "horizontal") {
      return {
        width: Math.max(schema.canvas.width, bounds.left + safeListWidth + paddingX),
        height: Math.max(schema.canvas.height, bounds.top + safeListHeight + paddingY)
      };
    }

    return {
      width: Math.max(schema.canvas.width, bounds.left + safeListWidth + paddingX),
      height: Math.max(schema.canvas.height, bounds.top + safeListHeight + paddingY)
    };
  }

  return {
    width: schema.canvas.width,
    height: schema.canvas.height
  };
}
