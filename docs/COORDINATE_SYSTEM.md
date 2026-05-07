# Overlay Coordinate System

Overlay editor memakai coordinate system tetap berbasis canvas/scene. DOM pixels hanya dipakai sebagai input pointer dan output visual.

## Single Source of Coordinate Truth

Scene/canvas coordinates adalah sumber kebenaran.

- `x`, `y`, `width`, dan `height` disimpan dalam scene/canvas coordinates.
- DOM/screen pixels hanya dipakai untuk membaca posisi pointer dan menampilkan hasil.
- Viewport scale hanya memengaruhi display, bukan nilai layout JSON.
- Drag/resize harus menyimpan nilai final `x`, `y`, `width`, `height` dalam scene coordinates.
- Builder, Preview, dan OBS harus render dari nilai scene layout yang sama.

## Viewport Scale Formula

Canvas editor dapat tampil lebih kecil/besar dari ukuran canvas asli. Scale tampilan dihitung dari viewport editor terhadap canvas.

Formula umum:

```ts
viewportScale = Math.min(
  viewportWidth / canvasWidth,
  viewportHeight / canvasHeight
);
```

Di builder saat ini, scale efektif berasal dari:

```ts
viewportScale = fitScale * zoom;
```

`fitScale` dihitung dari lebar area editor terhadap `canvas.width`, lalu dikombinasikan dengan zoom user.

Saat pointer interaction dimulai (`pointerdown`), nilai `viewportScale` dibekukan dalam interaction snapshot. Selama drag/resize berjalan, scale tidak boleh dihitung ulang. Ini mencegah resize/drag lompat akibat viewport resize loop atau re-render saat pointer masih bergerak.

## Transform Origin

Canvas wrapper memakai:

```css
transform-origin: top left;
```

Dengan origin `top left`, scene coordinate `(0, 0)` tetap berada di pojok kiri atas canvas visual. Pointer math menjadi linear:

```ts
sceneX = screenX / viewportScale;
sceneY = screenY / viewportScale;
```

Jika transform origin diganti, misalnya ke `center`, titik referensi visual bergeser. Akibatnya screen delta tidak lagi langsung sebanding dengan scene delta, dan drag/resize bisa terlihat bergeser atau lompat.

## Pointer Coordinate Conversion

Pointer event memberi koordinat dalam screen/client pixels. Karena canvas sedang di-scale, raw pointer delta wajib dikonversi ke scene delta.

Formula:

```ts
screenDeltaX = currentClientX - startClientX;
screenDeltaY = currentClientY - startClientY;

sceneDeltaX = screenDeltaX / viewportScale;
sceneDeltaY = screenDeltaY / viewportScale;
```

Semua layout update memakai `sceneDeltaX` dan `sceneDeltaY`, bukan raw screen delta.

## Resize Formula

Semua resize dihitung dari initial snapshot layout saat `pointerdown`.

Snapshot:

```ts
startX = startLayout.x;
startY = startLayout.y;
startWidth = startLayout.width;
startHeight = startLayout.height;
```

### Right

Right edge mengubah lebar saja.

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth + sceneDeltaX;
nextHeight = startHeight;
```

### Left

Left edge mengubah `x` dan `width`.

```ts
nextX = startX + sceneDeltaX;
nextY = startY;
nextWidth = startWidth - sceneDeltaX;
nextHeight = startHeight;
```

Saat width mencapai minimum, `x` dikunci agar right edge tetap stabil:

```ts
nextX = startX + startWidth - MIN_WIDTH;
nextWidth = MIN_WIDTH;
```

### Bottom

Bottom edge mengubah tinggi saja.

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth;
nextHeight = startHeight + sceneDeltaY;
```

### Top

Top edge mengubah `y` dan `height`.

```ts
nextX = startX;
nextY = startY + sceneDeltaY;
nextWidth = startWidth;
nextHeight = startHeight - sceneDeltaY;
```

Saat height mencapai minimum, `y` dikunci agar bottom edge tetap stabil:

```ts
nextY = startY + startHeight - MIN_HEIGHT;
nextHeight = MIN_HEIGHT;
```

### Top-left

Top-left menggabungkan formula left dan top.

```ts
nextX = startX + sceneDeltaX;
nextY = startY + sceneDeltaY;
nextWidth = startWidth - sceneDeltaX;
nextHeight = startHeight - sceneDeltaY;
```

### Top-right

Top-right menggabungkan formula right dan top.

```ts
nextX = startX;
nextY = startY + sceneDeltaY;
nextWidth = startWidth + sceneDeltaX;
nextHeight = startHeight - sceneDeltaY;
```

### Bottom-left

Bottom-left menggabungkan formula left dan bottom.

```ts
nextX = startX + sceneDeltaX;
nextY = startY;
nextWidth = startWidth - sceneDeltaX;
nextHeight = startHeight + sceneDeltaY;
```

### Bottom-right

Bottom-right menggabungkan formula right dan bottom.

```ts
nextX = startX;
nextY = startY;
nextWidth = startWidth + sceneDeltaX;
nextHeight = startHeight + sceneDeltaY;
```

## Validation Rules

Resize and drag must always sanitize layout values before writing them back to scene state.

- `width` minimum: `12px`
- `height` minimum: `12px`
- `width` and `height` must never become negative.
- `x`, `y`, `width`, `height` must never be `NaN`.
- `x`, `y`, `width`, `height` must never be `Infinity`.
- Non-finite values fallback to safe defaults.
- When resizing from left, `x` moves with the left edge and `width` changes inversely.
- When resizing from top, `y` moves with the top edge and `height` changes inversely.
- When minimum size is reached from left/top, the opposite edge should remain stable.

## Debug Values

Temporary debug logs are emitted from `CanvasEditor.tsx` with these prefixes:

```txt
[overlay-resize:start]
[overlay-resize:move]
[overlay-resize:end]
```

Each log contains:

- `viewportScale`
- `startPointer`
- `currentPointer`
- `rawDelta`
- `sceneDelta`
- `nextLayout`

`startLayout` is the stored layout snapshot captured at `pointerdown`. It is the base for all drag/resize calculations until `pointerup`.

## Builder, Preview, and OBS

Builder interaction may read pointer coordinates from DOM, but the committed result must always be scene layout values.

Preview and OBS must not infer layout from editor screen pixels. They should render the same scene values that Builder saved.
