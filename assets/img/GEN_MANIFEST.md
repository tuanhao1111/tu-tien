# 🎨 Manifest gen ảnh AI — Tiên Đồ Lộ (prompt SẴN, copy-paste thẳng)

> Mỗi mục: **tên file** + **prompt hoàn chỉnh** (đã gộp sẵn phong cách + bố cục). Cứ copy
> nguyên prompt dán vào tool AI (Midjourney / DALL·E / SDXL / Nano Banana…), xuất ảnh,
> **đặt đúng tên file** rồi thả vào thư mục `assets/img/`. Ảnh tự hiện trong game.
> Thiếu file nào thì chỗ đó không hiện gì (game vẫn chạy). Đuôi: `png` / `jpg` / `webp`.
>
> - **Banner** (cảnh giới, panel, bí cảnh, shop, túi): hợp tỉ lệ **16:9 ngang** (1280×720).
> - **Icon / chân dung** (trang bị, skill, đan, nguyên liệu, boss, phái): **vuông 1:1** (768×768).
> - Làm tới đâu hiện tới đó — **không cần đủ hết ~140 ảnh**. Ưu tiên: panel → trang bị → boss → vùng/yêu thú → chiêu.
> - Thêm/đổi ảnh lúc bot đang chạy → cần **restart** (có cache dò file).
>
> ### ⚠️ NÉN ẢNH (quan trọng — ảnh AI gốc rất nặng)
> Ảnh AI xuất ra thường **2048px ~ 7-13 MB** → Discord upload **rất chậm / dễ lỗi**. Discord chỉ
> hiện thumbnail ~80px, ảnh ~400-600px nên KHÔNG cần to. Sau khi thả ảnh `.png` vào đây, chạy:
> ```
> python assets/img/_optimize.py
> ```
> Script nén PNG → **WebP** (~30-150 KB, nhỏ ~450 lần) và dời bản gốc vào `_originals_backup/`
> (xóa thư mục này sau khi kiểm tra ảnh OK để lấy lại dung lượng). Game đọc `.webp` tự động.
> _(Đợt ảnh hiện tại đã nén: 798 MB → ~6 MB.)_

### 📍 Ảnh hiện Ở ĐÂU trong game (đã gắn sẵn)
| Ảnh | Hiện ở |
|---|---|
| `realm_*` | banner Hồ Sơ |
| `sect_*` | thumbnail Môn Phái · trận Đấu Tập / Đấu Pháp (đối thủ người thật) |
| `panel_*` | banner mỗi panel kênh |
| `gear_*` | màn xem chi tiết 1 món ở Trang Bị |
| `boss_*` | loan báo "boss giáng thế" (banner) · panel Boss (ẩn) · panel live (chỉ khi dùng URL) |
| `zone_*` | thumbnail các trận trong Bí Cảnh (theo vùng) |
| `foe_wild` / `foe_tower` | thumbnail trận Săn Yêu / Thí Luyện Tháp |
| `npc_dau` | thumbnail trận Đấu Pháp gặp đài chủ NPC |
| `shop` / `bag` | banner Phường Thị / Túi Đồ |
| `skill_*` | Hồ Sơ → 🎴 Quản Lý Chiêu → chọn chiêu ở menu "🔍 Xem chi tiết chiêu" |
| `pill_*` · `mat_*` | Hồ Sơ → 🎒 Túi Đồ → chọn vật phẩm ở menu "🔍 Xem chi tiết vật phẩm" |

---

## 1. Cảnh giới (banner 16:9) — `realm_<0..9>.png`

- **realm_0.png** `a mortal youth in humble cloth robes standing at the foot of a vast misty spirit mountain at dawn, Chinese xianxia cultivation RPG art, painterly semi-realistic, cinematic dramatic lighting, wide 16:9 banner, no text no watermark`
- **realm_1.png** `a young cultivator inhaling swirling pale-blue qi energy into the body, meditation pose, faint flowing energy streams, Chinese xianxia cultivation RPG art, painterly, cinematic lighting, mystical aura, wide 16:9 banner, no text no watermark`
- **realm_2.png** `a cultivator forging a glowing spiritual foundation core on a rune-carved stone platform, blue qi runes, Chinese xianxia cultivation RPG art, painterly, dramatic lighting, wide 16:9 banner, no text no watermark`
- **realm_3.png** `a radiant golden core forming in the dantian of a meditating cultivator, brilliant golden light rays, Chinese xianxia cultivation RPG art, painterly, epic glow, wide 16:9 banner, no text no watermark`
- **realm_4.png** `a tiny glowing nascent-soul spirit infant hovering above a serene meditating cultivator, soft halo, Chinese xianxia cultivation RPG art, painterly, ethereal lighting, wide 16:9 banner, no text no watermark`
- **realm_5.png** `a deity-like cultivator dissolving into spiritual essence, swirling starry cosmic aura, Chinese xianxia cultivation RPG art, painterly, divine lighting, wide 16:9 banner, no text no watermark`
- **realm_6.png** `a powerful sage bending void and space, a grey vortex of emptiness swirling around him, Chinese xianxia cultivation RPG art, painterly, surreal dramatic lighting, wide 16:9 banner, no text no watermark`
- **realm_7.png** `a transcendent immortal with a glowing yin-yang halo seated on a lotus, serene overwhelming aura, Chinese xianxia cultivation RPG art, painterly, sacred lighting, wide 16:9 banner, no text no watermark`
- **realm_8.png** `a defiant cultivator standing under a sky full of purple heavenly tribulation lightning bolts striking down, Chinese xianxia cultivation RPG art, painterly, intense dramatic lighting, wide 16:9 banner, no text no watermark`
- **realm_9.png** `an ascended immortal stepping through golden clouds toward a celestial palace in the sky, Chinese xianxia cultivation RPG art, painterly, radiant divine lighting, wide 16:9 banner, no text no watermark`

