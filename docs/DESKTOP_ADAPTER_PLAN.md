# Desktop Adapter Plan

This document defines the current desktop adapter boundary for Liplo.

## Target Stack

- Shell: Tauri
- UI: Next.js / React / shadcn
- Local runtime: bundled `liplo-runtime` Node sidecar
- OBS integration: `obs-websocket-js`
- Local config: `storage/desktop/config.json`
- Local database: future SQLite only
- Cloud server: auth, license, sync, backup, marketplace/update metadata

## Runtime/Data Mode

Current desktop direction is `desktop-cloud`:

- Tauri app starts a local web/realtime/TikTok runtime.
- Overlay OBS URLs are local.
- Data remains cloud-backed through API boundaries.
- Full offline SQLite is not enabled.

Code separates the concepts:

```ts
type LiploAppMode = "web" | "desktop";
type LiploDataMode = "cloud" | "local-sqlite";
type LiploRuntimeMode = "cloud-web" | "desktop-cloud" | "desktop-local";
```

`desktop-local` should be reserved for the future full local/offline runtime. Do not confuse it with the current packaged local process.

## Local Config

`src/runtime/desktop/local-config.ts` stores config at:

```txt
storage/desktop/config.json
```

It includes:

- local web host/port/baseUrl
- realtime host/port/socketUrl/socket.io path
- OBS websocket URL/password/default scene/source
- overlay base URL
- hotkeys
- optional cloud base URL
- future SQLite file path placeholder (`sqlite.path`, inactive in desktop-cloud mode)

The config reader normalizes old flat config fields into the current nested shape.

## Desktop Env

`src/runtime/desktop/desktop-env.ts` derives sidecar env values:

- `LIPLO_APP_MODE=desktop`
- `LIPLO_DATA_MODE=cloud`
- `LIPLO_RUNTIME_MODE=desktop-cloud`
- `PORT`
- `REALTIME_PORT`
- `REALTIME_CONTROL_URL`
- `NEXT_PUBLIC_WIDGET_BASE_URL`
- `NEXT_PUBLIC_SOCKET_URL`

## Sidecar Boundary

`src-tauri/src/lib.rs` owns packaged sidecar lifecycle:

- `start_sidecars`
- `stop_sidecars`
- `restart_sidecars`
- `get_sidecar_status`

Packaged mode invokes:

```rust
app.shell().sidecar("liplo-runtime")
```

Development fallback may call pnpm. Packaged mode must not call pnpm, must not rely on shell `PATH`, and must not require the project source folder.

`src/runtime/desktop/sidecar-manager.ts` remains the Node-side development helper boundary.

## Packaged Runtime Bundle

`pnpm build:desktop` prepares the runtime files that the packaged sidecar supervises:

- `src-tauri/resources/liplo-runtime/web`: Next.js standalone server, static assets, and public assets.
- `src-tauri/resources/liplo-runtime/realtime`: bundled realtime/TikTok runtime entrypoint.
- `src-tauri/resources/liplo-runtime/node`: bundled Node executable used by the sidecar.

`pnpm desktop:build*` runs `pnpm build:desktop` before Tauri packaging. If this bundle is missing, the desktop shell can open but the local web/realtime health checks will never pass.

The bundled Node copied by the local helper is for host-platform validation. Release CI should provide the correct Node runtime for each target platform.

## Sidecar Packaging

`src-tauri/tauri.conf.json` uses:

```json
"externalBin": ["binaries/liplo-runtime"]
```

Release CI must replace placeholders with target-triple source filenames:

```txt
src-tauri/binaries/liplo-runtime-aarch64-apple-darwin
src-tauri/binaries/liplo-runtime-x86_64-apple-darwin
src-tauri/binaries/liplo-runtime-x86_64-pc-windows-msvc.exe
```

The source filenames must be hyphenated exactly as Tauri expects.

`pnpm desktop:prepare` generates missing placeholders for target-triple filenames and builds the real host-platform sidecar from `src-tauri/runtime-sidecar` for local validation.

`pnpm desktop:verify-release-sidecars` checks the current host target by default. Release CI can run it with `--target=<target-triple>` for each target or `--all` after every release sidecar has been injected. It intentionally fails when the selected target is still a placeholder, so accidental production packages cannot ship a non-runtime sidecar.

The real sidecar must pass:

```bash
src-tauri/binaries/liplo-runtime-<target> self-check
```

and report `placeholder:false`, `requiresPnpm:false`, `requiresProjectSource:false`, and `requiresUserNode:false`.

## Health Checks

Rust commands:

- `check_web_health`
- `check_realtime_health`
- `check_desktop_health`

Shape:

```json
{
  "reachable": true,
  "url": "http://127.0.0.1:7051/health",
  "latencyMs": 10,
  "error": null,
  "timestamp": "..."
}
```

Health checks must read config values, not only hardcoded ports.

## OBS Adapter

`src/runtime/desktop/obs-websocket-adapter.ts` owns the OBS websocket client:

- connect/disconnect
- test connection
- get status/version
- update Browser Source URL
- set scene item transform

The adapter reads:

- `config.obs.websocketUrl`
- `config.obs.password`
- `config.obs.defaultSceneName`
- `config.obs.defaultBrowserSourceName`

Password must not be logged. Future hardening should move OBS credentials into the OS keychain.

## Tauri Bridge

`src/runtime/desktop/tauri-bridge.ts` exposes typed invoke names:

- config read/write
- sidecar lifecycle
- health checks
- OBS bridge command names

Rust OBS commands are currently lightweight bridge placeholders. OBS behavior remains in the JavaScript adapters so renderer/runtime logic stays in the web layer:

- `obs-websocket-adapter.ts` for Node/runtime contexts.
- `obs-websocket-client.ts` for the Tauri UI.

This keeps OBS password handling out of logs and avoids moving overlay/OBS logic into Rust.

## Desktop Settings UI

Workspace Settings includes a desktop-only panel for:

- local web/realtime config
- OBS websocket config and test
- local overlay URL copy/send-to-OBS
- sidecar start/stop/restart/status
- hotkey config

The panel is inert in normal web browsers and becomes active only when the Tauri command bridge is available.

## Desktop Shell

`desktop-shell/index.html` is the packaged bootstrap shell:

1. Read config.
2. Start sidecars.
3. Wait for web health.
4. Redirect to `config.web.baseUrl`.

In `tauri dev`, Tauri uses the normal Next.js dev URL.

## Packaging Note

Next.js `NEXT_PUBLIC_*` values are build-time constants. `pnpm build:desktop` builds with local desktop defaults. If dynamic per-user ports are needed later, add a runtime config endpoint such as `/api/desktop/config`.

## Distribution Model

Desktop releases are direct download artifacts:

- macOS internal: `.app`
- macOS public: signed/notarized `.dmg` or zipped `.app`
- Windows public: signed `.msi` or `.exe`

Apple App Store and Microsoft Store distribution are non-goals for the current desktop foundation. Self-hosted Tauri updater metadata can be added after signed direct-download artifacts exist.

## Database Boundary

Do not package production `DATABASE_URL`.

Packaged desktop must not direct-connect to production MySQL. Desktop cloud-backed mode should call hosted API boundaries. SQLite remains future work and should be implemented in a separate migration phase.

## Next Steps

1. Build the real `liplo-runtime` sidecar for all target triples.
2. Replace placeholders in release CI before `tauri build`.
3. Replace Rust OBS placeholders with native command plumbing only if UI-side JS adapter is insufficient.
4. Add release signing/notarization/updater automation.
5. Add OS keychain support for OBS password.
6. Plan SQLite/offline mode separately.
