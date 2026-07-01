// =====================================================================
//  PANEL CỐ ĐỊNH (builder dùng chung cho /setup) — ĐẠI TU UI/UX.
//  Mỗi panel = 1 message bền ở 1 kênh, customId TĨNH (không ownerId), nút bấm
//  phản hồi ẩn (ephemeral) -> tự cô lập theo người chơi.
//
//  Ngôn ngữ hình ảnh THỐNG NHẤT (qua util/ui.js):
//   - mỗi kênh một SẮC MÀU riêng (config.colors.chan[key]);
//   - tiêu đề + mô tả gọn (bullet ▸), footer 1 dòng;
//   - nút bấm dựng qua ui.btn (style nhất quán).
//  Handler tương ứng nằm ở các command tương ứng (xem từng customId).
// =====================================================================
const config = require('./config');
const leaderboard = require('./leaderboard'); // panel BXH dựng từ dữ liệu sống
const assets = require('./assets');           // ảnh banner panel (tự bỏ qua nếu chưa có)
const ui = require('./util/ui');

// 🌄 Sơ Nhập — đăng ký nhập đạo.
function soNhap() {
  const e = ui.panelEmbed('soNhap', {
    title: '🌄 Sơ Nhập Giang Hồ',
    desc:
      'Chào mừng đạo hữu đến với **Tiên Đồ Lộ** — hành trình từ Phàm Nhân tu luyện thành Tiên!\n\n' +
      '▸ Bấm **Nhập đạo** để khai mở tu vi.\n' +
      '▸ Sau đó qua kênh **Nhiệm Vụ** nhận dẫn dắt, lên cảnh giới để mở khóa môn phái · bí cảnh · luyện đan · boss thế giới…',
    footer: 'Đạo đồ vạn dặm, khởi từ một bước chân.',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_register', 'Nhập đạo', 'success', { emoji: '🌄' }))] };
}

// 📜 Nhiệm Vụ — cốt truyện + nhiệm vụ ngày.
function nhiemVu() {
  const e = ui.panelEmbed('nhiemVu', {
    title: '📜 Bảng Nhiệm Vụ',
    desc:
      '▸ **📖 Cốt truyện** "Tiên Đồ Lộ Ký" — dẫn dắt từng bước, mở khóa tính năng theo cảnh giới.\n' +
      '▸ **📋 Nhiệm vụ ngày** — tu luyện · luận đạo · bí cảnh… lãnh thưởng mỗi ngày (reset theo giờ VN).',
    footer: 'Mỗi người một tiến độ riêng — cứ bấm để mở bảng của mình.',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('story_open', 'Cốt truyện', 'primary', { emoji: '📖' }),
    ui.btn('panel_quests', 'Nhiệm vụ ngày', 'secondary', { emoji: '📋' }),
  )] };
}

// 🧘 Tu Luyện — chọn cách tu hành + đột phá + linh điền (gom chung GĐ16).
function tuLuyen() {
  const v = config.voice || {};
  const b = config.breakthrough;
  const e = ui.panelEmbed('tuLuyen', {
    title: '🧘 Tu Luyện Trường',
    desc:
      'Tùy chọn **cách tu hành** hợp với mình:\n\n' +
      `🧘 **Vận công** — chọn mốc (${(config.cultivate.durations || []).join('/')} phút), nhập định nhận **${config.cultivate.ratePerMin} tu vi/phút** (offline vẫn tính; thu sớm nhận một phần).\n` +
      `🎙️ **Voice** — bật trong bảng rồi ngồi kênh thoại tích **~${v.ratePerMin || 3}/phút** (cần **≥${v.minCompany || 2} người**).\n` +
      `🚪 **Bế quan** — chọn mốc (${(config.seclusion.durations || []).map((m) => m % 60 === 0 ? m / 60 + 'h' : m + 'p').join('/')}), tích cả khi offline.\n` +
      `⚡ **Đột phá** — đủ tu vi thì lên tầng / vượt cảnh giới (độ kiếp từ ${Math.round(b.baseSuccess * 100)}%, dùng đan Hộ Đạo).\n` +
      '🌱 **Linh Điền** — vườn linh dược tự tích nguyên liệu theo thời gian (cả offline).\n' +
      '💊 **Luyện đan** — chế đan dược từ nguyên liệu Bí Cảnh (mở ở Kim Đan).',
    footer: 'Mọi nẻo tu hành quy về một mối — chọn lối hợp với đạo của mình.',
  });
  return { embeds: [e], components: [
    ui.row(
      ui.btn('panel_cultivate', 'Tu luyện', 'primary', { emoji: '🧘' }),
      ui.btn('panel_seclude', 'Bế quan', 'secondary', { emoji: '🚪' }),
      ui.btn('panel_dotpha', 'Đột phá', 'success', { emoji: '⚡' }),
    ),
    ui.row(
      ui.btn('farm_linhdien', 'Linh Điền', 'secondary', { emoji: '🌱' }),
      ui.btn('panel_luyendan', 'Luyện đan', 'secondary', { emoji: '💊' }),
    ),
  ] };
}

// 🏯 Môn Phái.
function monPhai() {
  const e = ui.panelEmbed('monPhai', {
    title: '🏯 Chiêu Hiền Đại Điện',
    desc:
      'Đạt **🏛️ Trúc Cơ** + hoàn thành chính tuyến để mở môn phái.\n\n' +
      '▸ **🏯 Xem & chọn phái** — đặt nguyện vọng bái nhập (6 phái, mỗi phái một lối đánh).\n' +
      '▸ **🎴 Kỹ năng** — xem & trang bị tối đa 3 chiêu chủ động.\n' +
      '▸ **🥊 Đấu tập** — thử kỹ năng với mộc nhân (không mất gì).',
    footer: 'Hoàn thành nghi thức nhập môn ở bảng Nhiệm Vụ để chính thức làm đệ tử.',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('panel_sect', 'Xem & chọn phái', 'primary', { emoji: '🏯' }),
    ui.btn('panel_kynang', 'Kỹ năng', 'secondary', { emoji: '🎴' }),
    ui.btn('panel_dautap', 'Đấu tập', 'success', { emoji: '🥊' }),
  )] };
}

