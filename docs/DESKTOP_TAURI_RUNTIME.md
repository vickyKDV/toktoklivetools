# Liplo Desktop Runtime

Liplo Desktop targets Windows and macOS while keeping the existing web overlay renderer stable.

This is **desktop cloud-backed mode**:

- local Tauri shell
- local web/realtime/TikTok runtime process
- cloud/API-backed data boundary
- no packaged production MySQL credentials
- no full offline SQLite yet

`desktop-local` in older notes meant "local runtime process". It did not mean full offline database. The current naming direction is:

```ts
type LiploAppMode = "web" | "desktop";
type LiploDataMode = "cloud" | "local-sqlite";
type LiploRuntimeMode = "cloud-web" | "desktop-cloud" | "desktop-local";
```

## Supported Targets

- Windows x64: `x86_64-pc-windows-msvc`
- macOS Apple Silicon: `aarch64-apple-darwin`
- macOS Intel: `x86_64-apple-darwin`

macOS builds must run on a Mac or macOS CI runner. Intel builds from Apple Silicon require:

```bash
rustup target add x86_64-apple-darwin
```

## Build Scripts

```bash
pnpm desktop:prepare
pnpm desktop:verify-release-sidecars
pnpm desktop:dev
pnpm build:desktop
pnpm desktop:build
pnpm desktop:build:windows
pnpm desktop:build:mac
pnpm desktop:build:mac:arm64
pnpm desktop:build:mac:x64
```

`pnpm build:desktop` builds the packaged desktop runtime bundle:

- Next.js standalone server under `src-tauri/resources/liplo-runtime/web`
- `.next/static` and `public` assets
- realtime/TikTok runtime entrypoint under `src-tauri/resources/liplo-runtime/realtime`
- a bundled Node runtime under `src-tauri/resources/liplo-runtime/node`

`pnpm desktop:build*` runs `pnpm build:desktop` before Tauri packaging. A packaged `.app` or installer without this generated resource bundle can open but will stay on the waiting screen because no local runtime is available.

The build uses desktop-local public defaults:

```txt
NEXT_PUBLIC_WIDGET_BASE_URL=http://127.0.0.1:7050
NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:7051
```

This matters because `NEXT_PUBLIC_*` values are baked into the client bundle at build time. Runtime env changes alone do not rewrite built client JavaScript.

The macOS scripts build `.app` bundles for internal validation. DMG packaging, signing, notarization, stapling, and final updater publishing belong in release CI.

## Local URLs

Desktop mode uses config-derived local URLs. Defaults:

```txt
App/runtime: http://127.0.0.1:7050
Overlay OBS URL: http://127.0.0.1:7050/overlay/{kind}/{overlayId}
Dock URL: http://127.0.0.1:7050/widgets/dock/chat/{overlayKey}
Realtime: http://127.0.0.1:7051
Realtime health: http://127.0.0.1:7051/health
OBS websocket: ws://127.0.0.1:4455
```

OBS Browser Source should use the local overlay URL, not the hosted dashboard URL.

## Distribution Model

Liplo Desktop is distributed by direct download.

Non-goals for now:

- Apple App Store
- Microsoft Store

Manual distribution targets:

- macOS internal validation: `.app`
- macOS public direct download: signed/notarized `.dmg` or zipped `.app`
- Windows public direct download: signed `.msi` or `.exe` installer

Unsigned/ad-hoc builds are internal testing only. Auto-update can be self-hosted later through Tauri updater metadata.

## Sidecar Packaging

Tauri config must point to the logical sidecar name:

```json
"externalBin": ["binaries/liplo-runtime"]
```

The `liplo-runtime` sidecar is a real supervisor binary. It supports:

```bash
liplo-runtime self-check
liplo-runtime version
liplo-runtime serve
liplo-runtime serve --config <path> --data-dir <path> --log-dir <path>
```

`self-check` must report `placeholder:false`, `requiresPnpm:false`, `requiresProjectSource:false`, and `requiresUserNode:false`.

Release CI must provide target-triple suffixed source binaries before `tauri build` runs:

