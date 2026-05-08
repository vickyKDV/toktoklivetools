# JSON Overlay Runtime

Dokumen ini merangkum sistem overlay terbaru: Builder, Public Preview, OBS Runtime, asset upload, dan event realtime.

## Prinsip Utama

- Semua overlay adalah record resmi di tabel `Overlay`.
- Builder menyimpan JSON, bukan HTML final.
- Preview dan OBS membaca JSON yang sama.
- `draftSchema` dipakai editor.
- `publishedSchema` dipakai OBS/live setelah user klik `Publish`.
- Setiap overlay punya URL unik. Tidak ada konsep active overlay global yang menentukan URL.

## Overlay Kind

Overlay kind yang tersedia:

```txt
CHAT
GIFT
LEADERBOARD
DOCK
CUSTOM
STATIC
```

Route OBS runtime:

```txt
/overlay/chat/[overlayId]
/overlay/gift/[overlayId]
/overlay/leaderboard/[overlayId]
/overlay/dock/[overlayId]
/overlay/custom/[overlayId]
/overlay/static/[overlayId]
```

Route legacy masih ada sebagai adapter:

```txt
/widgets/chat/[theme]/[overlayKey]
/widgets/gift/[theme]/[overlayKey]
/widgets/leaderboard/[metric]/[overlayKey]
```

## Schema Overlay

Schema utama:

```json
{
  "version": 2,
  "kind": "CHAT",
  "name": "Overlay Name",
  "canvas": {
    "width": 800,
    "height": 400,
    "background": {
      "type": "transparent",
      "color": "transparent",
      "opacity": 0
    },
    "radius": 0,
    "stroke": {
      "enabled": false,
      "color": "#ffffff",
      "width": 0
    },
    "shadow": {
      "enabled": false,
      "color": "#000000",
      "blur": 0,
      "x": 0,
      "y": 0
    }
  },
  "dataSource": {
    "type": "chat",
    "filters": {}
  },
  "layout": {
    "mode": "list",
    "maxItems": 5,
    "gap": 12,
    "direction": "vertical",
    "reverse": true,
    "align": "start",
    "listStyle": "default",
    "enterAnimation": "slide-up",
    "exitAnimation": "fade",
    "animationDurationMs": 620,
    "autoCloseMs": 0
  },
  "components": []
}
```

Component utama memakai koordinat canvas:

```json
{
  "id": "comment_1",
  "type": "comment",
  "name": "Komentar",
  "x": 40,
  "y": 80,
  "width": 420,
  "height": 56,
  "rotation": 0,
  "zIndex": 2,
  "visible": true,
  "locked": false,
  "props": {},
  "style": {}
}
```

## Canvas Dan Coordinate System

- Semua `x`, `y`, `width`, `height`, `rotation`, dan `zIndex` disimpan dalam koordinat canvas.
- Preview kecil boleh discale, tetapi scale hanya diterapkan di wrapper.
- OBS/Public Preview/Builder tidak boleh menghitung ulang ukuran child berdasarkan viewport.
- Detail rumus interaksi editor ada di:
  - [Coordinate System](COORDINATE_SYSTEM.md)
  - [Coordinate Audit](COORDINATE_AUDIT.md)
  - [Resize Debug Report](RESIZE_DEBUG_REPORT.md)

## Builder

Route utama:

```txt
/dashboard/workspaces/[workspaceId]/overlay-design-builder
```

Fitur builder:

- Blank canvas.
- Template JSON.
- Add component.
- Drag, resize, rotate.
- Snap dan guideline editor.
- Select component/layer.
- Duplicate.
- Delete.
- Lock/unlock.
- Hide/show.
- Bring forward.
- Send backward.
- Bring to front.
- Send to back.
- JSON realtime view.
- Public Preview.
- OBS URL.
- Save Draft.
- Publish.

Builder hanya editor. Runtime OBS tidak membawa toolbar, selection outline, snapline, atau handle editor.

## Component Registry

Component yang tersedia:

- Card / Container.
- Bubble Card.
- Glass Card.
- Gradient Card.
- Speech Bubble Card.
- Raw Card.
- Profile Photo.
- Viewer Name.
- Username.
- Badge.
- Comment.
- Timestamp.
- Gift Text.
- Gift Name.
- Gift Count.
- Gift Image.
- Running Text.
- Leaderboard Rank.
- Media Switch.

Container/card dapat memiliki children. Child memakai koordinat relatif terhadap parent container. Jika `clipContent` aktif, container menggunakan overflow hidden.

## Text Behavior

Text component mendukung:

- Manual text atau binding.
- Font size.
- Font weight.
- Color.
- Line height.
- Align.
- Max lines.
- Text overflow: clip / ellipsis.
- Auto fit font size.
- New line/wrap untuk komentar panjang.

