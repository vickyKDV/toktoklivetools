"use client";

import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { OverlayRenderer } from "@/features/overlay-builder/components/OverlayRenderer";
import type {
  OverlayComponentSchema,
  OverlayComponentType,
  OverlayDesignSchema,
  OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import { isContainerType } from "@/features/overlay-builder/utils/componentTree";

type CanvasEditorProps = {
  designSchema: OverlayDesignSchema;
  data: OverlayRenderData;
  selectedComponentId: string | null;
  zoom: number;
  previewMode: boolean;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onDropComponent: (type: OverlayComponentType, x: number, y: number, parentId?: string | null) => void;
  onReparentComponent: (id: string, parentId: string, x: number, y: number) => void;
  onAddComment: () => void;
  onChooseTemplate: () => void;
};

type Interaction = {
  kind: "move" | "resize";
  id: string;
  startClientX: number;
  startClientY: number;
  currentClientX: number;
  currentClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  scale: number;
};

export function CanvasEditor({
  designSchema,
  data,
  selectedComponentId,
  zoom,
  previewMode,
  onSelectComponent,
  onUpdateComponent,
  onDropComponent,
  onReparentComponent,
  onAddComment,
  onChooseTemplate
}: CanvasEditorProps) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [hoverContainerId, setHoverContainerId] = useState<string | null>(null);
  const scale = fitScale * zoom;

  useEffect(() => {
    const area = areaRef.current;

    if (!area) {
      return;
    }

    function updateScale() {
      const width = area?.clientWidth ?? designSchema.canvas.width;
      setFitScale(Math.min(1, Math.max(0.2, (width - 24) / Math.max(1, designSchema.canvas.width))));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(area);

    return () => observer.disconnect();
  }, [designSchema.canvas.width]);

  function startMove(event: ReactPointerEvent<HTMLDivElement>, component: OverlayComponentSchema) {
    if (previewMode || component.locked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectComponent(component.id);
    interactionRef.current = {
      kind: "move",
      id: component.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      startX: component.x,
      startY: component.y,
      startWidth: component.width,
      startHeight: component.height,
      scale
    };
  }

  function moveInteraction(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    const nextHoverContainerId = findContainerAtPoint(event.clientX, event.clientY, interaction.id);
    setHoverContainerId(nextHoverContainerId);
    interaction.currentClientX = event.clientX;
    interaction.currentClientY = event.clientY;

    const deltaX = (event.clientX - interaction.startClientX) / interaction.scale;
    const deltaY = (event.clientY - interaction.startClientY) / interaction.scale;

    if (interaction.kind === "resize") {
      onUpdateComponent(interaction.id, {
        width: Math.max(12, Math.round(interaction.startWidth + deltaX)),
        height: Math.max(12, Math.round(interaction.startHeight + deltaY))
      });
      return;
    }

    onUpdateComponent(interaction.id, {
      x: Math.round(interaction.startX + deltaX),
      y: Math.round(interaction.startY + deltaY)
    });
  }

  function stopInteraction() {
    const interaction = interactionRef.current;

    if (interaction && hoverContainerId) {
      const rect = getComponentRect(hoverContainerId);
      const childRect = getComponentRect(interaction.id);

      if (rect && childRect) {
        onReparentComponent(
          interaction.id,
          hoverContainerId,
          Math.round((childRect.left - rect.left) / scale),
          Math.round((childRect.top - rect.top) / scale)
        );
      }
    }

    interactionRef.current = null;
    setHoverContainerId(null);
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, component: OverlayComponentSchema) {
    if (component.locked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectComponent(component.id);
    interactionRef.current = {
      kind: "resize",
      id: component.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      currentClientX: event.clientX,
      currentClientY: event.clientY,
      startX: component.x,
      startY: component.y,
      startWidth: component.width,
      startHeight: component.height,
      scale
    };
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-overlay-component") as OverlayComponentType;
    const rect = areaRef.current?.querySelector("[data-canvas-shell]")?.getBoundingClientRect();
    const parentId = findContainerAtPoint(event.clientX, event.clientY, null);
    const parentRect = parentId ? getComponentRect(parentId) : null;

    if (!type || !rect) {
      return;
    }

    if (parentId && parentRect) {
      onDropComponent(type, Math.round((event.clientX - parentRect.left) / scale), Math.round((event.clientY - parentRect.top) / scale), parentId);
      setHoverContainerId(null);
      return;
    }

    onDropComponent(type, Math.round((event.clientX - rect.left) / scale), Math.round((event.clientY - rect.top) / scale), null);
    setHoverContainerId(null);
  }

  function findContainerAtPoint(clientX: number, clientY: number, excludeId: string | null) {
    const containers = designSchema.components.flatMap((component) => collectContainers(component));
    const hits = containers
      .filter((component) => component.id !== excludeId)
      .map((component) => {
        const rect = getComponentRect(component.id);
        return { component, rect };
      })
      .filter((item): item is { component: OverlayComponentSchema; rect: DOMRect } => Boolean(item.rect))
      .filter(({ rect }) => clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom)
      .sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));

    return hits[0]?.component.id ?? null;
  }

  function collectContainers(component: OverlayComponentSchema): OverlayComponentSchema[] {
    return [
      ...(isContainerType(component.type) ? [component] : []),
      ...(component.children ?? []).flatMap((child) => collectContainers(child))
    ];
  }

  function getComponentRect(id: string) {
    return areaRef.current?.querySelector(`[data-overlay-component-id="${id}"]`)?.getBoundingClientRect() ?? null;
  }

  return (
    <div
      ref={areaRef}
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setHoverContainerId(findContainerAtPoint(event.clientX, event.clientY, null));
      }}
      onDragLeave={() => setHoverContainerId(null)}
      className="h-full min-h-[420px] min-w-0 overflow-auto rounded-lg border bg-zinc-950/5 p-8 shadow-inner"
    >
      <div className="flex min-h-full min-w-0 items-start justify-center">
        <div
          data-canvas-shell
          style={{
            width: designSchema.canvas.width * scale,
            height: designSchema.canvas.height * scale
          }}
        >
          <div
            onPointerDown={() => onSelectComponent(null)}
            style={{
              position: "relative",
              width: designSchema.canvas.width,
              height: designSchema.canvas.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left"
            }}
          >
            <OverlayRenderer
              designJson={designSchema}
              data={data}
              enableRuntimeLayout={previewMode}
              className={previewMode ? undefined : "outline outline-1 outline-primary/50"}
              getComponentProps={(component) => ({
                role: "button",
                tabIndex: 0,
                onPointerDown: (event) => startMove(event, component),
                onPointerMove: moveInteraction,
                onPointerUp: stopInteraction,
                onPointerCancel: stopInteraction,
                className: previewMode ? "" : "select-none"
              })}
              renderDropIndicator={(component) => (
                hoverContainerId === component.id ? (
                  <div className="pointer-events-none absolute inset-0 z-[9997] rounded-[inherit] border-2 border-primary bg-primary/10">
                    <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                      Drop inside card
                    </span>
                  </div>
                ) : null
              )}
              renderEditorOverlay={(component) => {
                if (previewMode || selectedComponentId !== component.id) {
                  return null;
                }

                return (
                  <>
                    <div className="pointer-events-none absolute inset-0 ring-2 ring-primary ring-offset-2" />
                    <button
                      type="button"
                      aria-label="Resize component"
                      onPointerDown={(event) => startResize(event, component)}
                      onPointerMove={moveInteraction}
                      onPointerUp={stopInteraction}
                      onPointerCancel={stopInteraction}
                      className="absolute bottom-[-8px] right-[-8px] z-20 size-4 cursor-nwse-resize rounded-full border border-primary bg-card shadow"
                    />
                  </>
                );
              }}
            />
            {!previewMode && designSchema.components.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center p-8">
                <div className="max-w-md rounded-lg border border-dashed bg-card/95 p-5 text-center shadow">
                  <p className="text-lg font-semibold">Mulai dari canvas kosong</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tambahkan Foto Profil, Nama, Komentar, Gift, atau elemen lain dari panel kiri.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Canvas masih kosong. Drag component dari kiri atau klik component untuk mulai.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={onAddComment}
                      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      Tambah Komentar
                    </button>
                    <button
                      type="button"
                      onClick={onChooseTemplate}
                      className="rounded-md border px-3 py-2 text-sm font-semibold"
                    >
                      Pilih Template
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
