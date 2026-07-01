// =====================================================================
//  BÍ CẢNH (PvE) — module THUẦN (không đụng DB).
//  - Danh sách bí cảnh (mở dần theo cảnh giới).
//  - Sinh yêu thú thành "combatant" tương thích combat.js (tái dùng engine).
//  - Bảng rớt đồ: linh thạch + tu vi + NGUYÊN LIỆU (dùng cho Luyện Đan sau).
//
//  Cơ chế: vào 1 bí cảnh = 1 "lượt thám hiểm". Đánh yêu thú từng TẦNG;
//  thắng thì gom chiến lợi phẩm (chưa nhận) rồi chọn ĐI SÂU (mạnh hơn,
//  thưởng hơn) hay RỜI (nhận thưởng). THUA = trọng thương, mất đồ chưa nhận.
//  Máu mang theo giữa các tầng (chỉ hồi nhẹ) -> đi sâu càng rủi ro.
// =====================================================================
const combat = require('./combat');
const cult = require('./cultivation');
const config = require('./config');

const R = Math.round;
const rnd = () => Math.random();
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// --- KHO NGUYÊN LIỆU (Luyện Đan sẽ tiêu thụ) ---
//  tier = cấp nguyên liệu (1 thấp -> 4 cao), để cân giá trị về sau.
const MATERIALS = {
  linh_thao:  { name: 'Linh Thảo',     emoji: '🌿', tier: 1, desc: 'Cỏ linh khí, nguyên liệu đan dược cơ bản.' },
  yeu_dan:    { name: 'Yêu Đan',       emoji: '🔮', tier: 2, desc: 'Nội đan yêu thú, tụ tinh hoa linh lực.' },
  huyet_tinh: { name: 'Huyết Tinh',    emoji: '🩸', tier: 2, desc: 'Tinh huyết ngưng kết, bổ khí dưỡng thân.' },
  long_can:   { name: 'Long Cân',      emoji: '🐲', tier: 3, desc: 'Gân cốt giao long, cương mãnh phi thường.' },
  hu_tinh:    { name: 'Hư Tinh Thạch', emoji: '🌌', tier: 4, desc: 'Mảnh sao rơi từ hư không, ẩn chứa đại đạo.' },
  co_phach:   { name: 'Cổ Phách',      emoji: '⚰️', tier: 4, desc: 'Tàn hồn thượng cổ chiến tướng, oán khí ngút trời.' },
  // Hạt giống Linh Điền (mua ở Shop, gieo ở Linh Điền — KHÔNG rớt từ bí cảnh).
  linh_chung: { name: 'Linh Chủng',    emoji: '🌰', tier: 1, desc: 'Hạt giống linh dược — gieo ở Linh Điền (panel Tu Luyện) để thu Linh Thảo.' },
  // Yêu Hồn Phách — tài nguyên BẮT/NÂNG NGỰ THÚ (farm ở Luyện Trường "Truy Tung"; pet trùng cũng trả về đây).
  yeu_hon_phach: { name: 'Yêu Hồn Phách', emoji: '👻', tier: 4, desc: 'Hồn phách yêu thú ngưng tụ — dùng để bắt & nâng cấp Ngự Thú (gacha + cho ăn).' },
  // Yêu Thú Lương — THỨC ĂN cho Ngự Thú (mua Shop / rớt Truy Tung). Cho ăn -> +EXP thú.
  yeu_thu_luong: { name: 'Yêu Thú Lương', emoji: '🍖', tier: 2, desc: 'Lương thực nuôi Ngự Thú — cho ăn để tích kinh nghiệm, đủ thì đột phá cấp.' },
};

function materialInfo(id) {
  return MATERIALS[id] || null;
}

