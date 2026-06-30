// =====================================================================
//  HỆ THỐNG CẢNH GIỚI (thuần — chỉ dữ liệu + công thức, KHÔNG đụng DB)
//  Xương sống của game: tu vi -> lên tầng -> vượt cảnh giới (độ kiếp).
//
//  Mô hình tiến độ tuyến tính bằng "bậc toàn cục" (globalStage):
//    Phàm Nhân(1 tầng) -> Luyện Khí(9) -> Trúc Cơ(9) -> ... -> Tiên Nhân(1).
//  Mỗi player lưu: realm (chỉ số cảnh giới), tier (tầng trong cảnh giới),
//  tu_vi (tiến độ đang tích về bậc kế tiếp).
// =====================================================================
const config = require('./config');

// Danh sách cảnh giới theo thứ tự. tiers = số tầng trong cảnh giới đó.
const REALMS = [
  { name: 'Phàm Nhân', tiers: 1, emoji: '🧍' }, // điểm xuất phát
  { name: 'Luyện Khí', tiers: 9, emoji: '🌬️' },
  { name: 'Trúc Cơ', tiers: 9, emoji: '🏛️' },
  { name: 'Kim Đan', tiers: 9, emoji: '🟡' },
  { name: 'Nguyên Anh', tiers: 9, emoji: '👶' },
  { name: 'Hóa Thần', tiers: 9, emoji: '✨' },
  { name: 'Luyện Hư', tiers: 9, emoji: '🌀' },
  { name: 'Đại Thừa', tiers: 9, emoji: '☯️' },
  { name: 'Độ Kiếp', tiers: 9, emoji: '⚡' },
  { name: 'Tiên Nhân', tiers: 1, emoji: '🪙' }, // viên mãn — đỉnh game
];

// Số chữ Hán cho tầng (1..9) cho ra lời thoại "tầng X" đẹp hơn.
const TIER_NAMES = ['', 'Nhất', 'Nhị', 'Tam', 'Tứ', 'Ngũ', 'Lục', 'Thất', 'Bát', 'Cửu'];

// --- Bậc toàn cục: quy realm+tier về 1 con số 0,1,2,... để tính tu vi cần ---
function globalStage(realm, tier) {
  let s = 0;
  for (let i = 0; i < realm; i++) s += REALMS[i].tiers;
  return s + (tier - 1);
}

// Tổng số bậc của toàn game (để biết khi nào viên mãn).
function maxStage() {
  return REALMS.reduce((sum, r) => sum + r.tiers, 0) - 1;
}

// Tu vi cần để đi từ bậc hiện tại LÊN bậc kế tiếp.
function tuViNeeded(realm, tier) {
  const s = globalStage(realm, tier);
  const { base, growth } = config.progression;
  return Math.round(base * Math.pow(growth, s));
}

// Đã ở đỉnh chưa (Tiên Nhân tầng cuối)?
function isMaxed(realm, tier) {
  return globalStage(realm, tier) >= maxStage();
}

// Bậc kế tiếp là gì? Trả { realm, tier, isMajor }.
//  isMajor = true khi phải VƯỢT cảnh giới (đại đột phá = độ kiếp).
function nextStage(realm, tier) {
  const r = REALMS[realm];
  if (tier < r.tiers) {
    return { realm, tier: tier + 1, isMajor: false }; // lên tầng trong cùng cảnh giới
  }
  // Hết tầng -> nhảy sang cảnh giới kế (tầng 1) = đại đột phá
  return { realm: realm + 1, tier: 1, isMajor: true };
}

// Tỉ lệ thành công của ĐẠI ĐỘT PHÁ khi đang ở cảnh giới `realm` vượt lên `realm+1`.
//  Cảnh giới càng cao càng khó, nhưng không dưới sàn minSuccess.
function majorSuccessRate(realm) {
  const b = config.breakthrough;
  // realm 1 (Luyện Khí) là lần độ kiếp đầu tiên -> baseSuccess.
  const rate = b.baseSuccess - b.successDropPerRealm * (realm - 1);
  return Math.max(b.minSuccess, Math.min(1, rate));
}

// Tên hiển thị đầy đủ của cảnh giới, vd "Luyện Khí Tầng Ngũ" / "Phàm Nhân".
function realmLabel(realm, tier) {
  const r = REALMS[realm];
  if (!r) return 'Không rõ';
  if (r.tiers <= 1) return `${r.emoji} ${r.name}`;
  return `${r.emoji} ${r.name} Tầng ${TIER_NAMES[tier] || tier}`;
}

// Danh hiệu ngắn gọn theo cảnh giới (dùng cho bảng xếp hạng / chào hỏi).
function getTitle(realm) {
  const r = REALMS[realm];
  return r ? `${r.emoji} ${r.name}` : '🧍 Phàm Nhân';
}

// Thanh tiến trình tu vi (đẹp mắt trong embed).
function progressBar(cur, need, len = 12) {
  if (need <= 0) return '▰'.repeat(len);
  const filled = Math.max(0, Math.min(len, Math.round((cur / need) * len)));
  return '▰'.repeat(filled) + '▱'.repeat(len - filled);
}

module.exports = {
  REALMS,
  TIER_NAMES,
  globalStage,
  maxStage,
  tuViNeeded,
  isMaxed,
  nextStage,
  majorSuccessRate,
  realmLabel,
  getTitle,
  progressBar,
};
