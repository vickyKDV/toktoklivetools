# Liplo Desktop Sidecars

Tauri config uses the logical sidecar name `binaries/liplo-runtime`.
Release CI must provide target-triple suffixed source binaries before `tauri build` runs.

The sidecar is responsible for starting the local web/realtime/TikTok runtime without requiring user-installed Node or pnpm.
`pnpm desktop:prepare` creates missing target-triple placeholders and builds a real host-platform `liplo-runtime` sidecar for local validation.
Any remaining placeholder for a non-host target must be replaced in release CI before that target is packaged.

Required target-triple filenames:
- macOS Apple Silicon: `src-tauri/binaries/liplo-runtime-aarch64-apple-darwin`
- macOS Intel: `src-tauri/binaries/liplo-runtime-x86_64-apple-darwin`
- Windows x64: `src-tauri/binaries/liplo-runtime-x86_64-pc-windows-msvc.exe`

Do not ship a placeholder as the production runtime.
