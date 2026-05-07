"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { OverlaySceneRenderer } from "@/components/overlay/OverlaySceneRenderer";
import type {
  OverlayComponentSchema,
  OverlayComponentType,
  OverlayDesignSchema,
  OverlayRenderData
} from "@/features/overlay-builder/schema/overlaySchema";
import { isContainerType } from "@/features/overlay-builder/utils/componentTree";
import { flattenComponents } from "@/features/overlay-builder/utils/componentTree";
import {
  getDragLayout,
  getPointerDelta,
  getResizedLayout,
  sanitizeInteractionLayout,
  type InteractionLayout,
  type ResizeHandle
} from "@/features/overlay-builder/utils/interactionMath";

type CanvasEditorProps = {
  designSchema: OverlayDesignSchema;
  data: OverlayRenderData;
  selectedComponentId: string | null;
  zoom: number;
  previewMode: boolean;
  onSelectComponent: (id: string | null) => void;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onUpdateComponentTransient?: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onBeginTransform?: () => void;
  onZoomChange?: (zoom: number) => void;
  onDeleteComponent?: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDropComponent: (type: OverlayComponentType, x: number, y: number, parentId?: string | null) => void;
  onReparentComponent: (id: string, parentId: string, x: number, y: number) => void;
  onAddComment: () => void;
  onChooseTemplate: () => void;
};

const SNAP_SIZE = 8;
const DEBUG_RESIZE = true;

type EditorPointerInteraction = {
  kind: "move" | "resize";
  pointerId: number;
  componentId: string;
  viewportScale: number;
  startPointer: {
    x: number;
    y: number;
  };
  currentPointer: {
    x: number;
    y: number;
  };
  startLayout: InteractionLayout;
  resizeHandle?: ResizeHandle;
  latestLayout: InteractionLayout;
};

const resizeHandles: ResizeHandle[] = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

function getSnapSize(event?: { altKey?: boolean }) {
  return event?.altKey ? 1 : SNAP_SIZE;
}

function snapValue(value: number, snapSize = SNAP_SIZE) {
  return Math.round(value / snapSize) * snapSize;
}

