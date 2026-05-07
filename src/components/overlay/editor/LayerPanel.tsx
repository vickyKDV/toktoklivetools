"use client";

import { GripVertical, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import type { ReactNode } from "react";
import { useState, type DragEvent } from "react";
import type { OverlayComponentSchema } from "@/features/overlay-builder/schema/overlaySchema";

type LayerNode = OverlayComponentSchema & {
  parentId?: string | null;
};

type LayerPanelProps = {
  components: LayerNode[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder?: (sourceId: string, targetId: string) => void;
};

export function LayerPanel({
  components,
  selectedIds,
  onSelect,
  onToggleVisible,
  onToggleLock,
  onDelete,
  onReorder
}: LayerPanelProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const ordered = [...components].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <section className="grid min-w-0 gap-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold">Layers</p>
      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
        {ordered.length ? (
          ordered.map((component, index) => {
            const selected = selectedIds.includes(component.id);
            const visible = component.visible && !component.hidden;

            return (
              <button
                key={`${component.parentId ?? "root"}-${component.id}-${index}`}
                type="button"
                draggable
                onDragStart={(event) => {
                  setDraggingId(component.id);
                  event.dataTransfer.setData("application/x-overlay-layer", component.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => handleDrop(event, component.id)}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onSelect(component.id)}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                  selected ? "border-primary bg-primary/10" : "bg-background hover:bg-muted"
                } ${draggingId === component.id ? "opacity-45" : ""}`}
                title={component.name}
              >
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{component.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{component.type}</span>
                </span>
                <IconButton label={visible ? "Hide" : "Show"} onClick={() => onToggleVisible(component.id)}>
                  {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconButton>
                <IconButton label={component.locked ? "Unlock" : "Lock"} onClick={() => onToggleLock(component.id)}>
                  {component.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                </IconButton>
                <IconButton label="Delete" danger disabled={component.locked} onClick={() => onDelete(component.id)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </button>
            );
          })
        ) : (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Belum ada layer.</p>
        )}
      </div>
    </section>
  );

  function handleDrop(event: DragEvent<HTMLButtonElement>, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = event.dataTransfer.getData("application/x-overlay-layer") || draggingId;
    setDraggingId(null);

    if (!sourceId || sourceId === targetId) {
      return;
    }

    onReorder?.(sourceId, targetId);
  }
}

function IconButton({
  label,
  danger,
  disabled,
  onClick,
  children
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <span
      role="button"
      aria-label={label}
      title={label}
      aria-disabled={disabled ? "true" : undefined}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!disabled) {
          onClick();
        }
      }}
      className={`grid size-7 place-items-center rounded border ${
        disabled
          ? "cursor-not-allowed opacity-35"
          : danger
            ? "text-red-600 hover:bg-red-500/10"
            : "hover:bg-muted"
      }`}
    >
      {children}
    </span>
  );
}
