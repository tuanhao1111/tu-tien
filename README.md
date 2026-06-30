# 🧘 Tiên Đồ Lộ — Bot game tu tiên Discord

Bot game chủ đề **tu tiên / kiếm hiệp**. Đây là **bản MVP**: tu luyện tích tu vi → đột phá cảnh giới → mạnh hơn → lặp lại.

> Game này nằm trong thư mục riêng, **không liên quan** tới bot "Đời Là Bể Khổ" ở thư mục cha. Dữ liệu lưu riêng trong `tu-tien.db`.

## Lệnh hiện có

| Lệnh | Công dụng |
|------|-----------|
| `/batdau` | Nhập đạo, tạo nhân vật (bắt đầu từ Phàm Nhân) |
| `/tuluyen` | **Vận công** tích tu vi: chọn thời gian → nhận tu vi sau khi vận công (đủ giờ kể cả offline; thu sớm nhận 1 phần). Có **chế độ Voice** chọn ngay trong lệnh |
| `/bequan` | Bế quan tích tu vi theo thời gian (cả khi offline). Bảng hiển thị **thời gian đã bế quan**; bấm **Xuất quan** để nhận |
| `/dotpha` | Đột phá khi đủ tu vi. Vượt **cảnh giới** = **độ kiếp**, có rủi ro! |
| `/cottruyen` | **Cốt truyện chính** "Tiên Đồ Lộ Ký" — dẫn dắt từng bước qua từng cảnh giới |
| `/hoso [ai]` | Xem đạo tịch: cảnh giới, tu vi, linh thạch, hạng |
| `/monphai` | **Môn phái** — gia nhập / đổi phái (mở ở Trúc Cơ) |
| `/kynang` | Xem & trang bị tối đa 3 chiêu chủ động của phái |
| `/dautap` | Đấu tập với mộc nhân để thử kỹ năng combat |
| `/bicanh` | **Bí Cảnh (PvE)** — thám hiểm theo tầng, săn yêu thú & nguyên liệu (mở ở Kim Đan) |
| `/luyendan` | **Luyện Đan** — chế đan từ nguyên liệu Bí Cảnh: đan trợ tu & cứu mạng độ kiếp (mở ở Kim Đan) |
| `/luyentruong` | **Luyện Trường** — Linh Điền, Săn Yêu, Thí Luyện Tháp (mở ở Kim Đan) |
| `/dauphap` | **Đấu Pháp (PvP)** — Luận Võ Đài tỉ thí xếp hạng (mở ở Nguyên Anh) |
| `/tinhnang` | Cây mở khóa tính năng theo cảnh giới |
| `/setup` | **[Admin]** Đăng/cập nhật panel cố định ở các kênh đã cấu hình |
| `/quantri` | **[Admin]** Bảng quản trị: chỉnh linh thạch/tu vi/cảnh giới/điểm/nguyên liệu/đan/trang bị/phái/điểm PvP, reset cooldown, xóa tu sĩ |
| `/top [loại]` | Bảng xếp hạng (cảnh giới / linh thạch / đấu pháp) |
| `/trogiup` | Hướng dẫn nhập môn + danh sách cảnh giới |

Tất cả tính năng đã hoàn thiện — **không còn tính năng "sắp ra mắt"**.

## Bí Cảnh (PvE)
Đạt **Kim Đan**, gõ `/bicanh` chọn một bí cảnh để xông vào. Đánh yêu thú theo **tầng**; thắng thì gom chiến lợi phẩm rồi tự quyết:
- **⚔️ Đi sâu hơn** — yêu thú mạnh hơn nhưng thưởng hậu hơn (mỗi 5 tầng có **BOSS**).
- **🚪 Rời bí cảnh** — nhận toàn bộ thu hoạch vào túi.

