// =====================================================================
//  LUYỆN ĐAN (thuần — chỉ dữ liệu + công thức, KHÔNG đụng DB)
//  Tiêu thụ NGUYÊN LIỆU Bí Cảnh (bicanh.js MATERIALS) -> chế ĐAN DƯỢC.
//  Đóng vòng lặp: bí cảnh rớt nguyên liệu -> luyện đan -> đan trợ tu / cứu
//  mạng lúc độ kiếp. Engine combat KHÔNG đụng tới (đan tu vi & độ kiếp,
//  không phải buff combat) -> không ảnh hưởng cân bằng phái.
//
//  Hai loại đan:
//    kind 'tuvi'        -> uống tức thì, +tu vi = pctNeed × tu vi cần lên bậc
//                          (theo % nên giữ giá trị ở MỌI cảnh giới, không lỗi thời).
//    kind 'tribulation' -> GIỮ trong túi; tự động tiêu hao khi ĐỘ KIẾP để cộng
//                          tỉ lệ thành công (rateBonus), trần config.alchemy.tribulationCap.
// =====================================================================
const config = require('./config');

// --- KHO ĐAN DƯỢC ---
//  tier để gợi ý "cấp đan" (1 thấp -> 4 cao). emoji + desc cho hiển thị.
const PILLS = {
  tu_khi_dan: {
    name: 'Tụ Khí Đan', emoji: '🟢', tier: 1, kind: 'tuvi', pctNeed: 0.06,
    desc: 'Đan cơ bản tụ linh khí trời đất, uống vào tăng nhẹ tu vi.',
  },
  boi_nguyen_dan: {
    name: 'Bồi Nguyên Đan', emoji: '🔵', tier: 2, kind: 'tuvi', pctNeed: 0.12,
    desc: 'Bồi bổ nguyên khí, tu vi tăng tiến rõ rệt.',
  },
  ho_dao_dan: {
    name: 'Hộ Đạo Đan', emoji: '🛡️', tier: 3, kind: 'tribulation', rateBonus: 0.12,
    desc: 'Hộ thể trong thiên kiếp — tự dùng khi độ kiếp, +12% tỉ lệ thành công.',
  },
  cuong_the_dan: {
    name: 'Cường Thể Đan', emoji: '🟣', tier: 3, kind: 'tuvi', pctNeed: 0.20,
    desc: 'Tinh huyết giao long luyện thành, đại bổ tu vi cho thân tu sĩ.',
  },
  tao_hoa_dan: {
    name: 'Tạo Hóa Đan', emoji: '🌌', tier: 4, kind: 'tribulation', rateBonus: 0.22,
    desc: 'Ẩn chứa một tia tạo hóa hư không — độ kiếp +22% tỉ lệ thành công.',
  },
  cuu_chuyen_dan: {
    name: 'Cửu Chuyển Kim Đan', emoji: '⚜️', tier: 4, kind: 'tuvi', pctNeed: 0.35,
    desc: 'Thần đan thượng cổ chín lần tôi luyện, tu vi bùng tiến.',
  },
};

// --- ĐAN PHƯƠNG (recipe) ---
//  minRealm: cần đạt cảnh giới này mới luyện được.
//  cost:     nguyên liệu tiêu hao { matId: qty } (matId theo bicanh.MATERIALS).
//  stoneCost: linh thạch hao thêm (phí lửa đỉnh lò).
//  baseSuccess: tỉ lệ thành công NỀN ở đúng minRealm (cao hơn cảnh giới -> dễ hơn).
//  yield:    số đan ra khi THÀNH CÔNG.
const RECIPES = {
  tu_khi_dan:     { minRealm: 3, cost: { linh_thao: 2 },                stoneCost: 5,   baseSuccess: 0.92, yield: 1 },
  boi_nguyen_dan: { minRealm: 4, cost: { linh_thao: 1, yeu_dan: 2 },     stoneCost: 15,  baseSuccess: 0.85, yield: 1 },
  ho_dao_dan:     { minRealm: 4, cost: { yeu_dan: 2, huyet_tinh: 2 },    stoneCost: 30,  baseSuccess: 0.80, yield: 1 },
  cuong_the_dan:  { minRealm: 5, cost: { huyet_tinh: 2, long_can: 1 },   stoneCost: 40,  baseSuccess: 0.78, yield: 1 },
  tao_hoa_dan:    { minRealm: 6, cost: { long_can: 2, hu_tinh: 1 },      stoneCost: 80,  baseSuccess: 0.72, yield: 1 },
  cuu_chuyen_dan: { minRealm: 7, cost: { hu_tinh: 2, co_phach: 2 },      stoneCost: 150, baseSuccess: 0.70, yield: 1 },
};

function pillInfo(id) { return PILLS[id] || null; }
function recipeInfo(id) { return RECIPES[id] || null; }
function isPill(id) { return Object.prototype.hasOwnProperty.call(PILLS, id); }

// Đan phương mở cho cảnh giới hiện tại. Trả [{ id, pill, recipe }] (giữ thứ tự tier).
const ORDER = ['tu_khi_dan', 'boi_nguyen_dan', 'ho_dao_dan', 'cuong_the_dan', 'tao_hoa_dan', 'cuu_chuyen_dan'];
function recipesFor(realm) {
  return ORDER
    .filter((id) => (realm ?? 0) >= RECIPES[id].minRealm)
    .map((id) => ({ id, pill: PILLS[id], recipe: RECIPES[id] }));
}

// Tỉ lệ luyện thành công: nền + thưởng theo cảnh giới vượt mức yêu cầu, có trần.
function craftSuccessRate(recipeId, realm) {
  const r = RECIPES[recipeId];
  if (!r) return 0;
  const a = config.alchemy;
  const bonus = (a.realmSuccessBonus || 0) * Math.max(0, (realm ?? 0) - r.minRealm);
  return Math.max(0, Math.min(a.maxSuccess ?? 1, r.baseSuccess + bonus));
}

// Đan độ kiếp MẠNH NHẤT người chơi đang có (rateBonus lớn nhất). Trả {id, rateBonus} | null.
function bestTribulationPill(bag) {
  let best = null;
  for (const [id, qty] of Object.entries(bag || {})) {
    const p = PILLS[id];
    if (!p || p.kind !== 'tribulation' || (qty || 0) <= 0) continue;
    if (!best || p.rateBonus > best.rateBonus) best = { id, rateBonus: p.rateBonus };
  }
  return best;
}

module.exports = {
  PILLS, RECIPES, ORDER,
  pillInfo, recipeInfo, isPill,
  recipesFor, craftSuccessRate, bestTribulationPill,
};
