export const MIN_INTERACTION_SIZE = 12;

export type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export type InteractionPoint = {
  x: number;
  y: number;
};

export type InteractionLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PointerDelta = {
  rawDelta: InteractionPoint;
  sceneDelta: InteractionPoint;
};

type DragInput = {
  startLayout: InteractionLayout;
  sceneDelta: InteractionPoint;
};

type ResizeInput = DragInput & {
  handle: ResizeHandle;
  lockAspectRatio?: boolean;
  minWidth?: number;
  minHeight?: number;
};

type PointerDeltaInput = {
  startPointer: InteractionPoint;
  currentPointer: InteractionPoint;
  viewportScale: number;
};

/**
 * Scene coordinates are the overlay JSON coordinate system. Viewport coordinates
 * are browser/client pixels after the scene has been visually scaled.
 *
 * Pointer events arrive in viewport coordinates, so pointer deltas must be
 * divided by the frozen viewport scale before changing scene layout values.
 */
export function getPointerDelta({
  startPointer,
  currentPointer,
  viewportScale
}: PointerDeltaInput): PointerDelta {
  const safeScale = Math.max(0.001, safeFinite(viewportScale, 1));
  const safeStartPointer = {
    x: safeNumber(startPointer.x, 0),
    y: safeNumber(startPointer.y, 0)
  };
  const rawDelta = {
    x: safeNumber(currentPointer.x, safeStartPointer.x) - safeStartPointer.x,
    y: safeNumber(currentPointer.y, safeStartPointer.y) - safeStartPointer.y
  };

  return {
    rawDelta,
    sceneDelta: {
      x: rawDelta.x / safeScale,
      y: rawDelta.y / safeScale
    }
  };
}

/**
 * Drag always starts from the initial snapshot layout captured on pointerdown.
 * It must never accumulate from already-mutated state, otherwise drift appears
 * when React rerenders during pointer movement.
 */
export function getDragLayout({ startLayout, sceneDelta }: DragInput): InteractionLayout {
  const start = sanitizeInteractionLayout(startLayout);

  return sanitizeInteractionLayout({
    ...start,
    x: start.x + safeNumber(sceneDelta.x, 0),
    y: start.y + safeNumber(sceneDelta.y, 0)
  });
}

/**
 * Resize is also derived from the initial pointerdown layout snapshot.
 * Handles that resize from the left/top move x/y while inversely changing
 * width/height. The opposite edge remains stable when min size is reached.
 */
export function getResizedLayout({
  startLayout,
  sceneDelta,
  handle,
  lockAspectRatio = false,
  minWidth = MIN_INTERACTION_SIZE,
  minHeight = MIN_INTERACTION_SIZE
}: ResizeInput): InteractionLayout {
  const start = sanitizeInteractionLayout(startLayout, minWidth, minHeight);
  const safeDelta = {
    x: safeNumber(sceneDelta.x, 0),
    y: safeNumber(sceneDelta.y, 0)
  };
  const safeMinWidth = Math.max(1, safeFinite(minWidth, MIN_INTERACTION_SIZE));
  const safeMinHeight = Math.max(1, safeFinite(minHeight, MIN_INTERACTION_SIZE));
  let nextX = start.x;
  let nextY = start.y;
  let nextWidth = start.width;
  let nextHeight = start.height;

  if (handle.includes("e")) {
    nextWidth = start.width + safeDelta.x;
  }

  if (handle.includes("s")) {
    nextHeight = start.height + safeDelta.y;
  }

  if (handle.includes("w")) {
    nextWidth = start.width - safeDelta.x;
    nextX = start.x + safeDelta.x;
  }

  if (handle.includes("n")) {
    nextHeight = start.height - safeDelta.y;
    nextY = start.y + safeDelta.y;
  }

  if (lockAspectRatio && handle.length === 2) {
    const aspectRatio = Math.max(0.001, start.width / Math.max(1, start.height));
    const widthDelta = Math.abs(nextWidth - start.width);
    const heightDelta = Math.abs(nextHeight - start.height);

    if (widthDelta >= heightDelta) {
      nextHeight = nextWidth / aspectRatio;
    } else {
      nextWidth = nextHeight * aspectRatio;
    }

    if (handle.includes("w")) {
      nextX = start.x + start.width - nextWidth;
    }

    if (handle.includes("n")) {
      nextY = start.y + start.height - nextHeight;
    }
  }

  if (nextWidth < safeMinWidth) {
    if (handle.includes("w")) {
      nextX = start.x + start.width - safeMinWidth;
    }

    nextWidth = safeMinWidth;
  }

  if (nextHeight < safeMinHeight) {
    if (handle.includes("n")) {
      nextY = start.y + start.height - safeMinHeight;
    }

    nextHeight = safeMinHeight;
  }

  return sanitizeInteractionLayout({
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight
  }, safeMinWidth, safeMinHeight);
}

export function sanitizeInteractionLayout(
  layout: InteractionLayout,
  minWidth = MIN_INTERACTION_SIZE,
  minHeight = MIN_INTERACTION_SIZE
): InteractionLayout {
  const safeMinWidth = Math.max(1, safeFinite(minWidth, MIN_INTERACTION_SIZE));
  const safeMinHeight = Math.max(1, safeFinite(minHeight, MIN_INTERACTION_SIZE));

  return {
    x: safeFinite(layout.x, 0),
    y: safeFinite(layout.y, 0),
    width: Math.max(safeMinWidth, safeFinite(layout.width, safeMinWidth)),
    height: Math.max(safeMinHeight, safeFinite(layout.height, safeMinHeight))
  };
}

function safeFinite(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function safeNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