## 2. Môn phái (icon emblem 1:1) — `sect_<id>.png`

- **sect_kiem_tong.png** `a glowing blue flying-sword crest emblem radiating sharp sword-qi, Chinese xianxia sect insignia, painterly game icon, dark gradient background, square 1:1, no text no watermark`
- **sect_huyen_hoa.png** `a black-and-crimson flaming sigil crest emblem, dark mysterious fire, Chinese xianxia sect insignia, painterly game icon, dark background, square 1:1, no text no watermark`
- **sect_dan_dinh.png** `an alchemy cauldron crest emblem with rising jade-green medicinal smoke, Chinese xianxia sect insignia, painterly game icon, dark background, square 1:1, no text no watermark`
- **sect_cuong_the.png** `a diamond-hard golden armored fist crest emblem, vajra body, Chinese xianxia sect insignia, painterly game icon, dark background, square 1:1, no text no watermark`
- **sect_huyet_ma.png** `a sinister blood-red demonic rune crest emblem dripping crimson, Chinese xianxia dark sect insignia, painterly game icon, dark background, square 1:1, no text no watermark`
- **sect_phong_linh.png** `a swirling green wind-vortex crest emblem with floating feathers, Chinese xianxia sect insignia, painterly game icon, dark background, square 1:1, no text no watermark`

## 3. Panel kênh (banner 16:9) — `panel_<key>.png`

- **panel_soNhap.png** `a glowing immortal gate at sunrise welcoming a new disciple onto a path, beginning of a cultivation journey, Chinese xianxia RPG art, painterly, warm cinematic lighting, wide 16:9 banner, no text no watermark`
- **panel_tuLuyen.png** `a serene cultivation cave-abode with a meditation platform, floating qi energy and a small alchemy furnace, Chinese xianxia RPG art, painterly, soft glow, wide 16:9 banner, no text no watermark`
- **panel_nhiemVu.png** `an ancient quest scroll unrolled beside a glowing journey map and an ink brush, Chinese xianxia RPG art, painterly, warm lighting, wide 16:9 banner, no text no watermark`
- **panel_monPhai.png** `a grand sect recruitment hall with banners, statues and disciples, Chinese xianxia RPG art, painterly, majestic lighting, wide 16:9 banner, no text no watermark`
- **panel_hoSo.png** `a glowing jade character-record slip floating with a cultivator's profile aura, Chinese xianxia RPG art, painterly, mystical glow, wide 16:9 banner, no text no watermark`
- **panel_hoSoCard.png** ⭐ *(NỀN THẺ HỒ SƠ — kiểu bảng nhân vật RPG. Thẻ tự vẽ NHÂN VẬT ở giữa + 2 BẢNG đè 2 bên, nên nền phải TỐI & TRỐNG ở giữa/2 bên, KHÔNG có người/đồ vật)* `an ornate dark obsidian and jade RPG character-sheet backdrop, perfectly symmetrical, intricate antique gold filigree corner frames, a dim empty vertical niche in the center flanked by two faint recessed side alcoves, soft mystical blue qi glow with floating dust motes, faint constellation and rune engravings on black stone, deep cinematic vignette keeping the center and both sides dark and uncluttered, Chinese xianxia RPG UI panel art, painterly, no characters no people no items no text no watermark, wide 16:9 banner`
- **panel_trangBi.png** `an armory rack displaying mystical glowing weapons, armor and talismans, Chinese xianxia RPG art, painterly, dramatic lighting, wide 16:9 banner, no text no watermark`
- **panel_luyenTruong.png** `a training-ground arena with a tall mystical climbing tower and beast pens, Chinese xianxia RPG art, painterly, dynamic lighting, wide 16:9 banner, no text no watermark`
- **panel_dauDai.png** `a grand dueling arena platform with two cultivators about to clash before a crowd, Chinese xianxia RPG art, painterly, intense lighting, wide 16:9 banner, no text no watermark`
- **panel_bossTheGioi.png** `a colossal monstrous beast descending from a stormy sky over a tiny city, epic world-boss scale, Chinese xianxia RPG art, painterly, ominous dramatic lighting, wide 16:9 banner, no text no watermark`
- **panel_shop.png** `the interior of a cozy xianxia RPG item shop, wooden and jade shelves lined with neatly arranged glowing pills in jars, ore chunks, spirit herbs, talismans and sheathed weapons, a shop counter with an abacus, warm red lantern light, Chinese xianxia RPG art, painterly, inviting cinematic lighting, wide 16:9 banner, no text no watermark`
- **panel_shopCard.png** ⭐ *(NỀN THẺ SHOP RPG — nếu sau này dựng thẻ shop động: các ô vật phẩm + giá vẽ đè lên trên, nền cần TỐI & TRỐNG ở giữa)* `a dark elegant xianxia RPG shop UI backdrop, rows of empty ornate wooden display shelves with dim niches and small hanging price-tag hooks, antique gold trim, warm dim lantern glow at the edges, dark uncluttered center for item slots, Chinese xianxia RPG UI panel art, painterly, deep vignette, no items no text no watermark, wide 16:9 banner`
- **panel_bangXepHang.png** `a towering stone ranking monument engraved with glowing golden names, Chinese xianxia RPG art, painterly, majestic lighting, wide 16:9 banner, no text no watermark`
- **panel_toDoi.png** `a team of four cultivators standing together facing a giant boss monster at the entrance of a secret realm, co-op party raid, Chinese xianxia RPG art, painterly, epic dramatic lighting, wide 16:9 banner, no text no watermark`