// --- DANH SÁCH BÍ CẢNH (mở dần theo cảnh giới) ---
//  minRealm: cần đạt cảnh giới này mới vào được.
//  statMult: hệ số sức mạnh yêu thú nền (vùng càng sâu, càng mạnh & nhiều đồ).
//  lootMult: hệ số chiến lợi phẩm.
//  drops:    danh sách id nguyên liệu vùng này có thể rớt.
//  foes:     pool tên yêu thú thường. boss: pool tên boss (tầng thứ 5,10,...).
const ZONES = [
  {
    id: 'me_vu', name: 'Mê Vụ Trận', emoji: '🌫️', minRealm: 3,
    desc: 'Sương mù vạn trượng che kín trời, yêu thú sơ cấp ẩn hiện rình mồi.',
    statMult: 1.0, lootMult: 1.0,
    // Ghi chú cân bằng: chỉ số yêu thú ĐÃ scale theo cảnh giới người chơi (combat.build).
    // statMult chỉ là "vùng này gắt hơn chút" — KHÔNG cộng dồn thành khó gấp bội.
    // Khác biệt giữa các vùng nằm ở lootMult + nguyên liệu cấp cao.
    drops: ['linh_thao', 'yeu_dan'],
    foes: ['Vụ Lang', 'Độc Vụ Mãng', 'U Hồn Điểu', 'Thực Khí Quỷ'],
    boss: ['Mê Vụ Lão Yêu', 'Thiên Niên Vụ Mãng'],
  },
  {
    id: 'hoa_diem', name: 'Hỏa Diễm Sơn', emoji: '🌋', minRealm: 4,
    desc: 'Núi lửa rực cháy ngàn năm, hỏa thú cuồng bạo nuốt cả linh khí.',
    statMult: 1.05, lootMult: 1.35,
    drops: ['yeu_dan', 'huyet_tinh'],
    foes: ['Hỏa Giáp Tê', 'Viêm Lang', 'Thục Cốt Xà', 'Cuồng Diễm Hầu'],
    boss: ['Hỏa Lân Yêu Vương', 'Phần Thiên Hỏa Mãng'],
  },
  {
    id: 'long_cot', name: 'Long Cốt Uyên', emoji: '🐉', minRealm: 5,
    desc: 'Vực sâu chôn xương giao long thượng cổ, sát khí cương mãnh ngút ngàn.',
    statMult: 1.1, lootMult: 1.8,
    drops: ['huyet_tinh', 'long_can'],
    foes: ['Giao Long Hậu Duệ', 'Cương Giáp Quy', 'Long Hồn Vệ', 'Bạo Lân Mãng'],
    boss: ['Tàn Long Chi Linh', 'Cốt Long Vương'],
  },
  {
    id: 'hu_khong', name: 'Hư Không Tàn Cảnh', emoji: '🌌', minRealm: 6,
    desc: 'Mảnh không gian vỡ vụn trôi dạt, dị thú nuốt cả ánh sáng và linh hồn.',
    statMult: 1.13, lootMult: 2.4,
    drops: ['long_can', 'hu_tinh'],
    foes: ['Hư Không Thú', 'Thôn Quang Yêu', 'Tinh Không Giảo', 'Hỗn Độn Linh'],
    boss: ['Hư Không Cự Thú', 'Thôn Thiên Ma Linh'],
  },
  {
    id: 'co_chien', name: 'Thượng Cổ Chiến Trường', emoji: '⚰️', minRealm: 7,
    desc: 'Nơi vạn tiên chôn xác, oán khí thượng cổ kết thành chiến hồn bất diệt.',
    statMult: 1.16, lootMult: 3.2,
    drops: ['hu_tinh', 'co_phach'],
    foes: ['Tàn Hồn Chiến Tướng', 'Bất Diệt Thi Vệ', 'Oán Linh Tiên', 'Cổ Chiến Khôi Lỗi'],
    boss: ['Thượng Cổ Đại Năng Tàn Niệm', 'Vạn Cốt Chiến Hồn Vương'],
  },
];

const zoneById = new Map(ZONES.map((z) => [z.id, z]));
function getZone(id) { return zoneById.get(id) || null; }

// Các bí cảnh người chơi đã mở (theo cảnh giới hiện tại).
function zonesFor(realm) {
  return ZONES.filter((z) => (realm ?? 0) >= z.minRealm);
}

// Tầng có phải BOSS không (mỗi 5 tầng: 5, 10, ...).
function isBossFloor(floor) {
  return floor > 0 && floor % 5 === 0;
}

// --- KIỂU YÊU THÚ (archetype): chỉnh chỉ số + 1 chiêu đặc trưng ---
//  Đa dạng lối đánh để combat không nhàm. mods nhân lên chỉ số sau khi build.
const ARCHETYPES = [
  {
    id: 'thuong', label: 'Hung Thú', mods: {},
    active: { id: 'm_strike', name: 'Trảo Kích', kind: 'active', power: 1.7, mp: 0, cd: 2, emoji: '🐾' },
  },
  {
    id: 'cuong', label: 'Cuồng Thú', mods: { hp: 1.35, atk: 1.18, spd: 0.82 },
    active: { id: 'm_smash', name: 'Cuồng Bạo Kích', kind: 'active', power: 2.3, mp: 0, cd: 3, emoji: '💥' },
  },
  {
    id: 'nhanh', label: 'Tốc Thú', mods: { hp: 0.8, atk: 1.05, spd: 1.45, crit: 0.12 },
    active: { id: 'm_flurry', name: 'Liên Trảm', kind: 'active', power: 0.95, hits: 2, mp: 0, cd: 2, emoji: '🌀' },
  },
  {
    id: 'doc', label: 'Độc Thú', mods: { hp: 1.05 },
    active: { id: 'm_venom', name: 'Độc Vụ Phún', kind: 'active', power: 0.6, dot: { mult: 0.85, turns: 3 }, mp: 0, cd: 3, emoji: '☠️' },
  },
];