// 📜 Hồ Sơ.
function hoSo() {
  const e = ui.panelEmbed('hoSo', {
    title: '📜 Hồ Sơ Nhân Vật',
    desc:
      'Xem mọi thứ về đạo hữu: cảnh giới · chỉ số chiến đấu · thuộc tính · trang bị · kỹ năng · **Ngự Thú & Thần Thông** (hiện trên thẻ).\n\n' +
      '▸ Cộng 🧬 **điểm thuộc tính** (nhận khi đột phá) · nâng 🎴 **chiêu** (nhận khi độ kiếp).\n' +
      '▸ ⚙️ Menu chức năng: 🛡️ Trang bị · 🎒 Túi đồ · 🏷️ Danh hiệu · 🏆 Thành tựu · 🐉 **Ngự Thú** · 👁️ **Thần Thông** · 📖 Cẩm nang.',
    footer: 'Bấm để mở hồ sơ riêng — hoặc đọc Cẩm Nang hướng dẫn đầy đủ.',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('panel_profile', 'Xem hồ sơ', 'primary', { emoji: '📜' }),
    ui.btn('guide_open', 'Cẩm nang hướng dẫn', 'secondary', { emoji: '📖' }),
  )] };
}

// (GĐ18: panel Trang Bị riêng đã BỎ — trang bị truy cập qua nút 🛡️ ở panel Hồ Sơ.)

// ⛰️ Luyện Trường.
function luyenTruong() {
  const e = ui.panelEmbed('luyenTruong', {
    title: '⛰️ Luyện Trường',
    desc:
      'Đạt **🟡 Kim Đan** để mở khu rèn luyện & farm:\n\n' +
      '🗼 **Thí Luyện Tháp** — leo tháp vô tận, càng cao thưởng càng hậu.\n' +
      '🗺️ **Bí Cảnh** — thám hiểm theo lượt, rớt nguyên liệu + trang bị (`/bicanh`).\n' +
      '👻 **Truy Tung Nhiếp Hồn** (từ **👶 Nguyên Anh**) — farm 👻 Yêu Hồn Phách + 🍖 thức ăn để **bắt & nuôi Ngự Thú**.\n\n' +
      '🐗 **Săn Yêu** mở SỚM hơn (từ **🌬️ Luyện Khí**) — có kênh **Bãi Săn Yêu** riêng.',
    footer: 'Cày khôn ngoan — Linh Khí Loãng khiến farm quá đà giảm hiệu suất.',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('panel_luyentruong', 'Vào Luyện Trường', 'success', { emoji: '⛰️' }),
    ui.btn('panel_bicanh', 'Bí Cảnh', 'primary', { emoji: '🗺️' }),
  )] };
}

