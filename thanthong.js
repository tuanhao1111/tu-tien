// =====================================================================
//  THẦN THÔNG (thuần: catalog + công thức) — nhánh tu NGUYÊN THẦN (mở Hóa Thần)
//  Nuôi "Nguyên Thần" lên cấp -> mở dần các Thần Thông (buff chỉ số PHẲNG).
//  Trang bị tối đa N Thần Thông -> cộng combat CẢ PvE LẪN PvP (qua kênh gearBonus).
//
//  thanthong.js CHỈ giữ DỮ LIỆU + CÔNG THỨC. Cấp Nguyên Thần + Thần Thông đang
//  vận lưu ở players (than_level, thanthong). Crediting/khóa do database làm.
//  LƯU Ý: bonus CHỈ dùng các chỉ số kênh gearBonus mang được:
//    hp · atk · def · spd · mp · crit · dodge · critDmg (cộng phẳng).
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

const TT = () => config.thanthong || {};

// Catalog: mỗi Thần Thông mở ở 1 cấp Nguyên Thần (unlock), cộng 1 chỉ số phẳng.
const POWERS = [
  { id: 'thien_nhan', name: 'Thiên Nhãn Thông', emoji: '👁️', unlock: 1, bonus: { crit: 0.06 },   desc: '+6% Bạo Kích' },
  { id: 'phan_thien', name: 'Phần Thiên Ấn',    emoji: '🔥', unlock: 2, bonus: { atk: 26 },       desc: '+26 Lực Sát' },
  { id: 'hu_anh',     name: 'Hư Ảnh Thân',      emoji: '🌀', unlock: 3, bonus: { dodge: 0.05 },    desc: '+5% Né Tránh' },
  { id: 'kim_cuong',  name: 'Kim Cương Hồn',    emoji: '🛡️', unlock: 4, bonus: { def: 22 },        desc: '+22 Phòng Ngự' },
  { id: 'bat_diet',   name: 'Bất Diệt Nguyên Thần', emoji: '❤️', unlock: 5, bonus: { hp: 130 },   desc: '+130 Sinh Lực' },
  { id: 'loi_don',    name: 'Lôi Độn Thân Pháp', emoji: '⚡', unlock: 6, bonus: { spd: 15 },       desc: '+15 Tốc Độ' },
  { id: 'sat_pha',    name: 'Sát Phá Lang',     emoji: '💥', unlock: 7, bonus: { critDmg: 0.14 },  desc: '+14% ST Bạo' },
  { id: 'linh_hai',   name: 'Linh Hải Vô Lượng', emoji: '💠', unlock: 8, bonus: { mp: 70 },        desc: '+70 Linh Lực' },
];
const BY_ID = Object.fromEntries(POWERS.map((p) => [p.id, p]));
function power(id) { return BY_ID[id] || null; }

function maxLevel() { return TT().maxLevel || 8; }
// Số ô Thần Thông trang bị được theo cấp Nguyên Thần.
function slotsForLevel(level) {
  const base = TT().slotsBase || 1;
  const s = base + Math.floor((Math.max(1, level) - 1) / 3);
  return Math.min(TT().slotsMax || 3, s);
}
// Thần Thông đã MỞ ở cấp Nguyên Thần `level`.
function unlockedAt(level) { return POWERS.filter((p) => (level || 1) >= p.unlock); }
// Chi phí lên cấp Nguyên Thần từ `level` -> `level+1`: { stones, mat:{id:qty} }.
function levelCost(level, player) {
  const stage = player ? cult.globalStage(player.realm, player.tier) : 0;
  const stones = Math.round((TT().levelStonesBase || 0) * Math.max(1, level) * (1 + 0.06 * stage));
  const matId = TT().levelMatId;
  const mat = matId ? { [matId]: (TT().levelMatPerLevel || 1) * Math.max(1, level) } : {};
  return { stones, mat };
}
// Tổng bonus PHẲNG của danh sách Thần Thông đang vận (ids).
function sumBonus(ids) {
  const out = {};
  for (const id of ids || []) {
    const p = BY_ID[id]; if (!p) continue;
    for (const [k, v] of Object.entries(p.bonus)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

module.exports = { POWERS, power, maxLevel, slotsForLevel, unlockedAt, levelCost, sumBonus };