⚠️ **Gục giữa bí cảnh = mất hết đồ chưa nhận!** Máu mang theo giữa các tầng (chỉ hồi nhẹ) nên càng xuống sâu càng rủi ro — biết điểm dừng là cả một nghệ thuật. Nguyên liệu nhặt được mang đi **Luyện Đan**.

## Luyện Trường (khu farm)
Đạt **Kim Đan**, gõ `/luyentruong` (hoặc panel Luyện Trường) để mở 3 khu rèn luyện:
- 🌱 **Linh Điền** — vườn linh dược tự tích nguyên liệu theo thời gian (cả khi offline); ghé **Thu hoạch**.
- 🐗 **Săn Yêu** — đánh nhanh 1 yêu hoang kiếm linh thạch + tu vi (cooldown ngắn, thua không mất gì).
- 🗼 **Thí Luyện Tháp** — leo tháp vô tận: thắng thì lên tầng, thưởng càng cao; thua giữ nguyên kỷ lục. Có **⚡ Quét** gom nhanh thưởng tới tầng cao nhất đã đạt (tốn cooldown như leo). Cần môn phái.

## Đấu Pháp (PvP)
Đạt **Nguyên Anh** + có môn phái, gõ `/dauphap` (hoặc panel **Đấu Pháp Đài**) để lên **Luận Võ Đài**:
- Bấm **⚔️ Khiêu chiến** → hệ thống ghép một cao thủ **ngang điểm**, đánh **bản sao chỉ số** của họ (**không cần đối thủ online**). Chưa có ai ngang sức thì ghép **đài chủ NPC** cùng bậc.
- **Điểm đấu (ELO):** thắng **+điểm** + thưởng (linh thạch + chút tu vi), thua **−điểm** (không mất gì khác). Cooldown ngắn mỗi trận.
- **Danh hiệu** leo dần theo điểm (*Vô Danh Tiểu Tốt → … → Thiên Hạ Đệ Nhất*); thăng hạng được loan báo ở **Vọng Âm Đài**. Xem **🏆 Luận Võ Bảng** để so tài.
- Dùng **đúng** chỉ số combat của bạn → cộng thuộc tính, nâng chiêu, đổi loadout & trang bị đều có tác dụng.

## Luyện Đan
Đạt **Kim Đan**, gõ `/luyendan` để đốt lò chế đan từ nguyên liệu gom ở Bí Cảnh:
- **Đan tu vi** (Tụ Khí / Bồi Nguyên / Cường Thể / Cửu Chuyển Kim Đan) — uống tức thì, cộng tu vi theo **%** lượng cần lên bậc (giữ giá trị ở mọi cảnh giới).
- **Đan độ kiếp** (Hộ Đạo / Tạo Hóa Đan) — giữ trong túi, **tự động dùng** khi `/dotpha` vượt cảnh giới để cộng tỉ lệ thành công (cứu mạng lúc độ kiếp).

⚠️ Luyện đan có **rủi ro** — thất bại vẫn mất nguyên liệu & linh thạch (tỉ lệ thành cao hơn khi cảnh giới vượt mức yêu cầu của đan phương).