Jika text tidak truncate, targetnya adalah text tetap terbaca. Untuk komentar panjang, card dapat auto-height pada runtime sesuai setting.

## Bubble Tail

Bubble/chat card dapat memakai tail:

```json
{
  "bubbleTail": {
    "enabled": true,
    "side": "left",
    "position": "bottom",
    "size": 22
  }
}
```

Tail dirender sebagai node visual/CSS layer dan ikut scale Builder, Preview, dan OBS.

## List Layout

Mode list dipakai oleh chat, gift history, dan leaderboard.

Setting:

- `maxItems`
- `gap`
- `direction`: `vertical` atau `horizontal`
- `reverse`
- `align`: `start`, `center`, `stretch`
- `listStyle`

Behavior:

- Normal order: item pertama mulai dari atas, item baru mengalir ke bawah.
- Reverse order: item pertama mulai dari bawah, item baru mendorong list ke atas.
- Horizontal list memakai prinsip sama pada sumbu horizontal.
- Gap bisa negatif untuk overlap, tetapi item tetap memakai ukuran asli dari JSON.
- Item tidak boleh auto-shrink hanya karena jumlah list.

List style:

- Default.
- Stacked Card UI.
- Layered List.
- Card Stack.
- Focus Stack List.
- Depth List UI.

## Chat Overlay

Chat overlay dapat menampilkan event:

- Chat.
- Join/member.
- Like.
- Share.
- Follow.
- Gift jika diaktifkan.

Chat list memakai data realtime dari workspace. Builder preview memakai sample data, tetapi renderer yang sama tetap digunakan agar visual sama.

Dock/focus chat adalah alur terpisah:

- Dock menampilkan daftar komentar.
- User klik item dock untuk mengirim focus item ke custom/single overlay.
- Auto focus dapat mengirim item terbaru otomatis.
- Item yang pernah dipilih dan item aktif diberi warna berbeda.

## Gift Overlay

Gift overlay mendukung:

- Gift text gabungan, misalnya `Mengirim x100 Mawar`.
- Prefix bisa diset.
- Gift image mengikuti payload gift jika tersedia.
- Pengirim yang sama dan gift sama dapat digabung count-nya selama overlay masih tampil.
- Test gift tersedia di builder.

## Leaderboard Overlay

Leaderboard khusus list.

Fitur:

- Minimal 3 item.
- Maksimal 50 item.
- Default aman 10 item.
- Metric: gifts, likes, views, comments/chat.
- Rank component dapat berupa text, number, crown/top rank, atau icon metric.
- Rank/icon adalah component/layer sendiri dan bisa diatur seperti layer lain.

Preset leaderboard:

- Default Clean.
- Neon Rank Board.
- Cyberpunk.
- Liquid Glass.
- Gold Podium.
- Minimal Slate.
- Arcade Scoreboard.

Leaderboard logic diisolasi dari chat/gift/custom agar tidak mengganggu overlay lain.

## Static Overlay

Static overlay dipakai untuk promosi/product/media display.

Component utama:

- `media_switch`

Fitur:

- Multiple file.
- Image.
- GIF.
- Video.
- JSON/Lottie.
- Switch by interval.
- Switch when media ends.
- Video/Lottie bisa menunggu event selesai sebelum pindah.

Static overlay tidak perlu koneksi socket realtime.

## Runtime Asset Upload

Upload asset tidak disimpan ke DB sebagai BLOB dan tidak ditulis ke `public`.

Flow:

```txt
POST /api/assets/upload
-> storage/uploads/overlay-assets
-> return /api/assets/[filename]
```

Route serve:

```txt
GET /api/assets/[filename]
```

Karakteristik:

- Folder dibuat otomatis oleh app.
- Tidak perlu rebuild setelah upload.
- Tidak perlu env upload root.
- Tidak expose path filesystem asli ke client.
- Aman dari path traversal.
- Mendukung range request untuk video.
- File tetap ada setelah app restart selama folder project tidak dihapus.

Endpoint lama builder:

```txt
GET /api/workspaces/[workspaceId]/animation-assets
POST /api/workspaces/[workspaceId]/animation-assets
```

Masih dipakai UI existing, tetapi upload baru juga disimpan ke `storage/uploads/overlay-assets` dan URL yang dikembalikan adalah `/api/assets/[filename]`.

## OBS Notes

- Pakai URL dari card overlay di halaman `/overlays`.
- OBS Browser Source harus mengikuti ukuran canvas overlay jika ingin pixel-perfect.
- Jika source OBS discale, scale harus uniform agar tidak gepeng.
- Untuk list, tinggi source perlu cukup untuk jumlah item yang ingin tampil.
- OBS tidak memakai UI editor.

## Debug

Runtime mendukung debug mode pada route overlay jika tersedia:

```txt
/overlay/[kind]/[overlayId]?debug=1
```

Debug dipakai untuk memeriksa ukuran canvas, viewport, dan scale.