## 4. ⭐ Trang bị (icon 1:1) — `gear_<ô>_<độ hiếm>.png` — 30 file

> Người chơi thấy đúng ảnh khớp ô + độ hiếm món của họ. Mỗi prompt đã gắn sẵn màu hào quang theo độ hiếm.
>
> ℹ️ **"Trang bị mới" (biến thể GĐ19 — Liệt Hỏa/Huyền Thiết/Truy Phong… + bảng rớt cố định Phó Bản Tổ Đội GĐ20) KHÔNG cần ảnh mới.** Hệ ảnh tra theo **ô × độ hiếm** (`gear_<slot>_<rarity>`), nên mọi món rớt mới đều DÙNG LẠI 30 ảnh dưới đây — đã đủ. Biến thể chỉ đổi tên + chỉ số, không đổi ảnh. _(Nếu muốn mỗi biến thể một ảnh riêng thì cần đổi cả code `assets.gear` — báo nếu cần.)_

### 🗡️ Vũ khí (weapon)
- **gear_weapon_pham.png** `a plain common-grade cultivator sword of dull iron, faint grey-white glow, Chinese xianxia RPG weapon item icon, painterly, centered on dark gradient background, square 1:1, no text no watermark`
- **gear_weapon_linh.png** `a fine spirit-grade cultivator sword with jade accents, green glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_bao.png** `an ornate treasure-grade cultivator sword with silver-gold filigree, blue glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_tien.png** `a legendary immortal-grade cultivator sword set with radiant gems and runes, purple glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_than.png** `a divine god-grade cultivator sword blazing with overwhelming golden light and celestial runes, radiant gold aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🛡️ Giáp (armor)
- **gear_armor_pham.png** `a plain common-grade set of cultivator cloth-and-iron armor robes, faint grey-white glow, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_linh.png** `a fine spirit-grade set of cultivator battle robes with jade accents, green glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_bao.png** `an ornate treasure-grade set of cultivator battle armor with silver-gold filigree, blue glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_tien.png** `a legendary immortal-grade set of cultivator armor with radiant gems and runes, purple glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_than.png** `a divine god-grade set of cultivator armor blazing with golden light and celestial runes, radiant gold aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### ⛑️ Mũ (helmet)
- **gear_helmet_pham.png** `a plain common-grade cultivator headband / simple circlet, faint grey-white glow, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_linh.png** `a fine spirit-grade cultivator circlet with jade accents, green glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_bao.png** `an ornate treasure-grade cultivator war helm with silver-gold filigree, blue glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_tien.png** `a legendary immortal-grade cultivator crown set with radiant gems and runes, purple glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_than.png** `a divine god-grade cultivator crown blazing with golden light and celestial runes, radiant gold aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🥾 Giày (boots)
- **gear_boots_pham.png** `a plain common-grade pair of cultivator cloth boots, faint grey-white glow, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_linh.png** `a fine spirit-grade pair of cultivator boots with jade wind motif, green glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_bao.png** `an ornate treasure-grade pair of cultivator boots with silver-gold filigree, blue glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_tien.png** `a legendary immortal-grade pair of cultivator boots with radiant gems and wind runes, purple glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_than.png** `a divine god-grade pair of cultivator boots blazing with golden light and celestial wind runes, radiant gold aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 💍 Nhẫn (ring)
- **gear_ring_pham.png** `a plain common-grade cultivator spirit ring with a dull stone, faint grey-white glow, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_linh.png** `a fine spirit-grade cultivator ring set with a green jade gem, green glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_bao.png** `an ornate treasure-grade cultivator ring with a blue gemstone and gold filigree, blue glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_tien.png** `a legendary immortal-grade cultivator ring with a radiant purple gem and runes, purple glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_than.png** `a divine god-grade cultivator ring blazing with a golden gem and celestial runes, radiant gold aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🪬 Pháp bảo (talisman)
- **gear_talisman_pham.png** `a plain common-grade jade talisman pendant, faint grey-white glow, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_linh.png** `a fine spirit-grade floating jade talisman with green runes, green glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_bao.png** `an ornate treasure-grade floating talisman artifact with silver-gold filigree, blue glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_tien.png** `a legendary immortal-grade floating talisman artifact with radiant gems and runes, purple glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_than.png** `a divine god-grade floating talisman artifact blazing with golden light and celestial runes, radiant gold aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`

