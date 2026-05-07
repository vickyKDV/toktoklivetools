"use client";

import { EditorMoveable } from "@/components/overlay/editor/EditorMoveable";
import { EditorSelecto } from "@/components/overlay/editor/EditorSelecto";
import { FloatingNodeToolbar } from "@/components/overlay/editor/FloatingNodeToolbar";
import type { OverlayComponentSchema, OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

type EditorInteractionLayerProps = {
  canvasElement: HTMLElement | null;
  selectedTargets: HTMLElement[];
  selectedNodes: OverlayComponentSchema[];
  flatComponents: OverlayComponentSchema[];
  schema: OverlayDesignSchema;
  zoom: number;
  onSelectNodes: (ids: string[]) => void;
  onBeginTransform: () => void;
  onPatchNode: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onBringSelectedForward: () => void;
  onSendSelectedBackward: () => void;
  onToggleSelectedLock: () => void;
  onResetSelectedRotation: () => void;
};

export function EditorInteractionLayer({
  canvasElement,
  selectedTargets,
  selectedNodes,
  flatComponents,
  schema,
  zoom,
  onSelectNodes,
  onBeginTransform,
  onPatchNode,
  onDuplicateSelected,
  onDeleteSelected,
  onBringSelectedForward,
  onSendSelectedBackward,
  onToggleSelectedLock,
  onResetSelectedRotation
}: EditorInteractionLayerProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: editorInteractionCss }} />
      <EditorSelecto canvasElement={canvasElement} onSelectNodes={onSelectNodes} />
      <EditorMoveable
        canvasElement={canvasElement}
        targets={selectedTargets}
        components={flatComponents}
        canvas={schema.canvas}
        zoom={zoom}
        onBeginTransform={onBeginTransform}
        onPatchNode={onPatchNode}
      />
      <FloatingNodeToolbar
        selectedNodes={selectedNodes}
        onDuplicate={onDuplicateSelected}
        onDelete={onDeleteSelected}
        onBringForward={onBringSelectedForward}
        onSendBackward={onSendSelectedBackward}
        onToggleLock={onToggleSelectedLock}
        onResetRotation={onResetSelectedRotation}
      />
    </>
  );
}

const editorInteractionCss = `
  .overlay-editor-moveable,
  .overlay-editor-moveable .moveable-control-box,
  .overlay-editor-moveable .moveable-line,
  .overlay-editor-moveable .moveable-control,
  .overlay-editor-moveable .moveable-rotation {
    z-index: 2147483000 !important;
    pointer-events: auto !important;
  }

  .overlay-editor-moveable .moveable-control {
    width: 14px !important;
    height: 14px !important;
    margin-top: -7px !important;
    margin-left: -7px !important;
    border: 2px solid hsl(var(--primary)) !important;
    background: hsl(var(--card)) !important;
    box-shadow: 0 8px 20px rgba(0, 0, 0, .18) !important;
  }

  .overlay-editor-moveable .moveable-rotation-control {
    width: 16px !important;
    height: 16px !important;
  }

  .selecto-selection {
    z-index: 2147482999 !important;
    pointer-events: none !important;
  }
`;
