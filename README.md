# TikTok Live Automation Platform

Staging MVP for TikTok LIVE automation, realtime event storage, JSON overlays, and OBS browser sources.

## Current Architecture

- Email/password auth with database-backed sessions.
- Multi-workspace dashboard.
- TikTok LIVE connector service with Socket.IO realtime rooms.
- Rules and Automation Builder for conditional actions.
- Unified JSON Overlay Runtime for chat, gift, leaderboard, dock, and custom overlays.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:migrate
pnpm dev:ws
```

Edit `DATABASE_URL` in `.env` before running migrations.

Use `pnpm dev:ws` instead of `pnpm dev` when testing realtime overlay events locally. It starts Next.js and Socket.IO in the same Node process.

## Overlay Runtime

Overlays are now standalone JSON resources. There is no active/inactive global selector. Every overlay has its own OBS URL:

```txt
/overlay/chat/[overlayId]
/overlay/gift/[overlayId]
/overlay/leaderboard/[overlayId]
/overlay/dock/[overlayId]
/overlay/custom/[overlayId]
```

The `Overlay` table is the single source of truth:

```txt
kind: CHAT | GIFT | LEADERBOARD | DOCK | CUSTOM
draftSchema: JSON currently edited in builder
publishedSchema: JSON used by OBS/live
publishedAt: null means draft has not been published yet
```

The runtime renderer reads `publishedSchema ?? draftSchema`. Builder edits only `draftSchema`; clicking `Publish` copies draft into `publishedSchema`, keeping the OBS URL stable for that overlay id.

## Overlay Schema

All overlay kinds use one JSON schema shape:

```json
{
  "version": 2,
  "kind": "CHAT",
  "name": "Default Chat Overlay",
  "canvas": {
    "width": 720,
    "height": 140,
    "background": { "type": "transparent", "color": "transparent", "opacity": 0 },
    "radius": 0,
    "stroke": { "enabled": false, "color": "#ffffff", "width": 0 },
    "shadow": { "enabled": false, "color": "#000000", "blur": 0, "x": 0, "y": 0 }
  },
  "dataSource": { "type": "chat", "filters": {} },
  "layout": {
    "mode": "list",
    "maxItems": 5,
    "gap": 12,
    "direction": "vertical",
    "reverse": true,
    "align": "start",
    "enterAnimation": "slide-up",
    "exitAnimation": "fade"
  },
  "components": []
}
```

Layout modes:

- `single`: one event/card, for gift alert and custom scenes.
- `list`: repeated item template, for chat, gift history, and leaderboard rows.
- `ticker`: running text style overlays.
- `dock`: dock/chat management surfaces.
- `grid`: future grid/table layouts.

## Dashboard Routes

```txt
/dashboard
/dashboard/workspaces
/dashboard/workspaces/[workspaceId]
/dashboard/workspaces/[workspaceId]/connection
/dashboard/workspaces/[workspaceId]/rules
/dashboard/workspaces/[workspaceId]/automation-builder
/dashboard/workspaces/[workspaceId]/overlay-design-builder
/dashboard/workspaces/[workspaceId]/overlays
/dashboard/workspaces/[workspaceId]/events
```

## OBS Routes

Use the URL shown in `/dashboard/workspaces/[workspaceId]/overlays`.

Legacy widget URLs remain as adapters and redirect to the newest matching JSON overlay where possible:

```txt
/widgets/chat/[theme]/[overlayKey]
/widgets/gift/[theme]/[overlayKey]
/widgets/leaderboard/[metric]/[overlayKey]
```

New work should use:

```txt
/overlay/[kind]/[overlayId]
```

Set `NEXT_PUBLIC_WIDGET_BASE_URL` when deploying a dedicated widget domain:

```txt
NEXT_PUBLIC_WIDGET_BASE_URL="https://widgets.yourdomain.com"
```

## Builder Flow

1. Open `/dashboard/workspaces/[workspaceId]/overlay-design-builder`.
2. Pick `kind`: `CHAT`, `GIFT`, `LEADERBOARD`, `DOCK`, or `CUSTOM`.
3. Edit canvas, layout, components, bindings, and styles.
4. Preview with dummy/live event data.
5. Click `Save Draft` to persist `draftSchema`.
6. Click `Publish` to update the OBS/live `publishedSchema`.
7. Copy the unique `/overlay/[kind]/[overlayId]` URL from `/overlays`.

## Database Reset

This staging branch intentionally performs a destructive overlay migration. Existing legacy overlay rows and `OverlayDesign` data are removed by migration `20260504090000_rebuild_overlay_runtime`.

To reset locally:

```bash
pnpm prisma migrate reset
pnpm db:seed
```

## Docs

- [Automation Builder dan Rules](docs/automation-builder.md)

## Notes

TikTok does not provide an official LIVE event API. The connector is isolated in `src/lib/tiktok/connection-manager.ts` so it can be replaced or patched without rewriting dashboard, storage, rules, or overlays.