## 4B. ⭐ Trang bị — DÒNG PHỤ b/c/d (icon 1:1) — `gear_<id>.png` — 90 file

> 30 món nền (mục 4) DÙNG LẠI ảnh cũ. 90 món mới dưới đây mỗi món 1 ảnh riêng. Cùng phong cách: glow theo độ hiếm, nền tối, vuông 1:1.

### 🗡️ Vũ khí (weapon)

**Dòng b — Cuồng Đao**
- **gear_weapon_pham_b.png** _(⚪ Phàm)_ `a plain common-grade heavy broad single-edged saber (dao), faint grey-white glow, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade heavy broad single-edged saber (dao), green glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade heavy broad single-edged saber (dao), blue glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade heavy broad single-edged saber (dao), purple glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_than_b.png** _(🟡 Thần)_ `a divine god-grade heavy broad single-edged saber (dao), radiant gold aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Truy Phong Thương**
- **gear_weapon_pham_c.png** _(⚪ Phàm)_ `a plain common-grade swift slender long spear, faint grey-white glow, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade swift slender long spear, green glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade swift slender long spear, blue glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade swift slender long spear, purple glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_than_c.png** _(🟡 Thần)_ `a divine god-grade swift slender long spear, radiant gold aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — Phá Quân Phủ**
- **gear_weapon_pham_d.png** _(⚪ Phàm)_ `a plain common-grade massive crescent battle axe, faint grey-white glow, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade massive crescent battle axe, green glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade massive crescent battle axe, blue glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade massive crescent battle axe, purple glow aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_weapon_than_d.png** _(🟡 Thần)_ `a divine god-grade massive crescent battle axe, radiant gold aura, Chinese xianxia RPG weapon item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🛡️ Giáp (armor)

**Dòng b — Huyền Quy Khải**
- **gear_armor_pham_b.png** _(⚪ Phàm)_ `a plain common-grade heavy turtle-shell lamellar plate armor, faint grey-white glow, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade heavy turtle-shell lamellar plate armor, green glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade heavy turtle-shell lamellar plate armor, blue glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade heavy turtle-shell lamellar plate armor, purple glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_than_b.png** _(🟡 Thần)_ `a divine god-grade heavy turtle-shell lamellar plate armor, radiant gold aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Lưu Vân Sam**
- **gear_armor_pham_c.png** _(⚪ Phàm)_ `a plain common-grade light flowing-cloud silk robe armor, faint grey-white glow, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade light flowing-cloud silk robe armor, green glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade light flowing-cloud silk robe armor, blue glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade light flowing-cloud silk robe armor, purple glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_than_c.png** _(🟡 Thần)_ `a divine god-grade light flowing-cloud silk robe armor, radiant gold aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — Hộ Linh Giáp**
- **gear_armor_pham_d.png** _(⚪ Phàm)_ `a plain common-grade spirit-guard rune-inscribed armor, faint grey-white glow, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade spirit-guard rune-inscribed armor, green glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade spirit-guard rune-inscribed armor, blue glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade spirit-guard rune-inscribed armor, purple glow aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_armor_than_d.png** _(🟡 Thần)_ `a divine god-grade spirit-guard rune-inscribed armor, radiant gold aura, Chinese xianxia RPG armor item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### ⛑️ Mũ (helmet)

**Dòng b — Kim Chiến Khôi**
- **gear_helmet_pham_b.png** _(⚪ Phàm)_ `a plain common-grade heavy horned war helm, faint grey-white glow, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade heavy horned war helm, green glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade heavy horned war helm, blue glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade heavy horned war helm, purple glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_than_b.png** _(🟡 Thần)_ `a divine god-grade heavy horned war helm, radiant gold aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Tụ Linh Quan**
- **gear_helmet_pham_c.png** _(⚪ Phàm)_ `a plain common-grade scholar's spirit-gathering coronet headpiece, faint grey-white glow, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade scholar's spirit-gathering coronet headpiece, green glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade scholar's spirit-gathering coronet headpiece, blue glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade scholar's spirit-gathering coronet headpiece, purple glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_than_c.png** _(🟡 Thần)_ `a divine god-grade scholar's spirit-gathering coronet headpiece, radiant gold aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — Tịnh Minh Quan**
- **gear_helmet_pham_d.png** _(⚪ Phàm)_ `a plain common-grade serene tranquil-mind circlet diadem, faint grey-white glow, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade serene tranquil-mind circlet diadem, green glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade serene tranquil-mind circlet diadem, blue glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade serene tranquil-mind circlet diadem, purple glow aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_helmet_than_d.png** _(🟡 Thần)_ `a divine god-grade serene tranquil-mind circlet diadem, radiant gold aura, Chinese xianxia RPG helmet item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🥾 Giày (boots)

