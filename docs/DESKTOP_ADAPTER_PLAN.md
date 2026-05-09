# Desktop Adapter Plan

This document defines the current desktop preparation layer for future Tauri work.

## Target Desktop Stack

- Shell: Tauri
- UI: Next.js / React / shadcn
- Local runtime: Node sidecar first, Rust commands later where useful
- OBS integration: `obs-websocket-js`
- Local database: SQLite
- Cloud server: auth, license, sync, backup, marketplace/update metadata

## Runtime Mode

`src/runtime/desktop/runtime-mode.ts` defines:

```ts
type LiploRuntimeMode = "cloud" | "desktop-local";
```

Current default is `cloud`.

Future desktop builds can set:

```txt
LIPLO_RUNTIME_MODE="desktop-local"
```

## Local Config

`src/runtime/desktop/local-config.ts` stores app-owned config at:

```txt
storage/desktop/config.json
```

Default values:

- web port: `7050`
- realtime port: `7051`
- OBS websocket URL: `ws://127.0.0.1:4455`
- asset storage: `storage/uploads/overlay-assets`
- SQLite file: `storage/liplo.sqlite`

## SQLite Adapter

`src/runtime/desktop/sqlite-adapter.ts` only derives the future SQLite database URL:

```txt
file:/absolute/path/to/storage/liplo.sqlite
```

It does not change Prisma schema yet. A real SQLite migration should be done deliberately because the current production DB is MySQL.

## OBS Adapter

`src/runtime/desktop/obs-websocket-adapter.ts` defines a typed boundary:

- connect/disconnect
- set browser source URL
- set scene item transform

It intentionally throws for now because `obs-websocket-js` is not installed yet. This keeps the current web runtime stable while giving Tauri a clean integration point.

## Next Steps

1. Add Tauri app shell.
2. Add Node sidecar launcher for `pnpm start:web` + `pnpm start:realtime` equivalent.
3. Install and wire `obs-websocket-js`.
4. Add local SQLite Prisma schema/migration strategy.
5. Add cloud sync/license boundary.
