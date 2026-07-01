// =====================================================================
//  SỔ ĐĂNG KÝ MỞ KHÓA TÍNH NĂNG (thuần — chỉ dữ liệu + helper)
//  Mỗi tính năng mở khóa khi đạt một CẢNH GIỚI (realm index). Lệnh nào
//  thuộc tính năng chưa mở -> bị khóa cứng, báo cần lên cảnh giới nào.
//
//  status: 'live' = đã code xong, dùng được.
//          'soon' = đã có lệnh stub, mở khóa rồi nhưng nội dung sắp ra mắt.
//  Khi code xong tính năng 'soon' -> đổi thành 'live' là đèn sáng ngay.
// =====================================================================
const cult = require('./cultivation');

const FEATURES = [
  // --- Có sẵn từ Phàm Nhân (realm 0) ---
  { key: 'tuluyen', name: 'Tu Luyện', emoji: '🧘', realm: 0, status: 'live', commands: ['tuluyen'], desc: 'Vận công hấp thụ linh khí, tích tu vi.' },
  { key: 'bequan', name: 'Bế Quan', emoji: '🚪', realm: 0, status: 'live', commands: ['bequan'], desc: 'Nhập định tích tu vi theo thời gian, cả khi offline.' },
  { key: 'dotpha', name: 'Đột Phá', emoji: '⚡', realm: 0, status: 'live', commands: ['dotpha'], desc: 'Đột phá tầng/cảnh giới. Vượt cảnh giới = độ kiếp.' },
  { key: 'hoso', name: 'Đạo Tịch', emoji: '📜', realm: 0, status: 'live', commands: ['hoso'], desc: 'Xem hồ sơ tu tiên.' },
  { key: 'cottruyen', name: 'Cốt Truyện', emoji: '📖', realm: 0, status: 'live', commands: ['cottruyen'], desc: 'Hành trình Tiên Đồ Lộ Ký dẫn dắt từng bước.' },
  { key: 'nhiemvu', name: 'Nhiệm Vụ Ngày', emoji: '📋', realm: 0, status: 'live', commands: ['nhiemvu'], desc: 'Nhiệm vụ hằng ngày — tu luyện, luận đạo, bí cảnh… lãnh thưởng.' },
  { key: 'kyngo', name: 'Kỳ Ngộ', emoji: '🎲', realm: 0, status: 'live', commands: ['kyngo'], desc: 'Sự kiện phiêu lưu ngẫu nhiên — cơ duyên tu vi/linh thạch ngoài tu luyện.' },

  // --- Mở khóa khi lên cảnh giới (realm >= ...) ---
  { key: 'top', name: 'Bảng Xếp Hạng', emoji: '🏔️', realm: 1, status: 'live', commands: ['top'], desc: 'Phong Vân Bảng — so tài thiên hạ.' },
  { key: 'sanyeu', name: 'Săn Yêu', emoji: '🐗', realm: 1, status: 'live', commands: ['sanyeu'], desc: 'Bãi săn yêu nhanh — kiếm linh thạch + tu vi (mở ở Luyện Khí, chưa cần môn phái).' },

  // --- Môn phái & combat (mở khóa ở Trúc Cơ) ---
  { key: 'monphai', name: 'Môn Phái', emoji: '🏯', realm: 2, status: 'live', commands: ['monphai'], desc: 'Gia nhập môn phái, học kỹ năng chiến đấu riêng.' },
  { key: 'kynang', name: 'Kỹ Năng', emoji: '🎴', realm: 2, status: 'live', commands: ['kynang'], desc: 'Xem & trang bị tối đa 3 chiêu chủ động của môn phái.' },
  { key: 'dautap', name: 'Đấu Tập', emoji: '🥊', realm: 2, status: 'live', commands: ['dautap'], desc: 'Đấu tập với mộc nhân để thử kỹ năng (không mất gì).' },
  { key: 'trangbi', name: 'Trang Bị', emoji: '🛡️', realm: 2, status: 'live', commands: ['trangbi'], desc: 'Kho trang bị: mặc/cường hóa/phân giải. 6 ô · 5 độ hiếm.' },

  { key: 'luyendan', name: 'Luyện Đan', emoji: '💊', realm: 3, status: 'live', commands: ['luyendan'], desc: 'Chế đan dược trợ tu & cứu mạng lúc độ kiếp.' },
  { key: 'loren', name: 'Rèn Khí Lô', emoji: '🔨', realm: 3, status: 'live', commands: ['loren'], desc: 'Rèn vũ khí & trang bị theo ý muốn từ nguyên liệu + Tinh Thiết.' },
  { key: 'boss', name: 'Boss Thế Giới', emoji: '🐲', realm: 3, status: 'live', commands: ['boss'], desc: 'Công phạt boss chung toàn server, chia thưởng theo sát thương.' },
  { key: 'bicanh', name: 'Bí Cảnh', emoji: '🗺️', realm: 3, status: 'live', commands: ['bicanh'], desc: 'Thám hiểm bí cảnh, săn yêu thú & cơ duyên (PvE).' },
  { key: 'luyentruong', name: 'Luyện Trường', emoji: '⛰️', realm: 3, status: 'live', commands: ['luyentruong'], desc: 'Linh Điền (vườn idle), Săn Yêu (săn nhanh), Thí Luyện Tháp (leo tháp).' },
  { key: 'dauphap', name: 'Đấu Pháp', emoji: '⚔️', realm: 2, status: 'live', commands: ['dauphap'], desc: 'Luận Võ Đài — tỉ thí xếp hạng với tu sĩ khác (PvP, mở ở Trúc Cơ).' },

  // --- Hướng chơi cảnh giới cao (GĐ24) ---
  { key: 'nguthu', name: 'Ngự Thú', emoji: '🐉', realm: 4, status: 'live', commands: ['nguthu'], desc: 'Thu phục yêu thú làm bạn chiến PvE — cộng chỉ số + tung đòn phụ (mở ở Nguyên Anh).' },
  { key: 'thanthong', name: 'Thần Thông', emoji: '👁️', realm: 5, status: 'live', commands: ['thanthong'], desc: 'Tu luyện Nguyên Thần — mở các Thần Thông cộng chỉ số (dùng cả PvE lẫn PvP, mở ở Hóa Thần).' },
  { key: 'dutien', name: 'Du Tiên', emoji: '🧭', realm: 6, status: 'live', commands: ['dutien'], desc: 'Nguyên Thần Xuất Khiếu — phái Nguyên Thần đi lịch luyện vùng xa (idle, offline), về nhận cơ duyên.' },
];

