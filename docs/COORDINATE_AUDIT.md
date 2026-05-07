# Coordinate Audit

This audit documents the current overlay editor coordinate system as implemented now. It is intentionally limited to interaction math and render coordinate flow. It does not propose or include theme, template, TikTok, automation, or feature work.

## 1. Current Coordinate System

The authoritative coordinate system is the overlay scene/canvas coordinate system.

- Component layout values live in JSON schema fields: `x`, `y`, `width`, `height`, `rotation`, and `zIndex`.
- These values are scene/canvas coordinates, not DOM pixels.
- DOM/client/screen pixels are only used for input events and visual display.
- Viewport scale only changes how the scene is displayed. It must not mutate JSON layout values.
- Drag and resize must write final `x`, `y`, `width`, and `height` back in scene coordinates.

Current render paths:

- Builder editor: `CanvasEditor.tsx` renders `OverlaySceneRenderer` inside a scaled editor canvas. The editor passes `enableRuntimeLayout={previewMode}` and `renderRuntime={false}`.
- Builder preview: `BuilderLayout.tsx` renders `OverlaySceneRenderer` using the current schema and preview/sample data.
- OBS/Public runtime: `OverlayRuntimeClient.tsx` and `OverlayOutputClient.tsx` render through `OverlayViewportSceneRenderer`, which uses `SceneViewport` and `OverlaySceneRenderer`.
- Thumbnail cards: `OverlayThumbnail.tsx` reads the same schema layout values, but currently renders through the legacy `OverlayRenderer` directly instead of the complete `OverlaySceneRenderer` + `SceneViewport` runtime path.

Builder, Preview, and OBS are intended to consume the same scene layout values. There are still runtime modifiers that can change effective visual size in Preview/OBS, especially list runtime canvas expansion and runtime text auto-height.

## 2. Viewport Scale Formula

Runtime viewport scale is calculated in `SceneViewport.tsx`.

```ts
scale = fit === "none"
  ? 1
  : Math.min(
      viewport.width / scene.canvas.width,
      viewport.height / scene.canvas.height
    );
```

Runtime scaled dimensions:

```ts
scaledWidth = scene.canvas.width * scale;
scaledHeight = scene.canvas.height * scale;
offsetX = (viewport.width - scaledWidth) / 2;
offsetY = (viewport.height - scaledHeight) / 2;
```

Runtime transform:

```ts
transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
transformOrigin = "top left";
```

Builder editor scale is calculated in `CanvasEditor.tsx`.

```ts
fitScale = Math.min(
  1,
  Math.max(0.2, (areaWidth - 24) / Math.max(1, canvasWidth))
);

scale = interactionScale ?? fitScale * zoom;
```

During drag/resize interaction:

- `viewportScale` is captured at `pointerdown`.
- `interactionScale` is set to that captured scale.
- The editor `ResizeObserver` skips recalculating `fitScale` while `interactionRef.current` exists.
- This freezes the effective canvas scale during pointer interaction.

The canvas wrapper transform origin in the builder is:

```css
transform-origin: top left;
```

Changing transform origin would break the current pointer math because the delta conversion assumes the visual scene origin and scene coordinate origin both start at the canvas top-left corner.

## 3. Pointer Coordinate Conversion

Pointer conversion is implemented in `CanvasEditor.tsx`.

At `pointerdown`, the editor stores:

```ts
viewportScale = Math.max(scale, 0.001);
startPointer = {
  x: event.clientX,
  y: event.clientY
};
startLayout = {
  x: component.x,
  y: component.y,
  width: component.width,
  height: component.height
};
```

At `pointermove`, screen movement is converted into scene movement:

```ts
screenDeltaX = currentClientX - startClientX;
screenDeltaY = currentClientY - startClientY;

sceneDeltaX = screenDeltaX / viewportScale;
sceneDeltaY = screenDeltaY / viewportScale;
```

Actual code shape:

```ts
rawDelta = {
  x: event.clientX - interaction.startPointer.x,
  y: event.clientY - interaction.startPointer.y
};

sceneDelta = {
  x: rawDelta.x / interaction.viewportScale,
  y: rawDelta.y / interaction.viewportScale
};
```

Pointer capture is used:

```ts
event.currentTarget.setPointerCapture(event.pointerId);
```

Pointer capture is released on interaction end if still active:

```ts
event.currentTarget.releasePointerCapture(event.pointerId);
```

Scroll offset is not added to the drag/resize delta formula because the calculation uses relative `clientX/clientY` movement from the same captured pointer stream. Scroll offset is used separately for canvas panning and for drop coordinate conversion via `getBoundingClientRect()`.

`getBoundingClientRect()` is used for drag-and-drop placement and container hit testing, not for the active resize/move delta formula.

## 4. Resize Formula

Resize is calculated from the initial snapshot layout captured at `pointerdown`. Current resize does not reuse already-mutated layout values as the resize base.

Initial snapshot:

```ts
startX = startLayout.x;
startY = startLayout.y;
startWidth = startLayout.width;
startHeight = startLayout.height;
dx = sceneDelta.x;
dy = sceneDelta.y;
```

### Left Resize

```ts
nextX = startX + dx;
nextY = startY;
nextWidth = startWidth - dx;
nextHeight = startHeight;
```

If `nextWidth < MIN_COMPONENT_SIZE`:

```ts
nextX = startX + startWidth - MIN_COMPONENT_SIZE;
nextWidth = MIN_COMPONENT_SIZE;
```

### Right Resize

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth + dx;
nextHeight = startHeight;
```

If `nextWidth < MIN_COMPONENT_SIZE`:

```ts
nextWidth = MIN_COMPONENT_SIZE;
```

### Top Resize

```ts
nextX = startX;
nextY = startY + dy;
nextWidth = startWidth;
nextHeight = startHeight - dy;
```

If `nextHeight < MIN_COMPONENT_SIZE`:

```ts
nextY = startY + startHeight - MIN_COMPONENT_SIZE;
nextHeight = MIN_COMPONENT_SIZE;
```

### Bottom Resize

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth;
nextHeight = startHeight + dy;
```

If `nextHeight < MIN_COMPONENT_SIZE`:

```ts
nextHeight = MIN_COMPONENT_SIZE;
```

### Top-left Resize

```ts
nextX = startX + dx;
nextY = startY + dy;
nextWidth = startWidth - dx;
nextHeight = startHeight - dy;
```

Minimum size handling preserves the opposite edges:

```ts
if (nextWidth < MIN_COMPONENT_SIZE) {
  nextX = startX + startWidth - MIN_COMPONENT_SIZE;
  nextWidth = MIN_COMPONENT_SIZE;
}

if (nextHeight < MIN_COMPONENT_SIZE) {
  nextY = startY + startHeight - MIN_COMPONENT_SIZE;
  nextHeight = MIN_COMPONENT_SIZE;
}
```

### Top-right Resize

```ts
nextX = startX;
nextY = startY + dy;
nextWidth = startWidth + dx;
nextHeight = startHeight - dy;
```

Minimum height preserves the bottom edge:

```ts
if (nextHeight < MIN_COMPONENT_SIZE) {
  nextY = startY + startHeight - MIN_COMPONENT_SIZE;
  nextHeight = MIN_COMPONENT_SIZE;
}
```

### Bottom-left Resize

```ts
nextX = startX + dx;
nextY = startY;
nextWidth = startWidth - dx;
nextHeight = startHeight + dy;
```

Minimum width preserves the right edge:

```ts
if (nextWidth < MIN_COMPONENT_SIZE) {
  nextX = startX + startWidth - MIN_COMPONENT_SIZE;
  nextWidth = MIN_COMPONENT_SIZE;
}
```

