// =====================================================================
//  NGỰ THÚ (thuần: catalog yêu thú + công thức) — bạn chiến PvE (mở Nguyên Anh)
//  Thu phục 1 con (tốn linh thạch + nguyên liệu) -> luyện cấp -> trang bị.
//  Con đang theo CỘNG CHỈ SỐ PHẲNG (hp/atk/def/spd) qua kênh gearBonus +
//  cơ hội tung "đòn phụ" mỗi vòng. CHỈ áp PvE (xem combat.petStrike / db.*).
//
//  petbeasts.js CHỈ giữ DỮ LIỆU + CÔNG THỨC. Sở hữu/cấp lưu ở players (pets,
//  pet_active). Crediting/khóa do command + database làm.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

const PET = () => config.pet || {};

// --- BẬC THÚ (gacha): độ hiếm tăng dần. MUA THẲNG trong shop bằng 🔮 Tiên Ngọc +
//  👻 Yêu Hồn Phách (KHÔNG dùng linh thạch). Giá cao theo bậc. ---
const TIERS = {
  pham: { key: 'pham', name: 'Phàm Thú', emoji: '⚪', color: 0xb2bec3, buyPremium: 15,  buyYhp: 40 },
  linh: { key: 'linh', name: 'Linh Thú', emoji: '🟢', color: 0x00b894, buyPremium: 40,  buyYhp: 120 },
  tien: { key: 'tien', name: 'Tiên Thú', emoji: '🟣', color: 0xa29bfe, buyPremium: 100, buyYhp: 300 },
  than: { key: 'than', name: 'Thần Thú', emoji: '🟡', color: 0xfdcb6e, buyPremium: 250, buyYhp: 800 },
};
const TIER_ORDER = ['pham', 'linh', 'tien', 'than'];
function tierInfo(t) { return TIERS[t] || TIERS.pham; }

// Catalog: archetype khác nhau (bruiser/tank/swift/…). tier = bậc gacha.
//  base/growth: chỉ số PHẲNG ở cấp 1 (+growth mỗi cấp). strike: đòn phụ {power, chance}.
const BEASTS = [
  // ⚪ Phàm Thú
  { key: 'man_nguu', name: 'Mãnh Ngưu', emoji: '🐂', tier: 'pham', minRealm: 4,
    base: { hp: 55, atk: 9, def: 8, spd: 3 }, growth: { hp: 18, atk: 3, def: 3, spd: 0.8 }, strike: { power: 0.30, chance: 0.22 },
    lore: 'Trâu rừng linh hóa, húc một cú nghiêng trời lệch đất.' },
  { key: 'thiet_dau_tru', name: 'Thiết Đầu Trư', emoji: '🐗', tier: 'pham', minRealm: 4,
    base: { hp: 48, atk: 11, def: 6, spd: 5 }, growth: { hp: 15, atk: 4, def: 2, spd: 1.4 }, strike: { power: 0.34, chance: 0.26 },
    lore: 'Lợn rừng đầu sắt, lao bừa không biết sợ là gì.' },
  // 🟢 Linh Thú
  { key: 'hac_phong_lang', name: 'Hắc Phong Lang', emoji: '🐺', tier: 'linh', minRealm: 4,
    base: { hp: 40, atk: 14, def: 5, spd: 8 }, growth: { hp: 14, atk: 5, def: 2, spd: 2.5 }, strike: { power: 0.45, chance: 0.32 },
    lore: 'Lang vương thảo nguyên, lao đi như cơn gió đen xé màn đêm.' },
  { key: 'huyen_giap_quy', name: 'Huyền Giáp Quy', emoji: '🐢', tier: 'linh', minRealm: 4,
    base: { hp: 90, atk: 6, def: 14, spd: 2 }, growth: { hp: 34, atk: 2, def: 5, spd: 0.6 }, strike: { power: 0.30, chance: 0.20 },
    lore: 'Linh quy mai cứng hơn thần thiết, trấn thủ vững như non.' },
  // 🟣 Tiên Thú
  { key: 'kim_si_dieu', name: 'Kim Sí Điêu', emoji: '🦅', tier: 'tien', minRealm: 4,
    base: { hp: 35, atk: 12, def: 4, spd: 14 }, growth: { hp: 12, atk: 4, def: 1.5, spd: 4 }, strike: { power: 0.40, chance: 0.42 },
    lore: 'Đại điêu cánh vàng che kín trời, một cú vồ xé toạc gió mây.' },
  { key: 'bich_lan_xa', name: 'Bích Lân Xà', emoji: '🐍', tier: 'tien', minRealm: 5,
    base: { hp: 50, atk: 18, def: 6, spd: 9 }, growth: { hp: 16, atk: 6, def: 2, spd: 2.5 }, strike: { power: 0.55, chance: 0.34 },
    lore: 'Mãng xà vảy biếc, một nọc độc làm ám cả nhật nguyệt.' },
  { key: 'cuu_vi_ho', name: 'Cửu Vĩ Hồ', emoji: '🦊', tier: 'tien', minRealm: 5,
    base: { hp: 60, atk: 15, def: 8, spd: 11 }, growth: { hp: 20, atk: 5, def: 3, spd: 3 }, strike: { power: 0.50, chance: 0.38 },
    lore: 'Hồ ly chín đuôi, mị hoặc chúng sinh, biến hóa khôn lường.' },
  // 🟡 Thần Thú (cực hiếm)
  { key: 'tieu_giao_long', name: 'Tiểu Giao Long', emoji: '🐉', tier: 'than', minRealm: 6,
    base: { hp: 80, atk: 22, def: 12, spd: 12 }, growth: { hp: 28, atk: 7, def: 4, spd: 3.5 }, strike: { power: 0.60, chance: 0.40 },
    lore: 'Giao long chưa hóa rồng, khí thế đã ngút trời chín tầng.' },
];
const BY_KEY = Object.fromEntries(BEASTS.map((b) => [b.key, b]));
function beast(key) { return BY_KEY[key] || null; }
function beastsFor(realm) { return BEASTS.filter((b) => (realm ?? 0) >= b.minRealm); }
function beastsByTier(t) { return BEASTS.filter((b) => b.tier === t); }
// Giá MUA THẲNG 1 thú: { premium: 🔮 Tiên Ngọc, yhp: 👻 Yêu Hồn Phách } theo bậc.
function buyCostOf(b) { const ti = tierInfo(b.tier); return { premium: ti.buyPremium || 0, yhp: ti.buyYhp || 0 }; }

