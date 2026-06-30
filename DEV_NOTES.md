# 📌 DEV NOTES — Bàn giao dự án "Tiên Đồ Lộ" (bot game tu tiên Discord)

> File này để **tiếp tục dự án ở session Claude Code mới**. Đọc hết file này + `README.md` là nắm được toàn bộ.

## 0. Bối cảnh
- Đây là **game MỚI** (chủ đề tu tiên), nằm trong thư mục riêng `tu-tien/`, **không đụng** tới game cũ "Đời Là Bể Khổ" ở thư mục cha (`discord game/`).
- Game cũ giữ nguyên; loader của nó chỉ đọc thư mục của nó nên không xung đột.
- Stack: Node 18+, discord.js v14, better-sqlite3, dotenv. Dùng chung `node_modules` của thư mục cha.

## 1. ⚠️ RÀNG BUỘC MÔI TRƯỜNG (quan trọng)
- `node_modules/better-sqlite3` trong dự án là **bản build cho Linux** (game cũ chạy trên host Pterodactyl). Trên **Windows này KHÔNG load được** ("not a valid Win32 application").
- Hệ quả: mọi file **require `./database`** (tức các lệnh + index.js) **không chạy được trên Windows** để test trực tiếp. Chỉ `node --check` (cú pháp) được.
- Các module **thuần** (không đụng DB) thì **test thoải mái** trên Windows: `cultivation.js`, `story.js`, `features.js`, `skills.js`, `sects.js`, `combat.js`.
- Cách chạy thật: deploy lên host Linux (`npm run deploy` đăng ký lệnh, `npm start`). Hoặc `cd tu-tien && npm install` trên máy chạy bot để build lại binary đúng nền tảng.
- **Nên dùng 1 Application/bot Discord RIÊNG** (token khác game cũ) để chạy song song. `.env` cần: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.

## 2. Trạng thái hiện tại — ĐÃ LÀM XONG
6 giai đoạn đã hoàn thành (tất cả test logic thuần đã pass; lệnh DB mới chỉ test cú pháp):

### GĐ1 — Core tu luyện
- 10 cảnh giới × 9 tầng (73 bậc): Phàm Nhân → Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần → Luyện Hư → Đại Thừa → Độ Kiếp → Tiên Nhân.
- Tu vi cần = `50 × 1.16^bậc`. Đột phá tầng nhỏ chắc thành; vượt cảnh giới = **độ kiếp** (rủi ro, 90%→sàn 45%, thất bại mất 30% tu vi).
- Lệnh: `/batdau /tuluyen /bequan /dotpha /hoso /top /trogiup`. Tiền tệ: 💎 Linh Thạch.

### GĐ2 — Cốt truyện + mở khóa tính năng
- Engine cảnh tự chứa (line/choice/task) ở `story.js` + `commands/cottruyen.js`. Tiến độ bền ở bảng `story_progress`.
- 7 chương, gắn cảnh giới. Sau `/batdau` có nút "📖 Bắt đầu hành trình".
- Mở khóa tính năng theo cảnh giới (**khóa cứng**) ở `features.js`; xem cây mở khóa: `/tinhnang`.

### GĐ3 — Môn phái + Combat (vừa xong)
- 6 phái cân bằng, mở ở **Trúc Cơ** (realm 2): ⚔️ Kiếm Tông, 🔥 Huyền Hỏa Môn, 💊 Đan Đỉnh Lâu, 👊 Cương Thể Môn, 🩸 Huyết Ma Giáo, 🌀 Phong Linh Tông.
- Mỗi phái: 1 bị động + 4 chủ động (trang bị tối đa 3). Tổng 30 skill ở `skills.js`.
- Engine combat theo lượt ở `combat.js` (HP/Công/Phòng/Tốc/Linh Lực phái sinh từ cảnh giới; có bạo kích, né, khiên, phản đòn, hút máu, DoT, buff/debuff). Dùng chung cho PvE/PvP về sau.
- Lệnh: `/monphai` (gia nhập/đổi, đổi tốn 💎200), `/kynang` (đổi loadout), `/dautap` (đấu tập mộc nhân để test).
- Cốt truyện: chương "Bái Nhập Sư Môn" (Trúc Cơ) có mục tiêu `join_sect` → dẫn người chơi tới `/monphai`.
- **Cân bằng:** mô phỏng ~5.000 trận/cặp, tỉ lệ thắng mỗi phái ~48–65% (khắc chế kéo-búa-bao: độc khắc tank, tank khắc cận chiến, né khắc pháp sư...).

