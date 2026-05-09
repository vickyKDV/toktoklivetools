# Overlay Next Roadmap

Dokumen ini adalah roadmap dan audit teknis untuk pengembangan overlay berikutnya. Fase ini hanya dokumentasi. Tidak ada perubahan runtime, schema production, renderer, database, atau migration.

## 1. Kondisi Existing

Overlay kind yang sudah ada:

```txt
CHAT
GIFT
LEADERBOARD
DOCK
CUSTOM
STATIC
```

Sistem existing sudah memakai record `Overlay` sebagai sumber resmi, dengan lifecycle:

```txt
draftSchema -> diedit di Builder
publishedSchema -> dipakai OBS/live
```

Builder, Public Preview, dan OBS harus tetap membaca JSON schema yang sama. Prinsip ini tidak boleh diubah.

### Kenapa ALERT Belum Perlu Dibuat

Untuk sekarang tidak perlu menambah kind `ALERT`, karena behavior alert sudah ter-cover oleh beberapa sistem existing:

- Gift/action overlay dari Automation Builder.
- Automation action overlay untuk video, text, confetti, sound, dan trigger conditional.
- Dock click-to-focus chat overlay.
- Custom overlay untuk menampilkan item terpilih seperti Social Stream Ninja.
- Gift overlay single untuk alert hadiah.

Menambah `ALERT` sekarang berisiko membuat overlap konsep dengan `GIFT`, `CUSTOM`, dan action overlay. Roadmap berikutnya lebih baik fokus ke overlay yang belum ter-cover.

## 2. Prioritas Implementasi

Rekomendasi urutan:

1. `GOAL / TARGET`
2. `TICKER / Running Text` sebagai template `CUSTOM` atau `STATIC`
3. `GIVEAWAY / RAFFLE`
4. `POLL / VOTING`

Urutan ini dipilih karena Goal paling dekat dengan sistem overlay JSON existing dan bisa dibuat additive. Ticker sudah punya dasar `layout.mode = "ticker"`, jadi sebaiknya tidak jadi kind baru dulu. Giveaway dan Poll butuh dashboard state/data collection yang lebih besar, sehingga ditempatkan setelah Goal/Ticker.

## 3. Rekomendasi Arsitektur Per Fitur

### GOAL / TARGET

Rekomendasi kind:

- Tambah kind baru `GOAL` jika ingin URL dan list overlay terpisah.
- Alternatif aman: gunakan `CUSTOM` dengan `dataSource.type = "goal"`.

Rekomendasi awal:

- Gunakan pendekatan additive di schema.
- Jangan ubah renderer existing.
- Jika renderer shared terlalu berisiko, buat renderer terisolasi `GoalOverlayRenderer` yang tetap membaca schema JSON yang sama.

Route OBS:

```txt
/overlay/goal/[overlayId]
```

Jika belum menambah kind DB, gunakan:

```txt
/overlay/custom/[overlayId]
```

Data source:

```json
{
  "type": "goal",
  "metrics": ["likes", "gifts", "viewers", "comments", "shares", "custom"]
}
```

Schema tambahan:

- `goalItems[]`
- `metricType`
- `currentValue`
- `targetValue`
- `manualValue`
- `aggregationWindow`
- `displayMode`
- `progressStyle`
- `icon`

Component registry yang perlu ditambah:

- `goal_progress_bar`
- `goal_progress_ring`
- `goal_liquid_meter`
- `goal_metric_text`
- `goal_target_text`
- `goal_icon`

Builder panel setting:

- Goal item list.
- Metric type.
- Target value.
- Manual current value.
- Source realtime/manual.
- Progress style.
- Icon.
- Show/hide per goal.
- Position/layer jika goal item diperlakukan sebagai component.

Dashboard page:

- Belum wajib page khusus.
- Bisa mulai dari Overlay Builder.
- Jika nanti perlu control manual target/current, tambahkan panel di page overlay detail.

Socket.IO event:

```txt
goal:update
goal:reset
goal:manual-value
```

Database yang mungkin dibutuhkan nanti:

- `GoalState`
- `GoalSnapshot`
- `GoalManualAdjustment`

Jangan buat migration pada fase roadmap ini.

### TICKER / Running Text

Rekomendasi kind:

- Jangan buat kind baru dulu.
- Gunakan `CUSTOM` atau `STATIC` template.
- Pakai `layout.mode = "ticker"` yang sudah ada.

Route OBS:

```txt
/overlay/custom/[overlayId]
/overlay/static/[overlayId]
```

Data source:

```json
{
  "type": "static",
  "messages": []
}
```

Atau untuk ticker realtime:

```json
{
  "type": "ticker",
  "source": "manual"
}
```

Schema tambahan:

- `ticker.speed`
- `ticker.direction`
- `ticker.gap`
- `ticker.separator`
- `ticker.repeat`
- `ticker.messages[]`

Component registry:

- `running_text` sudah ada.
- Tambahkan `ticker_separator` jika perlu.

Builder panel setting:

- Direction: left/right/up/down.
- Speed.
- Gap.
- Separator.
- Repeat.
- Multiple messages optional.

Dashboard page:

- Tidak perlu page khusus dulu.
- Edit cukup dari Overlay Builder.

Socket.IO event:

- Tidak wajib untuk static ticker.
- Optional `ticker:update` jika ada update message realtime.

Database yang mungkin dibutuhkan:

- Tidak wajib.
- Bisa tetap simpan di `draftSchema/publishedSchema`.

### GIVEAWAY / RAFFLE

Rekomendasi kind:

- Overlay renderer bisa menjadi kind baru `GIVEAWAY` karena membutuhkan dashboard state khusus.
- Dashboard page wajib terpisah:

```txt
/dashboard/workspaces/[workspaceId]/giveaway
```

Route OBS:

```txt
/overlay/giveaway/[overlayId]
```

Jika belum menambah kind, sementara bisa pakai:

```txt
/overlay/custom/[overlayId]
```

Data source:

```json
{
  "type": "giveaway",
  "giveawayId": "..."
}
```

Schema tambahan:

- `giveaway.mode`
- `giveaway.keywordFilters`
- `giveaway.sources`
- `giveaway.duplicateMode`
- `giveaway.drawMode`
- `giveaway.winnerDisplay`

Component registry:

- `giveaway_participant_name`
- `giveaway_winner_name`
- `giveaway_wheel`
- `giveaway_slot_picker`
- `giveaway_count`
- `giveaway_status`

Builder panel setting:

- Display mode.
- Winner card style.
- Wheel/slot visual style.
- Animation duration.
- Confetti optional.
- Show participant count.

Dashboard page:

- Start/stop collect.
- Keyword filters.
- Sources: comment, like, share, gift, manual.
- Duplicate handling.
- Participant table.
- Manual entries.
- Draw button.
- Winner history.

Socket.IO event:

```txt
giveaway:participant:add
giveaway:participant:update
giveaway:draw:start
giveaway:draw:tick
giveaway:winner
giveaway:reset
```

Database yang mungkin dibutuhkan:

- `Giveaway`
- `GiveawayParticipant`
- `GiveawayDraw`
- `GiveawayWinner`
- `GiveawayManualEntry`

Jangan buat migration pada fase roadmap ini.

### POLL / VOTING

Rekomendasi kind:

- Bisa jadi kind baru `POLL` karena butuh dashboard state dan vote collector.
- Jika ingin lebih aman, mulai dari `CUSTOM` renderer template dengan `dataSource.type = "poll"`.

Route OBS:

```txt
/overlay/poll/[overlayId]
```

Data source:

```json
{
  "type": "poll",
  "pollId": "..."
}
```

Schema tambahan:

- `poll.options[]`
- `poll.voteSource`
- `poll.mapping`
- `poll.showPercentage`
- `poll.showTotalVotes`
- `poll.highlightWinner`

Component registry:

- `poll_option_bar`
- `poll_option_label`
- `poll_option_count`
- `poll_option_percentage`
- `poll_total_votes`
- `poll_winner_badge`

Builder panel setting:

- Option count.
- Bar style.
- Percentage display.
- Total votes display.
- Winner highlight.
- Color per option.

Dashboard page:

- Create poll.
- Option editor.
- Vote source mapping.
- Manual adjustment.
- Start/pause/close poll.
- Reset votes.

Socket.IO event:

```txt
poll:vote
poll:update
poll:reset
poll:close
```

Database yang mungkin dibutuhkan:

- `Poll`
- `PollOption`
- `PollVote`
- `PollManualAdjustment`

Jangan buat migration pada fase roadmap ini.

## 4. GOAL Detail

Goal harus support banyak target dalam satu overlay/canvas, bukan satu overlay per metric.

Contoh use case dalam satu canvas:

- Like Goal.
- Gift Goal.
- Viewer Goal.
- Comment Goal.
- Share Goal.
- Order/Custom Goal.

Setiap goal item minimal punya:

- `metricType`
- `label`
- `currentValue`
- `targetValue`
- `displayMode`
- `icon`
- `progressStyle`
- `visible`
- `layout` jika menjadi component/layer.

Contoh schema konseptual:

```json
{
  "version": 2,
  "kind": "GOAL",
  "name": "Live Goals",
  "canvas": {
    "width": 800,
    "height": 400,
    "background": {
      "type": "transparent",
      "color": "transparent",
      "opacity": 0
    }
  },
  "dataSource": {
    "type": "goal",
    "aggregation": {
      "scope": "workspace",
      "window": "current_live"
    }
  },
  "goalItems": [
    {
      "id": "like_goal",
      "metricType": "likes",
      "label": "Like Goal",
      "currentValue": null,
      "manualValue": 0,
      "targetValue": 10000,
      "displayMode": "progress_bar",
      "progressStyle": "linear",
      "icon": "heart",
      "visible": true,
      "layout": {
        "x": 24,
        "y": 24,
        "width": 360,
        "height": 64,
        "rotate": 0,
        "zIndex": 1
      },
      "style": {
        "trackColor": "#1f2937",
        "fillColor": "#ef4444",
        "textColor": "#ffffff",
        "radius": 18
      }
    },
    {
      "id": "gift_goal",
      "metricType": "gifts",
      "label": "Gift Goal",
      "manualValue": 0,
      "targetValue": 100,
      "displayMode": "progress_ring",
      "progressStyle": "ring",
      "icon": "gift",
      "visible": true,
      "layout": {
        "x": 420,
        "y": 24,
        "width": 120,
        "height": 120,
        "rotate": 0,
        "zIndex": 2
      }
    }
  ]
}
```

Metric binding:

```txt
likes    -> aggregate LiveEvent LIKE count
gifts    -> aggregate gift count/value
viewers  -> current live viewer count if available
comments -> aggregate COMMENT count
shares   -> aggregate SHARE count
custom   -> manual/API supplied value
```

Fallback behavior:

- Jika realtime value belum tersedia, gunakan `manualValue`.
- Jika `targetValue <= 0`, progress dianggap 0 dan tampilkan warning di builder.
- Progress clamp 0 sampai 100 persen.

Renderer:

- Progress bar/ring/liquid meter membaca current dan target.
- Layout tetap dari JSON.
- Theme/style tidak boleh overwrite `x/y/width/height/zIndex`.

## 5. GIVEAWAY Detail

Giveaway sebaiknya memiliki dashboard sendiri:

```txt
/dashboard/workspaces/[workspaceId]/giveaway
```

Dashboard ini bukan sekadar overlay builder. Ia adalah control room untuk mengumpulkan participant dan melakukan draw.

### Participant Collection

Sumber participant:

- Comment dengan filter keyword/text.
- Like event.
- Share event.
- Gift event optional.
- Manual entries.

Contoh filter comment:

```txt
ikut
1
hadir
keyword custom
```

Konfigurasi duplicate:

- `one_per_viewer`: satu entry per viewer.
- `multiple_allowed`: setiap event valid menjadi entry.
- `weighted`: entry ditimbang oleh jumlah like/share/gift.

Contoh config:

```json
{
  "sources": {
    "comment": {
      "enabled": true,
      "keywords": ["ikut", "hadir"],
      "matchMode": "equals"
    },
    "like": {
      "enabled": true,
      "weight": 1
    },
    "share": {
      "enabled": true,
      "weight": 2
    },
    "gift": {
      "enabled": false,
      "weightByGiftCount": true
    },
    "manual": {
      "enabled": true
    }
  },
  "duplicateMode": "one_per_viewer"
}
```

### Draw Mode

Mode draw:

- Random picker.
- Spinning wheel.
- Slot/random name picker.
- Random number.
- Winner reveal card.

Overlay display mode:

- `idle`: menunggu draw.
- `collecting`: participant masuk.
- `drawing`: animasi berjalan.
- `winner`: pemenang tampil.

Data model yang disarankan:

```txt
Giveaway
- id
- workspaceId
- name
- status
- configJson
- createdAt
- updatedAt

GiveawayParticipant
- id
- giveawayId
- viewerId
- displayName
- username
- avatarUrl
- source
- weight
- entryCount
- createdAt

GiveawayDraw
- id
- giveawayId
- status
- mode
- startedAt
- endedAt

GiveawayWinner
- id
- giveawayId
- drawId
- participantId
- displayName
- username
- createdAt
```

Tidak perlu migration pada fase roadmap ini.

## 6. POLL Detail

Poll mengumpulkan vote dari event live atau input manual.

### Vote Source

Sumber vote:

- Comment keyword.
- Like.
- Share.
- Any comment.
- Manual adjustment.

Mode:

- `keyword_vote`
- `activity_vote`
- `manual_vote`
- `hybrid`

Contoh:

```txt
Option A <- comment "1" atau "A"
Option B <- comment "2" atau "B"
Option C <- comment "3" atau "C"
Like     <- option tertentu jika user set mapping
Share    <- option tertentu jika user set mapping
```

### Mapping Vote

Contoh schema mapping:

```json
{
  "options": [
    {
      "id": "option_a",
      "label": "A",
      "keywords": ["1", "a", "A"],
      "color": "#22c55e"
    },
    {
      "id": "option_b",
      "label": "B",
      "keywords": ["2", "b", "B"],
      "color": "#3b82f6"
    }
  ],
  "mapping": [
    {
      "optionId": "option_a",
      "eventType": "COMMENT",
      "keywords": ["1", "a"],
      "weight": 1
    },
    {
      "optionId": "option_b",
      "eventType": "LIKE",
      "weight": 1
    }
  ]
}
```

Rules:

- `optionId` menunjuk option valid.
- `keywords` bisa banyak.
- `eventType` menentukan sumber.
- `weight` menentukan bobot vote.

### Tampilan Overlay

Mode tampilan:

- Option bars.
- Percentage.
- Total votes.
- Winner/highest option highlight.
- Compact card.
- Full board.

Contoh output overlay:

```txt
A  62%  ████████████
B  38%  ███████
Total votes: 214
```

Data model yang disarankan:

```txt
Poll
- id
- workspaceId
- name
- status
- configJson
- createdAt
- updatedAt

PollOption
- id
- pollId
- label
- color
- order

PollVote
- id
- pollId
- optionId
- viewerId
- eventId
- source
- weight
- createdAt

PollManualAdjustment
- id
- pollId
- optionId
- delta
- note
- createdAt
```

Tidak perlu migration pada fase roadmap ini.

## 7. Risiko Regression

Risiko utama:

- Renderer CHAT/GIFT/LEADERBOARD/DOCK/CUSTOM/STATIC yang sudah stabil ikut berubah.
- Builder preview berbeda dari OBS karena renderer berbeda.
- Schema lama rusak karena perubahan breaking.
- Route lama widget adapter tidak kompatibel.
- List layout yang sudah stabil untuk chat/gift/leaderboard terganggu.
- Socket event baru bentrok dengan event existing.

Cara mencegah:

- Jangan sentuh renderer stable kecuali ada adapter interface yang benar-benar aman.
- Gunakan isolated renderer jika fitur baru punya behavior khusus.
- Schema harus additive, bukan breaking change.
- `draftSchema/publishedSchema` tetap dipakai.
- Route lama tetap jalan.
- Builder, Preview, dan OBS harus memakai JSON yang sama.
- Tambahkan normalizer/migration runtime untuk field baru, bukan migration DB langsung.
- Buat feature flag internal jika perlu.
- Test manual per overlay kind existing sebelum merge.

## 8. Strategi Implementasi Incremental

### Phase 0: Docs / Audit Only

Status fase ini.

Output:

- Roadmap.
- Audit arsitektur.
- Rekomendasi schema.
- Tidak ada perubahan runtime.
- Tidak ada migration.

### Phase 1: Goal Schema + Renderer Isolated

Tujuan:

- Tambah schema additive untuk goal.
- Buat renderer goal terisolasi.
- Gunakan sample data/manual value.

Tidak menyentuh renderer overlay existing.

### Phase 2: Goal Builder Controls

Tujuan:

- Tambah panel builder goal.
- Tambah component registry goal.
- Support multiple goal items dalam satu canvas.

### Phase 3: Ticker Template

Tujuan:

- Tambah template `CUSTOM` atau `STATIC` dengan `layout.mode = "ticker"`.
- Tambah controls speed, direction, separator, repeat.
- Tidak buat kind baru.

### Phase 4: Giveaway Dashboard Data Collection

Tujuan:

- Buat dashboard giveaway.
- Kumpulkan participant dari comment/like/share/gift/manual.
- Belum wajib overlay animasi penuh.

### Phase 5: Giveaway Overlay Renderer

Tujuan:

- Render winner reveal.
- Render wheel/slot/random picker.
- Kirim event draw via Socket.IO.

### Phase 6: Poll Dashboard + Vote Collector

Tujuan:

- Buat dashboard poll.
- Mapping vote.
- Kumpulkan vote.
- Manual adjustment.

### Phase 7: Poll Overlay Renderer

Tujuan:

- Render option bars.
- Render percentage.
- Render total votes.
- Highlight winner/highest option.

## Prinsip Wajib

- Jangan ganggu `CHAT`, `GIFT`, `LEADERBOARD`, `DOCK`, `CUSTOM`, `STATIC` existing.
- Builder, Preview, dan OBS tetap pakai schema JSON yang sama.
- `draftSchema/publishedSchema` tetap dipakai.
- Fitur yang cukup jadi template `CUSTOM`/`STATIC` jangan dipaksa jadi kind baru.
- Perubahan harus additive.
- Hindari refactor besar.
- Jangan membuat migration atau mengubah database pada fase roadmap ini.
- Jangan menghapus kode lama.
- Jangan mengubah behavior overlay yang sudah stable.