// 🐗 Bãi Săn Yêu — kênh riêng (mở ở Luyện Khí), panel sticky.
function sanYeu() {
  return require('./commands/luyentruong').sanYeuPanelView();
}

// 🧭 Du Tiên Đường — Nguyên Thần Xuất Khiếu (mở ở Luyện Hư), panel sticky.
function duTien() {
  return require('./commands/dutien').panelView();
}

// 🐉 Ngự Thú Viên — bạn chiến PvE (mở ở Nguyên Anh), panel sticky.
function nguThu() {
  return require('./commands/nguthu').panelView();
}

// 👁️ Nguyên Thần Điện — Thần Thông (mở ở Hóa Thần), panel sticky.
function thanThong() {
  return require('./commands/thanthong').panelView();
}

// ⚔️ Đấu Pháp Đài — bảng xếp hạng LIVE + khiêu chiến CÔNG KHAI (sticky).
function dauDai() {
  return require('./commands/dauphap').boardPanelView();
}

// 🐲 Boss Thế Giới — dùng builder LIVE (trạng thái boss thời gian thực + sticky).
function bossTheGioi() {
  return require('./commands/boss').livePanelView();
}

// 🛡️ Phó Bản Tổ Đội — co-op 2-4 người, kênh riêng (GĐ20).
function toDoi() {
  const dp = (config.party || {}).dailyAttempts;
  const e = ui.panelEmbed('toDoi', {
    title: '🛡️ Phó Bản Tổ Đội',
    desc:
      'Hợp sức **2-4 đạo hữu** cùng xông **bí cảnh phó bản** — boss có **HP CHUNG**, khó hơn nhiều bí cảnh thường (càng đông boss càng trâu, buộc phối hợp).\n\n' +
      '▸ Bấm **Lập tổ đội** mở phòng chờ công khai, rủ người **Tham Gia**.\n' +
      '▸ Trưởng đội chọn bí cảnh & **Bắt Đầu** — cả đội **Công Phạt** boss theo lượt.\n' +
      '▸ Hạ boss: chia thưởng theo **% đóng góp** + **trang bị rớt cố định theo từng phó bản** + 🔮 **Tiên Ngọc** cho top đóng góp.\n' +
      `▸ Mở ở **🟡 Kim Đan** · giới hạn **${dp || '∞'} lượt/người/ngày** (chống spam, reset giờ VN).`,
    footer: 'Mỗi người chỉ ở 1 tổ đội cùng lúc. Lập đội để bắt đầu!',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_toduoi', 'Lập tổ đội', 'success', { emoji: '🛡️' }))] };
}

// 🛒 Phường Thị (Shop) — kênh riêng (GĐ17).
function shop() {
  const e = ui.panelEmbed('shop', {
    title: '🛒 Phường Thị',
    desc:
      'Chốn giao thương của tu sĩ — mua **vật phẩm tiêu hao** bằng linh thạch:\n\n' +
      '🌰 **Linh Chủng** — hạt giống gieo ở **Linh Điền** (panel Tu Luyện).\n' +
      '🧪 **Nguyên liệu** Bí Cảnh — để **luyện đan**.\n' +
      '🔩 **Tinh Thiết** — để **cường hóa trang bị**.\n' +
      '💊 **Đan dược** cơ bản · 🍖 **Yêu Thú Lương** (nuôi Ngự Thú).\n\n' +
      '🎰 **Chiêu Hồn Đài** — **bắt Ngự Thú** (gacha): quay bằng LT + 👻 Yêu Hồn Phách, hoặc 🔮 Tiên Ngọc (có pity); hoặc **mua thẳng thú**.\n\n' +
      '_Phường thị KHÔNG bán trang bị — trang bị chỉ từ rớt Bí Cảnh / Tháp / Boss._',
    footer: 'Bấm để mở quầy · 🎰 Chiêu Hồn Đài ở trong quầy (mở ở Nguyên Anh).',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('panel_shop', 'Vào Phường Thị', 'primary', { emoji: '🛒' }),
    ui.btn('panel_gacha', 'Chiêu Hồn Đài', 'success', { emoji: '🎰' }),
  )] };
}

function loRen() {
  const e = ui.panelEmbed('loRen', {
    title: '🔨 Lò Rèn',
    desc:
      'Lò rèn của tu sĩ — **rèn vũ khí & trang bị** theo ý muốn. Mở khóa ở **🟡 Kim Đan**.\n\n' +
      '🔨 **Chế tạo** — tạo món MỚI (chọn ô + độ hiếm) từ nguyên liệu + 🔩 Tinh Thiết + linh thạch.\n' +
      '⚒️ **Cường hóa** — +chỉ số cho món đang có (cap theo độ hiếm; bại cao có thể tụt cấp).\n' +
      '⬆️ **Nâng bậc** — nâng độ hiếm thấp → cao (giữ cấp cường hóa).\n\n' +
      '🧧 **Hộ Khí Phù** chống tụt khi bại · 📜 **Thiên Mệnh Phù** tăng tỉ lệ _(mua ở Phường Thị Cao Cấp)_.',
    footer: 'Bấm để mở Lò Rèn của riêng bạn.',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_loren', 'Mở Lò Rèn', 'success', { emoji: '🔨' }))] };
}

// 🏔️ Bảng Xếp Hạng — ảnh chụp 2 bảng + nút realtime (dựng từ DB).
function bangXepHang() {
  return leaderboard.panelView();
}

// key trùng config.channels để /setup ánh xạ kênh.
const PANELS = {
  soNhap:      { key: 'soNhap',      name: 'Sơ Nhập',        build: soNhap },
  tuLuyen:     { key: 'tuLuyen',     name: 'Tu Luyện',       build: tuLuyen },
  nhiemVu:     { key: 'nhiemVu',     name: 'Nhiệm Vụ',       build: nhiemVu },
  monPhai:     { key: 'monPhai',     name: 'Môn Phái',       build: monPhai },
  hoSo:        { key: 'hoSo',        name: 'Hồ Sơ',          build: hoSo },
  luyenTruong: { key: 'luyenTruong', name: 'Luyện Trường',   build: luyenTruong },
  sanYeu:      { key: 'sanYeu',      name: 'Bãi Săn Yêu',    build: sanYeu },
  nguThu:      { key: 'nguThu',      name: 'Ngự Thú Viên',   build: nguThu },
  thanThong:   { key: 'thanThong',   name: 'Nguyên Thần Điện', build: thanThong },
  duTien:      { key: 'duTien',      name: 'Du Tiên Đường',  build: duTien },
  dauDai:      { key: 'dauDai',      name: 'Đấu Pháp Đài',   build: dauDai },
  bossTheGioi: { key: 'bossTheGioi', name: 'Boss Thế Giới',  build: bossTheGioi },
  toDoi:       { key: 'toDoi',       name: 'Phó Bản Tổ Đội', build: toDoi },
  shop:        { key: 'shop',        name: 'Phường Thị',     build: shop },
  loRen:       { key: 'loRen',       name: 'Lò Rèn',         build: loRen },
  bangXepHang: { key: 'bangXepHang', name: 'Bảng Xếp Hạng',  build: bangXepHang },
};

// Gắn ảnh banner panel (nếu có) vào embed ĐẦU của mỗi panel — tập trung 1 chỗ,
//  tự bỏ qua khi chưa có ảnh. payload thêm `files` (rỗng nếu không có) để /setup gửi kèm.
for (const [pk, meta] of Object.entries(PANELS)) {
  const inner = meta.build;
  meta.build = async () => {
    const v = await inner(); // build có thể async (vd BXH render ảnh) -> await cho đồng nhất
    // Builder LIVE (boss/đấu pháp/BXH) tự gắn banner + files rồi -> không gắn đè.
    if (v && v.embeds && v.embeds[0] && !(v.files && v.files.length)) {
      const files = assets.panel(v.embeds[0], pk, 'image');
      if (files.length) v.files = files;
    }
    return v;
  };
}

// --- STICKY cho panel TĨNH (tự nổi xuống đáy khi kênh có tin nhắn, không auto-edit) ---
//  Panel "động" (boss/đấu pháp/BXH) tự đăng ký live ở command tương ứng. Ở đây chỉ
//  đăng ký các panel TĨNH cần sticky để không bị tin nhắn người chơi đẩy trôi.
const livepanels = require('./util/livepanels');
for (const key of ['luyenTruong', 'tuLuyen', 'monPhai', 'shop', 'nhiemVu', 'toDoi', 'loRen', 'sanYeu', 'duTien', 'nguThu', 'thanThong']) {
  if (PANELS[key]) livepanels.register(key, PANELS[key].build, { sticky: true, stickyOnly: true });
}

module.exports = { PANELS };
