# Production Runtime Audit

Liplo now supports two deployment shapes.

## 1. Combined Runtime

This is the default and remains the safest local mode:

```bash
pnpm dev
pnpm start
```

`server.ts` boots Next.js and attaches Socket.IO to the same HTTP server.

Use this when:

- running local development
- debugging overlay runtime quickly
- deploying a small single-process VPS setup

Do not run another realtime process on the same port.

## 2. Split Web + Realtime Runtime

This is the cloud/desktop-ready shape:

```bash
pnpm start:web
pnpm start:realtime
```

Processes:

- `start:web`: Next.js UI/API/overlay routes on port `7050`.
- `start:realtime`: Socket.IO + TikTok connection runtime on `REALTIME_PORT`, default `7051`.

Required env for the web process:

```txt
NEXT_PUBLIC_WIDGET_BASE_URL="https://toktok.example.com"
NEXT_PUBLIC_SOCKET_URL="https://toktok.example.com"
REALTIME_CONTROL_URL="http://127.0.0.1:7051"
REALTIME_CONTROL_TOKEN="change-me"
```

Required env for the realtime process:

```txt
REALTIME_PORT="7051"
REALTIME_CONTROL_TOKEN="change-me"
DATABASE_URL="mysql://user:password@localhost:3306/database_name"
```

`REALTIME_CONTROL_TOKEN` is optional in development, but should be set in production.

## Caddy Split Proxy

Single public domain, split by path:

```caddyfile
toktok.example.com {
  handle /socket.io/* {
    reverse_proxy 127.0.0.1:7051
  }

  handle {
    reverse_proxy 127.0.0.1:7050
  }
}
```

Browser clients keep using:

```txt
NEXT_PUBLIC_SOCKET_URL="https://toktok.example.com"
```

Socket.IO will hit `/socket.io`, which Caddy sends to the realtime process.

## PM2 Split Example

```bash
pm2 start "pnpm start:web" --name liplo-web
pm2 start "pnpm start:realtime" --name liplo-realtime
pm2 save
```

Restart:

```bash
pm2 restart liplo-web
pm2 restart liplo-realtime
```

## Current Status

Implemented:

- Combined server remains available through `server.ts`.
- Realtime-only entrypoint exists in `realtime-server.ts`.
- Web process can proxy TikTok start/stop to realtime via `REALTIME_CONTROL_URL`.
- Socket.IO route can be proxied by Caddy to realtime.

Not implemented yet:

- Separate API server package.
- Redis/socket adapter for multi-instance Socket.IO.
- Horizontal scaling.

## Risks

- If `NEXT_PUBLIC_SOCKET_URL` points to the web process but Caddy does not route `/socket.io` to realtime, overlays will not receive events.
- If `REALTIME_CONTROL_URL` is missing in split mode, web API starts TikTok connector inside the web process instead of realtime.
- If both combined and split realtime run against the same workspace, duplicate events can occur.

## Recommendation

Use combined mode locally. Use split mode in production only when you are ready to operate two PM2 processes.
