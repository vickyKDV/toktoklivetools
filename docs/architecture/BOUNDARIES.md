# Web/Desktop Architecture Boundaries

This document defines the current separation plan for the Next.js web app and the future Tauri desktop app.

## Stage 1: Logical Separation

The app still runs as one Next.js project, but imports now have clear ownership:

- `src/app` and `src/components`: UI, routes, and React components.
- `src/core`: portable business logic that can be reused by web, desktop, OBS runtime, and tests.
- `src/server`: server-only runtime code such as Prisma, auth, workspace access, Socket.IO, TikTok connection, and automation execution.
- `src/lib`: compatibility layer for old imports. New server code should prefer `src/server/*`; new portable code should prefer `src/core/*`.

Rules:

- UI components must not import Prisma directly.
- Overlay renderer/schema utilities should live behind `src/core/overlay`.
- Overlay database access and workspace ownership checks should go through `src/server/overlays/service`.
- Automation parsing/sanitizing should live behind `src/core/automation`.
- Socket.IO server emit/bind logic should live behind `src/server/realtime`.
- TikTok connector logic stays server-only.

## Stage 2: Shared Core

Portable modules now have stable import paths:

- `@/core/overlay/schema`
- `@/core/overlay/renderer`
- `@/core/overlay/runtimeCanvas`
- `@/core/overlay/runtimeLayout`
- `@/core/overlay/interactionMath`
- `@/core/automation/flow`
- `@/core/rules/engine`

Overlay schema, runtime layout/canvas sizing, binding resolver, component tree helpers,
normalization, and interaction math are now owned by `src/core/overlay`. Old
`src/features/overlay-builder/schema/*` and `src/features/overlay-builder/utils/*`
imports are compatibility wrappers only; new code should import from `@/core/overlay/*`.
The React renderer remains feature-owned for now to avoid changing the stable
Builder/Preview/OBS rendering path.

These modules are the candidates for future package extraction into:

- `packages/overlay-core`
- `packages/automation-core`
- `packages/rules-core`

The current implementation uses re-export boundaries where needed to avoid a risky large move.

## Overlay Service Boundary

Overlay records are workspace-owned. Builder save/edit/delete/list flows should not query
`prisma.overlay` directly from UI routes or feature actions. Use these server service methods instead:

- `listWorkspaceOverlaysForUser(userId, workspaceId)` for dashboard lists that need ownership checks.
- `getOverlayDesignForUser({ userId, workspaceId, overlayId })` for builder edit pages.
- `saveOverlayDesign(...)` and `publishOverlayDesign(...)` for draft/publish writes.
- `updateOverlayForUser(...)` and `deleteOverlayForUser(...)` for API routes.
- `getPublishedOverlayById(overlayId)` for public OBS/runtime reads.

This keeps the browser source URL stable while preventing one workspace from editing another
workspace's overlay. Public preview/OBS can still read by overlay id where intentionally public.

## Stage 3: Physical Split Target

The target production/desktop shape is:

```txt
apps/
  web-dashboard/
  api-server/
  realtime-server/
  desktop/
packages/
  overlay-core/
  automation-core/
  rules-core/
  db/
```

Do not split runtime services physically until the stable boundaries above have been used consistently.

Recommended order:

1. Migrate new imports to `src/core` and `src/server`.
2. Remove direct Prisma imports from route components where a service method is clearer.
3. Extract `src/core/*` to `packages/*`.
4. Extract Socket.IO/TikTok runtime to `apps/realtime-server`.
5. Add Tauri shell and local SQLite adapter.

## Desktop Direction

For Tauri, desktop should run a local runtime and keep OBS local:

- UI: Next.js/React/shadcn inside Tauri.
- Local runtime: Node sidecar or Rust command layer.
- OBS integration: local `obs-websocket-js`.
- Local database: SQLite.
- Cloud server: auth, license, sync, backup, marketplace/update metadata.

OBS Browser Source should use local URLs such as:

```txt
http://127.0.0.1:{port}/overlay/chat/{overlayId}
```

The cloud should not be required for live overlay playback once desktop is running.
