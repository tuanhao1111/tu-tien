// =====================================================================
//  CẨM NANG HƯỚNG DẪN (thuần — dữ liệu) — mở từ Hồ Sơ.
//  Mỗi mục là 1 trang giải thích chi tiết một hệ thống. Số liệu lấy thẳng
//  từ config/cultivation nên LUÔN khớp với game thật (cập nhật xuyên suốt).
//  Thêm/sửa hệ thống mới -> thêm/sửa 1 mục ở đây là cẩm nang tự cập nhật.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');
const pvp = require('./pvp');
const petbeasts = require('./petbeasts');

const cur = `${config.currency.emoji} ${config.currency.name}`;
const realmsLine = cult.REALMS.map((r) => `${r.emoji} ${r.name}`).join(' → ');

const SECTIONS = [
  {
    id: 'tongquan', emoji: '🌄', label: 'Tổng quan',
    title: '🌄 Tổng Quan — Con Đường Tiên Đồ Lộ',
    body:
      'Bạn khởi đầu là **Phàm Nhân** tay trắng, tu luyện tích **tu vi** rồi **đột phá** để lên cảnh giới — càng cao càng mạnh, mở khóa nhiều tính năng.\n\n' +
      `**10 cảnh giới:**\n${realmsLine}\n\n` +
      '**Vòng lặp cốt lõi:** tu luyện → đủ tu vi → đột phá (vượt cảnh giới = **độ kiếp**, có rủi ro) → mạnh hơn, mở tính năng mới → lặp lại.\n\n' +
      `Tiền tệ: **${cur}** 💎. Mọi tiến độ được lưu bền — cứ tu từ từ, không reset.`,
  },
  {
    id: 'tuluyen', emoji: '🧘', label: 'Tu luyện',
    title: '🧘 Tu Luyện — Tích Tu Vi',
    body:
      'Có **nhiều cách** tích tu vi, cứ chọn cách hợp với bạn:\n\n' +
      `🧘 **\`/tuluyen\` — Vận công** — CHỌN một mốc thời gian (${(config.cultivate.durations || []).join('/')} phút) rồi nhập định; nhận **${config.cultivate.ratePerMin} tu vi/phút**. Đủ giờ (kể cả offline) thì thu trọn vẹn; **thu sớm** vẫn nhận theo phần thời gian đã vận công.\n\n` +
      `🎙️ **Tu luyện qua Voice** (chọn trong \`/tuluyen\`) — bấm **Bật Voice** rồi ngồi kênh thoại tích **${config.voice.ratePerMin} tu vi/phút**. Cần **≥${config.voice.minCompany} người thật** cùng kênh (khuyến khích tu chung), bỏ qua kênh AFK, tối đa **${Math.round(config.voice.dailyCapMinutes / 60)} giờ/ngày**. Nhớ **Tắt Voice** khi muốn vận công thường.\n\n` +
      `🚪 **\`/bequan\`** — **chọn mốc thời gian** (${(config.seclusion.durations || []).map((m) => m % 60 === 0 ? m / 60 + 'h' : m + 'p').join('/')}) rồi bế quan, tích **${config.seclusion.ratePerMin} tu vi/phút** kể cả khi offline. Đủ mốc thu trọn; **xuất sớm** vẫn nhận theo phần đã ngồi (cần ≥ ${config.seclusion.minMinutes} phút).\n\n` +
      `💬 **Ngộ tính khi chat** — trò chuyện trong server cũng tích chút tu vi (+${config.insight.min}–${config.insight.max}, hồi ${Math.round(config.insight.cooldownMs / 1000)}s/lần).`,
  },
  {
    id: 'dotpha', emoji: '⚡', label: 'Đột phá & Độ kiếp',
    title: '⚡ Đột Phá & Độ Kiếp',
    body:
      'Đủ tu vi thì gõ **`/dotpha`**:\n\n' +
      `• **Lên tầng nhỏ** (trong cùng cảnh giới): **luôn thành công**, thưởng ${config.breakthrough.minorStones}💎 + 🧬 ${config.attributes.pointsPerTier} điểm thuộc tính.\n\n` +
      `• **Vượt cảnh giới = ĐỘ KIẾP**: có **rủi ro**! Tỉ lệ thành công bắt đầu ${Math.round(config.breakthrough.baseSuccess * 100)}%, càng cao càng khó (sàn ${Math.round(config.breakthrough.minSuccess * 100)}%). **Thất bại mất ${Math.round(config.breakthrough.failLossPct * 100)}% tu vi** (vẫn giữ cảnh giới).\n` +
      `  Thành công thưởng ${config.breakthrough.majorStones}💎 + 🧬 ${config.attributes.pointsPerTier} điểm thuộc tính + 🎴 ${config.skills.upgradePointsPerMajor} điểm nâng chiêu.\n\n` +
      '💊 **Mẹo:** luyện **đan Hộ Đạo / Tạo Hóa** (xem mục Luyện Đan) rồi giữ trong túi — ở bảng Đột Phá có nút **bật/tắt tự dùng đan** lúc độ kiếp để cộng tỉ lệ thành công (mặc định BẬT). Tùy bạn quyết có xài hay để dành!',
  },
  {
    id: 'thuoctinh', emoji: '🧬', label: 'Thuộc tính',
    title: '🧬 Thuộc Tính Gốc',
    body:
      `Mỗi lần đột phá (tầng HOẶC độ kiếp) nhận **${config.attributes.pointsPerTier} điểm thuộc tính**. Vào **Hồ Sơ** bấm +1 để cộng:\n\n` +
      '🪨 **Căn Cốt** → Sinh Lực · 🌟 **Linh Lực** → Công + Linh Lực\n' +
      '🛡️ **Thể Phách** → Phòng Ngự · 🌀 **Thân Pháp** → Tốc + Né\n' +
      '🔮 **Ngộ Tính** → Bạo Kích & ST bạo kích\n\n' +
      `Điểm cộng **phẳng** sau chỉ số phái (không bị nhân lên) nên không phá cân bằng. Mỗi phái có **thuộc tính chính** (⭐) gợi ý. Đổi hướng build? **Rửa điểm** tốn ${config.attributes.respecCost}💎 để trả hết về quỹ.`,
  },
  {
    id: 'monphai', emoji: '🏯', label: 'Môn phái & Combat',
    title: '🏯 Môn Phái & Chiến Đấu',
    body:
      `Đạt **${cult.REALMS[2].emoji} ${cult.REALMS[2].name}** mở khóa môn phái. Tới panel **Môn Phái** (hoặc \`/monphai\`) đặt **nguyện vọng**, rồi hoàn thành **nghi thức nhập môn** ở bảng Nhiệm Vụ để chính thức thành đệ tử.\n\n` +
      '**6 phái cân bằng** (kèo khắc chế kéo-búa-bao): ⚔️ Kiếm Tông · 🔥 Huyền Hỏa Môn · 💊 Đan Đỉnh Lâu · 👊 Cương Thể Môn · 🩸 Huyết Ma Giáo · 🌀 Phong Linh Tông.\n\n' +
      'Mỗi phái: **1 bị động + 4 chủ động** (trang bị tối đa **3** cùng lúc). **Đánh THEO LƯỢT** — mỗi lượt bạn **tự chọn chiêu** (hoặc 👊 đánh thường), hoặc bấm **⚡ Đánh nhanh** để tự kết trận. Cơ chế: bạo kích, né, khiên, phản đòn, hút máu, độc/thiêu, buff/debuff; Tốc cao hơn hẳn được **đánh thêm 1 đòn**.\n\n' +
      '📿 **Nhiệm vụ nhập môn:** vào phái mới chỉ có **1 chiêu cơ bản**; mở panel **Môn Phái → 📿 Nhiệm vụ nhập môn** làm chuỗi 3 bước để **mở dần 2 chiêu còn lại** + nhận **bộ trang bị nhập môn** (3 món cộng chỉ số).\n\n' +
      `🥊 **\`/dautap\`** đấu mộc nhân để thử chiêu (không mất gì). Đổi phái tốn ${config.sect.switchCost}💎 và **khóa đổi tiếp ${Math.round(config.sect.switchLockMs / 3600000)} giờ**; sau **${Math.round(config.sect.freeReturnMs / 3600000)} giờ** được **quay về phái cũ MIỄN PHÍ**.`,
  },
  {
    id: 'kynang', emoji: '🎴', label: 'Kỹ năng',
    title: '🎴 Kỹ Năng — Mở Khóa & Nâng Cấp',
    body:
      '🎯 **`/kynang`** — xem & trang bị tối đa 3 chiêu chủ động.\n\n' +
      `**Mở khóa chiêu:** 3 chiêu cơ bản **mở dần qua nhiệm vụ nhập môn** (vào phái có 1, làm nhiệm vụ mở 2 & 3); **tuyệt kỹ** mỗi phái mở ở **${cult.REALMS[4].emoji} ${cult.REALMS[4].name}**.\n\n` +
      `**Nâng cấp chiêu:** mỗi lần **độ kiếp** thành công nhận **${config.skills.upgradePointsPerMajor} điểm nâng chiêu**. Vào **Hồ Sơ → 🎴 Quản lý chiêu** để nâng (mỗi cấp +${Math.round(config.skills.levelPowerStep * 100)}% sát thương/DoT, giảm hồi chiêu; tối đa cấp ${config.skills.maxLevel}).\n\n` +
      `Ngoài ra mỗi bậc kể từ khi gia nhập phái, chiêu tự mạnh thêm nhẹ (+${Math.round(config.skills.perStageBuff * 100)}%/bậc).`,
  },
  {
    id: 'bicanh', emoji: '🗺️', label: 'Bí cảnh',
    title: '🗺️ Bí Cảnh (PvE)',
    body:
      `Đạt **${cult.REALMS[3].emoji} ${cult.REALMS[3].name}** + có môn phái → mở **\`/bicanh\`**.\n\n` +
      'Vào 1 bí cảnh = 1 lượt thám hiểm. Đánh yêu thú theo **tầng**; thắng thì gom chiến lợi phẩm (chưa nhận), rồi tự quyết:\n' +
      '• ⚔️ **Đi sâu** — yêu thú mạnh hơn, thưởng hậu hơn (mỗi 5 tầng có **BOSS**).\n' +
      '• 🚪 **Rời** — nhận toàn bộ thu hoạch vào túi.\n\n' +
      `Mỗi tầng **đánh theo lượt** (chọn chiêu, hoặc ⚡ Đánh nhanh). ⚠️ **Gục giữa bí cảnh = MẤT hết đồ chưa nhận!** Máu mang theo giữa các tầng (chỉ hồi nhẹ) → đi sâu càng rủi ro. Cooldown vào bí cảnh: ${Math.round(config.bicanh.cooldownMs / 60000)} phút.\n\n` +
      'Bí cảnh rớt **linh thạch + tu vi + nguyên liệu** → mang đi **Luyện Đan**.',
  },
  {
    id: 'luyentruong', emoji: '⛰️', label: 'Luyện Trường',
    title: '⛰️ Luyện Trường — Khu Farm',
    body:
      `Đạt **${cult.REALMS[3].emoji} ${cult.REALMS[3].name}** → mở **\`/luyentruong\`** (Tháp + Bí Cảnh). 🐗 **Săn Yêu** mở SỚM hơn — từ **${cult.REALMS[config.farm.sanYeu.minRealm || 1].emoji} ${cult.REALMS[config.farm.sanYeu.minRealm || 1].name}**.\n\n` +
      `🌱 **Linh Điền** (ở panel **Tu Luyện**) — **trồng trọt**: mua 🌰 Linh Chủng ở Phường Thị → **gieo** → sau ${Math.round(config.farm.linhDien.growMs / 60000)} phút chín → thu **${config.farm.linhDien.yieldPerSeed}× Linh Thảo/hạt** (offline vẫn chín). Đếm ngược **tự cập nhật**.\n\n` +
      `🐗 **Săn Yêu** (kênh **Bãi Săn Yêu** riêng, mở ở **${cult.REALMS[config.farm.sanYeu.minRealm || 1].emoji} ${cult.REALMS[config.farm.sanYeu.minRealm || 1].name}** — **chưa cần môn phái**) — đánh nhanh 1 yêu hoang kiếm linh thạch + tu vi (cooldown **${Math.round(config.farm.sanYeu.cooldownMs / 1000)}s**). Thua không mất gì. 🎲 Đôi khi gặp **Kỳ Ngộ** bất ngờ.\n\n` +
      `🗼 **Thí Luyện Tháp** — leo tháp vô tận: thắng thì **lên tầng** + thưởng tăng dần; thua giữ nguyên kỷ lục (cooldown **${Math.round(config.farm.thap.cooldownMs / 1000)}s**). Có **⚡ Quét** gom nhanh thưởng. **Tháp cần có môn phái.** _(Đếm ngược cooldown tự cập nhật.)_\n\n` +
      `👻 **Truy Tung Nhiếp Hồn** (mở ở **${cult.REALMS[config.farm.sanHon.minRealm || 4].emoji} ${cult.REALMS[config.farm.sanHon.minRealm || 4].name}**) — đánh yêu thú nhiếp **👻 Yêu Hồn Phách**: tài nguyên **bắt & nâng cấp Ngự Thú** (cooldown **${Math.round(config.farm.sanHon.cooldownMs / 1000)}s**).`,
  },
  {
    id: 'dauphap', emoji: '⚔️', label: 'Đấu Pháp (PvP)',
    title: '⚔️ Đấu Pháp — Luận Võ Đài (PvP)',
    body:
      `Đạt **${cult.REALMS[config.pvp.minRealm].emoji} ${cult.REALMS[config.pvp.minRealm].name}** → mở **\`/dauphap\`** (hoặc panel **Đấu Pháp Đài**). _(GĐ24: hạ từ Nguyên Anh xuống Trúc Cơ — PvP sớm hơn.)_\n\n` +
      'Bấm **⚔️ Khiêu chiến** → hệ thống **ghép một cao thủ ngang điểm**, rồi đánh **bản sao chỉ số** của họ — **không cần đối thủ online**. Chưa có ai ngang sức thì ghép **đài chủ NPC** cùng bậc.\n\n' +
      `🏆 **Điểm đấu (ELO):** khởi điểm ${pvp.START_RATING}. Thắng **+điểm** + thưởng (${config.pvp.winStones}💎 · +${config.pvp.winTuVi} tu vi), thua **−điểm** (không mất gì khác). Cooldown **${config.pvp.cooldownMs < 60000 ? Math.round(config.pvp.cooldownMs / 1000) + ' giây' : Math.round(config.pvp.cooldownMs / 60000) + ' phút'}/trận** · đánh **theo lượt**.\n\n` +
      '🎖️ **Danh hiệu** leo dần theo điểm: *Vô Danh Tiểu Tốt → … → Thiên Hạ Đệ Nhất*. Thăng hạng được loan báo ở **Vọng Âm Đài**. Xem **🏆 Luận Võ Bảng** để so tài cao thủ thiên hạ.\n\n' +
      '💡 Đấu Pháp dùng **đúng** chỉ số combat của bạn — cộng thuộc tính, nâng chiêu, đổi loadout (`/kynang`) và trang bị đều có tác dụng.',
  },
  {
    id: 'nguthu', emoji: '🐉', label: 'Ngự Thú (bạn chiến)',
    title: '🐉 Ngự Thú — Bạn Chiến PvE',
    body:
      `Đạt **${cult.REALMS[(config.pet && config.pet.minRealm) || 4].emoji} ${cult.REALMS[(config.pet && config.pet.minRealm) || 4].name}** → mở **\`/nguthu\`** (hoặc **Hồ Sơ → 🐉 Ngự Thú**).\n\n` +
      '🎰 **Bắt thú ở Chiêu Hồn Đài** (kênh **Shop**): quay bằng **LT + 👻 Yêu Hồn Phách** _(không pity)_ hoặc **🔮 Tiên Ngọc** _(tốn hơn, có pity)_. Tỉ lệ 🟡 **Thần Thú** cực thấp — trùng thú trả về 👻 Yêu Hồn Phách; hoặc **mua thẳng thú** (giá cao).\n' +
      '👻 **Yêu Hồn Phách** farm ở **Luyện Trường → Truy Tung Nhiếp Hồn**.\n' +
      `🐾 Có thú rồi → **trang bị 1 con** (**Hồ Sơ → ⚙️ → 🐉 Ngự Thú**) → **cho ăn** 🍖 Yêu Thú Lương + 👻 để tích EXP → **đột phá cấp** (có **tỉ lệ trượt**, dùng 🪬 **Ngự Thú Phù** cho chắc). **Tiến hóa hình** ở mốc cấp, tối đa cấp **${(config.pet && config.pet.maxLevel) || 15}**.\n` +
      '⚔️ Con đang theo **cộng chỉ số phẳng** (❤️ Sinh Lực · ⚔️ Công · 🛡️ Phòng · 🌀 Tốc) + thỉnh thoảng **tung đòn phụ** trong trận.\n' +
      `🎯 Dùng được **cả PvE** (bí cảnh/săn yêu/tháp/boss/phó bản/đấu tập) **lẫn Đấu Pháp (PvP)** — ở PvP **cả hai đấu thủ** đều mang thú của mình (đối xứng).\n\n` +
      `Có **${petbeasts.BEASTS.length} loại thú** (mở dần theo cảnh giới), mỗi con một lối: trâu bò, bạo lực, tốc độ… Cấp tối đa **${(config.pet && config.pet.maxLevel) || 10}**.`,
  },
  {
    id: 'thanthong', emoji: '👁️', label: 'Thần Thông (Nguyên Thần)',
    title: '👁️ Thần Thông — Nhánh Tu Nguyên Thần',
    body:
      `Đạt **${cult.REALMS[(config.thanthong && config.thanthong.minRealm) || 5].emoji} ${cult.REALMS[(config.thanthong && config.thanthong.minRealm) || 5].name}** → quản lý ở **Hồ Sơ → ⚙️ → 👁️ Thần Thông** (hoặc lệnh **\`/thanthong\`**).\n\n` +
      `🧠 **Luyện Nguyên Thần** lên cấp (tốn linh thạch + nguyên liệu) — mỗi cấp mở thêm **1 Thần Thông** (tối đa cấp **${(config.thanthong && config.thanthong.maxLevel) || 8}**).\n` +
      `🌌 **Vận Thần Thông** (tối đa **${(config.thanthong && config.thanthong.slotsMax) || 3} ô** theo cấp): mỗi cái cộng **chỉ số phẳng** (bạo/công/né/phòng/sinh lực…).\n` +
      `🎯 Thần Thông áp **CẢ PvE LẪN Đấu Pháp (PvP)** — đối xứng theo mức đầu tư Nguyên Thần của mỗi người.\n\n` +
      `Hiện trên thẻ Hồ Sơ ở dải **🎴 Chiêu & Đồng Hành** (ô **tím**).`,
  },
  {
    id: 'dutien', emoji: '🧭', label: 'Du Tiên (Nguyên Thần)',
    title: '🧭 Du Tiên — Nguyên Thần Xuất Khiếu (idle)',
    body:
      `Đạt **${cult.REALMS[(config.dutien && config.dutien.minRealm) || 6].emoji} ${cult.REALMS[(config.dutien && config.dutien.minRealm) || 6].name}** → quản lý ở **Hồ Sơ → ⚙️ → 🧭 Du Tiên** (hoặc lệnh **\`/dutien\`**).\n\n` +
      'Nguyên Thần **rời thân** đi lịch luyện vùng xa — đây là vòng chơi **IDLE/offline**, khác hẳn combat:\n' +
      '🪷 Chọn **điểm đến** (mở dần theo cảnh giới, dài **2h / 4h / 8h**) → Nguyên Thần lên đường (đếm ngược **tự cập nhật**, **offline vẫn chạy**) → khi về bấm **Thu cơ duyên**.\n' +
      '🎁 Mỗi chuyến: **nguyên liệu hiếm + linh thạch + tu vi + cơ hội rớt trang bị & 🔮 Tiên Ngọc** (xa hơn = hậu hơn). Mỗi lúc **chỉ 1 chuyến**.\n\n' +
      '_Tu vi/linh thạch từ Du Tiên vẫn chịu Linh Khí Loãng; nguyên liệu & Tiên Ngọc thì không._',
  },
  {
    id: 'luyendan', emoji: '💊', label: 'Luyện đan',
    title: '💊 Luyện Đan',
    body:
      `Đạt **${cult.REALMS[3].emoji} ${cult.REALMS[3].name}** → mở **\`/luyendan\`**. Đốt lò biến **nguyên liệu Bí Cảnh** thành đan dược:\n\n` +
      '🟢 **Đan tu vi** (Tụ Khí / Bồi Nguyên / Cường Thể / Cửu Chuyển Kim Đan) — uống tức thì, +tu vi theo **%** lượng cần lên bậc (giữ giá trị ở mọi cảnh giới).\n\n' +
      '🛡️ **Đan độ kiếp** (Hộ Đạo / Tạo Hóa Đan) — giữ trong túi; **bật/tắt tự dùng** ở bảng Đột Phá để cộng tỉ lệ thành công khi độ kiếp.\n\n' +
      '⚠️ Luyện đan có **rủi ro**: thất bại vẫn mất nguyên liệu & linh thạch. Cảnh giới càng vượt mức yêu cầu của đan phương thì tỉ lệ luyện thành càng cao.',
  },
  {
    id: 'tuido', emoji: '🎒', label: 'Túi đồ',
    title: '🎒 Túi Đồ — Nguyên Liệu & Đan Dược',
    body:
      'Túi đồ chứa **nguyên liệu** (gom ở Bí Cảnh) và **đan dược** (luyện từ `/luyendan`).\n\n' +
      '🧪 **Nguyên liệu** (6 loại, cấp 1→4): 🌿 Linh Thảo · 🔮 Yêu Đan · 🩸 Huyết Tinh · 🐲 Long Cân · 🌌 Hư Tinh Thạch · ⚰️ Cổ Phách. Vùng bí cảnh càng sâu rớt nguyên liệu càng cao cấp.\n\n' +
      '💊 **Đan dược** — đan tu vi uống ở `/luyendan`; đan độ kiếp giữ sẵn, bật/tắt tự dùng ở bảng Đột Phá khi vượt cảnh giới.\n\n' +
      'Xem nhanh túi đồ ngay tại **Hồ Sơ → 🎒 Túi đồ**, hoặc trong `/bicanh` và `/luyendan`.',
  },
  {
    id: 'nhiemvu', emoji: '📜', label: 'Nhiệm vụ',
    title: '📜 Cốt Truyện & Nhiệm Vụ Ngày',
    body:
      '📖 **Cốt truyện "Tiên Đồ Lộ Ký"** — chính tuyến dẫn dắt từng bước qua các cảnh giới, mỗi chương có thưởng. Mở ở kênh **Nhiệm Vụ** (nút 📖 Cốt truyện) hoặc `/cottruyen`.\n\n' +
      'Giai đoạn đầu (Phàm Nhân → Luyện Khí → trước Trúc Cơ) có nhiều chương dẫn dắt: bái sư vận công, **săn yêu sơ thí**, **cơ duyên kỳ ngộ**, tích lũy căn cơ… giúp người mới làm quen từng hệ thống.\n\n' +
      '📋 **Nhiệm vụ hằng ngày** — tu luyện, luận đạo (chat), đột phá, bí cảnh, luyện đan… hoàn thành để lãnh thưởng, **reset mỗi ngày** (giờ VN). Mở bằng nút 📋 Nhiệm vụ ngày hoặc `/nhiemvu`.',
  },
  {
    id: 'kyngo', emoji: '🎲', label: 'Kỳ ngộ',
    title: '🎲 Kỳ Ngộ — Cơ Duyên Bất Ngờ',
    body:
      'Kỳ ngộ là **sự kiện phiêu lưu ngẫu nhiên** — nguồn tu vi / linh thạch / nguyên liệu phụ, rất hữu ích **giai đoạn đầu**. Mỗi kỳ ngộ cho **chọn 1 hướng xử lý**: gan dạ thì lời to, đôi khi cũng có rủi ro nhỏ.\n\n' +
      `🎯 **Cách gặp kỳ ngộ:** kỳ ngộ **KHÔNG tự bấm để nhận** — nó **tự ập tới ngẫu nhiên** (cơ hội ~${Math.round((config.kyngo.triggerChance || 0) * 100)}%) khi:\n` +
      `• **Thu hoạch tu luyện** hoặc **xuất quan bế quan**.\n` +
      `• Đi **săn yêu** thắng trận, hoặc **tiến triển cốt truyện**.\n\n` +
      `⏳ Sau mỗi lần **nhận thưởng** kỳ ngộ phải nghỉ **${Math.round((config.kyngo.cooldownMs || 0) / 60000)} phút** (đang nghỉ thì kỳ ngộ KHÔNG tự ập tới). Chỉ xem sự kiện thì miễn phí — bấm chọn mới tính cooldown.`,
  },
  {
    id: 'nhiptu', emoji: '🌫️', label: 'Nhịp tu hành',
    title: '🌫️ Nhịp Tu Hành — Linh Khí Loãng & Bình Cảnh',
    body:
      'Thiên địa linh khí **hữu hạn** — không thể cày liên tục mà cứ lên đều. Hai quy luật điều tiết nhịp tu:\n\n' +
      `🌫️ **Linh Khí Loãng (theo ngày)** — farm càng nhiều trong NGÀY thì **tu vi & linh thạch nhận về càng giảm**. Trong "ngưỡng thoải mái" (~**${config.dampen.tuViStages} bậc tu vi**/ngày) vẫn nhận **trọn vẹn**; vượt ngưỡng thì hiệu suất tụt dần: ×${config.dampen.brackets[1]} → ×${config.dampen.brackets[2]} → sàn ×${config.dampen.brackets[config.dampen.brackets.length - 1]}. **Reset mỗi ngày** (giờ VN) — hôm sau linh khí ngưng tụ lại, nhận đầy như cũ. Ngưỡng **tự co giãn** theo cảnh giới nên bậc nào cũng công bằng.\n\n` +
      `⛰️ **Bình Cảnh (ở tầng đỉnh)** — khi đã tới **tầng cuối** một cảnh giới (sắp độ kiếp), tu vi vào **chỉ còn ×${config.bottleneck.mult}**: không thể cày thẳng một mạch lên cảnh giới mới, phải kiên trì tích đủ rồi **độ kiếp** để phá ải (áp dụng từ ${cult.REALMS[config.bottleneck.minRealm].emoji} ${cult.REALMS[config.bottleneck.minRealm].name} trở lên; người mới được miễn).\n\n` +
      '💊 **Lối qua ải:** thưởng **cốt truyện/nhiệm vụ ngày**, **đan tu vi** (`/luyendan`) và quà admin **KHÔNG** dính hai quy luật này — đó là cách tiến bộ bền vững thay vì spam. Bình cảnh thì dồn **đan Hộ Đạo/Tạo Hóa** rồi độ kiếp cho chắc.',
  },
  {
    id: 'shop', emoji: '🛒', label: 'Phường Thị (Shop)',
    title: '🛒 Phường Thị — Mua Vật Phẩm',
    body:
      'Mở **`/shop`** (kênh **Phường Thị** riêng, hoặc nút 🛒 ở Luyện Trường) để mua **vật phẩm tiêu hao** bằng linh thạch:\n\n' +
      '🌰 **Linh Chủng** — hạt giống gieo ở **Linh Điền** (panel Tu Luyện).\n' +
      '🧪 **Nguyên liệu** Bí Cảnh (linh thảo → cổ phách) — để **luyện đan**.\n' +
      '🔩 **Tinh Thiết** — để **cường hóa trang bị** (khỏi phải phân giải nhiều đồ).\n' +
      '💊 **Đan dược** cơ bản — Tụ Khí / Bồi Nguyên (tu vi) · Hộ Đạo (độ kiếp).\n\n' +
      'Chọn món → mua **x1 / x5 / x10**. _Shop **KHÔNG** bán trang bị — trang bị chỉ từ rớt Bí Cảnh / Tháp / Boss._',
  },
  {
    id: 'trangbi', emoji: '🛡️', label: 'Trang bị',
    title: '🛡️ Trang Bị — 6 Ô · 5 Độ Hiếm · Cường Hóa',
    body:
      `Đạt **${cult.REALMS[2].emoji} ${cult.REALMS[2].name}** → mở **\`/trangbi\`** (hoặc panel **Trang Bị**). Mặc đồ cộng **chỉ số chiến đấu phẳng**.\n\n` +
      '🎽 **6 ô:** 🗡️ Vũ Khí · 🛡️ Giáp · ⛑️ Mũ · 🥾 Giày · 💍 Nhẫn · 🪬 Pháp Bảo.\n' +
      '✨ **5 độ hiếm:** ⚪ Phàm Khí → 🟢 Linh Khí → 🔵 Bảo Khí → 🟣 Tiên Khí → 🟡 Thần Khí (càng hiếm chỉ số càng cao).\n\n' +
      '🎁 **Nguồn rớt:** Bí Cảnh, Thí Luyện Tháp, và **Boss Thế Giới** (top sát thương rớt đồ quý). Boss rớt độ hiếm cao hơn.\n\n' +
      `🔨 **Cường hóa** (tối đa **+${config.gear.enhanceMax}**, mỗi cấp +${Math.round(config.gear.enhanceStep * 100)}% chỉ số): tốn linh thạch + 🔩 **Tinh Thiết**. Cấp cao có **tỉ lệ trượt** (trượt mất nguyên liệu, KHÔNG tụt cấp).\n` +
      '♻️ **Phân giải** đồ thừa → 🔩 Tinh Thiết để cường hóa. Kho đầy thì đồ rớt tự phân giải.',
  },
  {
    id: 'boss', emoji: '🐲', label: 'Boss thế giới',
    title: '🐲 Boss Thế Giới — Công Phạt Chung',
    body:
      `Đạt **${cult.REALMS[3].emoji} ${cult.REALMS[3].name}** → mở kênh/panel **Boss Thế Giới** (\`/boss\`). Boss **CHUNG toàn server**, HP khổng lồ chia nhau đánh. Panel **tự cập nhật HP ~5s**.\n\n` +
      `⏳ Boss **xuất hiện NGẪU NHIÊN trong ngày**, chỉ tồn tại **${Math.round((config.worldboss.lifetimeMs || 0) / 60000)} phút** rồi tự rút lui. Khi giáng thế sẽ **loan báo + @nhắc** toàn bộ người chơi ở **Vọng Âm Đài** — đừng bỏ lỡ!\n\n` +
      '⚔️ Bấm **Công Phạt** → đo tổng sát thương một đợt → trừ vào **HP chung**. Mọi người góp sát thương cùng hạ gục.\n\n' +
      `🏆 **Chia thưởng theo % đóng góp:** linh thạch + tu vi + **rớt trang bị**. **Top sát thương** nhận thêm (+${Math.round((config.worldboss.topShareBonus || 0) * 100)}%) và **chắc chắn rớt đồ**. Top-3 luôn có đồ. **Hết giờ chưa giết:** vẫn thưởng theo **% HP đã phá**.\n\n` +
      `⏱️ Mỗi đòn công phạt cách nhau **${Math.round((config.worldboss.attackCooldownMs || 0) / 60000)} phút** (cooldown thuần).`,
  },
  {
    id: 'kenh', emoji: '📡', label: 'Các kênh',
    title: '📡 Các Kênh & Bảng',
    body:
      '🌄 **Sơ Nhập** — nhập đạo (người mới).\n' +
      '🧘 **Tu Luyện** — vận công / bế quan / voice / **đột phá** / **Linh Điền** / luyện đan (gom 1 chỗ).\n' +
      '📜 **Nhiệm Vụ** — cốt truyện + nhiệm vụ ngày.\n' +
      '🏯 **Môn Phái** — chọn & gia nhập phái.\n' +
      '📜 **Hồ Sơ** — xem bản thân, chỉ số, **trang bị**, cộng thuộc tính, nâng chiêu, túi đồ, cẩm nang này.\n' +
      '🛡️ **Trang Bị** — kho đồ, mặc/cường hóa/phân giải (6 ô, 5 độ hiếm).\n' +
      '🐗 **Bãi Săn Yêu** — săn yêu nhanh (mở ở **🌬️ Luyện Khí**), panel **sticky**.\n' +
      '🐉 **Ngự Thú Viên** — thu phục yêu thú làm bạn chiến (mở ở **👶 Nguyên Anh**), panel **sticky**.\n' +
      '👁️ **Nguyên Thần Điện** — Thần Thông, nhánh tu Nguyên Thần (mở ở **✨ Hóa Thần**), panel **sticky**.\n' +
      '🧭 **Du Tiên Đường** — Nguyên Thần xuất khiếu lịch luyện idle (mở ở **🌀 Luyện Hư**), panel **sticky**.\n' +
      '⛰️ **Luyện Trường** — Thí Luyện Tháp, Bí Cảnh _(cooldown tự đếm ngược)_.\n' +
      '🛒 **Phường Thị** — shop bán nguyên liệu · hạt giống · Tinh Thiết · đan.\n' +
      '⚔️ **Đấu Pháp Đài** — Luận Võ Đài xếp hạng (PvP) — trận **công khai**, panel **sticky tự cập nhật**.\n' +
      '🐲 **Boss Thế Giới** — công phạt chung toàn server, panel HP **thời gian thực**.\n' +
      '🏔️ **Bảng Xếp Hạng** — Phong Vân Bảng / Phú Hào Bảng / Luận Võ Bảng (**tự cập nhật**).\n' +
      '📣 **Vọng Âm Đài** — loan báo kỳ tích thiên hạ: độ kiếp, hạ boss, thần đan…\n\n' +
      '🗝️ **Mở khóa kênh theo cảnh giới:** một số kênh **ẩn** cho tới khi đạo hữu đạt cảnh giới tương ứng — đột phá lên cảnh giới mới sẽ **tự được cấp vai trò** mở các kênh vừa mở khóa (Săn Yêu/BXH ở Luyện Khí; Môn Phái·Đấu Pháp ở Trúc Cơ; Luyện Trường·Boss·Lò Rèn·Tổ Đội ở Kim Đan; Ngự Thú ở Nguyên Anh; Thần Thông ở Hóa Thần; Du Tiên ở Luyện Hư). **🛒 Phường Thị luôn mở** cho mọi người — nguồn vật phẩm quan trọng.',
  },
];

const byId = new Map(SECTIONS.map((s) => [s.id, s]));
function getSection(id) { return byId.get(id) || null; }
function firstSection() { return SECTIONS[0]; }

module.exports = { SECTIONS, getSection, firstSection };
