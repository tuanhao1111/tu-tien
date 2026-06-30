// =====================================================================
//  PHÓ BẢN TỔ ĐỘI (thuần — công thức + helper, KHÔNG đụng DB/discord)
//  Mô hình CO-OP "góp sát thương" (như Boss Thế Giới) nhưng phạm vi 1 TỔ ĐỘI
//  (2-4 người) đánh 1 BOSS PHÓ BẢN có HP CHUNG, ở 1 vùng bí cảnh.
//
//  party.js chỉ giữ CÔNG THỨC (HP boss / quỹ thưởng / chia phần / sinh boss).
//  Trạng thái tổ đội (thành viên, HP còn lại, đóng góp) do commands/toduoi.js
//  giữ trong RAM; việc đo sát thương 1 đòn do lệnh dùng combat engine.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');
const gear = require('./gear');

const P = () => config.party || {};
const R = Math.round;

function enabled() { return P().enabled !== false; }
function maxMembers() { return P().maxMembers || 4; }
function minRealm() { return P().minRealm || 3; }
function attackCooldownMs() { return P().attackCooldownMs || 0; }
function assaultPoolMult() { return P().assaultPoolMult || 8; }
function assaultRounds() { return P().assaultRounds || 10; }
function dailyAttempts() { return P().dailyAttempts || Infinity; }

// =====================================================================
//  BẢNG RỚT TRANG BỊ CỐ ĐỊNH mỗi BÍ CẢNH phó bản (yêu cầu: mỗi phó bản 1 list
//  item trang bị drop ra cố định). Mỗi mục { slot, rarity, v? (ép biến thể) }.
//  Hạ boss -> mỗi người TRÚNG drop nhận NGẪU NHIÊN 1 mục trong list của vùng đó,
//  build ở bậc NGƯỜI NHẬN, ưu tiên tứ tính ĐÚNG phái. Vùng sâu -> đồ hiếm hơn.
//  zoneId khớp bicanh.ZONES.
// =====================================================================
const ZONE_DROPS = {
  me_vu: [
    { slot: 'weapon', rarity: 'linh' },
    { slot: 'armor',  rarity: 'linh' },
    { slot: 'boots',  rarity: 'bao', v: 'truy_phong' },
    { slot: 'ring',   rarity: 'bao' },
  ],
  hoa_diem: [
    { slot: 'weapon', rarity: 'bao', v: 'liet_hoa' },
    { slot: 'armor',  rarity: 'bao' },
    { slot: 'helmet', rarity: 'linh' },
    { slot: 'talisman', rarity: 'bao' },
  ],
  long_cot: [
    { slot: 'weapon', rarity: 'bao' },
    { slot: 'armor',  rarity: 'bao', v: 'huyen_thiet' },
    { slot: 'ring',   rarity: 'tien' },
    { slot: 'boots',  rarity: 'bao' },
  ],
  hu_khong: [
    { slot: 'weapon', rarity: 'tien' },
    { slot: 'talisman', rarity: 'tien', v: 'linh_uyen' },
    { slot: 'helmet', rarity: 'bao' },
    { slot: 'ring',   rarity: 'tien' },
  ],
  co_chien: [
    { slot: 'weapon', rarity: 'tien', v: 'pha_quan' },
    { slot: 'armor',  rarity: 'tien' },
    { slot: 'talisman', rarity: 'than' },
    { slot: 'ring',   rarity: 'tien' },
  ],
};

function zoneDropList(zoneId) { return ZONE_DROPS[zoneId] || null; }

// Roll 1 trang bị từ list CỐ ĐỊNH của vùng. realm/tier = của người NHẬN; sect = phái
//  người nhận (để ưu tiên tứ tính). Trả gear instance (chưa nhập kho) | null nếu vùng
//  không có list (an toàn — caller fallback gear.rollDrop thường).
function rollZoneDrop(zoneId, realm, tier, sect) {
  const list = ZONE_DROPS[zoneId];
  if (!list || !list.length) return null;
  const pickItem = list[Math.floor(Math.random() * list.length)];
  const opts = { slot: pickItem.slot, rarity: pickItem.rarity };
  if (pickItem.v) opts.v = pickItem.v;
  if (sect && Math.random() < (P().affToOwnSect || 0)) opts.aff = sect;
  return gear.rollDrop(realm, tier, opts);
}

// Chia Tiên Ngọc cho TOP đóng góp khi hạ boss (top-1 gấp đôi). Trả mảng theo thứ hạng
//  cùng độ dài contributors: [n0, n1, ...]. Tổng ~ premiumPerKill × (1.. theo top).
function premiumShares(rankCount) {
  const base = P().premiumPerKill || 0;
  if (base <= 0 || rankCount <= 0) return [];
  const out = [];
  for (let i = 0; i < rankCount; i++) {
    if (i === 0) out.push(base);           // top-1: full
    else if (i < 3) out.push(Math.max(1, Math.floor(base / 2))); // top-2/3: nửa (tối thiểu 1)
    else out.push(0);                      // còn lại: 0 (rất khó cày)
  }
  return out;
}

// HP CHUNG của boss phó bản: theo bậc toàn cục (của tổ trưởng) × số thành viên ×
//  hệ số gắt của vùng. Càng đông -> boss càng trâu (đảm bảo cần phối hợp).
function raidBossHp(zone, realm, tier, memberCount) {
  const s = cult.globalStage(realm, tier);
  const per = (P().bossHpBase || 0) + (P().bossHpPerStage || 0) * s; // HP mỗi thành viên
  const zoneMult = zone && zone.statMult ? zone.statMult : 1;
  return Math.max(1, R(per * Math.max(1, memberCount) * zoneMult));
}

// Quỹ thưởng tổng (chia theo % đóng góp). Co giãn theo bậc × lootMult vùng × sĩ số.
function rewardPool(zone, realm, tier, memberCount) {
  const s = cult.globalStage(realm, tier);
  const lm = zone && zone.lootMult ? zone.lootMult : 1;
  const m = Math.max(1, memberCount);
  const stones = R(((P().rewardStoneBase || 0) + (P().rewardStonePerStage || 0) * s) * lm * m);
  const tuVi = R(((P().rewardTuViBase || 0) + (P().rewardTuViPerStage || 0) * s) * lm * m);
  return { stones, tuVi };
}

// Phần thưởng 1 người theo sát thương đóng góp. Trả { share, stones, tuVi }.
function shareFor(damage, totalDamage, pool) {
  const share = totalDamage > 0 ? damage / totalDamage : 0;
  return { share, stones: R(pool.stones * share), tuVi: R(pool.tuVi * share) };
}

// Tên + emoji boss phó bản (lấy từ pool boss của vùng). seed để chọn ổn định 1 trận.
function bossNameFor(zone, seed = 0) {
  const pool = (zone && zone.boss && zone.boss.length) ? zone.boss : ['Yêu Vương'];
  const name = pool[Math.abs(Math.floor(seed)) % pool.length];
  return { name, emoji: '👹', display: `👹 ${name}` };
}

module.exports = {
  enabled, maxMembers, minRealm, attackCooldownMs, assaultPoolMult, assaultRounds, dailyAttempts,
  raidBossHp, rewardPool, shareFor, bossNameFor,
  zoneDropList, rollZoneDrop, premiumShares,
};