### Bottom-right Resize

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth + dx;
nextHeight = startHeight + dy;
```

### Shift Aspect Ratio

Aspect ratio lock currently applies only to corner handles.

```ts
aspectRatio = startWidth / startHeight;
```

If width delta dominates:

```ts
nextHeight = nextWidth / aspectRatio;
```

If height delta dominates:

```ts
nextWidth = nextHeight * aspectRatio;
```

For west handles, `nextX` is recalculated so the right edge remains stable:

```ts
nextX = startX + startWidth - nextWidth;
```

For north handles, `nextY` is recalculated so the bottom edge remains stable:

```ts
nextY = startY + startHeight - nextHeight;
```

## 5. Stability Rules

Current stabilization rules:

- `MIN_COMPONENT_SIZE` is `12`.
- `width` and `height` are clamped to at least `12`.
- `safeFinite()` prevents `NaN` and `Infinity` from being committed.
- Non-finite `x` and `y` fall back to `0`.
- Non-finite `width` and `height` fall back to `MIN_COMPONENT_SIZE`.
- Final values are rounded before commit.
- The interaction scale is frozen from `pointerdown` until `pointerup` or `pointercancel`.
- Resize calculations are based on `startLayout`, not on already-mutated current layout.
- The selected element id remains stored separately from the scene data.
- Only the active component receives the layout patch during the current custom drag/resize path.

Known caveat: `patchNode()` still updates React state during pointer movement. That is correct enough for coordinate truth, but it can still cause rerenders while dragging/resizing.

## 6. Interaction Pipeline

Current interaction flow:

```txt
pointerdown
-> preventDefault / stopPropagation
-> setPointerCapture
-> capture viewportScale
-> capture startPointer
-> capture startLayout
-> set interactionScale to freeze scale
-> store interactionRef

pointermove
-> read interactionRef
-> calculate raw screen delta
-> convert screen delta to scene delta
-> generate next layout from startLayout
-> sanitize next layout
-> patch selected node layout in scene state
-> render

pointerup / pointercancel
-> write latest layout once more
-> releasePointerCapture
-> clear interactionRef
-> clear interactionScale
```

Involved files:

- `src/features/overlay-builder/components/CanvasEditor.tsx`
  - Owns builder pointer interaction, selection, zoom, pan, drag, and resize math.
- `src/features/overlay-builder/components/OverlayViewport.tsx`
  - Wraps `SceneViewport` for legacy overlay schema runtime rendering.
- `src/components/overlay/SceneViewport.tsx`
  - Calculates runtime viewport fit scale and applies `translate(...) scale(...)` with `transform-origin: top left`.
- `src/components/overlay/OverlaySceneRenderer.tsx`
  - Normalizes scene input, migrates to legacy overlay design, computes runtime canvas size, and dispatches single/list rendering.
- `src/features/overlay-builder/components/OverlayRenderer.tsx`
  - Renders absolute-positioned visual nodes from schema layout.
- `src/features/overlay-builder/utils/runtimeCanvas.ts`
  - Computes runtime canvas expansion for list overlays.
- `src/features/overlay-builder/utils/runtimeLayout.ts`
  - Computes runtime component height and bounds for wrapping text and list canvas sizing.

## 7. Known Remaining Problems

Honest current risks and remaining issues:

- Debug logs are currently active through `DEBUG_RESIZE = true` and can be noisy.
- `startLayout` is stored in the interaction snapshot but is not printed directly in the current debug payload.
- React state still updates during every pointer move. That can produce rerender spikes on complex overlays.
- Resize math is axis-aligned. It does not resize in the local rotated coordinate space of rotated elements.
- Resize handles live inside rotated elements, so visual handle position can feel rotated while math remains scene-axis based.
- Nested child elements are supported visually, but advanced nested transform behavior is limited. Parent rotation/transform is not part of child pointer math.
- Runtime auto-height in `runtimeLayout.ts` can make Preview/OBS visually differ from Builder editor when text wraps or when `enableRuntimeLayout` differs.
- `runtimeCanvas.ts` can expand CHAT list canvas based on item count, gap, and fade-out slot. This can make runtime canvas size differ from edit canvas size.
- Thumbnail rendering uses the same schema values but not the exact same full `OverlaySceneRenderer` + `SceneViewport` path.
- Drop placement and container hit testing use `getBoundingClientRect()` and current `scale`, but they are not part of the frozen active drag/resize interaction path.
- Selection state is separated from scene data, but DOM remounts can still happen if duplicate element ids or unstable tree order exist.
- OBS/Public rendering is shared through runtime renderer paths, but visual parity can still be affected by runtime canvas expansion and runtime text layout.

## 8. Next Step Recommendation

Do only one next engineering task:

Extract the drag/resize coordinate math from `CanvasEditor.tsx` into a pure utility module and add focused unit tests for all handles at multiple viewport scales.

The tests should cover:

- left, right, top, bottom, and all four corner handles
- `viewportScale` values such as `0.5`, `1`, and `2`
- minimum width/height clamping
- non-finite value sanitization
- shift aspect-ratio behavior on corner handles

No feature, theme, template, TikTok, or automation work should continue until these coordinate tests pass.