**Dòng b — Truy Phong Ngoa**
- **gear_boots_pham_b.png** _(⚪ Phàm)_ `a plain common-grade swift light wind-chasing boots, faint grey-white glow, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade swift light wind-chasing boots, green glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade swift light wind-chasing boots, blue glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade swift light wind-chasing boots, purple glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_than_b.png** _(🟡 Thần)_ `a divine god-grade swift light wind-chasing boots, radiant gold aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Vân Lý Ngoa**
- **gear_boots_pham_c.png** _(⚪ Phàm)_ `a plain common-grade sturdy heavy cloud-treading boots, faint grey-white glow, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade sturdy heavy cloud-treading boots, green glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade sturdy heavy cloud-treading boots, blue glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade sturdy heavy cloud-treading boots, purple glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_than_c.png** _(🟡 Thần)_ `a divine god-grade sturdy heavy cloud-treading boots, radiant gold aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — U Ảnh Ngoa**
- **gear_boots_pham_d.png** _(⚪ Phàm)_ `a plain common-grade dark shadowy stealth boots, faint grey-white glow, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade dark shadowy stealth boots, green glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade dark shadowy stealth boots, blue glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade dark shadowy stealth boots, purple glow aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_boots_than_d.png** _(🟡 Thần)_ `a divine god-grade dark shadowy stealth boots, radiant gold aura, Chinese xianxia RPG boots item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 💍 Nhẫn (ring)

**Dòng b — Sát Phá Giới**
- **gear_ring_pham_b.png** _(⚪ Phàm)_ `a plain common-grade sharp bladed killing-edge ring, faint grey-white glow, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade sharp bladed killing-edge ring, green glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade sharp bladed killing-edge ring, blue glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade sharp bladed killing-edge ring, purple glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_than_b.png** _(🟡 Thần)_ `a divine god-grade sharp bladed killing-edge ring, radiant gold aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Huyết Hoàn**
- **gear_ring_pham_c.png** _(⚪ Phàm)_ `a plain common-grade blood-red gemstone ring, faint grey-white glow, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade blood-red gemstone ring, green glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade blood-red gemstone ring, blue glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade blood-red gemstone ring, purple glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_than_c.png** _(🟡 Thần)_ `a divine god-grade blood-red gemstone ring, radiant gold aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — Linh Quang Bội**
- **gear_ring_pham_d.png** _(⚪ Phàm)_ `a plain common-grade radiant spirit-light gem ring, faint grey-white glow, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade radiant spirit-light gem ring, green glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade radiant spirit-light gem ring, blue glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade radiant spirit-light gem ring, purple glow aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_ring_than_d.png** _(🟡 Thần)_ `a divine god-grade radiant spirit-light gem ring, radiant gold aura, Chinese xianxia RPG ring item icon, painterly, centered on dark background, square 1:1, no text no watermark`

### 🪬 Pháp bảo (talisman)

**Dòng b — Trấn Nhạc Phù**
- **gear_talisman_pham_b.png** _(⚪ Phàm)_ `a plain common-grade heavy mountain-suppressing stone talisman, faint grey-white glow, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_linh_b.png** _(🟢 Linh)_ `a fine spirit-grade heavy mountain-suppressing stone talisman, green glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_bao_b.png** _(🔵 Bảo)_ `a ornate treasure-grade heavy mountain-suppressing stone talisman, blue glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_tien_b.png** _(🟣 Tiên)_ `a legendary immortal-grade heavy mountain-suppressing stone talisman, purple glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_than_b.png** _(🟡 Thần)_ `a divine god-grade heavy mountain-suppressing stone talisman, radiant gold aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng c — Hộ Linh Phù**
- **gear_talisman_pham_c.png** _(⚪ Phàm)_ `a plain common-grade floating spirit-channeling rune paper talisman, faint grey-white glow, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_linh_c.png** _(🟢 Linh)_ `a fine spirit-grade floating spirit-channeling rune paper talisman, green glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_bao_c.png** _(🔵 Bảo)_ `a ornate treasure-grade floating spirit-channeling rune paper talisman, blue glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_tien_c.png** _(🟣 Tiên)_ `a legendary immortal-grade floating spirit-channeling rune paper talisman, purple glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_than_c.png** _(🟡 Thần)_ `a divine god-grade floating spirit-channeling rune paper talisman, radiant gold aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`

**Dòng d — Ngự Hồn Bài**
- **gear_talisman_pham_d.png** _(⚪ Phàm)_ `a plain common-grade soul-guarding jade plaque talisman, faint grey-white glow, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_linh_d.png** _(🟢 Linh)_ `a fine spirit-grade soul-guarding jade plaque talisman, green glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_bao_d.png** _(🔵 Bảo)_ `a ornate treasure-grade soul-guarding jade plaque talisman, blue glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_tien_d.png** _(🟣 Tiên)_ `a legendary immortal-grade soul-guarding jade plaque talisman, purple glow aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **gear_talisman_than_d.png** _(🟡 Thần)_ `a divine god-grade soul-guarding jade plaque talisman, radiant gold aura, Chinese xianxia RPG talisman item icon, painterly, centered on dark background, square 1:1, no text no watermark`