## Panel đa kênh (cho admin)
Bot hỗ trợ **panel cố định** ở từng kênh để người chơi bấm tương tác (vẫn dùng được slash command song song):
- 🌄 **Sơ Nhập** — nút "Nhập đạo" đăng ký; nút **🧭 Bắt đầu hành trình** dẫn người mới sang kênh Nhiệm Vụ.
- 🧘 **Tu Luyện** — chọn cách tu hành: 🧘 Vận công · 🚪 Bế quan · 🎙️ Voice (tự động) · 💊 Luyện đan.
- ⚡ **Đột Phá Đường** — kênh riêng để đột phá tầng & độ kiếp vượt cảnh giới.
- 📜 **Nhiệm Vụ** — cốt truyện chính + nhiệm vụ hằng ngày.
- 🏯 **Môn Phái** — xem & đặt nguyện vọng bái nhập phái.
- 📜 **Hồ Sơ** — chỉ số, **thuộc tính**, **nâng cấp chiêu**, **trang bị**, **📖 Hướng dẫn** (cẩm nang đầy đủ), **🎒 Túi đồ**.
- ⛰️ **Luyện Trường** — 🌱 Linh Điền (vườn idle) · 🐗 Săn Yêu · 🗼 Thí Luyện Tháp · 🗺️ Bí Cảnh.
- ⚔️ **Đấu Pháp Đài** — Luận Võ Đài tỉ thí xếp hạng (PvP, mở ở Nguyên Anh).
- 🏔️ **Bảng Xếp Hạng** — Phong Vân Bảng (cảnh giới), Phú Hào Bảng (linh thạch) & Luận Võ Bảng (đấu pháp); nút xem realtime.
- 📣 **Vọng Âm Đài** — *feed thông báo* (không phải panel): bot tự loan báo độ kiếp, hạ boss bí cảnh, thần đan, thăng hạng đấu pháp… vào đây.

Cách bật: điền ID kênh vào `.env` (`CH_SO_NHAP/CH_TU_LUYEN/CH_DOT_PHA/CH_NHIEM_VU/CH_MON_PHAI/CH_HO_SO/CH_LUYEN_TRUONG/CH_DAU_DAI/CH_BANG_XEP_HANG/CH_VONG_AM_DAI`) rồi chạy `/setup` (cần quyền Manage Guild). Vọng Âm Đài chỉ cần điền ID, **không cần `/setup`**. Chạy lại `/setup` để cập nhật panel.

> **Quản trị (admin):** lệnh `/quantri` cho phép role admin (`ADMIN_ROLE_ID`) hoặc người có quyền *Manage Guild* chỉnh trực tiếp dữ liệu tu sĩ — cấp/trừ linh thạch, tu vi, đặt cảnh giới, điểm thuộc tính/nâng chiêu, nguyên liệu, đan, trang bị, môn phái, điểm Đấu Pháp, reset cooldown, hoặc xóa tu sĩ. Số âm = trừ. Phản hồi chỉ admin thấy.

> **Khóa lệnh theo kênh:** lệnh hành động (tu luyện/bí cảnh/luyện đan/môn phái…) chỉ dùng đúng kênh của nó (chống dùng sai chỗ); lệnh xem (`/hoso`, `/top`, `/trogiup`, `/tinhnang`) dùng tự do. Chỉ chặn khi kênh đã được cấu hình trong `.env`.

> **Quét bí cảnh:** sau khi vượt sâu trong một bí cảnh, `/bicanh` ghi **tầng sâu nhất** và mở nút **⚡ Quét** — gom nhanh thưởng tới tầng đó không phải đánh lại (tốn cooldown như vào bí cảnh).

## Thuộc tính & cấp chiêu
- Mỗi lần **đột phá** (tầng hoặc độ kiếp) nhận **điểm thuộc tính** → vào panel **Hồ Sơ** cộng vào 5 thuộc tính: 🪨 Căn Cốt (HP), 🌟 Linh Lực (Công), 🛡️ Thể Phách (Phòng), 🌀 Thân Pháp (Tốc/Né), 🔮 Ngộ Tính (Bạo kích). Mỗi phái hợp 2 thuộc tính chính (⭐).
- **Chiêu mở khóa theo cảnh giới**: vào phái có 3 chiêu; **tuyệt kỹ** mở ở **Nguyên Anh**. Mỗi **độ kiếp** thành công cho **điểm nâng chiêu** → "Quản lý chiêu" ở Hồ Sơ để cường hóa. Mỗi bậc còn tự buff nhẹ chiêu.

## Nhiệm vụ hằng ngày
`/nhiemvu` (hoặc panel Nhiệm Vụ) — tu luyện, luận đạo, đột phá, bí cảnh… hoàn thành để lãnh thưởng, reset mỗi ngày.