export function CanvasEditor({
  designSchema,
  data,
  selectedComponentId,
  zoom,
  previewMode,
  onSelectComponent,
  onUpdateComponent,
  onUpdateComponentTransient,
  onBeginTransform,
  onZoomChange,
  onDeleteComponent,
  onDuplicateComponent,
  onUndo,
  onRedo,
  onDropComponent,
  onAddComment,
  onChooseTemplate
}: CanvasEditorProps) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const interactionRef = useRef<EditorPointerInteraction | null>(null);
  const spacePressedRef = useRef(false);
  const [fitScale, setFitScale] = useState(1);
  const [interactionScale, setInteractionScale] = useState<number | null>(null);
  const [hoverContainerId, setHoverContainerId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(selectedComponentId ? [selectedComponentId] : []);
  const [spacePressed, setSpacePressed] = useState(false);
  const scale = interactionScale ?? fitScale * zoom;
  const flatComponents = flattenComponents(designSchema.components);
  const selectedNodes = flatComponents.filter((component) => selectedNodeIds.includes(component.id));

  useEffect(() => {
    const area = areaRef.current;

    if (!area) {
      return;
    }

    function updateScale() {
      if (interactionRef.current) {
        return;
      }

      const width = area?.clientWidth ?? designSchema.canvas.width;
      setFitScale(Math.min(1, Math.max(0.2, (width - 24) / Math.max(1, designSchema.canvas.width))));
    }

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(area);

    return () => observer.disconnect();
  }, [designSchema.canvas.width]);

  useEffect(() => {
    if (!selectedComponentId) {
      setSelectedNodeIds([]);
      return;
    }

    setSelectedNodeIds((current) => current.includes(selectedComponentId) ? current : [selectedComponentId]);
  }, [selectedComponentId]);

  const selectNodes = useCallback((ids: string[]) => {
    const nextIds = [...new Set(ids)].filter((id) => flatComponents.some((component) => component.id === id));
    setSelectedNodeIds(nextIds);
    onSelectComponent(nextIds[0] ?? null);
  }, [flatComponents, onSelectComponent]);

  const clearSelection = useCallback(() => {
    selectNodes([]);
  }, [selectNodes]);

  const patchNode = useCallback((id: string, patch: Partial<OverlayComponentSchema>) => {
    (onUpdateComponentTransient ?? onUpdateComponent)(id, patch);
  }, [onUpdateComponent, onUpdateComponentTransient]);

  const deleteSelected = useCallback(() => {
    selectedNodes
      .filter((node) => !node.locked)
      .forEach((node) => onDeleteComponent?.(node.id));
    clearSelection();
  }, [clearSelection, onDeleteComponent, selectedNodes]);

  const duplicateSelected = useCallback(() => {
    selectedNodes
      .filter((node) => !node.locked)
      .forEach((node) => onDuplicateComponent?.(node.id));
  }, [onDuplicateComponent, selectedNodes]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (previewMode || isEditableTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        spacePressedRef.current = true;
        setSpacePressed(true);
        return;
      }

      const isMeta = event.metaKey || event.ctrlKey;

      if (isMeta && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
          onRedo?.();
        } else {
          onUndo?.();
        }

        return;
      }

      if (event.key === "Escape") {
        clearSelection();
        return;
      }

      if (isMeta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const delta = getKeyboardDelta(event);

      if (!delta) {
        return;
      }

      event.preventDefault();
      onBeginTransform?.();
      selectedNodes.filter((node) => !node.locked).forEach((node) => patchNode(node.id, {
        x: node.x + delta.x,
        y: node.y + delta.y
      }));
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code !== "Space") {
        return;
      }

      spacePressedRef.current = false;
      setSpacePressed(false);
      panRef.current = null;
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [clearSelection, deleteSelected, duplicateSelected, onBeginTransform, onRedo, onUndo, patchNode, previewMode, selectedNodes]);

  function startMove(event: ReactPointerEvent<HTMLElement>, component: OverlayComponentSchema) {
    if (previewMode || component.locked || isEditorControlTarget(event.target)) {
      return;
    }

    startInteraction(event, component, "move");
  }

  function startResize(event: ReactPointerEvent<HTMLElement>, component: OverlayComponentSchema, resizeHandle: ResizeHandle) {
    if (previewMode || component.locked) {
      return;
    }

    startInteraction(event, component, "resize", resizeHandle);
  }

  function startInteraction(
    event: ReactPointerEvent<HTMLElement>,
    component: OverlayComponentSchema,
    kind: EditorPointerInteraction["kind"],
    resizeHandle?: ResizeHandle
  ) {
    const viewportScale = Math.max(scale, 0.001);
    const startLayout = sanitizeInteractionLayout({
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height
    });

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onBeginTransform?.();
    setInteractionScale(viewportScale);
    interactionRef.current = {
      kind,
      pointerId: event.pointerId,
      componentId: component.id,
      viewportScale,
      startPointer: { x: event.clientX, y: event.clientY },
      currentPointer: { x: event.clientX, y: event.clientY },
      startLayout,
      resizeHandle,
      latestLayout: startLayout
    };
    logInteraction("start", {
      viewportScale,
      startPointer: { x: event.clientX, y: event.clientY },
      currentPointer: { x: event.clientX, y: event.clientY },
      rawDelta: { x: 0, y: 0 },
      sceneDelta: { x: 0, y: 0 },
      nextLayout: startLayout
    });
  }

  function moveInteraction(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;

    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const { rawDelta, sceneDelta } = getPointerDelta({
      startPointer: interaction.startPointer,
      currentPointer: { x: event.clientX, y: event.clientY },
      viewportScale: interaction.viewportScale
    });
    const nextLayout = interaction.kind === "resize"
      ? getResizedLayout({
        startLayout: interaction.startLayout,
        sceneDelta,
        handle: interaction.resizeHandle ?? "se",
        lockAspectRatio: event.shiftKey
      })
      : getDragLayout({
        startLayout: interaction.startLayout,
        sceneDelta
      });

    interaction.currentPointer = { x: event.clientX, y: event.clientY };
    interaction.latestLayout = nextLayout;
    patchNode(interaction.componentId, nextLayout);
    logInteraction("move", {
      viewportScale: interaction.viewportScale,
      startPointer: interaction.startPointer,
      currentPointer: interaction.currentPointer,
      rawDelta,
      sceneDelta,
      nextLayout
    });
  }

  function stopInteraction(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;

    if (!interaction || interaction.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    patchNode(interaction.componentId, interaction.latestLayout);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    logInteraction("end", {
      viewportScale: interaction.viewportScale,
      startPointer: interaction.startPointer,
      currentPointer: interaction.currentPointer,
      ...getPointerDelta({
        startPointer: interaction.startPointer,
        currentPointer: interaction.currentPointer,
        viewportScale: interaction.viewportScale
      }),
      nextLayout: interaction.latestLayout
    });

    interactionRef.current = null;
    setInteractionScale(null);
  }

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    const area = areaRef.current;

    if (!area || !spacePressedRef.current || previewMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    area.setPointerCapture(event.pointerId);
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: area.scrollLeft,
      scrollTop: area.scrollTop
    };
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const area = areaRef.current;
    const pan = panRef.current;

    if (!area || !pan || pan.pointerId !== event.pointerId) {
      return;
    }

    area.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
    area.scrollTop = pan.scrollTop - (event.clientY - pan.y);
  }

  function stopPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    const nextZoom = clampZoom(zoom + (event.deltaY > 0 ? -0.05 : 0.05));
    onZoomChange?.(nextZoom);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-overlay-component") as OverlayComponentType;
    const rect = areaRef.current?.querySelector("[data-canvas-shell]")?.getBoundingClientRect();
    const parentId = findContainerAtPoint(event.clientX, event.clientY, null);
    const parentRect = parentId ? getComponentRect(parentId) : null;
    const snapSize = getSnapSize(event);

    if (!type || !rect) {
      return;
    }

    if (parentId && parentRect) {
      onDropComponent(
        type,
        snapValue((event.clientX - parentRect.left) / scale, snapSize),
        snapValue((event.clientY - parentRect.top) / scale, snapSize),
        parentId
      );
      setHoverContainerId(null);
      return;
    }

    onDropComponent(
      type,
      snapValue((event.clientX - rect.left) / scale, snapSize),
      snapValue((event.clientY - rect.top) / scale, snapSize),
      null
    );
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
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={stopPan}
      onPointerCancel={stopPan}
      onWheel={handleWheel}
      className={`h-full min-h-[420px] min-w-0 overflow-auto rounded-lg border bg-zinc-950/5 p-8 shadow-inner ${
        spacePressed ? "cursor-grab active:cursor-grabbing" : ""
      }`}
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
            ref={canvasRef}
            onPointerDown={(event) => {
              if (!spacePressedRef.current && shouldClearSelectionFromPointer(event.target, event.currentTarget)) {
                clearSelection();
              }
            }}
            style={{
              position: "relative",
              width: designSchema.canvas.width,
              height: designSchema.canvas.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left"
            }}
          >
            <OverlaySceneRenderer
              schema={designSchema}
              data={data}
              enableRuntimeLayout={previewMode}
              renderRuntime={false}
              className={previewMode ? undefined : "outline outline-1 outline-primary/50"}
              getComponentProps={(component) => ({
                role: "button",
                tabIndex: 0,
                "data-node-id": component.id,
                "data-node-locked": component.locked ? "true" : "false",
                onPointerDown: (event) => {
                  if (previewMode) {
                    return;
                  }

                  if (event.shiftKey) {
                    selectNodes(
                      selectedNodeIds.includes(component.id)
                        ? selectedNodeIds.filter((id) => id !== component.id)
                        : [...selectedNodeIds, component.id]
                    );
                  } else {
                    selectNodes([component.id]);
                  }

                  startMove(event, component);
                },
                onPointerMove: moveInteraction,
                onPointerUp: stopInteraction,
                onPointerCancel: stopInteraction,
                className: previewMode ? "" : `overlay-editor-node select-none ${component.locked ? "cursor-not-allowed" : "cursor-move"}`
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
                if (previewMode || !selectedNodeIds.includes(component.id)) {
                  return null;
                }

                return (
                  <>
                    <div className="pointer-events-none absolute inset-0 ring-2 ring-primary ring-offset-2" />
                    {!component.locked ? resizeHandles.map((handle) => (
                      <button
                        key={`${component.id}-${handle}`}
                        type="button"
                        aria-label={`Resize ${handle}`}
                        data-editor-resize-handle={handle}
                        onPointerDown={(event) => startResize(event, component, handle)}
                        onPointerMove={moveInteraction}
                        onPointerUp={stopInteraction}
                        onPointerCancel={stopInteraction}
                        className="absolute z-[2147483000] size-3 rounded-full border border-primary bg-card shadow"
                        style={getResizeHandleStyle(handle)}
                      />
                    )) : null}
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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isEditorControlTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const className = String(target.getAttribute("class") ?? "");

  if (className.includes("moveable") || className.includes("selecto")) {
    return true;
  }

  return Boolean(
    target.closest(
      [
        "[class*='moveable']",
        "[class*='selecto']",
        ".moveable-control-box",
        ".moveable-control",
        ".moveable-line",
        ".moveable-rotation",
        ".moveable-origin",
        ".moveable-area",
        ".selecto-selection",
        "[data-editor-toolbar='true']"
      ].join(", ")
    )
  );
}

function shouldClearSelectionFromPointer(target: EventTarget | null, canvasElement: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target === canvasElement) {
    return true;
  }

  if (isEditorControlTarget(target)) {
    return false;
  }

  return !target.closest(".overlay-editor-node, [data-overlay-component-id], [data-editor-toolbar='true']");
}

function getResizeHandleStyle(handle: ResizeHandle): CSSProperties {
  const positions: Record<ResizeHandle, CSSProperties> = {
    nw: { left: -6, top: -6, cursor: "nwse-resize" },
    n: { left: "50%", top: -6, transform: "translateX(-50%)", cursor: "ns-resize" },
    ne: { right: -6, top: -6, cursor: "nesw-resize" },
    w: { left: -6, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
    e: { right: -6, top: "50%", transform: "translateY(-50%)", cursor: "ew-resize" },
    sw: { left: -6, bottom: -6, cursor: "nesw-resize" },
    s: { left: "50%", bottom: -6, transform: "translateX(-50%)", cursor: "ns-resize" },
    se: { right: -6, bottom: -6, cursor: "nwse-resize" }
  };

  return positions[handle];
}

function logInteraction(
  phase: "start" | "move" | "end",
  payload: {
    viewportScale: number;
    startPointer: { x: number; y: number };
    currentPointer: { x: number; y: number };
    rawDelta: { x: number; y: number };
    sceneDelta: { x: number; y: number };
    nextLayout: InteractionLayout;
  }
) {
  if (!DEBUG_RESIZE) {
    return;
  }

  console.debug(`[overlay-resize:${phase}]`, payload);
}

function getKeyboardDelta(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 1;

  if (event.key === "ArrowLeft") {
    return { x: -step, y: 0 };
  }

  if (event.key === "ArrowRight") {
    return { x: step, y: 0 };
  }

  if (event.key === "ArrowUp") {
    return { x: 0, y: -step };
  }

  if (event.key === "ArrowDown") {
    return { x: 0, y: step };
  }

  return null;
}

function clampZoom(value: number) {
  return Math.min(3, Math.max(0.25, Number(value.toFixed(2))));
}