## 5. ⭐ Kỹ năng (icon 1:1) — `skill_<id>.png` — 48 file (24 gốc + 24 mới GĐ19)

> Prompt skill chung kết: dynamic energy burst, dark background, square 1:1.
> Tách 2 bộ: **Bộ 1** = chiêu gốc (đã có ảnh). **Bộ 2 (5B)** = 24 chiêu MỚI thêm ở GĐ19 (mỗi phái +4 chiêu, mở dần theo cảnh giới) — CẦN gen ảnh. Tên file khớp id trong `skills.js`.

### ⚔️ Kiếm Tông (xanh kiếm khí)
- **skill_kt_tramphong.png** `a crescent blue sword-qi arc slashing through wind, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_lienhoan.png** `a flurry of overlapping blue sword slashes in a combo, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_kiemkhi.png** `a concentrated piercing beam of razor blue sword-qi, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_phathan.png** `an explosive furious sword strike erupting with blue rage energy, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🔥 Huyền Hỏa (lửa đen-đỏ)
- **skill_hh_hoacau.png** `a hurled fireball of black-and-crimson flame, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_liemdiem.png** `a sweeping sickle-shaped black-red flame slash, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_phunhoa.png** `a cone of spewing black-red dragon fire, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_hoanguc.png** `an inferno hellfire vortex of black-red flame engulfing the ground, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 💊 Đan Đỉnh (độc xanh / hồi)
- **skill_dd_liemdoc.png** `a venomous green poison crescent slash with toxic mist, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_hoixuan.png** `a gentle jade-green healing light restoring vitality, Chinese xianxia martial skill ability icon, soft glowing energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_donghoa.png** `a swirling green empowerment buff aura around a figure, Chinese xianxia martial skill ability icon, dynamic energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_kichdoc.png** `a deadly burst of corrosive green poison cloud, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 👊 Cương Thể (vàng kim cương)
- **skill_ct_thietbosam.png** `a golden iron-shirt protective barrier shielding a body, Chinese xianxia martial skill ability icon, glowing defensive energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_bangson.png** `a mountain-shattering golden punch shockwave, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_phanchan.png** `a golden recoil shield reflecting an attack back, Chinese xianxia martial skill ability icon, dynamic energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_thaison.png** `a colossal golden fist slamming down like a falling mountain, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🩸 Huyết Ma (đỏ máu)
- **skill_hm_huyetdao.png** `a crimson blood-saber slash trailing red mist, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_nhiephon.png** `a sinister soul-snatching red spectral hand, Chinese xianxia martial skill ability icon, dark energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_huyette.png** `a blood-sacrifice ritual draining life, red lifesteal energy streams, Chinese xianxia martial skill ability icon, dark energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_mahon.png** `a monstrous demonic soul eruption with overwhelming blood-red dark aura, Chinese xianxia martial skill ability icon, dynamic dark energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🌀 Phong Linh (gió xanh lục)
- **skill_pl_phongnhan.png** `a slicing wind-blade gust of green air currents, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_cuongphong.png** `a violent green tornado storm whirlwind, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_phongton.png** `a swirling green wind-funnel sweeping enemies, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_vanphong.png** `a blur of supersonic green wind-speed motion streaks, Chinese xianxia martial skill ability icon, dynamic energy, painterly, dark background, square 1:1, no text no watermark`

## 5B. ⭐ Kỹ năng MỚI GĐ19 (icon 1:1) — `skill_<id>.png` — 24 file (mỗi phái +4)

> Cùng phong cách bộ 1: `Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`. Giữ đúng MÀU theo phái (Kiếm Tông xanh kiếm khí · Huyền Hỏa lửa đen-đỏ · Đan Đỉnh xanh độc/hồi · Cương Thể vàng kim cương · Huyết Ma đỏ máu · Phong Linh gió xanh lục).

### ⚔️ Kiếm Tông (xanh kiếm khí)
- **skill_kt_phithien.png** `a cultivator riding a glowing blue flying sword soaring through the sky leaving a sword-qi trail, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_kiemvu.png** `a graceful swirling storm of dancing blue spirit swords spiraling like falling leaves, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_dietinh.png** `a massive blue sword strike shattering a star in the night sky, exploding starlight, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_kt_thuongkhung.png** `a colossal heaven-splitting blue sword beam tearing through the firmament, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🔥 Huyền Hỏa (lửa đen-đỏ)
- **skill_hh_hoavu.png** `a falling rain of black-and-crimson fire droplets scattering, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_diemthien.png** `a towering pillar of black-red flames scorching the heavens, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_luuhoa.png** `a chain of streaking black-red flowing fire bolts in a combo, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_phuonghoang.png** `a reborn crimson-black phoenix rising from black-red nirvana flames, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 💊 Đan Đỉnh (độc xanh / hồi)
- **skill_dd_thanhtam.png** `a calming jade-green healing bubble shield enveloping a figure, Chinese xianxia martial skill ability icon, soft glowing energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_doclong.png** `a green venomous serpent-dragon coiling out of toxic mist, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_bachdoc.png** `a swirling cauldron unleashing a hundred green toxic insects and poison mist, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_truongsinh.png** `a radiant jade-green longevity life-force aura enveloping a serene meditating figure, Chinese xianxia martial skill ability icon, soft glowing energy, painterly, dark background, square 1:1, no text no watermark`

