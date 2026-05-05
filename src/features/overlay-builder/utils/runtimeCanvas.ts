import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

export const defaultObsCanvas = {
  width: 1080,
  height: 1920
};

export function getRuntimeCanvasSize(schema: OverlayDesignSchema) {
  if (schema.kind === "CHAT" && schema.layout.mode === "list") {
    return {
      width: Math.max(defaultObsCanvas.width, schema.canvas.width),
      height: Math.max(defaultObsCanvas.height, schema.canvas.height)
    };
  }

  return {
    width: schema.canvas.width,
    height: schema.canvas.height
  };
}
