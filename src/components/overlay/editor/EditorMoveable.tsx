"use client";

import Moveable, {
  type OnDrag,
  type OnDragGroup,
  type OnDragGroupStart,
  type OnDragStart,
  type OnResize,
  type OnResizeGroup,
  type OnResizeGroupStart,
  type OnResizeStart,
  type OnRotate,
  type OnRotateGroup,
  type OnRotateGroupStart,
  type OnRotateStart
} from "react-moveable";
import { useEffect, useRef } from "react";
import type { OverlayComponentSchema, OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

type EditorMoveableProps = {
  canvasElement: HTMLElement | null;
  targets: HTMLElement[];
  components: OverlayComponentSchema[];
  canvas: OverlayDesignSchema["canvas"];
  zoom: number;
  onBeginTransform: () => void;
  onPatchNode: (id: string, patch: Partial<OverlayComponentSchema>) => void;
};

type StartSnapshot = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

const SNAP_SIZE = 8;

export function EditorMoveable({
  canvasElement,
  targets,
  components,
  canvas,
  zoom,
  onBeginTransform,
  onPatchNode
}: EditorMoveableProps) {
  const activeTargets = targets.filter((target) => target.dataset.nodeLocked !== "true");
  const elementGuidelines = canvasElement
    ? Array.from(canvasElement.querySelectorAll<HTMLElement>(".overlay-editor-node")).filter((element) => !activeTargets.includes(element))
    : [];
  const snapshotsRef = useRef(new Map<string, StartSnapshot>());
  const pendingPatchesRef = useRef(new Map<string, Partial<OverlayComponentSchema>>());
  const pendingTargetsRef = useRef(new Map<string, HTMLElement>());
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (!activeTargets.length) {
    return null;
  }

  function getSnapshot(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const id = target.dataset.nodeId;

    if (!id) {
      return null;
    }

    const snapshot = snapshotsRef.current.get(id);
    return snapshot ? { id, snapshot } : null;
  }

  function begin() {
    snapshotsRef.current = new Map(components.map((component) => [component.id, snapshotComponent(component)]));
    pendingPatchesRef.current.clear();
    pendingTargetsRef.current.clear();
    onBeginTransform();
  }

  function queuePatch(id: string, patch: Partial<OverlayComponentSchema>, target: EventTarget | null) {
    pendingPatchesRef.current.set(id, {
      ...pendingPatchesRef.current.get(id),
      ...patch
    });

    if (target instanceof HTMLElement) {
      pendingTargetsRef.current.set(id, target);
    }

    if (frameRef.current != null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      pendingPatchesRef.current.forEach((nextPatch, patchId) => {
        const targetElement = pendingTargetsRef.current.get(patchId);

        if (targetElement) {
          applyLivePatch(targetElement, nextPatch);
        }
      });
    });
  }

  function flushPatches() {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    pendingPatchesRef.current.forEach((patch, id) => {
      onPatchNode(id, patch);
    });
    pendingPatchesRef.current.clear();
    pendingTargetsRef.current.clear();
  }

  function stopInput(event: { inputEvent?: Event }) {
    event.inputEvent?.stopPropagation();
  }

  function beginDrag(event: OnDragStart | OnDragGroupStart) {
    begin();
    stopInput(event);
    event.set([0, 0]);
  }

  function beginResize(event: OnResizeStart | OnResizeGroupStart) {
    begin();
    stopInput(event);
    if (event.dragStart) {
      event.dragStart.set([0, 0]);
    }
  }

  function beginRotate(event: OnRotateStart | OnRotateGroupStart) {
    begin();
    stopInput(event);
  }

  return (
    <Moveable
      className="overlay-editor-moveable"
      target={activeTargets.length === 1 ? activeTargets[0] : activeTargets}
      container={canvasElement}
      rootContainer={canvasElement}
      dragContainer={canvasElement}
      draggable
      resizable
      rotatable
      snappable
      dragArea={false}
      passDragArea={false}
      stopPropagation
      preventDefault
      preventClickDefault
      preventClickEventOnDrag
      checkInput
      snapContainer={canvasElement ?? undefined}
      snapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
      elementSnapDirections={{ top: true, left: true, bottom: true, right: true, center: true, middle: true }}
      snapGap
      snapGridWidth={SNAP_SIZE}
      snapGridHeight={SNAP_SIZE}
      snapThreshold={6}
      snapHorizontalThreshold={6}
      snapVerticalThreshold={6}
      verticalGuidelines={[0, canvas.width / 2, canvas.width]}
      horizontalGuidelines={[0, canvas.height / 2, canvas.height]}
      elementGuidelines={elementGuidelines}
      bounds={{ left: 0, top: 0, right: canvas.width, bottom: canvas.height }}
      throttleDrag={1}
      throttleResize={1}
      throttleRotate={1}
      snapRotationDegrees={[0, 45, 90, 135, 180, 225, 270, 315]}
      snapRotationThreshold={5}
      zoom={zoom}
      rotationPosition="top"
      renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
      onDragStart={beginDrag}
      onDragEnd={flushPatches}
      onDrag={(event: OnDrag) => {
        stopInput(event);
        const state = getSnapshot(event.target ?? null);

        if (!state) {
          return;
        }

        const distance = getDistance(event);
        const dx = distance.x / Math.max(zoom, 0.001);
        const dy = distance.y / Math.max(zoom, 0.001);

        queuePatch(state.id, {
          x: clampValue(snapValue(state.snapshot.x + dx), 0, Math.max(0, canvas.width - state.snapshot.width)),
          y: clampValue(snapValue(state.snapshot.y + dy), 0, Math.max(0, canvas.height - state.snapshot.height))
        }, event.target ?? null);
      }}
      onDragGroupStart={beginDrag}
      onDragGroupEnd={flushPatches}
      onDragGroup={(event: OnDragGroup) => {
        stopInput(event);
        event.events?.forEach((childEvent) => {
          const state = getSnapshot(childEvent.target ?? null);

          if (!state) {
            return;
          }

          const distance = getDistance(childEvent);
          const dx = distance.x / Math.max(zoom, 0.001);
          const dy = distance.y / Math.max(zoom, 0.001);

          queuePatch(state.id, {
            x: clampValue(snapValue(state.snapshot.x + dx), 0, Math.max(0, canvas.width - state.snapshot.width)),
            y: clampValue(snapValue(state.snapshot.y + dy), 0, Math.max(0, canvas.height - state.snapshot.height))
          }, childEvent.target ?? null);
        });
      }}
      onResizeStart={beginResize}
      onResizeEnd={flushPatches}
      onResize={(event: OnResize) => {
        stopInput(event);
        const state = getSnapshot(event.target ?? null);

        if (!state) {
          return;
        }

        const dx = Number(event.drag?.beforeDist?.[0] ?? 0) / Math.max(zoom, 0.001);
        const dy = Number(event.drag?.beforeDist?.[1] ?? 0) / Math.max(zoom, 0.001);

        const width = Math.max(12, snapValue(Number(event.width ?? state.snapshot.width)));
        const height = Math.max(12, snapValue(Number(event.height ?? state.snapshot.height)));

        queuePatch(state.id, {
          x: clampValue(snapValue(state.snapshot.x + dx), 0, Math.max(0, canvas.width - width)),
          y: clampValue(snapValue(state.snapshot.y + dy), 0, Math.max(0, canvas.height - height)),
          width: Math.min(width, canvas.width),
          height: Math.min(height, canvas.height)
        }, event.target ?? null);
      }}
      onResizeGroupStart={beginResize}
      onResizeGroupEnd={flushPatches}
      onResizeGroup={(event: OnResizeGroup) => {
        stopInput(event);
        event.events?.forEach((childEvent) => {
          const state = getSnapshot(childEvent.target ?? null);

          if (!state) {
            return;
          }

          const dx = Number(childEvent.drag?.beforeDist?.[0] ?? 0) / Math.max(zoom, 0.001);
          const dy = Number(childEvent.drag?.beforeDist?.[1] ?? 0) / Math.max(zoom, 0.001);

          const width = Math.max(12, snapValue(Number(childEvent.width ?? state.snapshot.width)));
          const height = Math.max(12, snapValue(Number(childEvent.height ?? state.snapshot.height)));

          queuePatch(state.id, {
            x: clampValue(snapValue(state.snapshot.x + dx), 0, Math.max(0, canvas.width - width)),
            y: clampValue(snapValue(state.snapshot.y + dy), 0, Math.max(0, canvas.height - height)),
            width: Math.min(width, canvas.width),
            height: Math.min(height, canvas.height)
          }, childEvent.target ?? null);
        });
      }}
      onRotateStart={beginRotate}
      onRotateEnd={flushPatches}
      onRotate={(event: OnRotate) => {
        stopInput(event);
        const state = getSnapshot(event.target ?? null);

        if (!state) {
          return;
        }

        queuePatch(state.id, {
          rotation: normalizeRotation(state.snapshot.rotation + getRotationDistance(event))
        }, event.target ?? null);
      }}
      onRotateGroupStart={beginRotate}
      onRotateGroupEnd={flushPatches}
      onRotateGroup={(event: OnRotateGroup) => {
        stopInput(event);
        event.events?.forEach((childEvent) => {
          const state = getSnapshot(childEvent.target ?? null);

          if (!state) {
            return;
          }

          queuePatch(state.id, {
            rotation: normalizeRotation(state.snapshot.rotation + getRotationDistance(childEvent, event))
          }, childEvent.target ?? null);
        });
      }}
    />
  );
}

