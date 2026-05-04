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
  gift_text: <Type className="size-4" />,
  gift_name: <Type className="size-4" />,
  gift_count: <Type className="size-4" />,
  gift_image: <ImageIcon className="size-4" />,
  running_text: <Type className="size-4" />
};

export function ComponentLibrary({ onAddComponent, onLoadTemplate, onBlankCanvas }: ComponentLibraryProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4">
        <button
          type="button"
          onClick={onBlankCanvas}
          className="flex h-10 items-center gap-2.5 rounded-md border bg-background px-4 text-left text-sm font-semibold transition-colors hover:bg-muted"
        >
          <FilePlus2 className="size-4" />
          Blank Canvas
        </button>

        <section className="grid min-w-0 gap-3">
          <div className="flex items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-muted-foreground">
            <Plus className="size-4" />
            Add Component
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            {componentLibrary.map((component) => (
              <button
                key={component.type}
                type="button"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("application/x-overlay-component", component.type)}
                onClick={() => onAddComponent(component.type)}
                className="flex h-10 min-w-0 items-center gap-2.5 rounded-md border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted"
                title={component.label}
              >
                {iconMap[component.type] ?? <Type className="size-4" />}
                <span className="truncate">{component.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="grid min-w-0 gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2.5 whitespace-nowrap text-sm font-semibold text-muted-foreground">
          <LayoutTemplate className="size-4" />
          Template
        </div>
        <div className="grid min-w-0 gap-3">
          {overlayTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onLoadTemplate(template.id)}
              className="h-10 min-w-0 truncate rounded-md border bg-background px-4 text-left text-sm font-semibold transition-colors hover:bg-muted"
              title={template.description}
            >
              {template.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