function maxLevel() { return PET().maxLevel || 10; }

// Chỉ số PHẲNG con thú cộng ở cấp lv (1..maxLevel).
function bonusAt(b, lv) {
  const k = Math.max(1, Math.min(maxLevel(), lv || 1)) - 1;
  return {
    hp: Math.round(b.base.hp + b.growth.hp * k),
    atk: Math.round(b.base.atk + b.growth.atk * k),
    def: Math.round(b.base.def + b.growth.def * k),
    spd: Math.round(b.base.spd + b.growth.spd * k),
  };
}
// Đòn phụ ở cấp lv: power tăng nhẹ theo cấp, chance giữ nguyên.
function strikeAt(b, lv) {
  const k = Math.max(1, Math.min(maxLevel(), lv || 1)) - 1;
  return {
    power: +(b.strike.power + (PET().strikePerLevel || 0) * k).toFixed(3),
    chance: b.strike.chance,
    name: b.name, emoji: b.emoji,
  };
}
// Chi phí linh thạch luyện thú từ cấp `lv` -> `lv+1` (CŨ — không còn dùng, giữ cho tương thích).
function levelCost(lv, player) {
  const stage = player ? cult.globalStage(player.realm, player.tier) : 0;
  return Math.round((PET().levelStonesBase || 0) * Math.max(1, lv) * (1 + 0.06 * stage));
}

// --- CHO ĂN / ĐỘT PHÁ / TIẾN HÓA (GĐ25 #11) ---
const FEED = () => PET().feed || {};
// EXP cần để ĐỘT PHÁ từ cấp `lv` -> `lv+1`.
function expNeed(lv) { return Math.round((FEED().expBase || 40) + (FEED().expPerLevel || 20) * Math.max(1, lv)); }
// Tỉ lệ đột phá thành công ở cấp `lv` (chưa tính bùa).
function breakRate(lv) {
  const f = FEED();
  return Math.max(f.breakMin || 0.35, Math.min(1, (f.breakBase || 1) - (f.breakDropPerLevel || 0) * lv));
}
// Bậc tiến hóa theo cấp (số mốc evoLevels đã vượt): 0/1/2…
function evoStage(lv) { return (FEED().evoLevels || []).filter((m) => lv >= m).length; }
// Key ảnh thú theo cấp (tiến hóa): pet_<key> · pet_<key>_e1 · pet_<key>_e2…
function imageKey(key, lv) { const s = evoStage(lv); return s > 0 ? `pet_${key}_e${s}` : `pet_${key}`; }

module.exports = {
  BEASTS, TIERS, TIER_ORDER, beast, beastsFor, beastsByTier, tierInfo, buyCostOf,
  maxLevel, bonusAt, strikeAt, levelCost,
  expNeed, breakRate, evoStage, imageKey,
};