### 👊 Cương Thể (vàng kim cương)
- **skill_ct_thiethoa.png** `a cultivator's body turning to golden iron behind a glowing protective barrier, Chinese xianxia martial skill ability icon, glowing defensive energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_locson.png** `a heavy golden fist crushing down with the force of a falling mountain, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_batdong.png** `an immovable golden vajra guardian-king stance radiating overwhelming power, Chinese xianxia martial skill ability icon, glowing defensive energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_hongmong.png** `a colossal golden primordial mountain slamming down to seal the earth, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🩸 Huyết Ma (đỏ máu)
- **skill_hm_huyetlinh.png** `a crimson blood-spirit claw raking with red mist, Chinese xianxia martial skill ability icon, dynamic dark energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_xichnguc.png** `twin crimson blood-saber slashes erupting from a hellish red rift, Chinese xianxia martial skill ability icon, dynamic dark energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_phelinh.png** `a sinister red soul-devouring maw draining crimson life essence from a victim, Chinese xianxia martial skill ability icon, dynamic dark energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_thienma.png** `a monstrous towering blood-red heavenly demon erupting with overwhelming dark aura, Chinese xianxia martial skill ability icon, dynamic dark energy burst, painterly, dark background, square 1:1, no text no watermark`

### 🌀 Phong Linh (gió xanh lục)
- **skill_pl_liemphong.png** `three green crescent wind sickle-blades slicing through the air, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_phongtieu.png** `a swirling storm of countless green wind feathers dancing in the sky, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_tuyetphong.png** `a blurring afterimage trail of supreme green wind-speed body movement, Chinese xianxia martial skill ability icon, dynamic energy, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_caphong.png** `a massive raging green super-tornado devouring the sky, Chinese xianxia martial skill ability icon, dynamic energy burst, painterly, dark background, square 1:1, no text no watermark`

## 5C. Nội công — Tâm pháp (passive, icon 1:1) — `skill_<id>.png` — 6 file

> 6 bị động (mỗi phái 1) — phong cách "hào quang / tâm pháp" tĩnh hơn (glowing aura emblem) thay vì energy burst. Giữ đúng màu phái.

- **skill_kt_kiemtam.png** `a serene glowing blue sword-heart spirit core radiating sharp clarity, Chinese xianxia inner-cultivation passive aura icon, painterly, dark background, square 1:1, no text no watermark`
- **skill_hh_hoaphach.png** `a smoldering black-and-crimson fire-soul ember core pulsing with heat, Chinese xianxia inner-cultivation passive aura icon, painterly, dark background, square 1:1, no text no watermark`
- **skill_dd_duoclinh.png** `a jade-green medicinal spirit-body aura with floating healing herbs, Chinese xianxia inner-cultivation passive aura icon, painterly, dark background, square 1:1, no text no watermark`
- **skill_ct_kimcuong.png** `a golden indestructible diamond-body silhouette with a vajra protective glow, Chinese xianxia inner-cultivation passive aura icon, painterly, dark background, square 1:1, no text no watermark`
- **skill_hm_hapsinh.png** `a sinister swirling red star-absorbing vortex draining essence into a core, Chinese xianxia inner-cultivation passive dark aura icon, painterly, dark background, square 1:1, no text no watermark`
- **skill_pl_phongthan.png** `a swirling green wind-god footwork aura with drifting feathers around a silhouette, Chinese xianxia inner-cultivation passive aura icon, painterly, dark background, square 1:1, no text no watermark`

## 6. ⭐ Boss thế giới (chân dung 1:1) — `boss_<key>.png` — 5 file

- **boss_huyet_lang.png** `a colossal blood-red demonic wolf with crimson fur and glowing eyes, menacing, Chinese xianxia RPG world-boss creature portrait, painterly, epic dramatic lighting, square 1:1, no text no watermark`
- **boss_thiet_giap.png** `a mountainous black iron-shell ancient guardian turtle, immovable fortress beast, Chinese xianxia RPG world-boss creature portrait, painterly, epic lighting, square 1:1, no text no watermark`
- **boss_cuu_u.png** `a nine-layered abyssal demonic serpent-dragon coiled in dark yin energy, Chinese xianxia RPG world-boss creature portrait, painterly, ominous lighting, square 1:1, no text no watermark`
- **boss_kim_si.png** `a vast golden-winged roc eagle with enormous wings blotting out the sky, Chinese xianxia RPG world-boss creature portrait, painterly, epic lighting, square 1:1, no text no watermark`
- **boss_hon_don.png** `a primordial chaos god of the void with a body of swirling black nothingness and cosmic eyes, Chinese xianxia RPG world-boss portrait, painterly, surreal cosmic lighting, square 1:1, no text no watermark`

## 7. Đan dược (icon 1:1) — `pill_<id>.png` — 6 file