```txt
src-tauri/binaries/liplo-runtime-aarch64-apple-darwin
src-tauri/binaries/liplo-runtime-x86_64-apple-darwin
src-tauri/binaries/liplo-runtime-x86_64-pc-windows-msvc.exe
```

Do not document release sidecars as unsuffixed `src-tauri/binaries/liplo-runtime` or `src-tauri/binaries/liplo-runtime.exe`. Those are logical names, not the final target-triple source filenames Tauri expects.

`pnpm desktop:prepare` creates missing target-triple placeholders and builds a real host-platform `liplo-runtime` sidecar for local validation. For example, on Apple Silicon it builds `src-tauri/binaries/liplo-runtime-aarch64-apple-darwin`.

Any remaining placeholder for a non-host target must be replaced before packaging that target. `pnpm desktop:verify-release-sidecars` checks the current host target by default. Use `pnpm desktop:verify-release-sidecars -- --target=<target-triple>` for one release target or `pnpm desktop:verify-release-sidecars -- --all` in full release CI.

The runtime sidecar source lives in `src-tauri/runtime-sidecar`. It is intentionally separate from the main Tauri app binary so Tauri does not accidentally package the sidecar CLI as the app executable.

Rust invokes the sidecar by logical name:

```rust
app.shell().sidecar("liplo-runtime")
```

Tauri resolves the bundled platform sidecar. Rust must not manually resolve the target-triple filename.

## Runtime Lifecycle

On app launch:

1. Read or create `storage/desktop/config.json`.
2. Start `liplo-runtime` if it is not already running.
3. Wait for web health.
4. Open or redirect the desktop shell to `http://127.0.0.1:7050`.

On app close:

- Stop only sidecar child processes spawned by this Tauri app.
- Do not kill unrelated processes.

Port handling:

- If the port is already used by a reachable Liplo runtime, reuse it.
- If the port is used by another process, show a readable error.
- If a future fallback port is selected, update config and local URLs consistently.
- Do not silently fail.
- Do not kill unrelated processes on the same port.

Logs:

- Sidecar stdout/stderr are captured under `storage/desktop/logs/`.
- Runtime status includes service, pid, port, startedAt, reachable, lastError, and logPath when available.

## Desktop Config

Config lives at:

```txt
storage/desktop/config.json
```

Default shape:

```json
{
  "web": {
    "host": "127.0.0.1",
    "port": 7050,
    "baseUrl": "http://127.0.0.1:7050"
  },
  "realtime": {
    "host": "127.0.0.1",
    "port": 7051,
    "socketUrl": "http://127.0.0.1:7051",
    "path": "/socket.io",
    "autoConnect": true
  },
  "obs": {
    "websocketUrl": "ws://127.0.0.1:4455",
    "password": "",
    "autoConnect": false,
    "defaultSceneName": "",
    "defaultBrowserSourceName": "Liplo Overlay"
  },
  "overlay": {
    "baseUrl": "http://127.0.0.1:7050",
    "autoUpdateObsBrowserSource": true
  },
  "hotkeys": [
    {
      "id": "toggle-overlay",
      "label": "Toggle Overlay",
      "accelerator": "CommandOrControl+Shift+O",
      "enabled": true,
      "action": {
        "type": "desktop-command",
        "command": "toggle_overlay"
      }
    }
  ],
  "cloud": {
    "baseUrl": ""
  },
  "sqlite": {
    "path": "storage/desktop/liplo.sqlite"
  }
}
```

Validation rules:

- Ports must be valid `1..65535`.
- Web/overlay/realtime URLs must be valid `http://` or `https://` URLs.
- OBS websocket URL must use `ws://` or `wss://`.
- OBS password must not be logged.
- Invalid config falls back to safe defaults or returns a readable error.
- `sqlite.path` is reserved for the future full offline mode and is not active in desktop-cloud mode.

## Health Checks

Tauri commands:

- `check_web_health`
- `check_realtime_health`
- `check_desktop_health`
- `get_sidecar_status`

Health response shape:

```json
{
  "reachable": true,
  "url": "http://127.0.0.1:7051/health",
  "latencyMs": 10,
  "error": null,
  "timestamp": "..."
}
```

Checks use config values, not only hardcoded ports.

