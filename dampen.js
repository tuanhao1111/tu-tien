// =====================================================================
//  NERF CHUNG (thuần — KHÔNG đụng DB). Một nơi quyết định "ăn bao nhiêu".
//   (1) LINH KHÍ LOÃNG: farm càng nhiều trong NGÀY -> hiệu suất giảm dần.
//   (2) BÌNH CẢNH: ở tầng đỉnh mỗi cảnh giới -> tu vi vào bị bóp (chặn rush cấp).
//  database.js gọi applyTuVi/applyStones ngay tại chokepoint addTuVi/addStones.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

// Hệ số loãng theo lượng RAW đã farm trong ngày so với ngưỡng "thoải mái".
//  earned trong [0,T) -> brackets[0]; [T,2T) -> brackets[1]; ... (kẹp ở phần tử cuối).
function bracketMult(earnedToday, threshold, brackets) {
  if (!(threshold > 0) || earnedToday <= 0) return brackets[0];
  const idx = Math.floor(earnedToday / threshold);
  return brackets[Math.min(idx, brackets.length - 1)];
}

// Ngưỡng tu vi "thoải mái"/ngày = số bậc × tu vi cần 1 bậc hiện tại (tự co giãn theo cảnh giới).
function tuViThreshold(realm, tier) {
  return Math.max(1, Math.round(config.dampen.tuViStages * cult.tuViNeeded(realm, tier)));
}
// Ngưỡng linh thạch "thoải mái"/ngày = base + perStage × bậc toàn cục.
function stonesThreshold(realm, tier) {
  const gs = cult.globalStage(realm, tier);
  return Math.max(1, Math.round(config.dampen.stonesBase + config.dampen.stonesPerStage * gs));
}

// BÌNH CẢNH: ở tầng ĐỈNH 1 cảnh giới (nextStage là đại đột phá) tu vi vào bị bóp,
//  chỉ áp từ minRealm trở lên (người mới được miễn). Trả hệ số nhân (1 = không bóp).
function bottleneckMult(realm, tier) {
  if (!config.bottleneck.enabled) return 1;
  if (realm < config.bottleneck.minRealm) return 1;
  return cult.nextStage(realm, tier).isMajor ? config.bottleneck.mult : 1;
}

// Áp nerf cho 1 lần nhận TU VI. earnedToday = tu vi RAW đã farm trong ngày (trước nerf).
//  Trả { raw, gained, damp, bottleneck, threshold }.
function applyTuVi(realm, tier, raw, earnedToday) {
  if (!config.dampen.enabled || raw <= 0) {
    return { raw, gained: raw, damp: 1, bottleneck: 1, threshold: 0 };
  }
  const threshold = tuViThreshold(realm, tier);
  const damp = bracketMult(earnedToday, threshold, config.dampen.brackets);
  const bottleneck = bottleneckMult(realm, tier);
  const gained = Math.max(0, Math.round(raw * damp * bottleneck));
  return { raw, gained, damp, bottleneck, threshold };
}

// Áp nerf cho 1 lần nhận LINH THẠCH (không có bình cảnh). Trả { raw, gained, damp, threshold }.
function applyStones(realm, tier, raw, earnedToday) {
  if (!config.dampen.enabled || raw <= 0) {
    return { raw, gained: raw, damp: 1, threshold: 0 };
  }
  const threshold = stonesThreshold(realm, tier);
  const damp = bracketMult(earnedToday, threshold, config.dampen.brackets);
  const gained = Math.max(0, Math.round(raw * damp));
  return { raw, gained, damp, threshold };
}

// Ghi chú ngắn gắn vào embed thưởng khi bị nerf (rỗng nếu không bị) — để người chơi hiểu vì sao ít.
function tuViNote(res) {
  const parts = [];
  if (res.bottleneck < 1) parts.push('⛰️ *Bình Cảnh* — tu vi vào chậm hẳn, hãy tích đủ rồi **độ kiếp** để qua ải.');
  if (res.damp < 1) parts.push(`🌫️ *Linh khí loãng* (×${res.damp.toFixed(2)}) — hôm nay đã hấp thu nhiều, để mai linh khí ngưng tụ lại.`);
  return parts.join('\n');
}
function stonesNote(res) {
  return res.damp < 1 ? `🌫️ *Linh khí loãng* (×${res.damp.toFixed(2)}) — farm nhiều, lợi tức giảm.` : '';
}

module.exports = {
  bracketMult, tuViThreshold, stonesThreshold, bottleneckMult,
  applyTuVi, applyStones, tuViNote, stonesNote,
};