- **pill_tu_khi_dan.png** `a glowing green spirit-gathering pill on a jade dish with sparkles, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **pill_boi_nguyen_dan.png** `a glowing deep-blue origin-nourishing elixir pill, azure aura, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **pill_ho_dao_dan.png** `a shimmering silver protective tribulation pill with a guardian glow, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **pill_cuong_the_dan.png** `a golden body-strengthening pill radiating warm light, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **pill_tao_hoa_dan.png** `a five-colored creation elixir pill swirling with rainbow energy, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **pill_cuu_chuyen_dan.png** `a supreme golden nine-revolution god pill blazing with divine light, Chinese xianxia RPG alchemy pill item icon, painterly, centered on dark background, square 1:1, no text no watermark`

## 8. Nguyên liệu (icon 1:1) — `mat_<id>.png` — 8 file

> Các ảnh `mat_*` & `pill_*` này CŨNG hiện trong **Phường Thị** (thẻ shop kiểu kệ RPG) — gen xong là shop tự thay tile chữ thành ảnh thật.

- **mat_refine.png** ⭐ *(🔩 Tinh Thiết — bán ở shop, vật phẩm cường hóa)* `a chunk of refined star-steel forging ingot with a metallic blue-silver sheen and faint runic glow, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_linh_chung.png** `a small glowing spirit seed sprouting a tiny green sprout, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_linh_thao.png** `a bundle of glowing jade-green spirit herb grass, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_yeu_dan.png** `a glowing orb-shaped beast inner-core demon pellet with a purple swirl, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_huyet_tinh.png** `a crystallized red blood-essence gem with a faint crimson glow, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_long_can.png** `a coiled glowing golden dragon sinew tendon with scales, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_hu_tinh.png** `a fragment of starry void-stone meteorite with cosmic shimmer, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`
- **mat_co_phach.png** `an ancient ghostly remnant soul relic with eerie grey wisps, Chinese xianxia RPG crafting material item icon, painterly, centered on dark background, square 1:1, no text no watermark`

## 9. Bí cảnh (banner 16:9) — `zone_<id>.png` — 5 file

- **zone_me_vu.png** `a foggy mist-maze spirit forest with eerie glowing trees, Chinese xianxia RPG secret-realm landscape, painterly, moody lighting, wide 16:9 banner, no text no watermark`
- **zone_hoa_diem.png** `a volcanic lava lake cavern with rivers of fire, Chinese xianxia RPG secret-realm landscape, painterly, fiery lighting, wide 16:9 banner, no text no watermark`
- **zone_long_cot.png** `an ancient dragon-bone cave full of giant skeletal remains, Chinese xianxia RPG secret-realm landscape, painterly, eerie lighting, wide 16:9 banner, no text no watermark`
- **zone_hu_khong.png** `a void rift in space revealing swirling stars and broken reality, Chinese xianxia RPG secret-realm landscape, painterly, cosmic lighting, wide 16:9 banner, no text no watermark`
- **zone_co_chien.png** `an ancient ruined battlefield shrouded in grey resentful spirit energy, Chinese xianxia RPG secret-realm landscape, painterly, somber lighting, wide 16:9 banner, no text no watermark`

## 10. Banner chung khác — `<key>.png`

- **shop.png** (banner túi mua sắm) `a bustling xianxia market street selling glowing pills, ores, herbs and weapons under red lanterns, Chinese xianxia RPG art, painterly, warm lighting, wide 16:9 banner, no text no watermark`
- **bag.png** (banner túi đồ) `an open spirit pouch spilling glowing herbs, pills and spirit stones, Chinese xianxia RPG art, painterly, warm lighting, wide 16:9 banner, no text no watermark`
- **quest.png** (banner nhiệm vụ) `an ancient quest scroll with a glowing seal beside a journey map, Chinese xianxia RPG art, painterly, warm lighting, wide 16:9 banner, no text no watermark`
- **story.png** (banner cốt truyện) `a lone cultivator beginning an epic journey on a mountain path under a vast sky, Chinese xianxia RPG art, painterly, cinematic lighting, wide 16:9 banner, no text no watermark`
- **foe_wild.png** (yêu hoang Săn Yêu) `a feral snarling wild demonic beast of the wilderness, Chinese xianxia RPG creature portrait, painterly, dramatic lighting, square 1:1, no text no watermark`
- **foe_tower.png** (quái Thí Luyện Tháp) `an armored stone guardian challenger of a trial tower, Chinese xianxia RPG creature portrait, painterly, dramatic lighting, square 1:1, no text no watermark`
- **npc_dau.png** (đài chủ NPC Đấu Pháp) `a confident rival cultivator dueling champion in a battle stance, Chinese xianxia RPG character portrait, painterly, dramatic lighting, square 1:1, no text no watermark`

---

## Dùng URL thay vì file (tùy chọn)
Nếu host ảnh ngoài (Imgur/CDN), điền vào các map trong `assets.js` (URL ưu tiên hơn file local):
`REALM_URL` · `SECT_URL` · `PANEL_URL` · `GEAR_URL` (key `'<slot>_<rarity>'`) · `SKILL_URL` · `MISC_URL` (key `boss_<key>` / `pill_<id>` / `mat_<id>` / `zone_<id>` / `shop` / `bag` …).

> 💡 Mẹo Midjourney: thêm `--ar 16:9` cho banner, `--ar 1:1` cho icon, và `--style raw` để bám prompt.