## Gia nhập môn phái (qua nhiệm vụ)
Đạt **Trúc Cơ** + đi cốt truyện tới chương "Bái Nhập Sư Môn": tới panel Môn Phái (hoặc `/monphai`) **đặt nguyện vọng** phái, rồi hoàn thành **nghi thức nhập môn** trong cốt truyện mới chính thức vào phái.

### Nhiệm vụ nhập môn + trang bị
Vào phái, đệ tử mới chỉ được truyền **1 chiêu cơ bản**. Mở panel Môn Phái → **📿 Nhiệm vụ nhập môn** làm chuỗi 3 bước (tu luyện → thắng đấu tập → đột phá):
- **Mở dần 2 chiêu cơ bản** còn lại (tuyệt kỹ vẫn mở ở Nguyên Anh).
- Nhận **bộ trang bị nhập môn** riêng của phái (3 món Vũ khí/Giáp/Phụ kiện) — cộng chỉ số phẳng vào combat, xem ở **Hồ Sơ**.

*(Đổi phái: đệ tử kỳ cựu được mở sẵn cả 3 chiêu + nhận trọn bộ trang bị phái mới.)*

## Môn phái & combat
Đạt **Trúc Cơ**, cốt truyện dẫn tới chương "Bái Nhập Sư Môn" → gõ `/monphai` chọn **1 trong 6 phái**, mỗi phái một lối đánh cân bằng & khắc chế nhau:

| Phái | Lối đánh |
|---|---|
| ⚔️ Kiếm Tông | Bạo kích, sát thương đơn bùng nổ |
| 🔥 Huyền Hỏa Môn | Thiêu đốt theo thời gian |
| 💊 Đan Đỉnh Lâu | Hồi máu, độc, trường kỳ |
| 👊 Cương Thể Môn | Trâu bò, phản đòn |
| 🩸 Huyết Ma Giáo | Hút máu, làm suy yếu |
| 🌀 Phong Linh Tông | Tốc độ, né tránh, đa đòn |

Mỗi phái có **1 bị động** (tự áp dụng) + **kho 4 chiêu chủ động** → trang bị tối đa **3** qua `/kynang`. Combat theo lượt (engine ở `combat.js`), thử ngay ở `/dautap`. Chỉ số combat phái sinh từ cảnh giới (cảnh giới cao luôn áp đảo).

> **Đổi phái:** tốn linh thạch (`config.sect.switchCost`) và **khóa đổi tiếp 12 giờ** (`switchLockMs`); sau **1 ngày** (`freeReturnMs`) được **quay về phái cũ MIỄN PHÍ**. Chỉnh ở `config.sect`.

> Số liệu cân bằng nằm trong `skills.js` / `sects.js` / `combat.js` — đã mô phỏng ~5.000 trận/cặp, tỉ lệ thắng mỗi phái rơi vào ~48–65%.

Ngoài ra: **chat trong server** tự tích chút **ngộ tính** (tu vi) cho người đã `/batdau`.

## Tu luyện 🧘 (vận công có thời gian) & Voice 🎙️
`/tuluyen` mở **bảng tu luyện**: chọn một mốc thời gian (5/15/30/60/120 phút) để **vận công** → đủ giờ (kể cả offline) nhận **~3 tu vi/phút**; thu sớm vẫn nhận theo phần thời gian đã trôi. Bảng hiển thị tiến độ phiên đang chạy.

Ngay trong `/tuluyen` còn có **chế độ Voice**: bấm **Bật Voice** rồi ngồi kênh thoại để tích **~3 tu vi/phút** — chỉ tính khi đã bật chế độ này. Để khuyến khích tu luyện cộng đồng & chống cày AFK: cần **≥2 người thật** cùng kênh, bỏ qua kênh AFK, **trần ~4 giờ/ngày**. Nhớ **Tắt Voice** khi muốn vận công thường. Chỉnh ở `config.cultivate` & `config.voice`.