## OBS Websocket Boundary

Desktop JS adapters own OBS websocket behavior:

- `src/runtime/desktop/obs-websocket-adapter.ts` for Node/runtime contexts.
- `src/runtime/desktop/obs-websocket-client.ts` for desktop UI/browser contexts.

They support:

- connect
- disconnect
- test connection
- get OBS status/version
- update Browser Source URL
- set scene item transform

Tauri bridge command names are reserved and exposed:

- `connect_obs_websocket`
- `disconnect_obs_websocket`
- `test_obs_websocket_connection`
- `get_obs_status`
- `set_obs_browser_source_url`
- `set_obs_scene_item_transform`

For now, OBS password may live in `storage/desktop/config.json`, but it must not be logged. Future hardening should move the password to OS keychain/secure storage.

## Desktop Settings UI

Workspace Settings includes a desktop-only runtime panel. In a normal browser it shows inactive helper text; inside Tauri it can:

- read/write `storage/desktop/config.json`
- start, stop, and restart sidecars
- display web/realtime/sidecar health
- test OBS websocket
- send the local overlay URL to the configured OBS Browser Source
- edit persisted hotkey accelerators

This panel does not move overlay rendering into Rust and does not direct-connect to production MySQL.

## TikTok Connector

Do not rewrite the TikTok connector. Do not move it to Rust.

`liplo-runtime` remains the Node/runtime sidecar responsible for:

- local web/API runtime
- realtime Socket.IO runtime
- TikTok live connector runtime

Desktop env must include:

```txt
LIPLO_APP_MODE=desktop
LIPLO_DATA_MODE=cloud
LIPLO_RUNTIME_MODE=desktop-cloud
PORT
REALTIME_PORT
REALTIME_CONTROL_URL
NEXT_PUBLIC_WIDGET_BASE_URL
NEXT_PUBLIC_SOCKET_URL
```

## CSP

Packaged desktop CSP must allow:

```txt
http://127.0.0.1:7050
http://127.0.0.1:7051
ws://127.0.0.1:7051
ws://127.0.0.1:4455
http://localhost:7050
http://localhost:7051
ws://localhost:7051
ws://localhost:4455
```

This prevents Socket.IO and OBS websocket from failing in the packaged app.

## Database Boundary

Do not package production `DATABASE_URL`.

Packaged desktop must not direct-connect to production MySQL. Desktop cloud-backed mode should call hosted backend/API boundaries where possible. If an internal/dev path still uses `DATABASE_URL`, it is dev-only and must not be shipped with production credentials.

SQLite remains future work. `sqlite-adapter.ts` is config/path-only.

## macOS Signing And Notarization

Unsigned/ad-hoc macOS builds are internal testing only.

Production macOS distribution needs CI secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

API key flow alternatives:

- `APPLE_API_KEY`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY_PATH`

Tauri updater signing:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

No Apple credential or updater private key should be committed.

## Auto Update Metadata

Updater metadata must be produced per platform:

- `darwin-aarch64`
- `darwin-x86_64`
- `windows-x86_64`

Any platform entry in the update JSON must have a valid URL and signature. Placeholder metadata is documentation only and must not be used as a production update feed.

## Validation Checklist

Run before release:

```bash
pnpm typecheck
pnpm lint
pnpm check:boundaries
pnpm build
pnpm desktop:prepare
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:build:mac
pnpm desktop:build:mac:arm64
pnpm desktop:build:mac:x64
pnpm desktop:build:windows
```

Manual checks:

- Windows build opens.
- macOS app bundle opens by double click.
- Packaged app does not need pnpm.
- Packaged app does not need source repo.
- Packaged app does not need user-installed Node.
- Local runtime starts automatically.
- Web health passes.
- Realtime health passes.
- OBS websocket test reaches `ws://127.0.0.1:4455`.
- OBS Browser Source can use `http://127.0.0.1:7050/overlay/{kind}/{overlayId}`.
- App can send local overlay URL to OBS Browser Source.
- TikTok connector still runs through Node/runtime sidecar.
- Global hotkey plugin is registered and uses `CommandOrControl+Shift+O`.
- No production DB credential is packaged.