function snapshotComponent(component: OverlayComponentSchema): StartSnapshot {
  return {
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height,
    rotation: component.rotation ?? 0
  };
}

function applyLivePatch(target: HTMLElement, patch: Partial<OverlayComponentSchema>) {
  if (typeof patch.x === "number" && Number.isFinite(patch.x)) {
    target.style.left = `${patch.x}px`;
  }

  if (typeof patch.y === "number" && Number.isFinite(patch.y)) {
    target.style.top = `${patch.y}px`;
  }

  if (typeof patch.width === "number" && Number.isFinite(patch.width)) {
    target.style.width = `${patch.width}px`;
  }

  if (typeof patch.height === "number" && Number.isFinite(patch.height)) {
    target.style.height = `${patch.height}px`;
    target.style.minHeight = `${patch.height}px`;
  }

  if (typeof patch.rotation === "number" && Number.isFinite(patch.rotation)) {
    target.style.transform = `rotate(${patch.rotation}deg)`;
  }
}

function snapValue(value: number) {
  return Math.round(value / SNAP_SIZE) * SNAP_SIZE;
}

function clampValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function getDistance(event: OnDrag) {
  if (Array.isArray(event.beforeDist)) {
    return {
      x: Number(event.beforeDist[0] ?? 0),
      y: Number(event.beforeDist[1] ?? 0)
    };
  }

  if (typeof event.beforeDist === "number") {
    return {
      x: event.beforeDist,
      y: 0
    };
  }

  if (Array.isArray(event.dist)) {
    return {
      x: Number(event.dist[0] ?? 0),
      y: Number(event.dist[1] ?? 0)
    };
  }

  return { x: 0, y: 0 };
}

function getRotationDistance(event: OnRotate, fallback?: OnRotate) {
  return Number(
    typeof event.dist === "number"
      ? event.dist
      : typeof fallback?.dist === "number"
        ? fallback.dist
        : 0
  );
}

function normalizeRotation(value: number) {
  const normalized = Math.round(value);
  return ((normalized % 360) + 360) % 360;
}
