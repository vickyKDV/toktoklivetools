# Desktop Runtime

This folder contains the first safe desktop adapter boundary for future Tauri work.

Expected responsibilities:

- `runtime-mode.ts`: cloud vs desktop-local mode detection.
- `local-config.ts`: app-owned local config stored in `storage/desktop/config.json`.
- `sqlite-adapter.ts`: derives the future local SQLite `file:` URL without changing Prisma yet.
- `obs-websocket-adapter.ts`: typed OBS adapter boundary. It is intentionally inactive until `obs-websocket-js` is added.

No desktop implementation is active yet. These files only define stable seams for Tauri commands/sidecars without touching the current web runtime.
