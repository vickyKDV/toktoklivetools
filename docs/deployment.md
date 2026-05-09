# Production / Cloud Deployment

Panduan ini merangkum cara menjalankan app di production setelah migrasi JSON Overlay Runtime.

## Environment

Minimal `.env` production:

```txt
NODE_ENV="production"
DATABASE_URL="mysql://user:password@localhost:3306/database_name"
NEXT_PUBLIC_WIDGET_BASE_URL="https://your-domain.com"
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"

TIKTOK_RECONNECT_MAX_ATTEMPTS="0"
TIKTOK_RECONNECT_MAX_DELAY_MS="30000"
```

Catatan:

- Gunakan `production`, bukan `productions`.
- `NEXT_PUBLIC_WIDGET_BASE_URL` dipakai untuk URL overlay/widget yang ditampilkan ke user.
- `NEXT_PUBLIC_SOCKET_URL` harus mengarah ke origin yang sama dengan Socket.IO endpoint.
- Tidak perlu `UPLOAD_ROOT`, `ANIMATION_UPLOAD_ROOT`, atau env upload path lain.

## Install Dan Build

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma migrate deploy
pnpm build
```

Seed hanya dipakai jika perlu data awal:

```bash
pnpm db:seed
```

## Run App

Script utama:

```bash
pnpm start
```

`pnpm start` menjalankan `server.ts`, yaitu runtime gabungan HTTP + Next.js + Socket.IO + TikTok connection manager di port `7050` secara default. Event TikTok, dock, overlay, dan automation berada di runtime yang sama.

`pnpm start:ws` masih tersedia sebagai alias kompatibilitas, tetapi jangan jalankan bersamaan dengan `pnpm start` karena memakai server dan port yang sama.

Contoh PM2:

```bash
pm2 start "pnpm start" --name liplo
pm2 save
```

Jika proses lama masih menahan port:

```bash
pm2 list
pm2 restart liplo
```

## Caddy Reverse Proxy

Contoh Caddyfile:

```caddyfile
toktok.example.com {
  reverse_proxy 127.0.0.1:7050
}
```

Socket.IO berjalan di origin yang sama. Tidak perlu path khusus selama reverse proxy meneruskan websocket dan HTTP upgrade standar.

## Runtime Upload Storage

Upload overlay asset disimpan otomatis oleh app:

```txt
storage/uploads/overlay-assets
```

App membuat folder ini sendiri dengan `fs.mkdir({ recursive: true })`.

Client tidak pernah melihat path filesystem. Client hanya memakai:

```txt
/api/assets/[filename]
```

Implikasi production:

- Upload langsung tampil di builder, preview, dan OBS.
- Tidak perlu build ulang setelah upload.
- Tidak perlu simpan asset ke DB.
- Tidak perlu simpan asset ke `public`.
- Pastikan folder project/storage ikut persistent disk VPS/container.

Jika deploy memakai container ephemeral, mount volume untuk folder `storage/uploads`.

## OBS URL

Gunakan URL dari halaman `/dashboard/workspaces/[workspaceId]/overlays`.

Format runtime:

```txt
/overlay/chat/[overlayId]
/overlay/gift/[overlayId]
/overlay/leaderboard/[overlayId]
/overlay/dock/[overlayId]
/overlay/custom/[overlayId]
/overlay/static/[overlayId]
```

OBS membaca `publishedSchema` jika ada. Jika user hanya klik `Save Draft`, OBS belum berubah. Klik `Publish` untuk memperbarui output live.

## Live Connection

Alur production:

```txt
Dashboard connect TikTok
-> server connection manager mulai menerima event
-> event disimpan ke LiveEvent
-> event dikirim ke Socket.IO room workspace
-> dock/overlay/action runtime menerima update
```

Jika dock/overlay tidak realtime:

1. Pastikan runtime `pnpm start` sedang hidup.
2. Pastikan `NEXT_PUBLIC_SOCKET_URL` mengarah ke domain production.
3. Pastikan workspace sudah connect ke live.
4. Cek browser Network untuk `/socket.io`.
5. Cek log PM2 proses app.

## Checklist Setelah Deploy

```bash
pnpm prisma migrate status
pnpm typecheck
pnpm lint
pnpm build
```

Validasi manual:

- Login dashboard.
- Buka workspace.
- Connect TikTok live.
- Buka dock chat.
- Test trigger chat/gift.
- Buka overlay OBS URL.
- Upload static/animation asset dan pastikan langsung tampil tanpa rebuild.
