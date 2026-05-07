"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { OverlaySceneSchema } from "@/components/overlay/sceneSchema";

type SceneViewportProps = {
  scene: OverlaySceneSchema;
  children: ReactNode;
  debug?: boolean;
  transparent?: boolean;
  fit?: "contain" | "none";
  verticalAnchor?: "top" | "center" | "bottom";
};

export function SceneViewport({
  scene,
  children,
  debug = false,
  transparent = true,
  fit = "contain",
  verticalAnchor = "center"
}: SceneViewportProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: scene.canvas.width, height: scene.canvas.height });
  const scale = fit === "none"
    ? 1
    : Math.min(viewport.width / scene.canvas.width, viewport.height / scene.canvas.height);
  const scaledWidth = scene.canvas.width * scale;
  const scaledHeight = scene.canvas.height * scale;
  const offsetX = (viewport.width - scaledWidth) / 2;
  const offsetY = getVerticalOffset(viewport.height, scaledHeight, verticalAnchor);

  useEffect(() => {
    function updateViewport() {
      const element = viewportRef.current;

      setViewport({
        width: element?.clientWidth || window.innerWidth || scene.canvas.width,
        height: element?.clientHeight || window.innerHeight || scene.canvas.height
      });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    const observer = typeof ResizeObserver !== "undefined" && viewportRef.current
      ? new ResizeObserver(updateViewport)
      : null;

    if (observer && viewportRef.current) {
      observer.observe(viewportRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateViewport);
      observer?.disconnect();
    };
  }, [scene.canvas.height, scene.canvas.width]);

  useEffect(() => {
    if (!debug) {
      return;
    }

    console.table({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      designWidth: scene.canvas.width,
      designHeight: scene.canvas.height,
      scale,
      scaledWidth,
      scaledHeight,
      viewportRatio: viewport.width / viewport.height,
      designRatio: scene.canvas.width / scene.canvas.height,
      verticalAnchor
    });
  }, [debug, scale, scaledHeight, scaledWidth, scene.canvas.height, scene.canvas.width, verticalAnchor, viewport.height, viewport.width]);

  const transform = useMemo(() => {
    if (fit === "none") {
      return undefined;
    }

    return `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  }, [fit, offsetX, offsetY, scale]);

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
        background: transparent ? "transparent" : undefined
      }}
    >
      <div
        className="designCanvas"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: scene.canvas.width,
          height: scene.canvas.height,
          transform,
          transformOrigin: "top left",
          backfaceVisibility: "hidden",
          willChange: fit === "none" ? undefined : "transform"
        }}
      >
        {children}
      </div>
    </div>
  );
}

function getVerticalOffset(viewportHeight: number, scaledHeight: number, anchor: SceneViewportProps["verticalAnchor"]) {
  if (anchor === "top") {
    return 0;
  }

  if (anchor === "bottom") {
    return viewportHeight - scaledHeight;
  }

  return (viewportHeight - scaledHeight) / 2;
}
