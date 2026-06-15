# Desktop Runtime

This folder contains the first safe desktop adapter boundary for Tauri work.

Expected responsibilities:

- `runtime-mode.ts`: web/desktop, cloud/local-sqlite, and runtime mode detection.
- `local-config.ts`: app-owned local config stored in `storage/desktop/config.json`.
- `desktop-env.ts`: derives local sidecar environment values from app-owned config.
- `sqlite-adapter.ts`: derives the future local SQLite `file:` URL without changing Prisma yet.
- `obs-websocket-adapter.ts`: OBS websocket connector for Browser Source URL and scene item transform updates.
- `sidecar-manager.ts`: Node sidecar process boundary for development fallback.
- `tauri-bridge.ts`: no-dependency client bridge for Tauri `invoke` commands.

These files define the desktop cloud-backed boundary without touching the current web runtime, overlay renderer, TikTok connector, or production database schema.

The native Tauri shell lives in `src-tauri/`. Runtime notes are documented in `docs/DESKTOP_TAURI_RUNTIME.md`.

## Current Limits

- SQLite is config/path-only. The production Prisma schema remains MySQL until a deliberate local schema/migration pass.
- Packaged Tauri commands prefer a bundled `liplo-runtime` sidecar and only fall back to pnpm during development.
- Tauri commands are registered in `src-tauri/src/lib.rs` for local config, sidecar lifecycle, and runtime health checks.
- Next.js public env values can be baked at build time. A packaged desktop build uses `pnpm build:desktop` to bake local desktop defaults.
- Do not package production database credentials. Desktop cloud-backed mode must use cloud API boundaries rather than direct MySQL access.
