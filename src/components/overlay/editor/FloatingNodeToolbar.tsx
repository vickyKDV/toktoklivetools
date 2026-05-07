"use client";

import { Copy, Lock, RotateCcw, SendToBack, Trash2, Unlock } from "lucide-react";
import type { ReactNode } from "react";
import type { OverlayComponentSchema } from "@/features/overlay-builder/schema/overlaySchema";

type FloatingNodeToolbarProps = {
  selectedNodes: OverlayComponentSchema[];
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onToggleLock: () => void;
  onResetRotation: () => void;
};

export function FloatingNodeToolbar({
  selectedNodes,
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBackward,
  onToggleLock,
  onResetRotation
}: FloatingNodeToolbarProps) {
  if (!selectedNodes.length) {
    return null;
  }

  const bounds = getSelectionBounds(selectedNodes);
  const locked = selectedNodes.every((node) => node.locked);

  return (
    <div
      data-editor-toolbar="true"
      onPointerDownCapture={(event) => {
        event.stopPropagation();
      }}
      onMouseDownCapture={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      className="pointer-events-auto absolute z-[2147483000] flex items-center gap-1.5 rounded-lg border bg-card/95 p-1.5 shadow-lg backdrop-blur"
      style={{
        left: bounds.x,
        top: Math.max(0, bounds.y - 46)
      }}
    >
      <ToolbarButton label="Duplicate" onClick={onDuplicate}>
        <Copy className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Bring forward" onClick={onBringForward}>
        <SendToBack className="size-3.5 rotate-180" />
      </ToolbarButton>
      <ToolbarButton label="Send backward" onClick={onSendBackward}>
        <SendToBack className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label={locked ? "Unlock" : "Lock"} onClick={onToggleLock}>
        {locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
      </ToolbarButton>
      <ToolbarButton label="Reset rotation" onClick={onResetRotation}>
        <RotateCcw className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Delete" onClick={onDelete} danger>
        <Trash2 className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  danger,
  onClick,
  children
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`grid size-8 place-items-center rounded-md border transition-colors ${
        danger ? "border-red-500/30 text-red-600 hover:bg-red-500/10" : "hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function getSelectionBounds(nodes: OverlayComponentSchema[]) {
  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
