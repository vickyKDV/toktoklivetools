# Desktop Updater Metadata

Liplo Desktop needs update metadata per platform:

- `darwin-aarch64`
- `darwin-x86_64`
- `windows-x86_64`

This repository only contains the release pipeline placeholder. Production release infrastructure must publish signed artifacts and matching updater metadata.

Liplo Desktop is distributed by direct download, not through the Apple App Store or Microsoft Store. The updater feed should point at the self-hosted direct-download artifacts after those artifacts are signed and uploaded.

## Metadata Shape

Use platform-specific channels so Apple Silicon, Intel macOS, and Windows can resolve the correct artifact.

Example placeholder:

```json
{
  "version": "0.1.0",
  "notes": "Internal test build.",
  "pub_date": "2026-05-11T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<filled-by-ci>",
      "url": "https://updates.liplo.app/darwin-aarch64/Liplo.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "<filled-by-ci>",
      "url": "https://updates.liplo.app/darwin-x86_64/Liplo.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "<filled-by-ci>",
      "url": "https://updates.liplo.app/windows-x86_64/Liplo.msi.zip"
    }
  }
}
```

Do not commit signing private keys or Apple credentials.

Unsigned/ad-hoc builds are internal testing only.

## Signing Inputs

Release CI should provide updater signing through environment secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

macOS signing/notarization is separate from updater signing and should use CI secrets only:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

Apple API key flow alternatives:

- `APPLE_API_KEY`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY_PATH`

Do not hardcode credentials or commit generated private keys.

## Production Feed Rule

Do not fake a working updater. Tauri validates updater JSON before version checks. Any platform entry that exists must have a valid `url` and `signature`.

Placeholder metadata is acceptable for documentation only, not as the production update feed.