## Cốt truyện & mở khóa tính năng
Sau `/batdau`, người chơi bấm **"🧭 Bắt đầu hành trình"** để được dẫn sang **kênh Nhiệm Vụ**, nơi mở bảng cốt truyện (📖 Cốt truyện) và nhiệm vụ ngày. Mỗi chương gắn với một cảnh giới; đi hết cảnh → lãnh thưởng → mở chương kế. **Đột phá lên cảnh giới mới sẽ mở khóa tính năng mới** (khóa cứng: chưa đủ cảnh giới thì lệnh bị từ chối, báo cần lên cảnh giới nào).

Nội dung truyện nằm ở `story.js`, sổ mở khóa ở `features.js` — cả hai đều dễ sửa.

## Con đường cảnh giới
🧍 Phàm Nhân → 🌬️ Luyện Khí → 🏛️ Trúc Cơ → 🟡 Kim Đan → 👶 Nguyên Anh → ✨ Hóa Thần → 🌀 Luyện Hư → ☯️ Đại Thừa → ⚡ Độ Kiếp → 🪙 Tiên Nhân

Mỗi cảnh giới có 9 tầng. Lên tầng = đột phá nhỏ (chắc thành). Vượt sang cảnh giới mới = **độ kiếp**, có % thành/bại — thất bại thì tổn tu vi.

## Cài đặt

Yêu cầu: **Node.js 18+**.

```bash
# Ở TRONG thư mục tu-tien/

# 1. (Tùy chọn) Cài thư viện riêng. Nếu chạy chung với bot cha thì
#    Node tự tìm node_modules ở thư mục cha, có thể bỏ qua bước này.
npm install

# 2. Tạo .env từ mẫu rồi điền token
cp .env.example .env
#    DISCORD_TOKEN, CLIENT_ID, GUILD_ID  (nên dùng 1 BOT KHÁC với game cũ)

# 3. Đăng ký lệnh lên server (chạy 1 lần / mỗi khi đổi lệnh)
npm run deploy

# 4. Khởi động bot
npm start
```

> ⚠️ Nên tạo **một Application/bot Discord riêng** cho game tu tiên (token khác), để chạy song song mà không đụng bot cũ.

## Cấu trúc

```
tu-tien/
├── index.js            # Bot chính: nạp lệnh, sự kiện, ngộ tính khi chat
├── deploy-commands.js  # Đăng ký slash command
├── config.js           # MỌI thông số game (tu vi, cooldown, tỉ lệ độ kiếp...) chỉnh ở đây
├── cultivation.js      # Hệ thống cảnh giới: công thức tu vi, đột phá, độ kiếp (thuần)
├── database.js         # SQLite + thao tác tu sĩ
├── commands/           # Mỗi lệnh 1 file
└── tu-tien.db          # Tự sinh khi chạy lần đầu (dữ liệu người chơi)
```

## Tinh chỉnh nhanh
Mở `config.js` đổi số: tu vi mỗi lần tu luyện, cooldown, tốc độ bế quan, tỉ lệ độ kiếp, thưởng linh thạch, độ khó tăng tiến (`progression.growth`)...

## Lộ trình
✅ **Đã xong:** Tu luyện · Cốt truyện · Môn phái & Combat · Bí Cảnh (PvE) · Luyện Đan · Thuộc tính & cấp chiêu · Trang bị & nhiệm vụ nhập môn · Khu farm (Luyện Trường) · Voice tu luyện · Panel đa kênh · **Đấu Pháp (PvP — Luận Võ Đài)**.

🔮 **Có thể mở rộng:** Đấu Pháp khiêu chiến trực tiếp + mùa giải · Tông môn (bang/hội) & chiến tông môn · Pháp bảo cao cấp · thêm bí cảnh/đan phương/nhiệm vụ ngày.