const byCommand = new Map();
for (const f of FEATURES) {
  for (const c of f.commands || []) byCommand.set(c, f);
}

// Tính năng gắn với 1 lệnh (hoặc null nếu lệnh không thuộc sổ này — vd /trogiup).
function featureForCommand(cmd) {
  return byCommand.get(cmd) || null;
}

// Người chơi đã mở khóa tính năng này chưa? (theo cảnh giới hiện tại)
function isUnlocked(player, feature) {
  return (player?.realm ?? 0) >= feature.realm;
}

// Kiểm tra 1 lệnh có dùng được không. Trả { ok, feature?, needRealm? }.
function checkCommand(player, cmd) {
  const f = featureForCommand(cmd);
  if (!f) return { ok: true }; // lệnh tự do (không nằm trong sổ)
  if (isUnlocked(player, f)) return { ok: true, feature: f };
  return { ok: false, feature: f, needRealm: f.realm };
}

// Các tính năng VỪA mở khóa khi nhảy từ oldRealm -> newRealm (oldRealm < r <= newRealm).
function newlyUnlocked(oldRealm, newRealm) {
  return FEATURES.filter((f) => f.realm > oldRealm && f.realm <= newRealm);
}

// Tên cảnh giới yêu cầu (cho thông báo khóa).
function realmName(realmIdx) {
  const r = cult.REALMS[realmIdx];
  return r ? `${r.emoji} ${r.name}` : `cảnh giới #${realmIdx}`;
}

module.exports = {
  FEATURES,
  featureForCommand,
  isUnlocked,
  checkCommand,
  newlyUnlocked,
  realmName,
};
