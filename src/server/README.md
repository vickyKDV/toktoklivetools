# Server Boundary

Server-only code belongs here.

Use this folder for:

- Prisma/database access
- auth/session logic
- workspace access services
- overlay record services and workspace ownership guards
- Socket.IO server bind/emit
- TikTok connector lifecycle
- automation execution that writes logs or emits runtime events

New UI/client components should not import from this folder.

## Local Runtime

`server.ts` is the combined runtime for development and production: it boots
Next.js and attaches Socket.IO to the same HTTP server/port. Use one process:

- `pnpm dev` for dashboard + API + overlays + realtime in development.
- `pnpm start` for the same combined runtime after `pnpm build`.

`pnpm dev:next` and `pnpm start:next` are Next-only fallbacks for UI work that
does not need Socket.IO/TikTok realtime. Do not run the combined server and
Next-only server on the same port at the same time.

Current service entrypoints:

- `auth/session.ts`: session cookie, password hashing, current user lookup.
- `workspaces/service.ts`: user-to-workspace ownership checks.
- `overlays/service.ts`: overlay list/edit/save/publish/delete plus public published lookup.
- `realtime/socket-server.ts`: Socket.IO attach/emit helpers.
- `tiktok/connection-manager.ts`: TikTok connector lifecycle.
- `automation/engine.ts`: runtime automation execution wrapper.
