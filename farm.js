// =====================================================================
//  KHU FARM (thuần — KHÔNG đụng DB). Mở ở Kim Đan, cùng kênh Luyện Trường.
//   • Linh Điền  — vườn idle: tích nguyên liệu theo thời gian.
//   • Săn Yêu    — bãi săn nhanh: 1 yêu thú/lượt (tái dùng combat).
//   • Thí Luyện Tháp — leo tháp vô tận: thắng thì lên tầng, thưởng tăng dần.
// =====================================================================
const config = require('./config');
const combat = require('./combat');
const cult = require('./cultivation');

const R = Math.round;
const rnd = () => Math.random();
const pick = (a) => a[Math.floor(rnd() * a.length)];

// ---------- LINH ĐIỀN (GĐ17: TRỒNG TRỌT — gieo hạt giống rồi thu hoạch) ----------
//  Mô hình: người chơi mua 🌰 Linh Chủng ở Shop -> GIEO (consume hạt, ghi mốc + số hạt)
//  -> sau growMs thì CHÍN -> THU HOẠCH ra nguyên liệu (lời hơn vốn hạt). Offline vẫn chín.
//  Trạng thái lưu: linhdien_ts (mốc gieo, 0 = ruộng trống), linhdien_seeds (số hạt đang trồng).

// Trạng thái ruộng: { planted, seeds, ready, leftMs }.
function linhDienState(plantTs, seeds, now) {
  const cfg = config.farm.linhDien;
  const t = now ?? Date.now();
  if (!plantTs || !seeds || seeds <= 0) return { planted: false, seeds: 0, ready: false, leftMs: 0 };
  const elapsed = Math.max(0, t - plantTs);
  const ready = elapsed >= cfg.growMs;
  return { planted: true, seeds, ready, leftMs: ready ? 0 : (cfg.growMs - elapsed) };
}
// Quy số hạt -> nguyên liệu thu hoạch { matId: qty } (mỗi hạt yieldPerSeed Linh Thảo + chance Yêu Đan).
function linhDienYield(seeds) {
  const cfg = config.farm.linhDien;
  const mats = {};
  if (seeds <= 0) return mats;
  mats.linh_thao = seeds * (cfg.yieldPerSeed || 1);
  let yeu = 0;
  for (let i = 0; i < seeds; i++) if (rnd() < cfg.yeuDanChance) yeu++;
  if (yeu > 0) mats.yeu_dan = yeu;
  return mats;
}

// ---------- SĂN YÊU ----------
const WILD = ['Hoang Lang', 'Thanh Diện Hầu', 'Độc Vĩ Hạt', 'Cuồng Giác Ngưu', 'Hắc Phong Điêu', 'Yêu Hồ'];
// Dựng 1 yêu hoang để đánh nhanh (combatant). Trả { c, name }.
function buildWildFoe(realm, tier) {
  const cfg = config.farm.sanYeu;
  const name = `🐗 ${pick(WILD)}`;
  const c = combat.build(name, realm, tier, null, []);
  const m = cfg.foeMult;
  c.maxHp = Math.max(1, R(c.maxHp * m)); c.hp = c.maxHp;
  c.base.atk = Math.max(1, R(c.base.atk * m));
  c.base.def = Math.max(0, R(c.base.def * m));
  c.actives = [{ id: 'wild_bite', name: 'Cắn Xé', kind: 'active', power: 1.6, mp: 0, cd: 2, emoji: '🦷' }];
  c.sectName = '🐾 Yêu Hoang';
  return { c, name };
}
// Thưởng khi thắng săn yêu. Trả { stones, tuVi, mats }.
function sanYeuLoot(realm) {
  const cfg = config.farm.sanYeu;
  const gs = cult.globalStage(realm, 1);
  const mult = 1 + gs * 0.08;
  const out = { stones: R(cfg.baseStones * mult), tuVi: R(cfg.baseTuVi * mult), mats: {} };
  if (rnd() < cfg.matChance) out.mats.linh_thao = 1 + (rnd() < 0.3 ? 1 : 0);
  return out;
}

// ---------- THÍ LUYỆN THÁP ----------
const TOWER_FOES = ['Thủ Tháp Khôi Lỗi', 'Tháp Linh Vệ', 'Trận Pháp Hư Ảnh', 'Cổ Tháp Hung Linh', 'Tháp Tầng Yêu Tướng'];
// Dựng quái canh tầng `floor` (càng cao càng mạnh). Trả { c, name }.
function buildTowerFoe(realm, tier, floor) {
  const cfg = config.farm.thap;
  const name = `🗼 ${pick(TOWER_FOES)} (tầng ${floor})`;
  const c = combat.build(name, realm, tier, null, []);
  const p = 1 + cfg.powerPerFloor * Math.max(0, floor - 1);
  c.maxHp = Math.max(1, R(c.maxHp * p)); c.hp = c.maxHp;
  c.base.atk = Math.max(1, R(c.base.atk * p));
  c.base.def = Math.max(0, R(c.base.def * p));
  c.actives = [{ id: 'tower_smash', name: 'Trấn Áp', kind: 'active', power: 1.8, mp: 0, cd: 2, emoji: '💢' }];
  c.sectName = '🗼 Thủ Tháp';
  return { c, name };
}
// Thưởng khi VƯỢT tầng `floor`. Trả { stones, tuVi }.
function towerReward(realm, floor) {
  const cfg = config.farm.thap;
  const gs = cult.globalStage(realm, 1);
  const mult = 1 + gs * 0.06;
  return {
    stones: R((cfg.baseStones + floor * cfg.perFloorStones) * mult),
    tuVi: R((cfg.baseTuVi + floor * cfg.perFloorTuVi) * mult),
  };
}

// --- QUÉT THÁP: gom nhanh thưởng các tầng 1..bestFloor (đã từng vượt) không phải đánh ---
//  Cộng dồn towerReward của mọi tầng đã chinh phục. Trả { stones, tuVi, floors }.
function towerSweepReward(realm, bestFloor) {
  const cap = Math.min(bestFloor || 0, config.farm.thap.maxFloor);
  const out = { stones: 0, tuVi: 0, floors: cap };
  for (let f = 1; f <= cap; f++) {
    const r = towerReward(realm, f);
    out.stones += r.stones;
    out.tuVi += r.tuVi;
  }
  return out;
}

module.exports = {
  linhDienState, linhDienYield,
  buildWildFoe, sanYeuLoot,
  buildTowerFoe, towerReward, towerSweepReward,
};
