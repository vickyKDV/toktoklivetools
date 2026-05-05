"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";
import { getRuntimeCanvasSize } from "@/features/overlay-builder/utils/runtimeCanvas";

type OverlayViewportProps = {
  schema: OverlayDesignSchema;
  children: ReactNode;
  debug?: boolean;
};

export function OverlayViewport({ schema, children, debug = false }: OverlayViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({
    width: 800,
    height: 600
  });
  const runtimeCanvas = getRuntimeCanvasSize(schema);
  const designWidth = runtimeCanvas.width;
  const designHeight = runtimeCanvas.height;
  const viewportWidth = viewport.width;
  const viewportHeight = viewport.height;
  const scale = Math.min(viewportWidth / designWidth, viewportHeight / designHeight);
  const scaledWidth = designWidth * scale;
  const scaledHeight = designHeight * scale;
  const offsetX = (viewportWidth - scaledWidth) / 2;
  const offsetY = (viewportHeight - scaledHeight) / 2;

  useEffect(() => {
    function updateViewport() {
      const container = viewportRef.current;

      setViewport({
        width: container?.clientWidth || window.innerWidth || 800,
        height: container?.clientHeight || window.innerHeight || 600
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    const resizeObserver = typeof ResizeObserver !== "undefined" && viewportRef.current
      ? new ResizeObserver(updateViewport)
      : null;

    if (resizeObserver && viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateViewport);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      viewportWidth,
      viewportHeight,
      designWidth,
      designHeight,
      scale,
      scaledWidth,
      scaledHeight,
      viewportRatio: viewportWidth / viewportHeight,
      designRatio: designWidth / designHeight
    });
  }, [debug, designHeight, designWidth, scale, scaledHeight, scaledWidth, viewportHeight, viewportWidth]);

  return (
    <div
      ref={viewportRef}
      className="obsViewport"
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
        className="designCanvas"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: designWidth,
          height: designHeight,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          transformOrigin: "top left",
          backfaceVisibility: "hidden",
          willChange: "transform"
        }}
      >
        {children}
      </div>
    </div>
  );
}
