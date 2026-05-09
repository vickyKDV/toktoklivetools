# Automation Builder dan JSON Overlay Runtime

Dokumen ini menjelaskan hubungan event realtime, JSON Overlay, Rules, dan Automation Builder setelah migrasi overlay v2.

## Prinsip Baru

Overlay sekarang adalah resource JSON resmi di tabel `Overlay`. Tidak ada lagi pemilihan active/inactive global per workspace.

Setiap overlay punya URL unik:

```txt
/overlay/chat/[overlayId]
/overlay/gift/[overlayId]
/overlay/leaderboard/[overlayId]
/overlay/dock/[overlayId]
/overlay/custom/[overlayId]
```

OBS memakai URL overlay id tersebut. Jika user mengedit draft di Builder, tampilan OBS tidak berubah sampai user klik `Publish`.

## Alur Event Realtime

Saat event TikTok LIVE masuk:

```txt
TikTok LIVE event
-> disimpan ke LiveEvent
-> dikirim ke dashboard realtime log
-> dikirim ke room overlay workspace
-> JSON overlay runtime membaca publishedSchema dan render event
-> Automation Builder mengevaluasi flow aktif
```

Overlay basic tetap jalan tanpa Rules atau Automation Builder. Rules dan Automation Builder hanya menambahkan aksi conditional.

## Tabel Overlay

Satu tabel `Overlay` dipakai untuk semua jenis output:

```txt
kind: CHAT | GIFT | LEADERBOARD | DOCK | CUSTOM | STATIC
name: nama overlay
draftSchema: JSON yang sedang diedit di Builder
publishedSchema: JSON yang dipakai OBS/live
publishedAt: waktu terakhir publish
```

`draftSchema` dan `publishedSchema` memakai schema JSON yang sama. Perbedaannya hanya lifecycle: draft untuk editor, published untuk live.

## Builder Flow

Route Builder:

```txt
/dashboard/workspaces/[workspaceId]/overlay-design-builder
/design-builder?overlayId=[overlayId]
```

Alur pengguna:

1. Pilih kind overlay: `CHAT`, `GIFT`, `LEADERBOARD`, `DOCK`, `CUSTOM`, atau `STATIC`.
2. Mulai dari blank canvas atau template JSON.
3. Tambahkan component dari library.
4. Atur canvas, layout, binding, container/card, text, avatar, border, shadow, dan style lain.
5. Klik `Save Draft` untuk menyimpan ke `draftSchema`.
6. Klik `Publish` agar OBS memakai perubahan tersebut.
7. Copy URL `/overlay/[kind]/[overlayId]` dari halaman `Overlays`.

Builder adalah editor visual untuk JSON. Builder tidak menyimpan HTML final.

## Schema Layout

Semua overlay memakai schema v2:

```json
{
  "version": 2,
  "kind": "CHAT",
  "name": "Chat Bubble",
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
    "align": "start"
  },
  "components": []
}
```

Mode layout:

- `single`: satu item/event, cocok untuk gift alert dan custom scene.
- `list`: item template berulang, cocok untuk chat, gift history, leaderboard.
- `ticker`: teks berjalan.
- `dock`: surface dock.
- `grid`: layout grid/table.

## OBS Setup

Pakai halaman:

```txt
/dashboard/workspaces/[workspaceId]/overlays
```

Setiap card overlay menampilkan URL OBS. Contoh:

```txt
http://localhost:7050/overlay/chat/cuid_overlay
```

Browser Source OBS harus memakai width/height sesuai canvas JSON overlay. Untuk `CHAT` list, tinggi Browser Source boleh lebih besar agar beberapa item terlihat.

## Legacy Widget Adapter

Route widget lama tetap ada sebagai adapter:

```txt
/widgets/chat/[theme]/[overlayKey]
/widgets/gift/[theme]/[overlayKey]
/widgets/leaderboard/[metric]/[overlayKey]
```

Route tersebut redirect ke overlay JSON terbaru berdasarkan kind dan workspace. Work baru sebaiknya langsung memakai `/overlay/[kind]/[overlayId]`.

## Action Overlay Automation

Automation yang menampilkan animasi/sound masih memakai action overlay khusus per flow:

```txt
/widgets/action/[overlayKey]/[flowId]?position=center
```

Route widget tersebut redirect ke runtime action:

```txt
/overlay-action/[overlayKey]?flowId=[flowId]&position=center
```

Gunakan URL ini sebagai Browser Source terpisah di layer OBS paling atas. JSON overlay utama tetap dipakai untuk chat/gift/leaderboard/dock.

Action overlay dapat menampilkan beberapa jenis action bersamaan. Node action yang berjalan dari trigger yang sama tidak saling menimpa selama z-index/layer-nya berbeda:

- `Show Animation`: image, GIF, video, JSON/Lottie.
- `Text Overlay`: text CSS/SVG ringan untuk ucapan gift dan dynamic message.
- `Confetti Overlay`: efek canvas-confetti sebagai overlay terpisah.
- `Play Sound`: putar audio overlay.
- `Reply Comment`: siapkan balasan komentar otomatis.

