import type { OverlayComponentSchema } from "@/features/overlay-builder/schema/overlaySchema";

export type OverlayEditorState = {
  selectedNodeIds: string[];
  hoverNodeId: string | null;
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
  toolMode: "select" | "pan";
};

export type OverlayEditorNodePatch = {
  id: string;
  patch: Partial<OverlayComponentSchema>;
};

export const defaultOverlayEditorState: OverlayEditorState = {
  selectedNodeIds: [],
  hoverNodeId: null,
  zoom: 1,
  pan: {
    x: 0,
    y: 0
  },
  toolMode: "select"
};