// Hệ số sức mạnh yêu thú theo độ sâu (tầng càng sâu càng mạnh).
function floorPower(floor) {
  return 0.70 + 0.06 * floor; // tầng 1 ≈ 0.76, tầng 5 ≈ 1.0, tầng 10 ≈ 1.3, tầng 12 ≈ 1.42
}

const BOSS_STAT = 1.18; // boss mạnh hơn (chỉ số chung) so với tầng thường cùng độ sâu
const BOSS_HP = 1.25;   // và trâu hơn (máu riêng)

// Sinh 1 yêu thú thành combatant (tương thích combat.resolve).
//  Trả { c, name, archetype, isBoss }.
function buildMonster(zone, floor, realm, tier) {
  const boss = isBossFloor(floor);
  const arch = boss ? pick([ARCHETYPES[1], ARCHETYPES[2]]) : pick(ARCHETYPES); // boss luôn cuồng/tốc cho căng
  const name = boss ? `👹 ${pick(zone.boss)}` : pick(zone.foes);

  // Yêu thú không có môn phái -> build chỉ số nền, không có bị động/chiêu phái.
  const c = combat.build(name, realm, tier, null, []);

  const m = arch.mods;
  const power = zone.statMult * floorPower(floor) * (boss ? BOSS_STAT : 1);
  c.maxHp = Math.max(1, R(c.maxHp * power * (m.hp || 1) * (boss ? BOSS_HP : 1)));
  c.hp = c.maxHp;
  c.base.atk = Math.max(1, R(c.base.atk * power * (m.atk || 1)));
  c.base.def = Math.max(0, R(c.base.def * power * (m.def || 1)));
  c.base.spd = Math.max(1, R(c.base.spd * (m.spd || 1)));
  if (m.crit) c.crit += m.crit;

  // Gắn 1 chiêu đặc trưng để combat AI dùng (xen kẽ đánh thường).
  c.actives = [{ ...arch.active }];
  c.sectName = boss ? '👑 Yêu Vương' : `🐾 ${arch.label}`;

  return { c, name, archetype: arch.id, isBoss: boss };
}

// --- BẢNG RỚT ĐỒ cho 1 tầng vừa THẮNG ---
//  Trả { stones, tuVi, mats: { matId: qty } }.
function rollLoot(zone, floor, realm) {
  const cfg = config.bicanh;
  const boss = isBossFloor(floor);
  const gs = cult.globalStage(realm, 1);
  const realmMult = 1 + gs * 0.08;
  const bossMult = boss ? cfg.bossMult : 1;

  const stones = R((cfg.baseStones + floor * cfg.perFloorStones) * zone.lootMult * realmMult * bossMult);
  const tuVi = R((cfg.baseTuVi + floor * cfg.perFloorTuVi) * realmMult * bossMult);

  const mats = {};
  // Boss: chắc chắn rớt nguyên liệu cao của vùng (1..3). Thường: ~55% rớt 1..2.
  if (boss) {
    const best = zone.drops[zone.drops.length - 1];
    mats[best] = (mats[best] || 0) + (1 + Math.floor(rnd() * 3));
    if (rnd() < 0.5) { const m = pick(zone.drops); mats[m] = (mats[m] || 0) + 1; }
  } else if (rnd() < 0.55) {
    const m = pick(zone.drops);
    mats[m] = (mats[m] || 0) + (1 + (rnd() < 0.3 ? 1 : 0));
  }
  return { stones, tuVi, mats };
}

// --- QUÉT: gom thưởng nhanh tới TẦNG SÂU NHẤT đã đạt (không phải đánh) ---
//  Cộng dồn rollLoot của các tầng 1..bestFloor (đã từng clear thật nên xứng đáng).
//  Trả { stones, tuVi, mats }.
function sweepLoot(zone, bestFloor, realm) {
  const out = { stones: 0, tuVi: 0, mats: {} };
  const cap = Math.min(bestFloor, config.bicanh.maxFloors);
  for (let f = 1; f <= cap; f++) {
    const l = rollLoot(zone, f, realm);
    out.stones += l.stones;
    out.tuVi += l.tuVi;
    for (const [k, v] of Object.entries(l.mats)) out.mats[k] = (out.mats[k] || 0) + v;
  }
  return out;
}

module.exports = {
  MATERIALS, materialInfo,
  ZONES, getZone, zonesFor,
  isBossFloor, buildMonster, rollLoot, floorPower, sweepLoot,
};
