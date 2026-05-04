"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

type OverlayViewportProps = {
  schema: OverlayDesignSchema;
  children: ReactNode;
  debug?: boolean;
};

export function OverlayViewport({ schema, children, debug = false }: OverlayViewportProps) {
  const [viewport, setViewport] = useState({
    width: schema.canvas.width,
    height: schema.canvas.height
  });
  const designWidth = schema.canvas.width;
  const designHeight = schema.canvas.height;
  const widthRatio = viewport.width / designWidth;
  const heightRatio = viewport.height / designHeight;
  const scale = Math.min(widthRatio, heightRatio);
  const isNativeSize = Math.abs(widthRatio - 1) < 0.001 && Math.abs(heightRatio - 1) < 0.001;

  useEffect(() => {
    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      mode: "viewport",
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      designWidth,
      designHeight,
      scale,
      scaleX: widthRatio,
      scaleY: heightRatio
    });

    if (Math.abs(widthRatio - heightRatio) > 0.001) {
      console.warn("Non-uniform scale detected. This will make overlay gepeng if it is used for transform.", {
        scaleX: widthRatio,
        scaleY: heightRatio
      });
    }
  }, [debug, designHeight, designWidth, heightRatio, scale, viewport.height, viewport.width, widthRatio]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "transparent"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: isNativeSize ? 0 : "50%",
          top: isNativeSize ? 0 : "50%",
          width: designWidth,
          height: designHeight,
          transform: isNativeSize ? undefined : `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: isNativeSize ? "top left" : "center center",
          backfaceVisibility: "hidden",
          willChange: "transform"
        }}
      >
        {children}
      </div>
    </div>
  );
}