Untuk media upload, file disimpan oleh app sebagai file fisik di:

```txt
storage/uploads/overlay-assets
```

Client hanya memakai URL:

```txt
/api/assets/[filename]
```

Tidak ada asset BLOB di DB, tidak perlu build ulang, dan tidak perlu env upload root.

## Rules

Rules adalah automation sederhana berbasis form.

Route:

```txt
/dashboard/workspaces/[workspaceId]/rules
```

Contoh:

```txt
Trigger: GIFT
Condition: giftName EQUALS Mawar
Action: SHOW_OVERLAY
```

Rules disimpan di tabel `Rule`, sedangkan hasil action masuk ke `ActionLog`.

## Automation Builder

Automation Builder adalah flow visual.

Route:

```txt
/automation-builder
/dashboard/workspaces/[workspaceId]/automation-builder
```

Contoh flow:

```txt
[Gift Received] -> [Gift name equals Mawar] -> [Show Animation]
[Comment Received] -> [Comment contains harga] -> [Reply Comment]
```

Contoh flow per nama gift:

```txt
[Gift Received]
  -> [giftName equals Mawar] -> [Show Animation Mawar]
  -> [giftName equals Doughnut] -> [Show Animation Doughnut]
  -> [giftName equals Finger Heart] -> [Show Animation Heart]
```

Node tanpa condition langsung setelah trigger akan berjalan untuk semua event trigger tersebut. Ini berguna untuk 3 layer umum seperti text overlay dan confetti, lalu branch condition dipakai untuk video khusus per gift.

Flow disimpan ke:

```txt
automation_flows
automation_executions
```

## Runtime Automation

Saat TikTok event masuk:

```txt
TikTok LIVE event
-> map payload TikTok ke LiveEvent
-> simpan ke database
-> emit event ke dashboard dan overlay room
-> ambil automation flow aktif di workspace
-> cari trigger node yang cocok
-> jalankan condition node
-> kalau condition true, jalankan action node
-> simpan log ke automation_executions
```

File engine:

```txt
src/lib/automation/engine.ts
```

Integrasi TikTok:

```txt
src/lib/tiktok/connection-manager.ts
```

## Action Nodes

### Show Animation

Dipakai untuk menampilkan asset visual:

- Image.
- GIF.
- Video.
- JSON/Lottie.

Setting penting:

- Fit/sizing media.
- Posisi.
- Z-index / bring to front / send to back.
- Fade in.
- Fade out.
- Ikuti durasi video jika aktif.
- Durasi fallback untuk image/GIF/Lottie.

Jika `ikuti durasi video` aktif, video akan ditutup setelah event `ended`, lalu fade out. Untuk image/GIF/Lottie, runtime memakai durasi ms sebagai fallback.

### Text Overlay

Text Overlay memakai CSS/SVG ringan, bukan WebGL, agar lebih aman untuk OBS dan tidak berat.

Binding umum:

```txt
{{viewer.name}}
{{gift.name}}
{{gift.amount}}
{{comment.text}}
```

Pastikan text ditempatkan di area yang cukup besar agar tidak terpotong saat dipakai di OBS.

### Confetti Overlay

Confetti memakai `canvas-confetti` dan dirender sebagai layer action sendiri. Preset yang tersedia:

- Basic Cannon.
- Random Direction.
- Realistic Look.
- Fireworks.
- Stars.
- Snow.
- School Pride.
- Custom Shapes.
- Emoji.

Mode:

- `once`: jalan sekali.
- `repeat`: jalan berulang dengan delay dan auto close.
- `repeat until overlay end`: jalan berulang sampai action overlay selesai.

Confetti dapat ditumpuk dengan video/text overlay. Atur z-index jika ingin confetti di depan atau di belakang text.

### Test Trigger

`Test Trigger` adalah tombol global di Automation Builder. Tombol ini menjalankan flow aktif tanpa menunggu event TikTok asli.

Behavior:

- Tidak wajib memilih node dulu.
- Tidak peduli tipe gift/comment real.
- Action overlay harus terbuka di URL flow yang sama.
- Cocok untuk validasi video, text overlay, confetti, dan sound sebelum live.

## Checklist OBS Tidak Update

1. Pastikan OBS memakai URL `/overlay/[kind]/[overlayId]`, bukan preview dashboard.
2. Pastikan overlay sudah `Publish`, bukan hanya `Save Draft`.
3. Pastikan TikTok connection berjalan.
4. Pastikan Browser Source width/height sesuai canvas JSON.
5. Untuk route legacy widget, pastikan workspace punya overlay dengan kind yang sesuai.

## Checklist Automation Tidak Jalan

1. Pastikan flow status `Active`.
2. Pastikan node terhubung dengan edge.
3. Pastikan condition sama dengan payload event asli.
4. Cek `Event Logs`.
5. Cek `Execution Log` di Automation Builder.
6. Pastikan action overlay `/widgets/action/[overlayKey]/[flowId]` sudah dipasang jika action butuh animasi/sound.

## Commands

```bash
pnpm dev
pnpm prisma migrate status
pnpm typecheck
pnpm lint
pnpm build
```
