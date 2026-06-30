// =====================================================================
//  RÈN KHÍ LÔ (engine) — 3 chế độ, THUẦN (dữ liệu + công thức). Logic tiêu
//  hao/roll nằm ở database (forgeCraft / forgeEnhance / forgeUpgrade).
//
//   ① CHẾ TẠO  — tạo món MỚI theo ô + độ hiếm (đốt nguyên liệu/Tinh Thiết/đá).
//   ② CƯỜNG HÓA — +1 chỉ số 1 món đang có. CAP theo độ hiếm (chống bug:
//        KHÔNG thể +15 đồ bậc thấp rồi nâng bậc). Bại ở cấp cao có thể TỤT CẤP.
//   ③ NÂNG BẬC — nâng độ hiếm thấp -> cao (giữ cấp cường hóa). Bại có thể TỤT BẬC.
//
//  PHÙ (mua bằng 🔮 Tiên Ngọc): 🧧 Hộ Khí (bại không bị tụt) · 📜 Thiên Mệnh (+tỉ lệ).
//  Mở khóa Lò Rèn ở KIM ĐAN (realm 3). Độ hiếm/bậc cao mở dần theo cảnh giới.
// =====================================================================
const gear = require('./gear');
const config = require('./config');

const MIN_REALM = 3;                                    // Kim Đan — mở Lò Rèn
const RARITY_SEQ = ['pham', 'linh', 'bao', 'tien', 'than']; // thấp -> cao

// ---------------------------------------------------------------------
//  ① CHẾ TẠO — đan phương theo độ hiếm món rèn ra.
// ---------------------------------------------------------------------
const CRAFT = {
  linh: { rarity: 'linh', minRealm: 3, rate: 0.92, stones: 120,  refine: 8,  mats: { linh_thao: 3, yeu_dan: 1 } },
  bao:  { rarity: 'bao',  minRealm: 4, rate: 0.82, stones: 320,  refine: 18, mats: { yeu_dan: 2, huyet_tinh: 2 } },
  tien: { rarity: 'tien', minRealm: 5, rate: 0.66, stones: 760,  refine: 32, mats: { huyet_tinh: 2, long_can: 2 } },
  than: { rarity: 'than', minRealm: 6, rate: 0.46, stones: 1600, refine: 60, mats: { long_can: 2, hu_tinh: 2, co_phach: 1 } },
};
const CRAFT_SEQ = ['linh', 'bao', 'tien', 'than'];
function craftRecipe(rarity) { return CRAFT[rarity] || null; }
function unlockedCraft(realm) { return CRAFT_SEQ.filter((r) => (realm ?? 0) >= CRAFT[r].minRealm); }
function nextLockedCraft(realm) { return CRAFT_SEQ.find((r) => (realm ?? 0) < CRAFT[r].minRealm) || null; }

// ---------------------------------------------------------------------
//  ② CƯỜNG HÓA — cap theo độ hiếm; chi phí/tỉ lệ tái dụng công thức gear.
// ---------------------------------------------------------------------
const ENH_CAP = { pham: 3, linh: 6, bao: 9, tien: 12, than: 15 }; // CHỐNG BUG: bậc thấp cap thấp
const ENH_DROP_FROM = 4;     // chỉ TỪ +4 (e>=4) trở lên mới có rủi ro tụt cấp khi bại
const ENH_DROP_CHANCE = 0.5; // xác suất tụt 1 cấp khi BẠI ở mức rủi ro (🧧 Hộ Khí chặn)

function enhCap(rarity) { return ENH_CAP[rarity] != null ? ENH_CAP[rarity] : (config.gear.enhanceMax || 15); }
function canEnhance(it) { return it && (it.e || 0) < enhCap(it.r); }
function enhanceCost(it) { return gear.enhanceCost(it); }
function enhanceBaseRate(it) { return gear.enhanceRate(it); }

// ---------------------------------------------------------------------
//  ③ NÂNG BẬC — keyed theo độ hiếm ĐÍCH (nâng từ `from` lên đó).
// ---------------------------------------------------------------------
const UPGRADE = {
  linh: { to: 'linh', from: 'pham', minRealm: 3, rate: 0.85, stones: 150,  refine: 10, mats: { linh_thao: 4, yeu_dan: 2 } },
  bao:  { to: 'bao',  from: 'linh', minRealm: 4, rate: 0.70, stones: 420,  refine: 22, mats: { yeu_dan: 3, huyet_tinh: 2 } },
  tien: { to: 'tien', from: 'bao',  minRealm: 5, rate: 0.52, stones: 980,  refine: 38, mats: { huyet_tinh: 3, long_can: 3 } },
  than: { to: 'than', from: 'tien', minRealm: 6, rate: 0.36, stones: 2200, refine: 66, mats: { long_can: 3, hu_tinh: 3, co_phach: 2 } },
};
const UP_DROP_CHANCE = 0.4; // xác suất tụt 1 bậc khi BẠI nâng bậc (🧧 Hộ Khí chặn; không tụt dưới Phàm)

function nextRarity(r) { const i = RARITY_SEQ.indexOf(r); return (i >= 0 && i < RARITY_SEQ.length - 1) ? RARITY_SEQ[i + 1] : null; }
function prevRarity(r) { const i = RARITY_SEQ.indexOf(r); return i > 0 ? RARITY_SEQ[i - 1] : null; }
function upgradeRecipe(toRarity) { return UPGRADE[toRarity] || null; }

// Đổi catalog id sang ĐỘ HIẾM khác, GIỮ ô + dòng phụ (b/c/d) nếu có. Thiếu -> dòng nền.
function reRarityId(oldId, newR) {
  const cat = gear.catalogItem(oldId);
  if (!cat) return null;
  const parts = oldId.split('_'); // [slot, rarity, letter?]
  const slot = parts[0]; const letter = parts[2];
  const cand = letter ? `${slot}_${newR}_${letter}` : `${slot}_${newR}`;
  return gear.isCatalog(cand) ? cand : `${slot}_${newR}`;
}

// ---------------------------------------------------------------------
//  PHÙ rèn (mua bằng 🔮 Tiên Ngọc; lưu ở players.forge_charms).
// ---------------------------------------------------------------------
const CHARMS = {
  ho_khi:     { id: 'ho_khi',     emoji: '🧧', name: 'Hộ Khí Phù',    desc: 'Rèn thất bại KHÔNG bị tụt cấp/tụt bậc (vẫn mất tài nguyên). Chỉ tốn khi thực sự cứu.' },
  thien_menh: { id: 'thien_menh', emoji: '📜', name: 'Thiên Mệnh Phù', desc: '+15% tỉ lệ thành công cho lần rèn đó.', rateBonus: 0.15 },
};
const THIEN_MENH_BONUS = 0.15;
function charm(id) { return CHARMS[id] || null; }

module.exports = {
  MIN_REALM, RARITY_SEQ,
  CRAFT, CRAFT_SEQ, craftRecipe, unlockedCraft, nextLockedCraft,
  ENH_CAP, ENH_DROP_FROM, ENH_DROP_CHANCE, enhCap, canEnhance, enhanceCost, enhanceBaseRate,
  UPGRADE, UP_DROP_CHANCE, upgradeRecipe, nextRarity, prevRarity, reRarityId,
  CHARMS, THIEN_MENH_BONUS, charm,
};
