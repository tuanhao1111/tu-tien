// =====================================================================
//  SINH MỆNH NGOÀI TRẬN (thuần — công thức, KHÔNG đụng DB)
//  HP bền tồn tại NGOÀI trận đấu: hồi theo thời gian, thua PvE -> trọng thương.
//  - maxHp do tầng combat tính (combat.build .maxHp) rồi TRUYỀN VÀO (giữ thuần).
//  - vit_cur + vit_ts lưu DB; hồi LƯỜI (tính khi đọc theo thời gian đã trôi).
//
//  Vai trò trong game: tài nguyên "thể lực/sinh mệnh" gắn nhịp PvE & boss.
//   • Thua 1 trận PvE  -> mất lossWoundPct máu tối đa.
//   • Thắng 1 trận PvE -> hao winWearPct (mệt mỏi nhẹ).
//   • Mỗi đòn công phạt boss thế giới tốn bossHitCost.
//   • Máu < minToFightPct = TRỌNG THƯƠNG: không vào PvE/boss tới khi hồi đủ.
//   • Hồi: thời gian (regenPerMin, cả offline) + đan Hồi Sinh + nút Liệu Thương.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

function cfg() { return config.health || {}; }
function enabled() { return cfg().enabled !== false; }

// Số máu hồi được từ lastTs -> now (theo % máu tối đa mỗi phút).
function regenSince(maxHp, lastTs, now) {
  if (!lastTs || now <= lastTs) return 0;
  const mins = (now - lastTs) / 60000;
  return Math.max(0, maxHp * (cfg().regenPerMin || 0) * mins);
}

// Trạng thái sinh mệnh hiện tại (đã cộng hồi theo thời gian, KHÔNG ghi DB).
//  cur < 0 (chưa khởi tạo) => coi như đầy máu. Trả { cur, max, pct, wounded, full, minToFight }.
function state(vitCur, maxHp, lastTs, now = Date.now()) {
  maxHp = Math.max(1, Math.round(maxHp));
  let cur = (vitCur == null || vitCur < 0) ? maxHp : vitCur;
  cur = Math.min(maxHp, cur + regenSince(maxHp, lastTs, now));
  cur = Math.max(0, Math.round(cur));
  const minToFight = Math.ceil(maxHp * (cfg().minToFightPct || 0));
  return {
    cur, max: maxHp,
    pct: cur / maxHp,
    minToFight,
    wounded: enabled() && cur < minToFight, // dưới ngưỡng = trọng thương (không PvE/boss được)
    full: cur >= maxHp,
  };
}

// Mất máu khi THUA 1 trận PvE (theo % tối đa).
function lossWound(maxHp) { return Math.round(maxHp * (cfg().lossWoundPct || 0)); }
// Hao máu khi THẮNG 1 trận PvE.
function winWear(maxHp) { return Math.round(maxHp * (cfg().winWearPct || 0)); }
// Chi phí máu mỗi đòn công phạt boss thế giới.
function bossHitCost(maxHp) { return Math.round(maxHp * (cfg().bossHitCost || 0)); }

// Linh thạch để Liệu Thương (hồi đầy tức thì) — co giãn theo bậc.
function restCost(realm, tier) {
  const s = cult.globalStage(realm, tier);
  return Math.round((cfg().restCost || 0) + (cfg().restCostPerStage || 0) * s);
}

// Thời gian (ms) ước tính để hồi đầy từ trạng thái hiện tại.
function timeToFull(cur, maxHp) {
  const per = maxHp * (cfg().regenPerMin || 0);
  if (per <= 0 || cur >= maxHp) return 0;
  return Math.ceil((maxHp - cur) / per) * 60000;
}

module.exports = { enabled, regenSince, state, lossWound, winWear, bossHitCost, restCost, timeToFull };
