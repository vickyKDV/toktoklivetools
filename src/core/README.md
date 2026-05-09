# Core Boundary

Portable business logic belongs here.

Core modules should avoid:

- Prisma/database access
- Next.js request/response APIs
- Socket.IO server state
- browser-only globals unless the module is explicitly a client renderer

These modules are intended to move into packages when the project is split into web, server, realtime, and Tauri desktop apps.

Overlay core ownership:

- `schema.ts`: shared JSON schema/types/default dummy data.
- `runtimeCanvas.ts` and `runtimeLayout.ts`: OBS/preview sizing and runtime text layout.
- `resolveBindings.ts`: runtime placeholder binding.
- `componentTree.ts`: tree helpers for nested overlay components.
- `normalizeDesignSchema.ts`: schema normalization/migration from old designs.
- `interactionMath.ts`: editor coordinate math that stays independent of React/DOM.

Builder feature paths may re-export these modules for compatibility, but portable core modules must not import from `features/overlay-builder`. The React renderer adapter is intentionally left as a later split because the current Builder/Preview/OBS render path is stable.
