"use client";

import { SceneViewport } from "@/components/overlay/SceneViewport";
import { migrateOverlayDesignToScene } from "@/components/overlay/sceneSchema";
import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";
import type { ReactNode } from "react";

type OverlayViewportProps = {
  schema: OverlayDesignSchema;
  children: ReactNode;
  debug?: boolean;
  transparent?: boolean;
  fit?: "contain" | "none";
  verticalAnchor?: "top" | "center" | "bottom";
};

export function OverlayViewport({
  schema,
  children,
  debug = false,
  transparent = true,
  fit = "contain",
  verticalAnchor = "center"
}: OverlayViewportProps) {
  return (
    <SceneViewport
      scene={migrateOverlayDesignToScene(schema)}
      debug={debug}
      transparent={transparent}
      fit={fit}
      verticalAnchor={verticalAnchor}
    >
      {children}
    </SceneViewport>
  );
}
