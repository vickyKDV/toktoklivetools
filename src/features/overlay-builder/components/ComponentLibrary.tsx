"use client";

import { FilePlus2, ImageIcon, LayoutTemplate, MessageSquareText, Plus, Square, Type, User } from "lucide-react";
import type { ReactNode } from "react";
import { componentLibrary } from "@/features/overlay-builder/registry/componentRegistry";
import { overlayTemplates } from "@/features/overlay-builder/registry/templateRegistry";
import type { OverlayComponentType } from "@/features/overlay-builder/schema/overlaySchema";

type ComponentLibraryProps = {
  onAddComponent: (type: OverlayComponentType) => void;
  onLoadTemplate: (templateId: string) => void;
  onBlankCanvas: () => void;
};

const iconMap: Partial<Record<OverlayComponentType, ReactNode>> = {
  container: <Square className="size-4" />,
  bubble_card: <Square className="size-4" />,
  glass_card: <Square className="size-4" />,
  gradient_card: <Square className="size-4" />,
  profile_photo: <ImageIcon className="size-4" />,
  viewer_name: <User className="size-4" />,
  viewer_username: <Type className="size-4" />,
  viewer_badge: <Type className="size-4" />,
  comment: <MessageSquareText className="size-4" />,
  created_at: <Type className="size-4" />,
  gift_name: <Type className="size-4" />,
  gift_count: <Type className="size-4" />,
  gift_image: <ImageIcon className="size-4" />,
  running_text: <Type className="size-4" />
};

export function ComponentLibrary({ onAddComponent, onLoadTemplate, onBlankCanvas }: ComponentLibraryProps) {
  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={onBlankCanvas}
        className="flex items-center gap-2 rounded-lg border bg-card p-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
      >
        <FilePlus2 className="size-4" />
        Blank Canvas
      </button>

      <section className="grid gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <LayoutTemplate className="size-4" />
          Template
        </div>
        {overlayTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onLoadTemplate(template.id)}
            className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted"
          >
            <span className="block text-sm font-semibold">{template.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{template.description}</span>
          </button>
        ))}
      </section>

      <section className="grid gap-2 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="size-4" />
          Add Component
        </div>
        {componentLibrary.map((component) => (
          <button
            key={component.type}
            type="button"
            draggable
            onDragStart={(event) => event.dataTransfer.setData("application/x-overlay-component", component.type)}
            onClick={() => onAddComponent(component.type)}
            className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              {iconMap[component.type] ?? <Type className="size-4" />}
              {component.label}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}
