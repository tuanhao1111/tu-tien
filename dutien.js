// =====================================================================
//  NGUYÊN THẦN XUẤT KHIẾU — DU TIÊN (thuần: catalog điểm đến + công thức)
//  Hướng chơi IDLE/offline mở ở 🌀 Luyện Hư: Nguyên Thần rời thân đi "lịch
//  luyện" tới vùng xa trong vài giờ (offline vẫn chạy), về nhận nguyên liệu
//  hiếm + linh thạch + tu vi + cơ hội rớt trang bị & Tiên Ngọc.
//
//  dutien.js CHỈ giữ DỮ LIỆU + CÔNG THỨC. Trạng thái chuyến lưu ở players
//  (dutien_ts = mốc bắt đầu, dutien_key = điểm đến). Crediting do command làm.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

const DT = () => config.dutien || {};

// --- Catalog ĐIỂM ĐẾN (mở dần theo cảnh giới; xa hơn = lâu hơn + hậu hơn) ---
//  hours: thời lượng chuyến · rewardMult: nhân quỹ thưởng · rarityBoost: dồn độ hiếm
//  khi rớt trang bị · mats: nguyên liệu vùng đó (id khớp bicanh.MATERIALS).
const DESTS = [
  { key: 'co_chien',  name: 'Thượng Cổ Chiến Trường', emoji: '⚰️', minRealm: 6, hours: 2, rewardMult: 1.0, rarityBoost: 0.6, mats: ['huyet_tinh', 'long_can'],
    lore: 'Bãi chiến trường thượng cổ ngập sát khí, di cốt đại năng vùi trong cát bụi vạn năm.' },
  { key: 'tinh_hai',  name: 'Tinh Hải Hư Vực',        emoji: '🌌', minRealm: 6, hours: 4, rewardMult: 1.7, rarityBoost: 0.95, mats: ['long_can', 'hu_tinh'],
    lore: 'Biển sao mênh mông giữa hư không, mỗi gợn sóng là một vì tinh tú vỡ vụn từ thái cổ.' },
  { key: 'hong_hoang', name: 'Hồng Hoang Tiên Tích',  emoji: '🏯', minRealm: 7, hours: 8, rewardMult: 2.8, rarityBoost: 1.2, mats: ['hu_tinh', 'co_phach'],
    lore: 'Di tích thời hồng hoang, nơi tiên nhân thượng cổ từng để lại cơ duyên nghịch thiên.' },
];
const BY_KEY = Object.fromEntries(DESTS.map((d) => [d.key, d]));
function dest(key) { return BY_KEY[key] || null; }
// Điểm đến đã mở cho cảnh giới hiện tại.
function destsFor(realm) { return DESTS.filter((d) => (realm ?? 0) >= d.minRealm); }

// Trạng thái chuyến hiện tại của player. Trả { state:'idle'|'traveling'|'done', dest?, leftMs?, durMs? }.
function tripState(player, now = Date.now()) {
  const ts = player && player.dutien_ts ? player.dutien_ts : 0;
  const d = ts ? dest(player.dutien_key) : null;
  if (!ts || !d) return { state: 'idle' };
  const durMs = d.hours * 3600 * 1000;
  const leftMs = Math.max(0, ts + durMs - now);
  return { state: leftMs > 0 ? 'traveling' : 'done', dest: d, leftMs, durMs };
}

// Quỹ thưởng 1 chuyến (theo điểm đến + bậc người chơi). Số NL/đá/tu vi cụ thể.
//  Trả { stones, tuVi, mats:{id:qty}, rarityBoost, gearChance, premiumChance }.
function rewardsFor(d, player) {
  const stage = cult.globalStage(player.realm, player.tier);
  const sm = 1 + 0.08 * stage;
  const h = d.hours;
  const matBase = Math.max(1, Math.round((DT().matPerTrip || 2) * d.rewardMult));
  const mats = {};
  // chia số NL nền cho các loại của vùng (ít nhất 1 mỗi loại nếu đủ).
  d.mats.forEach((id, i) => { mats[id] = Math.max(1, Math.round(matBase / d.mats.length) + (i === 0 ? matBase % d.mats.length : 0)); });
  return {
    stones: Math.round((DT().stonesPerHour || 0) * h * d.rewardMult * sm),
    tuVi: Math.round((DT().tuViPerHour || 0) * h * d.rewardMult * sm),
    mats,
    rarityBoost: d.rarityBoost,
    gearChance: DT().gearChance || 0,
    premiumChance: Math.min(0.25, (DT().premiumChancePerHour || 0) * h),
  };
}

module.exports = { DESTS, dest, destsFor, tripState, rewardsFor };