### GĐ4 — Bí Cảnh (PvE) (vừa xong)
- Lệnh `/bicanh` (mở khóa **Kim Đan**, realm 3). Tái dùng `combat.js`; cần có môn phái mới vào được.
- **Cơ chế lượt thám hiểm:** chọn 1 bí cảnh → đánh yêu thú từng **TẦNG**. Thắng thì gom chiến lợi phẩm (CHƯA nhận); chọn **⚔️ Đi sâu** (yêu thú mạnh hơn, thưởng hậu hơn) hoặc **🚪 Rời** (nhận thưởng vào túi). **THUA = trọng thương, mất hết đồ chưa nhận.** Máu **mang theo** giữa các tầng (hồi nhẹ `hpCarryRegen`) → đi sâu càng rủi ro. Mỗi 5 tầng có **BOSS**.
- **5 bí cảnh** mở dần theo cảnh giới (`me_vu` Kim Đan → `co_chien` Đại Thừa). Khác nhau ở **loot + nguyên liệu cấp cao**, KHÔNG khó gấp bội (chỉ số yêu thú đã scale theo cảnh giới qua `combat.build`; `statMult` vùng chỉ 1.0–1.16).
- **Nguyên liệu** (6 loại, `bicanh.js` `MATERIALS`) rớt ra → lưu túi đồ JSON cột `materials`. **Để dành cho Luyện Đan** (chưa làm).
- Thưởng/lượt: linh thạch + tu vi (cộng thẳng `tu_vi`, KHÔNG tự đột phá) + nguyên liệu. Cooldown vào bí cảnh `config.bicanh.cooldownMs` (8'), tính từ lúc VÀO.
- **Trạng thái lượt giữ TRONG BỘ NHỚ** (`runs` Map trong `commands/bicanh.js`), TTL 30'. ~~Bot restart giữa lượt thì mất lượt đó~~ → **GĐ13: đã bền hóa xuống cột `bicanh_run`, sống sót qua restart.**
- **Cân bằng (mô phỏng):** mọi phái clear vững ~4 tầng; phái trâu/hút máu (Cương Thể, Huyết Ma) đẩy tới boss tầng 5 (~50–86%), phái khác ~4–11% — không phái nào bị khóa 0%. Cần gạt: `config.bicanh` + `bicanh.js` (`floorPower`, `BOSS_STAT`, `BOSS_HP`, `statMult/lootMult` mỗi vùng).

### GĐ5 — UX panel đa kênh + thuộc tính + cấp/nâng chiêu + nhiệm vụ ngày (vừa xong)
Thay đổi lớn theo yêu cầu chủ dự án. **Combat cốt lõi không vỡ:** `combat.build(name,realm,tier,sectId,equipped, opts={})` — `opts` mặc định rỗng → build cũ & quái vật ra **y hệt**.
- **Thuộc tính gốc** (`attributes.js`): 5 thuộc tính (Căn Cốt→HP, Linh Lực→Công/Linh Lực, Thể Phách→Phòng, Thân Pháp→Tốc/Né, Ngộ Tính→Bạo Kích). Mỗi đột phá (tầng HOẶC độ kiếp) +`config.attributes.pointsPerTier` (2) điểm. Cộng PHẲNG sau bias/mods. `combatBonus()` là nguồn sự thật; combat.build nhận `opts.attrs`. Rửa điểm tốn `respecCost`. Mỗi phái có `primaryAttrs` (gợi ý). Lợi thế full-dump-vs-0 (chéo phái) ~56–59% — đáng kể, bị chặn.
- **Mở khóa chiêu theo cấp + nâng qua độ kiếp** (`skills.js` `unlockRealm`, `unlockedActivesForSect`): tuyệt kỹ mỗi phái khóa tới **realm 4** (Nguyên Anh); 3 chiêu còn lại = loadout mặc định ở realm 2. Buff tự động mỗi bậc kể từ khi gia nhập (`opts.stagesSinceJoin` × `config.skills.perStageBuff`). Nâng cấp chiêu bằng **điểm nâng chiêu** (+1 mỗi độ kiếp thành công) → `skill_levels` JSON, tối đa `maxLevel`. `kynang`/`hoso` lọc chiêu đã mở khóa. **Đã tái cân bằng bias 6 phái** cho bộ kỹ năng KHÔNG-tuyệt-kỹ ở Trúc Cơ (R2T5 spread ~18%, gần baseline 17%).
- **Gia nhập phái qua nhiệm vụ:** chọn phái ở panel/`/monphai` chỉ set `pending_sect`; phải hoàn thành **nghi thức nhập môn** (chương `ch_nhap_mon`, task `finalize_sect`, nút `story_finalize_sect`) mới `finalizeSect` (set sect + `sect_join_stage`). Đổi phái (đã là thành viên) vẫn tức thì. Tương thích ngược: thành viên cũ (đã có sect) tự qua các task mới.
- **Nhiệm vụ hằng ngày** (`quests.js` + `commands/nhiemvu.js`): tu luyện/luận đạo/đột phá/bí cảnh, reset theo ngày (giờ VN), cột `daily_quests`. Hook `addDailyProgress` gọi cạnh `addStoryProgress`.
- **Panel cố định đa kênh** (`panels.js` + `commands/setup.js`): 4 kênh (Sơ Nhập / Nhiệm Vụ / Môn Phái / Hồ Sơ), ID qua `.env` → `config.channels`. `/setup` (admin) đăng/sửa panel (bảng `panels`, sửa tại chỗ). customId **tĩnh**, phản hồi **ephemeral** → cô lập theo người. Slash command vẫn giữ song song.
- ✅ **CÂN BẰNG BẬC CAO — ĐÃ SỬA ở GĐ13** (trước đây: combat chỉ cân ở R2T5, bậc cao spread giãn mạnh do DEF_K hằng + tuyệt kỹ lệch). Nay `defK` co giãn theo bậc + đã tinh chỉnh 4 tuyệt kỹ → spread ~13-16% mọi cảnh giới. Xem GĐ13.

### GĐ6 — Luyện Đan (vừa xong)
- Lệnh `/luyendan` (mở khóa **Kim Đan**, realm 3) — **đóng vòng lặp** nguyên liệu Bí Cảnh (trước GĐ6 nguyên liệu rớt ra nhưng KHÔNG có chỗ tiêu). Module thuần `alchemy.js` (`PILLS` + `RECIPES` + helper). **KHÔNG đụng `combat.js`** → đan là tu vi/độ kiếp, không phải buff combat → không ảnh hưởng cân bằng phái.
- **2 loại đan:**
  - `kind:'tuvi'` — uống **tức thì** +tu vi = `pctNeed × cult.tuViNeeded(realm,tier)` (theo **%** nên giá trị giữ nguyên ý nghĩa ở MỌI cảnh giới; flat sẽ lỗi thời). 4 đan: Tụ Khí 6% / Bồi Nguyên 12% / Cường Thể 20% / Cửu Chuyển 35%.
  - `kind:'tribulation'` — **GIỮ trong túi**, tự động tiêu hao khi `/dotpha` **vượt cảnh giới** để cộng tỉ lệ thành công (Hộ Đạo +12%, Tạo Hóa +22%), trần `config.alchemy.tribulationCap` (95%). Tiêu dù thành/bại. Chọn đan **mạnh nhất** đang có (`alchemy.bestTribulationPill`).
- **6 đan phương** mở dần theo cảnh giới (realm 3→7), tiêu thụ **đủ cả 6 nguyên liệu** Bí Cảnh. Luyện có **RỦI RO**: tỉ lệ thành nền 70–92% + 5%/cảnh giới vượt mức (trần 98%); **thất bại vẫn mất nguyên liệu + linh thạch** (phí lò). RNG + tiêu hao nằm atomic trong `db.craftPill` (transaction).
- **Lưu trữ:** cột `pills` JSON `{pillId: qty}` (migrate tự động). API mới ở `database.js`: `getPills/addPills/craftPill/useTuViPill/consumeBestTribulationPill`.
- **UI:** embed liệt kê đan phương (chi phí + tỉ lệ + công dụng) + túi nguyên liệu + túi đan; 2 select: 🔥 luyện / 🍶 uống đan tu vi. customId tĩnh `luyendan:*`, ephemeral.
- **Nhiệm vụ ngày mới:** `d_luyendan` (type `craft`, goal 1) — hook `db.addDailyProgress(id,'craft',1)` gọi khi craft **thành công**.
- **Cần gạt:** `config.alchemy` (realmSuccessBonus/maxSuccess/tribulationCap) + `alchemy.js` (`PILLS` pctNeed/rateBonus, `RECIPES` cost/stoneCost/baseSuccess/yield).

### GĐ7 — UX mở rộng: voice tu luyện + cẩm nang + 2 kênh mới (vừa xong)
Theo yêu cầu chủ dự án (5 mục):
- **Nút "Bắt đầu hành trình" → dẫn tới kênh Nhiệm Vụ:** `batdau.js` đổi nút `story_open` → `goto_quests` (label "🧭 Bắt đầu hành trình"). Handler reply ephemeral chỉ đường tới `<#config.channels.nhiemVu>` (bấm 📖 Cốt truyện / 📋 Nhiệm vụ ngày). Chưa cấu hình kênh → fallback hướng dẫn slash command. `story_open` vẫn còn (panel Nhiệm Vụ + `/cottruyen` dùng).
- **Tu luyện qua VOICE** (`index.js` + `config.voice`): thêm intent `GuildVoiceStates`. Tick **mỗi phút** quét mọi kênh thoại; cộng **`ratePerMin` (3) tu vi/phút** cho người chơi đang ngồi voice. Điều kiện: **≥`minCompany` (2) người THẬT** cùng kênh (chống AFK 1 mình, khuyến khích cộng đồng), **bỏ qua kênh AFK**, **trần `dailyCapMinutes` (240')/ngày**. Trần ngày ~~giữ trong bộ nhớ~~ → **GĐ13: bền trong DB (`voice_day/voice_used`), restart không reset trần.** Người viên mãn bỏ qua. Timer `unref` + clear ở graceful shutdown.
- **Hồ Sơ + Cẩm nang + Túi đồ** (`hoso.js` + `guide.js` mới): thêm 2 nút `guide_open` (📖 Hướng dẫn) + `bag_open` (🎒 Túi đồ). Cẩm nang `guide.js` = **11 mục** chi tiết (Tổng quan/Tu luyện/Đột phá/Thuộc tính/Môn phái/Kỹ năng/Bí cảnh/Luyện đan/Túi đồ/Nhiệm vụ/Kênh), **số liệu kéo thẳng từ config/cult nên luôn khớp game** (sửa hệ thống → cẩm nang tự cập nhật). Select `guide_sec` đổi mục. Túi đồ hiện nguyên liệu (Bí Cảnh) + đan (Luyện Đan).
- **Kênh Bảng Xếp Hạng** (`leaderboard.js` mới + panel `bangXepHang`): `leaderboard.js` (đụng DB-đọc) dựng embed dùng chung cho `/top`, panel BXH, nút BXH. Panel = **ảnh chụp** 2 bảng (cảnh giới top10 + linh thạch top5) lúc `/setup` + nút `bxh:canhgioi`/`bxh:linhthach` → bảng **realtime** ephemeral (handler `top.js` `buttons.bxh`). `/top` refactor mỏng dùng `leaderboard.boardEmbed`. Env `CH_BANG_XEP_HANG`.
- **Kênh Vọng Âm Đài** (`util/announce.js` mới + `config.channels.vongAmDai`): `announce(client, embedHoặcPayload)` **fire-and-forget, nuốt mọi lỗi** (kênh chưa cấu hình → bỏ qua, không vỡ lệnh). Loan báo: **độ kiếp thành công/thất bại** vượt cảnh giới (+ phi thăng) ở `dotpha.js`; **hạ BOSS bí cảnh** ở `bicanh.js`; **luyện thành thần đan cấp 4** (tao_hoa/cuu_chuyen) ở `luyendan.js`. KHÔNG phải panel (feed thuần) → không nằm trong `PANELS`, không cần `/setup`; chỉ cần điền `CH_VONG_AM_DAI`.

### GĐ8 đợt 1 — Panel tu luyện + cẩm nang lên kênh + khóa kênh + quét bí cảnh (vừa xong)
Theo yêu cầu chủ dự án (5 mục lớn — đợt 1 làm 4 mục cấu trúc/UX + quét; **2 hệ lớn còn lại ở đợt 2**, xem mục 6).
- **Cẩm nang lên panel Hồ Sơ:** thêm nút `guide_open` (📖 Cẩm nang hướng dẫn) vào **panel Hồ Sơ** (`panels.js` `hoSo`) — giờ đọc cẩm nang ngay trên kênh, không cần mở hồ sơ. Handler `guide_open` (hoso.js) dùng được cho cả nút profile lẫn nút panel.
- **Kênh + panel Tu Luyện** (`config.channels.tuLuyen` + `panels.js` `tuLuyen`): panel cho người chơi **chọn cách tu hành** — nút 🧘 Vận công (`panel_cultivate`), 🚪 Bế quan/Xuất quan (`panel_seclude`), 💊 Luyện đan (`panel_luyendan`), + info Voice. **Refactor** `tuluyen.js`→`doCultivate()`, `bequan.js`→`doSeclusion()` (lõi trả `{content}` lỗi/ẩn hoặc `{embeds,public:true}`); slash gửi công khai khi thành công, nút panel luôn ẩn. `panel_luyendan` tự kiểm cảnh giới Kim Đan rồi mở `alchemyView`.
- **Khóa lệnh theo kênh** (`config.commandChannels` + chặn ở `index.js`): lệnh hành động chỉ dùng đúng kênh (tu luyện→tuLuyen; monphai/kynang→monPhai; bicanh/dautap→luyenTruong; cottruyen/nhiemvu→nhiemVu; batdau→soNhap). Lệnh **xem** (hoso/top/trogiup/tinhnang/setup) **tự do**. **CHỈ chặn khi kênh đích đã cấu hình** (kênh rỗng → bỏ qua, server chưa set kênh vẫn chơi được).
- **Quét bí cảnh** (`bicanh.js` `sweepLoot` + cột `bicanh_best`): lưu **tầng sâu nhất đã đạt** mỗi vùng (cập nhật mỗi lần thắng tầng). `/bicanh` hiện kỷ lục + select **⚡ Quét** → gom dồn `rollLoot` tầng 1..best **không phải đánh**, **tốn cooldown** như vào bí cảnh. Hàm DB: `getBicanhBest/updateBicanhBest`.
- **Kênh mới:** `tuLuyen` (có panel, vào `/setup`) + `luyenTruong` (mới — gating bí cảnh/farm; **panel Luyện Trường sẽ thêm ở đợt 2** cùng khu farm). Env: `CH_TU_LUYEN`, `CH_LUYEN_TRUONG`.

### GĐ8 đợt 2a — Trang bị nhập môn + chuỗi nhiệm vụ phái + mở khóa chiêu (vừa xong)
- **Mở khóa chiêu đổi sang theo NHIỆM VỤ:** vào phái chỉ có **1 chiêu cơ bản**; chuỗi nhiệm vụ nhập môn mở dần chiêu #2, #3. Tuyệt kỹ vẫn theo cảnh giới (Nguyên Anh). Cài đặt: `skills.unlockedActivesForSect(sectId, realm, questStage)` — chiêu cơ bản (thứ tự = `defaultLoadout`, nhận biết qua `isCoreActive` = không phải tuyệt kỹ) mở khi `questStage >= step`; **`questStage == null` = thành viên cũ → mở hết** (tương thích ngược, KHÔNG cần sửa 18 skill nhờ thứ tự object khớp defaultLoadout).
- **`sectquest.js`** (thuần): 3 bước (Tạp Dịch Đường `tuluyen×3` → Diễn Võ Trường `dautap_win×2` → Lĩnh Ngộ `dotpha×1`), đều làm được từ Trúc Cơ. Mỗi bước thưởng **1 món trang bị** + linh thạch/tu vi; xong 2 bước đầu mở chiêu #2/#3.
- **`equipment.js`** (thuần): mỗi phái **bộ 3 món** (Vũ khí/Giáp/Phụ kiện), `gearBonus(ids)` cộng **chỉ số PHẲNG** vào combat qua `combat.build` opts mới `gearBonus` (vắng = {} = +0 → build y hệt cũ). **Cân bằng:** Công nền các bộ gần bằng nhau (~11-12) để không nới spread; mô phỏng R2T5 cho gear THU HẸP spread (50.8–62.2% vs baseline 48.7–66.1%).
- **DB:** cột `equipment` (JSON mảng id), `sect_quest_stage` (NULL=cũ/full), `sect_quest_progress`. Hàm: `getEquipment/grantEquipItem/getSectQuestStage/getSectQuest/addSectQuestProgress/claimSectQuestStep`. `finalizeSect` → stage 0 + loadout chỉ `[defaultLoadout[0]]`. `setSect` (đổi phái) → stage = TOTAL (full chiêu) + **tặng trọn bộ trang bị** phái mới.
- **Hook tiến độ:** `addSectQuestProgress` gọi ở `tuluyen`(type tuluyen), `dotpha`(dotpha), `dautap`(dautap_win khi thắng).
- **UI:** panel/`/monphai` (đã là đệ tử) có nút **📿 Nhiệm vụ nhập môn** (`sectquest_open` → view chuỗi + nút `sectquest_claim`). Hồ Sơ hiện field **🛡️ Trang bị nhập môn**. `kynang`/`hoso` lọc chiêu theo `questStage`. Cẩm nang + thông báo bái nhập (cottruyen) đã cập nhật.

### GĐ8 đợt 2b — 3 khu farm + panel Luyện Trường (vừa xong)
- **`farm.js`** (thuần) + `config.farm` + lệnh **`/luyentruong`** (mở Kim Đan realm 3, gating kênh `luyenTruong`). Hub 3 khu (nút ẩn từng người), Bí Cảnh vẫn ở `/bicanh` riêng cùng kênh.
  - 🌱 **Linh Điền** (idle): tích 1 phần nguyên liệu/`intervalMs` (20'), cap `maxUnits` (12 = 4h), **offline vẫn tích**. Cột `linhdien_ts`; lần đầu bấm = khai hoang (set ts), sau đó Thu hoạch → linh thảo (+30% yêu đan/phần) + reset ts. Logic thuần `farm.linhDienUnits/Yield/NextMs`.
  - 🐗 **Săn Yêu**: đánh nhanh 1 yêu hoang (`farm.buildWildFoe` ~0.95× người chơi), cooldown `sanyeu_ts` (3'). Thắng → linh thạch+tu vi+đôi khi nguyên liệu; thua không mất gì. Cần môn phái.
  - 🗼 **Thí Luyện Tháp**: leo vô tận (cap 50 tầng). Đánh quái tầng `best+1` (`buildTowerFoe`, +5%/tầng). Thắng → `thap_best++` + thưởng tăng dần; thua giữ kỷ lục. Cooldown `thap_ts` (4'). Cần môn phái.
  - Combat tái dùng `combat.build` với **đầy đủ opts** (attrs/skillLevels/stagesSinceJoin/gearBonus) → trang bị & thuộc tính có tác dụng. DB chỉ lưu mốc/kỷ lục (`setLinhDienTs/setSanYeuTs/setTowerTs/setTowerBest`); thưởng cộng ở lệnh.
- **Panel Luyện Trường** (`panels.js` `luyenTruong`, vào `/setup`) ở `config.channels.luyenTruong` (env `CH_LUYEN_TRUONG`). Nút `panel_luyentruong` mở hub.
- **2 nhiệm vụ ngày mới:** `d_sanyeu` (type `sanyeu`), `d_thap` (type `thap_floor`) — hook ở lệnh khi thắng.
- **Cân bằng (mô phỏng R3T5, full chiêu+gear):** Săn Yêu ~100% (farm dễ, thưởng nhỏ); Tháp f1-5 dễ → f10 tường chắn (~24-42% phái mỏng, 100% tank) → f20 rất khó (0-38%) — leo cao thưởng investment (thuộc tính/cấp chiêu/trang bị); tank leo cao hơn (đúng chất phái).

### GĐ9 — Đấu Pháp (PvP) — Luận Võ Đài (vừa xong)
**Stub cuối cùng đã hoàn thành → không còn stub nào.** Lệnh `/dauphap` (mở khóa **Nguyên Anh**, realm 4).
- **Kiểu: Đấu Đài xếp hạng async (snapshot).** Bấm **⚔️ Khiêu chiến** → hệ thống ghép 1 đối thủ **ngang điểm** rồi `combat.resolve` đánh **bản sao chỉ số** của họ (build từ player row đối thủ — KHÔNG cần họ online). Tái dùng `combat.build` với **đầy đủ opts** (attrs/skillLevels/stagesSinceJoin/gearBonus) cho **cả 2 bên** → công bằng tuyệt đối giữa người thật.
- **Ghép cặp:** `db.findPvpOpponents` lấy `config.pvp.matchPool` (8) đối thủ **gần điểm nhất** (có phái, realm≥4, khác mình); command ưu tiên người trong **±`realmWindow` (1) cảnh giới** rồi chọn ngẫu nhiên. **Pool rỗng → đài chủ NPC** (`pvp.buildNpc` qua command): cùng realm/tier người chơi, phái ngẫu nhiên, **thuộc tính = globalStage×pointsPerTier dồn vào primaryAttrs** + full gear → ngang ngửa tu sĩ thật cùng bậc → đài **không bao giờ vắng đối thủ** (quan trọng cho server mới).
- **Hệ điểm ELO** (`pvp.js` thuần): khởi điểm `START_RATING` (1000), `K`=32. `recordPvpMatch` (atomic, `database.js`) cập nhật điểm **CẢ HAI** người thật (zero-sum) + thắng/thua + đặt cooldown. **Chống cày NPC:** đối thủ NPC coi như **điểm cố định = 1000** → thắng NPC khi đã lên cao gần như +0 điểm; leo hạng thật phải thắng **người thật**.
- **Danh hiệu** 8 mốc theo điểm (`pvp.RANKS`): *Vô Danh Tiểu Tốt → … → Thiên Hạ Đệ Nhất*. **Thăng hạng** loan báo ra **Vọng Âm Đài** (`announce` trong button handler, sau khi đã có `client`).
- **Thưởng** (chỉ khi THẮNG): `config.pvp.winStones` (20) + `winTuVi` (25, giữ NHỎ để PvP không thành kênh cày tu vi vượt cân bằng). Thua/hòa không mất gì ngoài điểm. Cooldown `config.pvp.cooldownMs` (3') từ lúc đánh.
- **UI:** `/dauphap` (hoặc panel) mở **sảnh đài** ẩn (điểm/hạng/thành tích + nút **⚔️ Khiêu chiến** / **🏆 Luận Võ Bảng**). customId tĩnh `dauphap:fight|board` + `panel_dauphap`. Trận xong `interaction.update` hiện log + đổi điểm + hạng + thưởng, kèm lại hàng nút (nút khiêu chiến chuyển sang **⏳ Hồi sức** khi còn cooldown).
- **DB:** cột mới `pvp_rating` (DEFAULT 1000), `pvp_wins`, `pvp_losses`, `pvp_ts` (migrate tự động). API: `getPvp/findPvpOpponents/recordPvpMatch/topByPvp`.
- **Tích hợp:** `features.dauphap` → `live`. **BXH:** thêm bảng `boardEmbed('pvp')` (Luận Võ Bảng) + nút `bxh:pvp` + field trong panel BXH. **Kênh + panel mới** `dauDai` (`config.channels.dauDai`, env `CH_DAU_DAI`, panel **Đấu Pháp Đài** vào `/setup`). **Nhiệm vụ ngày mới** `d_dauphap` (type `pvp_win`). **Cẩm nang** thêm mục ⚔️ Đấu Pháp + cập nhật mục Các Kênh.
- **Cân bằng (mô phỏng R4T5):** PvP người-vs-người **đối xứng** nên công bằng theo thiết kế. Player full-build vs **đài chủ NPC** ~58% (lợi thế đi trước khi hòa Tốc + NPC là benchmark chung), player **0 đầu tư** vs NPC ~33% → khuyến khích cộng thuộc tính/nâng chiêu/trang bị. NPC chỉ là dự phòng; trận xếp hạng thật là giữa người chơi.
- **Cần gạt:** `config.pvp` (minRealm/cooldownMs/matchPool/realmWindow/winStones/winTuVi) + `pvp.js` (`START_RATING`/`K`/`RANKS`/`npcAttrs`).

### GĐ10 — Quản trị (admin) + tách kênh Đột Phá (vừa xong)
Theo yêu cầu chủ dự án.
- **Lệnh quản trị `/quantri`** (`commands/quantri.js`): bảng điều khiển admin **đầy đủ chức năng**, quyền = role `config.adminRoleId` **HOẶC** Manage Guild (dùng helper chung `util/admin.js`), ẩn với người thường (`setDefaultMemberPermissions(ManageGuild)`), **không khóa kênh**, phản hồi ephemeral. 14 subcommand: `xem` (chi tiết DB) · `linhthach` · `tuvi` · `canhgioi` (set realm/tier, reset tu vi) · `diemthuoctinh` · `diemchieu` · `thuoctinh` (cộng thẳng 1 thuộc tính) · `nguyenlieu` · `dan` · `trangbi` (trọn bộ phái) · `monphai` (set/đổi) · `diempvp` (set ELO) · `hoicooldown` (reset mọi cooldown) · `xoa` (xóa tu sĩ, cần `xacnhan=True`). Số âm = trừ. Choices dựng từ `bicanh.MATERIALS`/`alchemy.ORDER`/`sects`/`attributes`.
- **DB API mới** (`database.js`): `adminSetStage`/`adminSetPvpRating`/`adminResetCooldowns`/`adminDeletePlayer` (xóa cả `story_progress`, atomic). `/quantri thuoctinh` ghi cột `attributes` trực tiếp qua `db.db`.
- **`util/admin.js`** (mới): `isAdmin(interaction)` — tách từ `setup.js` (đã refactor dùng chung) để `quantri` + `setup` chung 1 nguồn.
- **Đột Phá có KÊNH RIÊNG:** `config.channels.dotPha` (env `CH_DOT_PHA`) + `config.commandChannels.dotpha` đổi `tuLuyen → dotPha`. **Panel Đột Phá Đường** (`panels.js` `dotPha`, vào `/setup`) với nút `panel_dotpha`. **Refactor** `dotpha.js` → lõi `doBreakthrough(userId, username)` trả `{content}` (lỗi/ẩn) hoặc `{embeds, public, announce?}` — slash gửi công khai khi đột phá, nút panel luôn ẩn; cả hai vẫn loan **Vọng Âm Đài** (độ kiếp thành/bại) qua mảng `announce` (caller gửi vì cần `client`). Tương thích ngược: server chưa set `CH_DOT_PHA` → `/dotpha` dùng được mọi nơi như cũ.

### GĐ11 — Tu luyện vận công có thời gian + Voice opt-in + khóa đổi phái + quét tháp + dọn UI (vừa xong)
Theo yêu cầu chủ dự án (6 mục):
- **Tu luyện đổi cơ chế** (`commands/tuluyen.js` viết lại, `config.cultivate`): BỎ kiểu bấm-nhận-tức-thì-rồi-cooldown. Giờ `/tuluyen` mở **bảng trạng thái** (ẩn): chọn 1 mốc phút (`config.cultivate.durations` = 5/15/30/60/120) → **vận công**; nhận tu vi = phút × `ratePerMin` (3). Đủ giờ (offline vẫn tính) thu trọn; **thu sớm nhận 1 phần** theo thời gian đã trôi (cap ở số phút đã chọn). DB cột mới `cultivate_start/cultivate_minutes/cultivate_mode`; API `setCultivateSession/clearCultivateSession`. Hook story/daily/sectquest `tuluyen` +1 mỗi lần **thu hoạch**.
- **Voice = chế độ chọn trong /tuluyen** (không còn tự động cho mọi người): bấm **Bật Voice** → `cultivate_mode='voice'`; `index.js` `creditVoiceTick` chỉ cộng cho người có `cultivate_mode==='voice'` (vẫn cần ≥2 người, trần ngày, bỏ kênh AFK). Bấm **Tắt Voice** để về vận công thường. Vận công/Voice/Bế quan **loại trừ lẫn nhau** (gate khi bắt đầu).
- **Bế quan có bảng hiển thị thời gian** (`commands/bequan.js` viết lại): `/bequan` & nút `panel_seclude` mở **bảng trạng thái** — hiện **thời gian đã bế quan** + ước tính thu hoạch (cap maxHours) + nút **Xuất quan**/**Cập nhật**. Không còn kiểu bấm-2-lần mù.
- **Đổi phái: khóa + về phái cũ free** (`commands/monphai.js`, `config.sect`, DB cột `prev_sect`/`sect_switch_ts`): sau khi đổi, **khóa đổi tiếp `switchLockMs` (12h)**; được **về `prev_sect` MIỄN PHÍ sau `freeReturnMs` (24h)**. `db.setSect` tự ghi `prev_sect`(=phái đang ở) + `sect_switch_ts=now`. Helper `switchInfo(player,target,now)` quyết định {allowed,free,cost}. Embed/nút hiển thị trạng thái khóa + mốc free.
- **Thí Luyện Tháp có Quét** (`farm.towerSweepReward`, `commands/luyentruong.js`): nút **⚡ Quét (1→best)** gom dồn `towerReward` các tầng đã vượt, tốn cooldown `thap_ts` như leo; daily `thap_floor += floors`. (Trước đây chỉ Bí Cảnh có quét.)
- **Dọn UI:** bỏ nút **📖 Hướng dẫn** khỏi `/hoso` (profile) vì trùng panel Hồ Sơ; **giữ** handler `guide_open` (panel Hồ Sơ vẫn dùng) + nút 🎒 Túi đồ. Cẩm nang `guide.js` + panel `tuLuyen` + README cập nhật theo cơ chế mới.

### GĐ12 — NERF CHUNG chống cày/spam: Linh Khí Loãng + Bình Cảnh (vừa xong)
Theo yêu cầu chủ dự án: cần **một nerf chung** khiến cày cuốc khó hơn, chống spam liên tục để lên cấp/tiền. Vì mọi nguồn farm (tu luyện/bế quan/voice/bí cảnh/3 khu farm/PvP) cuối cùng đều đổ về **2 hàm** `addTuVi`/`addStones` ở `database.js`, cài nerf ngay tại **chokepoint** này → phủ toàn game, không phải sửa 20 chỗ.
- **Module thuần `dampen.js`** (test được trên Windows): `applyTuVi/applyStones` (trả `{raw,gained,damp,bottleneck}`), `tuViThreshold/stonesThreshold` (ngưỡng/ngày), `bottleneckMult`, `tuViNote/stonesNote` (chuỗi hiển thị).
- **(1) Linh Khí Loãng (theo ngày):** đếm tu vi/linh thạch **RAW đã farm trong ngày** (cột mới `earn_day/tuvi_today/stones_today`, reset theo `quests.dayKey` giờ VN). Vượt "ngưỡng thoải mái" → nhân `config.dampen.brackets` `[1, 0.6, 0.3, 0.15]`. **Ngưỡng tự co giãn theo cảnh giới**: tu vi = `tuViStages(3) × cult.tuViNeeded(realm,tier)`; linh thạch = `stonesBase(600) + stonesPerStage(120) × globalStage` → KHÔNG lỗi thời ở bậc cao.
- **(2) Bình Cảnh (bottleneck):** ở **tầng đỉnh** mỗi cảnh giới (`nextStage().isMajor`) tu vi vào ×`config.bottleneck.mult` (0.35), áp **từ realm ≥ minRealm (2 = Trúc Cơ)** — tân thủ miễn. Chặn riêng việc rush lên cảnh giới; phải tích đủ rồi **độ kiếp** để qua ải. Stack với loãng ở tầng đỉnh khi farm nhiều.
- **Đường MIỄN nerf** (`addTuViRaw/addStonesRaw`): thưởng **cốt truyện/chương** (storyNextScene + claimStory chuyển sang Raw), **nhiệm vụ ngày** (đã dùng `Q.addTuVi.run` raw), **đan tu vi** (`useTuViPill` raw), **admin** `/quantri` (linhthach/tuvi → Raw). Số ≤0 (chi tiêu/trừ/độ kiếp thất bại) đi thẳng không nerf (guard trong addTuVi/addStones).
- **Hiển thị trung thực:** `addTuVi/addStones` giờ TRẢ VỀ `{gained,...}`; các embed farm (tuluyen/bequan/bicanh×2/luyentruong×3/dauphap) đã đổi để hiện **số thực nhận** + ghi chú `dampen.tuViNote` (⛰️ Bình Cảnh / 🌫️ Linh khí loãng ×0.x). `db.earnState(player,now)` sẵn cho UI (chưa gắn vào Hồ Sơ — tùy chọn).
- **Cẩm nang:** thêm mục 🌫️ **Nhịp Tu Hành** (`guide.js`, số kéo từ config nên luôn khớp).
- **Cần gạt:** `config.dampen` (tuViStages/stonesBase/stonesPerStage/brackets) + `config.bottleneck` (enabled/minRealm/mult). Tắt nhanh: đặt `enabled:false`.
- **Mô phỏng (Windows, thuần):** ngưỡng co giãn đúng (Trúc Cơ 1197 tu vi·2280 LT/ngày → Kim Đan 4557·3360 → Luyện Hư 250k·6600); chơi vừa phải KHÔNG bị phạt, chỉ spam nặng mới tụt bậc; Bình Cảnh kích từ Trúc Cơ T9 (×0.35), Phàm/Luyện Khí miễn; stack bottleneck×damp đúng.

### GĐ13 — Đại tu CÂN BẰNG BẬC CAO + sửa bug Tốc + bền hóa state RAM (vừa xong)
Ba việc theo yêu cầu chủ dự án. Combat đụng tới nhưng **opts rỗng vẫn build y hệt** (quái/test cũ không đổi cấu trúc).

**(A) Bug Tốc — cơ chế "đánh thêm đòn" trước CHỈ có comment, nay đã CODE** (`combat.js` `resolve` + `config.combat`):
- Combatant **nhanh hơn ≥ `extraAttackRatio` (1.7) lần** → cuối mỗi vòng **đánh thêm 1 đòn** = `extraAttackPower` (0.7) đánh thường. Trước đây Tốc chỉ quyết định thứ tự → Phong Linh + thuộc tính Thân Pháp gần như vô dụng. Nay Tốc có giá trị thật mà **không gãy** (Phong Linh ~50-57% mọi bậc).

**(B) Đại tu cân bằng bậc cao — `DEF_K` co giãn theo bậc** (`config.combat.defKBase/defKPerStage`, `combat.js` `defKFor` lưu `c.defK`):
- **Gốc rễ vấn đề cũ:** `DEF_K=150` HẰNG ở mọi bậc, trong khi Phòng tăng tuyến tính → bậc cao tank trâu mất kiểm soát (spread R8 **85%**). Nay `defK = 40 + 8×bậc` (neo tại R2T5: bậc 14 → 152 ≈ 150 cũ) → **tỉ lệ giảm trừ ổn định mọi cảnh giới** → spread KHÔNG còn phình theo bậc. Dùng `target.defK` ở cả đòn đánh lẫn DoT.
- **Tinh chỉnh tuyệt kỹ (chỉ R4+, KHÔNG đụng R2T5):** `dd_kichdoc` dot 0.75→0.50 & def debuff 22%→14% (hạ Đan Đỉnh); `hh_hoanguc` dot 0.70→1.10, power 1.6→1.9 (buff Huyền Hỏa); `hm_mahon` lifesteal 0.30→0.48, selfHpCost 8%→3%, power 3.0→3.2 (buff Huyết Ma); `pl_vanphong` power 0.6→0.56 (ghìm Phong Linh).
- **Kết quả mô phỏng (2 chiều A↔B, CÓ tuyệt kỹ):** R2 **13%** · R4 **16%** · R6 **13%** · R8 **13%** (trước: 14% → **77% → 85%**). Mọi phái trong **42–58%** ở mọi bậc.
- **Tác dụng phụ đã kiểm:** PvE giữ độ khó (clear ~4–6 tầng vùng đầu). PvP người-vs-người vẫn đối xứng. Player vs **đài chủ NPC**: 0-đầu-tư ~46% / full-đầu-tư ~61% (trước 33%/58%) — động lực cộng thuộc tính vẫn rõ (~15%), đường cong mượt hơn; NPC chỉ là benchmark dự phòng.

**(C) Bền hóa state RAM (sống sót qua restart):**
- **Lượt bí cảnh** (`commands/bicanh.js`): `runs` Map giờ là **cache**, được ghi xuống cột `bicanh_run` (JSON) qua `db.setBicanhRun/getBicanhRun/clearBicanhRun`. Helper `loadRun` (cache→DB, kiểm TTL 30'), `saveRun`, `dropRun`. Restart giữa lượt → bấm nút Đi sâu/Rời vẫn nạp lại được từ DB → **không mất loot**.
- **Trần voice/ngày** (`index.js` + `db.bumpVoiceMinutes`): bỏ Map `voiceDaily`, chuyển sang cột bền `voice_day/voice_used` → **restart KHÔNG reset trần** (bịt lỗ lách cày AFK 24/7).
- **Cần gạt mới:** `config.combat` (defKBase/defKPerStage/extraAttackRatio/extraAttackPower).

### GĐ14 — Đánh theo lượt + 5 cải tiến UX/cân bằng (vừa xong)
Theo yêu cầu chủ dự án (6 mục). Mặc định chọn: đánh tay TẤT CẢ trận kèm nút ⚡ Đánh nhanh; bế quan chọn mốc cố định.
- **(1) ĐÁNH THEO LƯỢT** — không còn auto-skip ra kết quả. `combat.js` thêm `startFight/stepRound/autoResolve/skillReady` (tái dùng y nguyên startTurn/doAction/chooseAction → cân bằng GIỐNG HỆT resolve, chỉ khác A do người chơi điều khiển). Controller chung **`commands/fight.js`**: giữ phiên trận trong RAM (Map, TTL 10'), render embed (máu/linh lực/diễn biến) + hàng nút **mỗi chiêu trang bị · 👊 Đánh thường · ⚡ Đánh nhanh**; khi trận xong gọi `outcome` đã đăng ký. Mỗi tính năng `fight.start(interaction, me, foe, ctx, {useUpdate})` + `fight.registerOutcome(type, fn)` (KHÔNG vòng lặp require: fight.js không phụ thuộc feature). Áp cho: **bí cảnh** (mỗi tầng 1 trận, thắng → Đi sâu/Rời), **đấu tập** (+ nút Đấu lại), **PvP** (cooldown đặt lúc VÀO trận để bỏ trận vẫn tốn, ELO ghi lúc xong), **săn yêu**, **leo tháp**. Test fake-interaction: mở trận→đánh lượt→đánh nhanh→outcome chạy đúng; engine autoResolve≈resolve.
- **(2) Bế quan chọn MỐC** (`config.seclusion.durations` [60/120/240/480], cột `seclusion_minutes`, `db.setSeclusionSession`): `bequan.js` đổi sang **select mốc**; trần = mốc đã chọn; đủ mốc thu trọn, xuất sớm nhận phần đã ngồi (≥minMinutes). Có thanh tiến độ.
- **(3) Kỹ năng môn phái lên panel:** `kynang.js` thêm `panel_kynang` (mở bảng kỹ năng ẩn). Nút **🎴 Kỹ năng** + **🥊 Đấu tập** thêm vào panel Môn Phái (panels.js) + view "đã là đệ tử" (monphai.js `mySectComponents`).
- **(4) Toggle đan độ kiếp** (cột `auto_trib` mặc định 1, `db.setAutoTrib`): `dotpha.js` chỉ tự dùng đan khi BẬT. Panel Đột Phá giờ mở **bảng tương tác** (`breakthroughView`): trạng thái tu vi + tỉ lệ độ kiếp + nút **💊 Bật/Tắt tự dùng đan** + **⚡ Đột phá**. `/dotpha` slash giữ tức thì (vẫn tôn trọng toggle).
- **(5) Giảm cooldown PvP** `config.pvp.cooldownMs` 3' → **45s** (farm vốn đã bị nerf Linh Khí Loãng). Hiển thị `fmtCd` (giây/phút).
- **(6) Panel tương tác hơn:** Môn Phái thêm 2 nút; Đột Phá thành bảng bấm; text panel Tu Luyện/Đột Phá cập nhật. Mọi trận giờ là chuỗi nút bấm.
- **DB cột mới:** `auto_trib`, `seclusion_minutes` (+ `setPvpTs` cho cooldown-start). Phiên trận đánh tay KHÔNG bền hóa (transient; restart giữa trận chỉ mất trận đó, lượt bí cảnh vẫn còn trong `bicanh_run`).
- **Cần gạt:** `config.seclusion.durations`, `config.pvp.cooldownMs`, `config.combat.extraAttack*` (đòn thêm). Cẩm nang `guide.js` đã cập nhật (bế quan mốc / đánh theo lượt / toggle đan / cooldown 45s).

### Đợt RÀ SOÁT & SỬA BUG (audit chất lượng — vừa xong)
Audit 4 nhóm (kinh tế/farm · state/race/interaction · DB/transaction · combat/skill). **Phát hiện quan trọng: phần lớn lo ngại "race read-modify-write" là FALSE POSITIVE** — `better-sqlite3` đồng bộ + Node đơn luồng nên mọi đọc-sửa-ghi *trước* `await` đầu tiên không thể bị xen kẽ (vd `farm_linhdien_harvest` commit `setLinhDienTs` xong mới `await update` → click thứ 2 đọc ts mới → không double-claim). 5 bug THẬT đã sửa:
- **(1) Stack buff/debuff vô hạn** (`combat.js` ~244-251): DoT khử trùng theo `srcId` nhưng buff/debuff push thẳng → cùng 1 chiêu chồng nhiều lần (đo được `cuong_the` 3 stack DEF → ×1.87). Sửa: lọc bỏ status cũ cùng `srcId` trước khi push (mirror DoT) + thêm `srcId` vào status. Stack cùng (srcId,stat) giờ = 1.
- **(2) Phiên trận đè chéo tính năng** (`commands/fight.js`): `sessions` key theo `user.id` → 1 trận/người; mở `/bicanh` khi đang `/dautap` đè session, nút message cũ điều khiển trận mới. Sửa: key theo **`message.id`** (mỗi message 1 trận, cô lập hoàn toàn) — `start()` lấy id qua `interaction.message.id` (update) hoặc `fetchReply()` (reply); `buttons.fight` tra theo `message.id` + **tự kiểm TTL** (không phụ thuộc gc thụ động) + `.catch` trên update cuối.
- **(3) Linh Điền vứt phần thời gian dư** (`commands/luyentruong.js`): thu hoạch chưa đầy cap vẫn `setLinhDienTs(now)` → mất phút lẻ. Sửa: chưa đầy cap → dời mốc `oldTs + units×interval` (giữ dư); đầy cap → reset `now` (overflow bị bỏ là đúng bản chất cap).
- **(4) PvP cooldown tính sai mốc** (`database.js recordPvpMatch` + `dauphap.js`): `recordPvpMatch` ghi đè `pvp_ts` lúc XONG trận, trong khi cooldown đã đặt lúc VÀO (`setPvpTs`) → đánh tay lâu bị phạt cooldown oan. Sửa: `Q.setPvp` bỏ cột `pvp_ts`, `recordPvpMatch` bỏ tham số `ts`.
- **(5) Mất loot bí cảnh khi restart giữa trận** (`commands/bicanh.js`): phiên trận RAM (`fight.js`) mất sau restart nhưng `bicanh_run` (loot đã gom) còn trong DB — không có đường nhận lại, `/bicanh` mới sẽ ghi đè. Sửa: `/bicanh` phát hiện lượt dở (`loadRun`, floor≥1) → hiện embed loot đã gom + nút **Đi sâu / Rời** thay vì menu vùng mới.

**✅ ĐÃ SỬA Ở GĐ19 — cân bằng bậc cao (xem GĐ19 bên dưới).** ~~CÒN TỒN ĐỌNG — cân bằng bậc cao~~ Trước đây: mô phỏng 2 chiều A↔B cho thấy spread R4/R6/R8 ~36-38% — `phong_linh` áp đảo default loadout (~70%, spd 1.45 + "đòn thêm theo Tốc"), CÒN khi đã trang bị **tuyệt kỹ** thì `huyen_hoa`+`dan_dinh` vọt ~77-82% (DoT tuyệt kỹ quá mạnh) và `phong_linh` tuyệt kỹ (vanphong) lại thành "bẫy" yếu (~40%). GĐ19 đã đại tu (đo CẢ default LẪN tuyệt kỹ, người chơi tự chọn loadout mạnh nhất) → spread ~8-16% mọi bậc, mọi phái 50-65%.

### GĐ19 — ĐẠI TU CÂN BẰNG BẬC CAO (vừa xong)
Sửa dứt điểm cảnh báo "cân bằng bậc cao" tồn đọng từ GĐ5/GĐ13/đợt audit. **Combat engine KHÔNG đổi cấu trúc** (chỉ chỉnh SỐ ở `sects.js`/`skills.js`/`config.js`; `build(...,opts={})` rỗng vẫn ra y hệt → quái/NPC/test cũ giữ nguyên: quái bí cảnh dựng `sectId=null,equipped=[]` nên KHÔNG dính thay đổi bias/skill phái).
- **Phương pháp đo (quan trọng — khác các GĐ trước):** mô phỏng vòng tròn **2 chiều A↔B** (khử lợi thế đi trước) ở **R2/R4/R6/R8**, đo **CẢ HAI loadout**: *default* (3 chiêu cơ bản) VÀ *tuyệt kỹ* (build endgame chuẩn = tuyệt kỹ + 2 core mạnh). Lý do: người chơi tự chọn loadout mạnh nhất → cả hai phải gần 50%. Đo riêng một loadout (như GĐ13) bỏ sót: vanphong là "bẫy" yếu, còn DoT tuyệt kỹ thì OP.
- **Kết quả:** worst |winrate-50| **31.7% → 15.4%**; spread mỗi kịch bản **20-59% → 8-16%**; mọi phái mọi bậc nằm trong **50-65%**.
- **Thay đổi `sects.js` (bias):** kiem_tong atk 1.08→0.99; huyen_hoa atk 0.93→0.92; dan_dinh atk 1.16→1.14; cuong_the atk 0.86→0.89 (vốn yếu); phong_linh spd 1.45→1.36 & atk 1.05→1.03 (ghìm default OP).
- **Thay đổi `skills.js`:** **huyen_hoa** (DoT áp đảo): passive `hh_hoaphach` dotBonus 0.30→0.15, `hh_liemdiem` dot 0.45→0.40, `hh_phunhoa` dot 0.40→0.36, tuyệt kỹ `hh_hoanguc` dot **1.10→0.74**. **dan_dinh** tuyệt kỹ `dd_kichdoc` power 0.8→0.78, dot 0.50→0.38, def-debuff 0.86→0.92. **huyet_ma** (sustain mạnh nhất): passive `hm_hapsinh` lifesteal 0.18→0.13, `hm_huyetdao` 0.20→0.16, `hm_huyette` 0.35→0.28, tuyệt kỹ `hm_mahon` power 3.2→2.85 & lifesteal 0.48→0.30. **cuong_the** tuyệt kỹ `ct_thaison` power 2.4→2.05. **phong_linh** tuyệt kỹ `pl_vanphong` power 0.56→0.62 (gỡ "bẫy").
- **Thay đổi `config.js`:** `combat.extraAttackPower` 0.7→0.5 (đòn thêm theo Tốc — ghìm phong_linh bậc cao mà không tắt hẳn cơ chế).
- **Lưu ý sự nhạy:** `hh_hoanguc` dot rất nhạy (±0.10 ≈ ±24 điểm % winrate ở build tuyệt kỹ); round-robin là TƯƠNG ĐỐI nên nerf phái A có thể làm phái B (vốn bị A khắc) tăng — luôn đo lại toàn bảng sau mỗi chỉnh.
- **Tác động PvE (đã kiểm):** mọi phái vẫn clear ~2-4 tầng vùng đầu (R3T5, CHƯA đầu tư thuộc tính/trang bị/cấp chiêu); huyen_hoa thấp nhất do nerf DoT nhưng vẫn chơi được, đi sâu hơn khi đầu tư. Không phái nào bị khóa 0.
- **Cách đo lại (nếu chỉnh tiếp):** dựng harness mutate in-memory `sects.getSect(id).bias` / `skills.SKILLS[id]` / `config.combat` rồi chạy 2 chiều A↔B ở R2/R4/R6/R8 × {default, tuyệt kỹ}; mục tiêu worst |wr-50| ≤ ~16%. (Harness đã dùng là file tạm `_tune_tmp.js`/`_try_tmp.js`, đã xóa sau khi xong.)

### Đợt THÊM HÌNH ẢNH — hạ tầng art (vừa xong)
Dựng hạ tầng ảnh **tự bỏ qua khi chưa có** (giống `announce`) → game chạy bình thường dù chưa có art nào. Hỗ trợ **cả file local lẫn URL**.
- **`assets.js`** (thuần) + thư mục **`assets/img/`**: registry ảnh. 2 cách cấp ảnh (trộn được):
  1. **File local theo quy ước** — bỏ file vào `assets/img/` đúng tên là TỰ hiện (không sửa code): `realm_<0..9>.png` (cảnh giới), `sect_<id>.png` (phái), `panel_<key>.png` (panel). Đuôi: png/jpg/jpeg/gif/webp. Có cache dò file (thêm ảnh lúc chạy → cần restart).
  2. **URL host ngoài** — điền `REALM_URL/SECT_URL/PANEL_URL` trong `assets.js` (ưu tiên hơn file local).
- **Helper `apply(embed, src, kind)`** (kind `thumbnail`|`image`): set ảnh + trả **mảng `files`** (rỗng nếu dùng URL/không có) để spread vào payload. Tiện ích: `assets.realm/sect/panel(embed, key, kind)`.
- **Đã gắn:** banner cảnh giới ở **Hồ Sơ** (`hoso.js` profileView + xem người khác; `attachments:[]` ở các nút update để ảnh không đọng); thumbnail phái ở **Môn Phái** (`monphai.js mySectView`); banner **9 panel** (`panels.js` wrap tập trung `PANELS[*].build` → thêm `files`; `setup.js` edit kèm `attachments:[]` để không nhân đôi). Hướng dẫn chi tiết: `assets/img/README.md`.
- **CHƯA gắn (dễ thêm sau):** ảnh cảnh giới ở màn **độ kiếp** (`dotpha.js`), ảnh yêu thú/đan/nguyên liệu. Chỉ cần gọi `assets.*` rồi thêm `files` vào payload.

### GĐ15 — 4 HỆ THỐNG LỚN: Sinh Mệnh · Trang Bị đầy đủ · Boss Thế Giới · Đại tu UI (vừa xong)
Theo yêu cầu chủ dự án. Giữ **combat cốt lõi không vỡ** (regression test ✓: `combat.build` với `gearBonus:{}` ra Y HỆT không opts → quái/NPC/test cũ không đổi). 2 kênh + 2 panel mới + 2 lệnh mới (`/trangbi`, `/boss`).

**(A) SINH MỆNH ngoài trận (`health.js` thuần + DB):** HP **bền tồn tại ngoài trận** = Sinh Lực hiệu dụng (`db.vitMax` = `buildCombatant().maxHp`). Cột `vit_cur`(-1=đầy)/`vit_ts`; **hồi LƯỜI** (tính khi đọc theo `regenPerMin` `0.012/phút`, cả offline). **Thua PvE** mất `lossWoundPct` (50%), **thắng** hao `winWearPct` (8%); dưới `minToFightPct` (15%) = **TRỌNG THƯƠNG** → chặn vào bí cảnh/săn yêu/tháp/boss tới khi hồi đủ. Hồi: thời gian + **💗 Liệu Thương** ở Hồ Sơ (tốn linh thạch theo bậc, `db.restHeal`). API: `getVit/spendVit/healVit/vitFromLoss/vitFromWin/restHeal`. Hook thua/thắng đã gắn ở `bicanh`/`luyentruong`(sanyeu+thap); gate trọng thương ở các điểm VÀO. Cần gạt: `config.health` (tắt: `enabled:false`).

**(B) HỆ TRANG BỊ ĐẦY ĐỦ (`gear.js` thuần + DB):** giữ trang bị nhập môn (`equipment.js`) làm khởi đầu. **6 ô** (vũ khí/giáp/mũ/giày/nhẫn/pháp bảo) × **5 độ hiếm** (⚪Phàm→🟢Linh→🔵Bảo→🟣Tiên→🟡Thần). Instance gọn `{u,s,r,st,e}`, chỉ số **TẤT ĐỊNH** từ instance (kho nhẹ). **Rớt** từ Bí Cảnh/Tháp/**Boss** (`rollDrop` có `rarityBoost`). **Cường hóa** +15 (`enhanceStep` 0.04, có tỉ lệ trượt — trượt mất nguyên liệu, KHÔNG tụt cấp; tốn 💎 + 🔩 **Tinh Thiết**). **Phân giải** → Tinh Thiết; kho đầy → đồ rớt tự phân giải. Cột `gear_inv/gear_equipped/gear_uid/refine`. API: `getEquippedItems/addGearItem/equipGear/unequipGear/enhanceGear/salvageGear/getRefine/addRefine`. Lệnh `/trangbi` + panel **Trang Bị** (mở Trúc Cơ).
  - **GỘP BONUS COMBAT:** `db.combatGearBonus(player)` = nhập môn + gear mặc (cộng **PHẲNG**) → **thay 6 chỗ** gọi `equipment.gearBonus(...)` rời rạc (hoso/bicanh/dauphap/dautap/luyentruong). Bí cảnh **snapshot** bonus lúc vào (`run.gearBonus`).
  - ⚠️ **CÂN BẰNG (đã mô phỏng kỹ):** trang bị cộng phẳng nhưng **stat lớn làm trận "burst" nhanh → phái công cao thắng đậm hơn → NỚI spread**. Đã hạ `config.gear.powerScale` (1.0→**0.22**) + scale theo bậc nhẹ (0.02) + powerScale áp cả %. Kết quả 2 bên cùng gear: full **Bảo** nới spread chỉ **+2-9%** so baseline (R2 cao nhất); full **Thần+15** (trần aspirational hiếm) +10-13%. `powerScale` là cần gạt — hạ thêm nếu cần. (Lưu ý: baseline spread ~20-27% là **vấn đề cân bằng phái có sẵn** từ trước, GĐ này không sửa.)

**(C) BOSS THẾ GIỚI (`worldboss.js` thuần + 2 bảng DB + tick index.js):** boss **CHUNG toàn server**, HP **bền** (sống sót restart). Bảng `world_boss` (singleton id=1) + `world_boss_dmg` (đóng góp/đợt `spawn_n`). **5 boss** xoay vòng (catalog, sức/thưởng tăng dần). **Spawn tự động** (tick 5' ở `index.js`, sau `respawnMs` 6h kể từ boss chết; loan Vọng Âm Đài). **Công phạt** = `measureAssault` mô phỏng **8 hiệp** với boss làm **BIA ĐỠ ĐÒN** (HP 1e9 + **atk=0 không phản đòn** → người chơi giữ máu THẬT, AI hành xử đúng) → đo SÁT THƯƠNG ĐẦU RA → trừ HP chung (atomic `dealBossDamage`). Tốn **Sinh Mệnh** mỗi đòn + cooldown 5' (dùng `world_boss_dmg.last_ts`). **Hạ gục** → `distributeBossRewards` chia 💎+tu vi theo **% đóng góp** (top-1 +30%) + **rớt trang bị** (top-3 chắc chắn, `rarityBoost` cao), loan top-3. Lệnh `/boss` + panel **Boss Thế Giới** (mở Kim Đan). Admin `/quantri boss spawn|kill`. Cần gạt: `config.worldboss`.
  - ⚠️ **Lỗi đã sửa trong khi làm:** ban đầu phóng to `me.maxHp=1e9` để bất tử → kỹ năng **hồi máu** bị AI chấm điểm theo maxHp khổng lồ → phái có chiêu hồi (dan_dinh) spam hồi → **0 sát thương**. Sửa bằng cách để máu người chơi THẬT + boss atk=0 (bia đỡ đòn). Mô phỏng lại: mọi phái đều gây sát thương (tank `cuong_the` thấp nhất ~26% top — đúng chất phái thủ).

**(D) ĐẠI TU UI/UX (`util/ui.js` thuần + viết lại `panels.js`):** bộ dựng UI dùng chung — `panelEmbed(channelKey,...)` (mỗi kênh **một sắc màu** `config.colors.chan`), `barLine` (thanh máu/tiến trình), `btn/row/rows/select` (factory nút nhất quán), `num/dur/cdLeft/statBlock`. **Viết lại toàn bộ 11 panel** theo 1 ngôn ngữ hình ảnh (tiêu đề + bullet ▸ gọn + footer 1 dòng + màu kênh) + 2 panel mới (Trang Bị, Boss). Hồ Sơ thêm **thanh 💗 Sinh Mệnh** + nút **Liệu Thương** + field tóm tắt **trang bị (6 ô)**. Cẩm nang `guide.js` +3 mục (Sinh Mệnh/Trang bị/Boss), số liệu kéo từ config.
  - **Kênh mới:** `trangBi` (`CH_TRANG_BI`), `bossTheGioi` (`CH_BOSS_THE_GIOI` hoặc `CH_BOSS`). `features.js` +2 (`trangbi` R2, `boss` R3). `commandChannels` +2.

**Test (Windows, thuần):** toàn bộ 52+ file pass `node --check`; regression combat ✓; mô phỏng spread phái + sát thương boss + vòng đời boss 6 người chơi (chia thưởng, không NaN) ✓. **CHƯA test DB live** (better-sqlite3 binary Linux không chạy Windows — như mọi GĐ trước; rà soát code DB thủ công + cross-check 100 lệnh `db.*` đều export).

### GĐ16 — Gỡ HP · Boss cooldown · Shop · Real-time + Sticky · Dọn panel (vừa xong)
Theo yêu cầu chủ dự án (9 mục + 4 lựa chọn đã chốt). **Combat không đổi.**
- **(1) GỠ HP ngoài trận:** `config.health.enabled=false` (giữ `health.js` dạng ngủ). Gỡ mọi hook vit ở `bicanh`/`luyentruong`; thanh Sinh Mệnh + nút Liệu Thương ở Hồ Sơ tự ẩn (đã gate sẵn `health.enabled()`). DB vit_* để nguyên (vô hại).
- **(2) BOSS = COOLDOWN THUẦN:** bỏ tốn Sinh Mệnh; gate mỗi đòn bằng `world_boss_dmg.last_ts` + `attackCooldownMs` (5'). `boss.js` bỏ require health.
- **(3) SHOP — Phường Thị (`shop.js` thuần + `/shop`):** bán **VẬT PHẨM TIÊU HAO** (6 nguyên liệu · 🔩 Tinh Thiết · 3 đan). KHÔNG bán trang bị. Giá ở `shop.js`×`config.shop.priceMult`. Mua x1/x5/x10, trừ linh thạch raw + cộng vật phẩm. Nút 🛒 trên panel Luyện Trường.
- **(4) TRANG BỊ vào Hồ Sơ:** nút **🛡️ Trang bị** (`panel_trangbi`) trong profile mở thẳng kho. Giữ panel/kênh Trang Bị riêng.
- **(5) GIẢM CD:** Săn Yêu 3'→**1'**, Tháp 4'→**1'30** (`config.farm`).
- **(6) LINH ĐIỀN dời sang panel Tu Luyện** + cải tiến: **tự khai hoang** khi mở (bỏ bước "bấm thu hoạch để bắt đầu" khó hiểu) + **thanh tiến trình**; nút `farm_linhdien` gỡ khỏi hub Luyện Trường, đặt vào panel Tu Luyện; thêm `farm_linhdien_refresh`. Engine `farm.linhDien*` GIỮ NGUYÊN (offline tích + giữ phần dư đã đúng từ trước).
- **(7) ĐẤU PHÁP công khai + sticky:** `fight.js` thêm `opts.public` (reply KHÔNG ẩn) + `ownerId` (chỉ chủ trận bấm nút được, người khác báo ẩn). `dauphap` trận **công khai**; panel `dauDai` = **bảng xếp hạng LIVE** (`boardPanelView`) + nút Khiêu chiến/Sảnh đài/Bảng. Đăng ký sticky.
- **(8) ĐỘT PHÁ bỏ kênh riêng:** xóa panel `dotPha` khỏi `PANELS`; nút **⚡ Đột phá** (`panel_dotpha`) vào panel Tu Luyện; `commandChannels.dotpha` → `tuLuyen`. (config.channels.dotPha để trống không sao.)
- **(9) PANEL CHUNG REAL-TIME (10s) + STICKY** (`util/livepanels.js`): command tự `register(key, build, {sticky})` (như `fight.registerOutcome`). `index.js` chạy `livepanels.tick(client)` mỗi `config.ui.liveRefreshMs` (10s) → **edit tại chỗ** boss/BXH/đấu pháp với dữ liệu mới; `onMessage` (tin nhắn user) → **đăng lại panel xuống đáy** (debounce 4s, bỏ qua tin của bot). View CÁ NHÂN (hồ sơ/trang bị/shop) KHÔNG auto-edit được (giới hạn Discord) → giữ nút 🔄. Đã đăng ký: `bossTheGioi`+`dauDai` (sticky), `bangXepHang`.
- **(10) ẢNH AI (`assets.js` mở rộng + `assets/img/GEN_MANIFEST.md`):** thêm `gear(slot,rarity)` (`gear_<slot>_<rarity>.png` — **mỗi người thấy ảnh khớp ô×độ hiếm món của họ**, gắn ở trangbi itemView), `skill`, `misc` (shop/bag banner). Manifest liệt kê **đủ tên file + prompt RPG tiên hiệp** để chủ dự án gen bằng tool AI rồi thả vào `assets/img/` (thiếu thì tự bỏ qua). Override URL: `GEAR_URL/SKILL_URL/MISC_URL`.
- **Admin:** `/quantri boss spawn|kill`, `tinhthiet`, `lieuthuong` (GĐ15). **Kênh:** bỏ `dotPha` panel; còn 10 panel `/setup` + Trang Bị + Boss.

### GĐ17 — Boss bền · Shop kênh riêng · Linh Điền trồng trọt · Real-time per-loại (vừa xong)
Theo yêu cầu chủ dự án. **Combat không đổi.**
- **(1) Boss KHÔNG hết hạn:** `config.worldboss.lifetimeMs=0` → `worldboss.isActive` bỏ kiểm expire (chỉ chết khi bị giết). Spawn-check tick **30s** (`tickMs`). `respawnMs` 30'. Panel bỏ dòng "tồn tại còn". `maybeSpawn` chỉ expire khi lifetime>0.
- **(2) Boss panel 5s · Đấu Pháp panel 5s · BXH 10s:** `livepanels.register(key, build, {sticky, intervalMs})` — tick nền 5s, mỗi panel tôn trọng intervalMs riêng (tránh edit thừa).
- **(3) Shop có KÊNH + PANEL riêng:** `config.channels.shop` (`CH_SHOP`), `panels.shop` (vào `/setup`), `commandChannels.shop`. Nút Phường Thị vẫn còn ở Luyện Trường (lối tắt). Thêm 🌰 **Linh Chủng** (hạt giống) vào shop.
- **(4) Săn Yêu CD 1'→30s** (`config.farm.sanYeu`).
- **(5) LINH ĐIỀN = TRỒNG TRỌT (đại tu):** bỏ mô hình "tự tích từ không". Giờ: mua 🌰 Linh Chủng ở Shop → **GIEO** (tiêu hạt, `db.plantLinhDien`) → sau `growMs` (30') CHÍN → **THU** (`db.harvestLinhDien`, mỗi hạt `yieldPerSeed`=2 Linh Thảo + chance Yêu Đan). Cột mới `linhdien_seeds`. `farm.linhDienState/Yield` viết lại. `linh_chung` là 1 "nguyên liệu" trong túi (`bicanh.MATERIALS`). Offline vẫn chín.
- **(6) REAL-TIME VIEW CÁ NHÂN (`util/autorefresh.js`):** Discord không đẩy real-time, NHƯNG trong 15' token ẩn bot có thể `interaction.editReply` lặp lại. Helper `autorefresh.start(interaction, rebuild)` lặp mỗi `config.ui.autoRefreshMs` (5s) tới khi `rebuild().done` hoặc quá `autoRefreshMaxMs` (14'). Áp cho: **Săn Yêu / Tháp** (đếm ngược cooldown), **Tu Luyện** (vận công đếm tới đủ giờ), **Bế Quan** (đếm tới đủ mốc), **Linh Điền** (đếm tới chín). Mỗi người 1 vòng (mở view mới hủy vòng cũ); action handler gọi `autorefresh.stop` trước khi vào trận/thu.
- **(7) ẢNH AI cho TOÀN BỘ game:** `GEN_MANIFEST.md` có **111 prompt RPG copy-paste sẵn** (realm/sect/panel/gear-30/skill-24/boss-5/pill-6/mat-7/zone-5/banner). **Đã GẮN HẾT những chỗ embed hiện được 1 ảnh:** realm→Hồ Sơ; sect→Môn Phái + trận Đấu Tập/Đấu Pháp(người thật); panel→banner; gear→màn chi tiết Trang Bị; boss→announceSpawn + panel Boss ẩn + panel live(chỉ URL); zone→trận Bí Cảnh; foe_wild/foe_tower→Săn Yêu/Tháp; npc_dau→Đấu Pháp NPC; shop/bag→banner. `fight.js` thêm `ctx.thumbSrc` (upload ảnh **1 lần** lúc mở trận, giữ qua các lượt update, xóa lúc kết thúc → không re-upload). `assets.src(prefix)` trả nguồn ảnh thô. skill/pill/mat là DANH SÁCH nên chưa hiện (helper sẵn).
  - ⚠️ **NÉN ẢNH:** ảnh AI gốc 2048px ~7-13 MB → upload chậm/dễ lỗi. Script **`assets/img/_optimize.py`** (Python+Pillow) nén PNG→**WebP** (~30-150 KB) + dời gốc vào `_originals_backup/`. Đợt hiện tại: **798 MB → 5.8 MB** (111 ảnh). Game đọc `.webp` tự động. Thêm ảnh mới → chạy lại script.
- **Lưu ý real-time:** panel CHUNG (boss/đấu pháp/BXH) auto-edit theo interval; view CÁ NHÂN auto-refresh trong 15' rồi dừng (giới hạn token Discord — không thể vô hạn).

### GĐ18 — Sửa lỗi + tinh chỉnh (vừa xong)
- **(BUG) Nút Nhiệm Vụ Ngày lỗi:** realm 3+ có 7-8 nhiệm vụ nhưng dồn hết nút vào **1 hàng** (Discord tối đa 5 nút/hàng) → API từ chối → panel không mở được. Sửa `nhiemvu.js` `dailyView`: chia nút thành **nhiều hàng** (chunk 5, tối đa 5 hàng).
- **Ảnh xuống DƯỚI CÙNG:** đổi mọi ảnh game từ `thumbnail` (góc phải) → `image` (banner dưới) ở fight/boss/gear/sect/skill/pill/mat. Default `assets.sect/gear/skill` cũng đổi sang `image`. (Avatar người chơi ở Hồ Sơ vẫn thumbnail — là pfp Discord, không phải art.)
- **STICKY thêm panel tĩnh:** `livepanels` thêm cờ `stickyOnly` (chỉ nổi xuống đáy, KHÔNG auto-edit). `panels.js` đăng ký sticky cho **luyenTruong · tuLuyen · monPhai · shop · nhiemVu** (boss/đấu pháp/BXH đã live-sticky sẵn).
- **(GĐ18b — đợt 2):**
  - **Bỏ nút Phường Thị** khỏi panel Luyện Trường + **xóa dòng** "Linh Điền đã chuyển…" (panel + hub). Shop chỉ ở kênh riêng.
  - **Bỏ kênh/panel Trang Bị + Đột Phá:** xóa khỏi `PANELS` + `config.channels` + gating; trang bị truy cập qua nút 🛡️ ở Hồ Sơ, đột phá ở panel Tu Luyện. `/setup` giờ **tự dọn panel mồ côi** (panel cũ không còn trong PANELS → xóa message + bản ghi) qua `db.allPanels/deletePanel`.
  - **Boss đánh THEO LƯỢT (không auto-skip) + CD 30s:** bỏ `measureAssault`; `boss:attack` mở trận `fight.js` (ctx.type `worldboss`) — đợt boss = bia HP = `Công × assaultPoolMult(10)`, tối đa `assaultRounds(12)` hiệp. Outcome trừ sát thương (poolMax − HP còn) vào HP CHUNG (`dealBossDamage`); hạ gục → chia thưởng. Cooldown đặt lúc VÀO (ghi 0 dmg → last_ts) để bỏ trận vẫn tốn CD.
  - **Panel LIVE giữ banner:** trước đây tick auto-edit làm mất ảnh panel boss/đấu pháp/BXH. Nay builder trả `files` (banner); `livepanels.tick` **bỏ files khi edit** (không re-upload, banner persists), **repost/setup gửi kèm files**. Thêm `assets.imageRef`.
  - **Chi tiết item/tài nguyên:** `bagItemView` thêm **chỉ số/công dụng** — đan tu vi (+% & ≈ tu vi thực), đan độ kiếp (+% tỉ lệ), phẩm cấp, **đan phương** (nguyên liệu+phí); nguyên liệu hiện **luyện được đan gì** + hạt giống → Linh Điền.

## 3. Kiến trúc file (trong `tu-tien/`)
| File | Vai trò | Thuần? |
|---|---|---|
| `health.js` | **SINH MỆNH ngoài trận**: hồi máu lười + trọng thương (công thức; DB gọi) | ✅ |
| `gear.js` | **HỆ TRANG BỊ ĐẦY ĐỦ**: 6 ô · 5 độ hiếm · rớt/cường hóa/phân giải · `sumBonus` cộng phẳng vào combat | ✅ |
| `worldboss.js` | **BOSS THẾ GIỚI**: catalog 5 boss + công thức HP/thưởng/chia sát thương | ✅ |
| `util/ui.js` | **Bộ dựng UI dùng chung** (đại tu UI): panelEmbed màu kênh, barLine, factory nút, format | ✅ |
| `shop.js` | **SHOP Phường Thị**: catalog vật phẩm tiêu hao + giá (nguyên liệu/Tinh Thiết/đan) | ✅ |
| `util/livepanels.js` | **PANEL CHUNG REAL-TIME + STICKY**: register builder + intervalMs riêng, tick edit, đăng lại xuống đáy | ❌ DB (gián tiếp) |
| `util/autorefresh.js` | **VIEW CÁ NHÂN REAL-TIME**: lặp `interaction.editReply` (đếm ngược cooldown/tiến trình) trong 15' token | ✅ |
| `health.js` | (NGỦ — `config.health.enabled=false`) HP ngoài trận; bật lại nếu cần | ✅ |
| `config.js` | MỌI thông số game (tu vi, cooldown, độ kiếp, phí đổi phái...) | ✅ |
| `cultivation.js` | Cảnh giới: công thức tu vi, đột phá, độ kiếp, danh hiệu | ✅ |
| `story.js` | Nội dung cốt truyện (CHAPTERS) + helper | ✅ |
| `features.js` | Sổ mở khóa tính năng theo cảnh giới | ✅ |
| `skills.js` | Kho 30 skill (bị động + chủ động) | ✅ |
| `sects.js` | 6 môn phái: bias chỉ số + loadout mặc định | ✅ |
| `combat.js` | Engine đánh theo lượt. `build(...,opts={attrs,skillLevels,stagesSinceJoin})` — opts rỗng = y hệt cũ | ✅ |
| `attributes.js` | 5 thuộc tính gốc + `combatBonus()` (quy điểm → chỉ số). Nguồn sự thật cho combat | ✅ |
| `bicanh.js` | Bí Cảnh PvE: vùng + sinh yêu thú (tái dùng combat) + bảng rớt + nguyên liệu | ✅ |
| `alchemy.js` | Luyện Đan: kho đan (`PILLS`) + đan phương (`RECIPES`) + tỉ lệ luyện + chọn đan độ kiếp | ✅ |
| `guide.js` | Cẩm nang hướng dẫn (11 mục) — số liệu lấy từ config/cult nên luôn khớp game | ✅ |
| `assets.js` | Registry ẢNH (cảnh giới/phái/panel): file local `assets/img/` theo quy ước HOẶC URL; helper `apply/realm/sect/panel`. Thiếu ảnh → tự bỏ qua | ✅ |
| `equipment.js` | Trang bị nhập môn: bộ 3 món/phái + `gearBonus()` (cộng chỉ số phẳng vào combat) | ✅ |
| `sectquest.js` | Chuỗi nhiệm vụ nhập môn (mở dần chiêu + thưởng trang bị) | ✅ |
| `farm.js` | 3 khu farm: Linh Điền (idle) + Săn Yêu + Thí Luyện Tháp (tái dùng combat) | ✅ |
| `pvp.js` | Đấu Pháp: ELO + danh hiệu theo điểm + đối thủ NPC (đài chủ). Công thức thuần | ✅ |
| `dampen.js` | **NERF CHUNG**: Linh Khí Loãng (giảm farm theo ngày) + Bình Cảnh (bóp tu vi tầng đỉnh). database.js gọi tại chokepoint addTuVi/addStones | ✅ |
| `combat.js` (turn) | Thêm `startFight/stepRound/autoResolve` — đánh THEO LƯỢT (tái dùng engine, cân bằng giống resolve) | ✅ |
| `commands/fight.js` | Controller trận đánh theo lượt dùng chung (bí cảnh/đấu tập/PvP/săn yêu/tháp): phiên RAM + render nút chiêu + ⚡ Đánh nhanh + registerOutcome | ❌ DB (gián tiếp) |
| `leaderboard.js` | Dựng embed BXH dùng chung: cảnh giới / linh thạch / **đấu pháp** (`/top`, panel BXH, nút BXH) | ❌ DB (đọc) |
| `util/announce.js` | Vọng Âm Đài: `announce(client, embed)` fire-and-forget ra kênh thông báo | ❌ DB |
| `quests.js` | Catalog nhiệm vụ hằng ngày + `dayKey()` (reset theo ngày) | ✅ |
| `panels.js` | Builder 4 panel cố định (Sơ Nhập/Nhiệm Vụ/Môn Phái/Hồ Sơ) | ✅ |
| `database.js` | SQLite: players (+thuộc tính/cấp chiêu/pending_sect/daily_quests), story_progress, **panels** | ❌ DB |
| `index.js` | Bot chính: loader lệnh, router nút, ngộ tính + daily-chat hook, graceful shutdown | ❌ DB |
| `deploy-commands.js` | Đăng ký slash command | — |
| `util/feature-gate.js` | `requireUnlocked()` (khóa cứng) + `makeStub()` | ❌ DB |
| `util/admin.js` | `isAdmin()` — quyền quản trị dùng chung cho `/setup` + `/quantri` | ❌ DB |
| `commands/*.js` | Mỗi lệnh 1 file: `data`+`execute`(+`buttons`). Admin: `setup.js` (panel), `quantri.js` (chỉnh dữ liệu tu sĩ — 14 subcommand) | ❌ DB |

**Quy ước:** nút/menu định tuyến theo tiền tố `customId` trước dấu `:` (xem `index.js`). Panel cố định dùng customId **tĩnh** (không ownerId) + phản hồi **ephemeral**. **KHÔNG còn stub nào** — toàn bộ tính năng đã `live`.

## 4. Các "cần gạt" cân bằng (chỉnh ở đâu)
- Nhịp tu luyện, độ kiếp, **thuộc tính** (`attributes.pointsPerTier/respecCost`), **chiêu** (`skills.perStageBuff/maxLevel/levelPowerStep/upgradePointsPerMajor`), **kênh panel** (`channels`): `config.js`.
- Hệ số mỗi điểm thuộc tính → chỉ số: `attributes.js` (`PER`).
- Chỉ số combat gốc theo bậc: `combat.js` (`baseStats`). Hằng giảm trừ Phòng + đòn thêm theo Tốc: `config.combat` (`defKBase/defKPerStage` — `defK` co giãn theo bậc; `extraAttackRatio/extraAttackPower=0.5`). **Đã đại tu ở GĐ13 + GĐ19** — spread ~8-16% mọi cảnh giới, cân CẢ default LẪN tuyệt kỹ. Chỉnh tiếp: đo 2 chiều A↔B × {default, tuyệt kỹ} ở R2/R4/R6/R8 (xem GĐ19).
- Bias chỉ số mỗi phái + loadout mặc định + `primaryAttrs`: `sects.js`.
- Số liệu từng skill (power/dot/.../`unlockRealm`): `skills.js`.
- Cách re-cân bằng: chạy mô phỏng vòng tròn (xem mục 5). Lưu ý đo **chéo phái** (không dùng trận gương — gương lật 0/100% với chênh lệch nhỏ), và khử **lợi thế đi trước khi hòa Tốc** bằng cách bình quân 2 chiều A↔B.

## 5. Cách test trên Windows (không cần DB)
Mô phỏng cân bằng 6 phái (script mẫu đã dùng nhiều lần):
```bash
cd tu-tien && node -e '
const combat=require("./combat"), sects=require("./sects");
const ids=sects.allSects().map(s=>s.id); const N=5000,R=2,T=5;
const wins={},games={}; ids.forEach(i=>{wins[i]=0;games[i]=0;});
for(const a of ids)for(const b of ids){if(a===b)continue;let aw=0;
  for(let k=0;k<N;k++){const r=combat.resolve(combat.build("A",R,T,a),combat.build("B",R,T,b));if(r.winner==="A")aw++;else if(r.winner==="draw")aw+=0.5;}
  wins[a]+=aw;games[a]+=N;}
ids.map(i=>[i,wins[i]/games[i]]).sort((x,y)=>y[1]-x[1]).forEach(([i,w])=>console.log(i,(w*100).toFixed(1)+"%"));
'
```
Kiểm tra cú pháp tất cả: `for f in *.js commands/*.js util/*.js; do node --check "$f"; done`

## 6. Việc TIẾP THEO (gợi ý, chưa làm)
- **TRIỂN KHAI trên host Linux** (xem mục 8): điền 6 CHANNEL_ID vào `.env`, `npm run deploy`, `npm start`, chạy `/setup`, đi trọn luồng người chơi. **Lưu ý chưa chạy thật lần nào** — toàn bộ lệnh đụng DB + voice + announce mới chỉ test cú pháp + nạp module (mock DB), chưa test trên Discord live.
- ~~**Sửa cân bằng bậc cao**~~ — **ĐÃ XONG ở GĐ19** (spread ~8-16% mọi bậc, cân cả default lẫn tuyệt kỹ).
- **GĐ8 ĐỢT 2 + GĐ9 — ĐÃ XONG TOÀN BỘ.** **KHÔNG còn stub nào** — mọi tính năng đã `live`.
- **Đấu Pháp (PvP)** — ĐÃ LÀM (GĐ9): Đấu Đài xếp hạng snapshot async + ELO + đài chủ NPC. *Mở rộng tùy chọn:* khiêu chiến trực tiếp (tag người chơi, nút Chấp nhận có timeout); mùa giải (reset điểm + thưởng theo mùa); phần thưởng theo hạng; lịch sử trận.
- **Mở rộng Luyện Đan (tùy chọn):** thêm đan **buff combat** cho Bí Cảnh (truyền qua `combat.build` opts — CẨN THẬN cân bằng bậc cao), hoặc đan hồi điểm thuộc tính/rửa miễn phí; thêm đan phương mới chỉ cần thêm vào `alchemy.PILLS` + `RECIPES`.
- Cân nhắc hệ **đóng góp tông môn / nhiệm vụ phái / chiến tông môn**; thêm nhiệm vụ ngày mới (chỉ cần thêm vào `quests.DAILIES` + hook type).
- (Tùy chọn) Cho **độ sâu Bí Cảnh tăng theo tiến độ** (thuộc tính/cấp chiêu nay đã giúp người chơi mạnh hơn quái → đi sâu hơn chút; có thể bật `config.attributes.pveMonsterComp` nếu cần bù quái).

## 8. Triển khai panel + kênh trên host Linux
1. Tạo **12 kênh** Discord, bật Developer Mode, copy ID, điền `.env`:
   - **Panel có `/setup` (11):** `CH_SO_NHAP / CH_TU_LUYEN / CH_DOT_PHA / CH_NHIEM_VU / CH_MON_PHAI / CH_HO_SO / CH_TRANG_BI / CH_LUYEN_TRUONG / CH_DAU_DAI / CH_BOSS_THE_GIOI / CH_BANG_XEP_HANG`
   - `CH_VONG_AM_DAI` (Vọng Âm Đài — **feed thông báo, KHÔNG cần `/setup`**, bot tự gửi vào: độ kiếp, hạ boss bí cảnh + **boss thế giới**, thần đan)
   - (+ tùy chọn `ADMIN_ROLE_ID` — role được dùng `/setup` **và** `/quantri`). **Cần bật intent đặc quyền? KHÔNG** — voice dùng `GuildVoiceStates` (intent thường).
2. `cd tu-tien && npm install` (build lại `better-sqlite3` đúng nền tảng) — DB sẽ tự migrate thêm cột/bảng mới khi khởi động.
3. `npm run deploy` (đăng ký lệnh) rồi `npm start`.
4. Chạy `/setup` (Manage Guild / role admin) → bot đăng **11 panel** (gồm Tu Luyện + Đột Phá + Trang Bị + Luyện Trường + Đấu Pháp Đài + Boss Thế Giới + BXH). Chạy lại `/setup` để cập nhật panel tại chỗ. Admin chỉnh dữ liệu tu sĩ bằng **`/quantri`** (xem/cấp linh thạch·tu vi·cảnh giới·điểm·nguyên liệu·đan·trang bị·phái·điểm PvP, reset cooldown, xóa).
5. Đi thử luồng: Sơ Nhập "Nhập đạo" → nút **🧭 Bắt đầu hành trình** dẫn sang Nhiệm Vụ → cốt truyện + daily → đột phá nhận điểm thuộc tính → Hồ Sơ cộng điểm + xem **📖 Hướng dẫn / 🎒 Túi đồ** → Trúc Cơ: Môn Phái đặt nguyện vọng → nghi thức nhập môn → Kim Đan: `/bicanh` gom nguyên liệu → `/luyendan` chế đan → độ kiếp (tự dùng đan hộ đạo) → xem **Vọng Âm Đài** loan tin → ngồi **voice ≥2 người** tích tu vi → Nguyên Anh: **Đấu Pháp Đài** khiêu chiến (ghép đối thủ/đài chủ NPC, leo điểm ELO) → **Bảng Xếp Hạng** so tài (gồm Luận Võ Bảng).

## 7. Quyết định thiết kế đã chốt với chủ dự án
- Game mới hoàn toàn, chủ đề tu tiên, thư mục riêng, giữ game cũ.
- MVP gọn trước, mở rộng dần.
- Cốt truyện kể theo cảnh (immersive), mở khóa tính năng **khóa cứng theo cảnh giới**.
- Skill môn phái là **kỹ năng combat (PvE/PvP)**, KHÔNG phải buff tu luyện.
- Gia nhập phái ở **Trúc Cơ**; **bị động + tối đa 3 chủ động**; đổi phái **tốn linh thạch**; các phái phải **cân bằng**.
