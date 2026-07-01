// =====================================================================
//  GACHA BẮT NGỰ THÚ (thuần: công thức quay + pity). Chiêu Hồn Đài ở Shop.
//  2 cách quay: LT + Yêu Hồn Phách (KHÔNG pity) · Tiên Ngọc (tốn nhiều, CÓ pity).
//  Tỉ lệ Thần CỰC THẤP. Trùng -> trả Yêu Hồn Phách (crediting do database làm).
//  Số liệu ở config.pet.gacha; bậc/thú ở petbeasts.js.
// =====================================================================
const config = require('./config');
const petbeasts = require('./petbeasts');

const G = () => (config.pet && config.pet.gacha) || {};

// Bốc 1 BẬC theo bảng tỉ lệ (rates: {tier: prob}). rand mặc định Math.random.
function rollTier(rates, rand = Math.random) {
  let roll = rand();
  for (const t of petbeasts.TIER_ORDER) {
    const p = rates[t] || 0;
    if (roll < p) return t;
    roll -= p;
  }
  return 'pham'; // dư số -> Phàm
}
// Chọn ngẫu nhiên 1 thú trong bậc (bậc rỗng -> lùi bậc thấp hơn).
function pickBeast(tier, rand = Math.random) {
  let i = petbeasts.TIER_ORDER.indexOf(tier);
  let pool = petbeasts.beastsByTier(tier);
  while (!pool.length && i > 0) { i--; pool = petbeasts.beastsByTier(petbeasts.TIER_ORDER[i]); }
  if (!pool.length) pool = petbeasts.BEASTS;
  return pool[Math.floor(rand() * pool.length)];
}
// 1 lần quay. mode 'lt' | 'premium'. pity = số lần quay TIÊN NGỌC chưa ra Thần.
//  Trả { tier, beast, pity:bool(đã kích pity) }.
function roll(mode, pity = 0, rand = Math.random) {
  const g = G();
  if (mode === 'premium' && g.pityPremium && (pity + 1) >= g.pityPremium) {
    return { tier: 'than', beast: pickBeast('than', rand), pity: true };
  }
  const rates = mode === 'premium' ? (g.ratesPremium || {}) : (g.ratesLT || {});
  const tier = rollTier(rates, rand);
  return { tier, beast: pickBeast(tier, rand), pity: false };
}

module.exports = { rollTier, pickBeast, roll };
