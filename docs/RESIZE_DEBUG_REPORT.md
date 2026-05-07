# Resize Debug Report

## Root cause

Editor interaction sebelumnya mencampur beberapa jalur transform:

- Canvas sudah di-scale dengan CSS `transform: scale(...)`.
- Interaction layer masih membaca pointer delta dari screen coordinate.
- Resize/drag pernah melewati Moveable/live transform dan state mutation sekaligus.
- Scale bisa ikut berubah saat area editor resize/re-render, sehingga delta pointer berikutnya dihitung dengan basis yang berbeda.

Akibatnya resize terasa lompat, drag tidak konsisten, dan nilai layout bisa bergerak terlalu jauh ketika canvas sedang di-zoom/fit.

## Old incorrect behavior

Masalah utamanya adalah raw pointer movement dari browser dipakai terlalu dekat dengan nilai layout JSON.

Contoh yang salah:

```ts
nextX = startX + screenDeltaX
nextWidth = startWidth + screenDeltaX
```

Padahal canvas editor sedang di-scale. Jika canvas tampil pada 50%, `screenDeltaX = 20px` sebenarnya berarti `sceneDeltaX = 40px`.

## Corrected coordinate formula

Semua pointer movement sekarang dikonversi dari screen coordinate ke scene coordinate:

```ts
sceneDeltaX = screenDeltaX / viewportScale
sceneDeltaY = screenDeltaY / viewportScale
```

`viewportScale` diambil saat `pointerdown` dan dibekukan sampai `pointerup`, supaya interaction tidak berubah basis di tengah drag/resize.

## Resize rules

Resize sekarang memakai satu jalur direct layout update:

- Right edge: `width = startWidth + sceneDeltaX`
- Bottom edge: `height = startHeight + sceneDeltaY`
- Left edge: `x = startX + sceneDeltaX`, `width = startWidth - sceneDeltaX`
- Top edge: `y = startY + sceneDeltaY`, `height = startHeight - sceneDeltaY`
- Corner handles menggabungkan sumbu horizontal dan vertical.
- `width` dan `height` dikunci minimal `12px`.
- `NaN`, `Infinity`, dan nilai non-number difallback ke nilai aman.
- `Shift` pada corner resize menjaga aspect ratio.

## Files changed / audited

- Changed: `src/features/overlay-builder/components/CanvasEditor.tsx`
- Added: `docs/RESIZE_DEBUG_REPORT.md`
- Audited without visual/runtime changes: `src/features/overlay-builder/components/OverlayViewport.tsx`
- Audited without visual/runtime changes: `src/features/overlay-builder/components/OverlayRenderer.tsx`
- Audited without visual/runtime changes: `src/features/overlay-builder/utils/runtimeCanvas.ts`
- Audited without visual/runtime changes: `src/features/overlay-builder/utils/runtimeLayout.ts`

## Debug logs

Selama interaction, console akan mencetak:

- `viewportScale`
- `startPointer`
- `currentPointer`
- `rawDelta`
- `sceneDelta`
- `nextLayout`

Log prefix:

```txt
[overlay-resize:start]
[overlay-resize:move]
[overlay-resize:end]
```

## Builder/Preview/OBS rendering impact

Renderer visual tidak diubah. Perubahan hanya di interaction editor.

Builder tetap memakai renderer scene/shared yang sama, sementara OBS/Public Preview tidak membawa resize handle atau editor interaction.

## Remaining risks

- Debug log masih aktif sementara dan sebaiknya dimatikan setelah koordinat terasa stabil.
- Multi-select transform advanced tidak menjadi fokus perubahan ini.
- Rotate advanced tidak disentuh dalam patch ini karena target utama adalah drag/resize stabil.
