// =====================================================================
//  HỆ TRANG BỊ ĐẦY ĐỦ (thuần — dữ liệu + công thức, KHÔNG đụng DB)
//  6 ô · 5 độ hiếm · 30 MÓN CÓ TÊN RIÊNG (catalog) · rớt từ boss/bí cảnh/tháp.
//
//  THIẾT KẾ (chốt theo yêu cầu): mỗi (ô × độ hiếm) = 1 MÓN có TÊN RIÊNG + CHỈ SỐ
//  CỐ ĐỊNH tự định nghĩa (KHÔNG scale theo cảnh giới -> nhìn số là biết, dễ tinh
//  chỉnh). Progression = kiếm món độ hiếm cao hơn. Chỉ số cộng PHẲNG vào combat
//  (sau bias phái -> KHÔNG nới spread phái). Ảnh: gear_<ô>_<độ hiếm>.png (1 ảnh/món).
//
//  MODIFIER khi rớt (giữ cả hai):
//    • Tứ tính (aff): món "hợp" 1 phái; mặc ĐÚNG phái -> +affinityBonus chỉ số MÓN đó.
//    • Biến thể (v): tiền tố tên + cộng 1 chỉ số chủ đề.
//  CƯỜNG HÓA (e): mỗi cấp +enhanceStep chỉ số nền (max enhanceMax). Cộng phẳng.
//
//  Một "món" (instance) = { u(uid), id(catalog), s(slot), r(rarity), st(=cost proxy),
//    e(enhance), v(variant?), aff(affinity?) }. s/r sao từ catalog -> code đọc
//    slot/độ hiếm + ảnh không cần đổi. Chỉ số suy TẤT ĐỊNH từ id + e + v + aff.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');
const sects = require('./sects');

const G = () => config.gear || {};

// --- TỨ TÍNH PHÁI (affinity) ---
function affinityBonus() { return G().affinityBonus || 0; }
function affinityTag(aff) {
  const s = aff && sects.getSect(aff);
  return s ? `${s.emoji} ${s.name}` : null;
}

// --- BIẾN THỂ (variant): tiền tố tên + cộng 1 chỉ số chủ đề ---
const VARIANTS = {
  liet_hoa:   { name: 'Liệt Hỏa',   emoji: '🔥', stat: 'atk' },
  huyen_thiet:{ name: 'Huyền Thiết', emoji: '🛡️', stat: 'def' },
  hau_tho:    { name: 'Hậu Thổ',    emoji: '⛰️', stat: 'hp' },
  truy_phong: { name: 'Truy Phong', emoji: '🌀', stat: 'spd' },
  linh_uyen:  { name: 'Linh Uyên',  emoji: '💠', stat: 'mp' },
  xich_diem:  { name: 'Xích Diễm',  emoji: '💥', stat: 'crit' },
  u_anh:      { name: 'U Ảnh',      emoji: '💨', stat: 'dodge' },
  pha_quan:   { name: 'Phá Quân',   emoji: '⚡', stat: 'critDmg' },
};
const VARIANT_KEYS = Object.keys(VARIANTS);
// Độ lớn THAM CHIẾU (hiếm ×1) của chỉ số biến thể cộng thêm.
const VARIANT_BASE = { atk: 5, def: 5, hp: 28, spd: 4, mp: 12, crit: 0.018, dodge: 0.018, critDmg: 0.05 };
function variantMult() { return G().variantMult != null ? G().variantMult : 0.6; }
function variantInfo(v) { return v && VARIANTS[v] ? VARIANTS[v] : null; }
function pickVariant() { return VARIANT_KEYS[Math.floor(Math.random() * VARIANT_KEYS.length)]; }

// --- 6 ô trang bị ---
const SLOTS = [
  { key: 'weapon',   name: 'Vũ Khí',   emoji: '🗡️', noun: 'Binh Khí' },
  { key: 'armor',    name: 'Giáp',     emoji: '🛡️', noun: 'Chiến Giáp' },
  { key: 'helmet',   name: 'Mũ',       emoji: '⛑️', noun: 'Đầu Khôi' },
  { key: 'boots',    name: 'Giày',     emoji: '🥾', noun: 'Chiến Ngoa' },
  { key: 'ring',     name: 'Nhẫn',     emoji: '💍', noun: 'Giới Chỉ' },
  { key: 'talisman', name: 'Pháp Bảo', emoji: '🪬', noun: 'Hộ Phù' },
];
const SLOT_BY = Object.fromEntries(SLOTS.map((s) => [s.key, s]));
const SLOT_KEYS = SLOTS.map((s) => s.key);

const FLAT = ['hp', 'atk', 'def', 'spd', 'mp'];
const PCT = ['crit', 'dodge', 'critDmg'];
const STAT_EMOJI = { hp: '❤️', atk: '⚔️', def: '🛡️', spd: '🌀', mp: '💠', crit: '💥', dodge: '💨', critDmg: '🔥' };
const STAT_LABEL = { hp: 'Sinh Lực', atk: 'Công', def: 'Phòng', spd: 'Tốc', mp: 'Linh Lực', crit: 'Bạo', dodge: 'Né', critDmg: 'ST Bạo' };

// --- Độ hiếm (đọc từ config) ---
function rarity(key) { return (G().rarities || {})[key] || null; }
const RARITY_ORDER = ['pham', 'linh', 'bao', 'tien', 'than'];
function rarityRank(key) { return RARITY_ORDER.indexOf(key); }
function slotInfo(key) { return SLOT_BY[key] || null; }

// =====================================================================
//  CATALOG — 30 MÓN CÓ TÊN (6 ô × 5 độ hiếm). id = '<ô>_<độ hiếm>'.
//  stats: chỉ số CỐ ĐỊNH (flat: hp/atk/def/spd/mp · pct: crit/dodge/critDmg = phân số).
//  Sửa TRỰC TIẾP ở đây để tinh chỉnh. Ảnh mỗi món: assets/img/gear_<id>.png.
// =====================================================================
const CATALOG = {
  // 🗡️ VŨ KHÍ — Công + bạo kích
  weapon_pham: { slot: 'weapon', rarity: 'pham', emoji: '🗡️', name: 'Hàn Thiết Kiếm',        stats: { atk: 5,  crit: 0.01, critDmg: 0.04 }, desc: 'Kiếm sắt thô, công thấp nhưng bền.' },
  weapon_linh: { slot: 'weapon', rarity: 'linh', emoji: '🗡️', name: 'Thanh Phong Linh Kiếm',  stats: { atk: 8,  crit: 0.02, critDmg: 0.06 }, desc: 'Kiếm dẫn linh khí, nhẹ và sắc.' },
  weapon_bao:  { slot: 'weapon', rarity: 'bao',  emoji: '🗡️', name: 'Huyền Thiết Trọng Kiếm', stats: { atk: 12, crit: 0.03, critDmg: 0.10 }, desc: 'Kiếm huyền thiết nặng, uy lực lớn.' },
  weapon_tien: { slot: 'weapon', rarity: 'tien', emoji: '🗡️', name: 'Liệt Dương Tiên Kiếm',   stats: { atk: 17, crit: 0.04, critDmg: 0.15 }, desc: 'Kiếm tụ dương hỏa, bạo kích cao.' },
  weapon_than: { slot: 'weapon', rarity: 'than', emoji: '🗡️', name: 'Tru Tiên Thần Kiếm',     stats: { atk: 24, crit: 0.06, critDmg: 0.20 }, desc: 'Thần kiếm chém tiên, đỉnh cao sát thương.' },

  // 🛡️ GIÁP — Sinh Lực + Phòng
  armor_pham:  { slot: 'armor', rarity: 'pham', emoji: '🛡️', name: 'Bố Y Giáp',         stats: { hp: 36,  def: 5 },  desc: 'Áo vải thô, che chắn cơ bản.' },
  armor_linh:  { slot: 'armor', rarity: 'linh', emoji: '🛡️', name: 'Thanh Lân Linh Giáp', stats: { hp: 58,  def: 8 },  desc: 'Giáp vảy linh thú, bền chắc.' },
  armor_bao:   { slot: 'armor', rarity: 'bao',  emoji: '🛡️', name: 'Huyền Quy Bảo Giáp',  stats: { hp: 88,  def: 12 }, desc: 'Giáp mai huyền quy, phòng ngự cao.' },
  armor_tien:  { slot: 'armor', rarity: 'tien', emoji: '🛡️', name: 'Tử Kim Tiên Giáp',    stats: { hp: 126, def: 17 }, desc: 'Giáp tử kim, hộ thể kiên cố.' },
  armor_than:  { slot: 'armor', rarity: 'than', emoji: '🛡️', name: 'Bất Diệt Thần Giáp',   stats: { hp: 175, def: 24 }, desc: 'Thần giáp bất diệt, sừng sững bất hoại.' },

  // ⛑️ MŨ — Sinh Lực + Linh Lực
  helmet_pham: { slot: 'helmet', rarity: 'pham', emoji: '⛑️', name: 'Da Đầu Khôi',        stats: { hp: 26,  mp: 12 }, desc: 'Mũ da thú đơn sơ.' },
  helmet_linh: { slot: 'helmet', rarity: 'linh', emoji: '⛑️', name: 'Thanh Đồng Linh Khôi', stats: { hp: 42,  mp: 20 }, desc: 'Mũ đồng dẫn linh, tụ thần.' },
  helmet_bao:  { slot: 'helmet', rarity: 'bao',  emoji: '⛑️', name: 'Huyền Ngọc Bảo Khôi',  stats: { hp: 64,  mp: 30 }, desc: 'Mũ khảm huyền ngọc, tĩnh tâm.' },
  helmet_tien: { slot: 'helmet', rarity: 'tien', emoji: '⛑️', name: 'Cửu Vân Tiên Khôi',    stats: { hp: 92,  mp: 44 }, desc: 'Mũ chín tầng mây, linh lực dồi dào.' },
  helmet_than: { slot: 'helmet', rarity: 'than', emoji: '⛑️', name: 'Thiên Cương Thần Khôi', stats: { hp: 128, mp: 60 }, desc: 'Thần khôi thiên cương, hộ thần trấn hồn.' },

  // 🥾 GIÀY — Tốc + Sinh Lực + Né
  boots_pham:  { slot: 'boots', rarity: 'pham', emoji: '🥾', name: 'Bố Hài',          stats: { spd: 3,  hp: 14, dodge: 0.02 }, desc: 'Giày vải nhẹ.' },
  boots_linh:  { slot: 'boots', rarity: 'linh', emoji: '🥾', name: 'Truy Phong Linh Ngoa', stats: { spd: 5,  hp: 24, dodge: 0.03 }, desc: 'Giày đuổi gió, bước nhanh.' },
  boots_bao:   { slot: 'boots', rarity: 'bao',  emoji: '🥾', name: 'Lưu Vân Bảo Ngoa',   stats: { spd: 8,  hp: 38, dodge: 0.05 }, desc: 'Giày lướt mây, thân pháp linh hoạt.' },
  boots_tien:  { slot: 'boots', rarity: 'tien', emoji: '🥾', name: 'Lăng Không Tiên Ngoa', stats: { spd: 12, hp: 56, dodge: 0.07 }, desc: 'Giày lăng không, tốc độ phi thường.' },
  boots_than:  { slot: 'boots', rarity: 'than', emoji: '🥾', name: 'Tung Thiên Thần Ngoa', stats: { spd: 16, hp: 78, dodge: 0.10 }, desc: 'Thần ngoa tung thiên, nhanh như chớp.' },

  // 💍 NHẪN — Công + ST Bạo
  ring_pham:   { slot: 'ring', rarity: 'pham', emoji: '💍', name: 'Đồng Giới Chỉ',     stats: { atk: 3,  critDmg: 0.06 }, desc: 'Nhẫn đồng giản dị.' },
  ring_linh:   { slot: 'ring', rarity: 'linh', emoji: '💍', name: 'Tụ Linh Giới Chỉ',   stats: { atk: 6,  critDmg: 0.10 }, desc: 'Nhẫn tụ linh, dồn sát ý.' },
  ring_bao:    { slot: 'ring', rarity: 'bao',  emoji: '💍', name: 'Huyền Quang Bảo Giới', stats: { atk: 9,  critDmg: 0.15 }, desc: 'Nhẫn huyền quang, tăng uy sát.' },
  ring_tien:   { slot: 'ring', rarity: 'tien', emoji: '💍', name: 'Nhật Nguyệt Tiên Giới', stats: { atk: 13, critDmg: 0.21 }, desc: 'Nhẫn nhật nguyệt, sát thương bạo lớn.' },
  ring_than:   { slot: 'ring', rarity: 'than', emoji: '💍', name: 'Càn Khôn Thần Giới',   stats: { atk: 18, critDmg: 0.28 }, desc: 'Thần giới càn khôn, một đòn định sinh tử.' },

  // 🪬 PHÁP BẢO — Linh Lực + Phòng + Sinh Lực
  talisman_pham: { slot: 'talisman', rarity: 'pham', emoji: '🪬', name: 'Mộc Phù',          stats: { mp: 14, def: 3,  hp: 16 }, desc: 'Phù gỗ hộ thân sơ khai.' },
  talisman_linh: { slot: 'talisman', rarity: 'linh', emoji: '🪬', name: 'Hộ Thân Linh Phù',  stats: { mp: 24, def: 6,  hp: 28 }, desc: 'Linh phù hộ thân, tụ linh khí.' },
  talisman_bao:  { slot: 'talisman', rarity: 'bao',  emoji: '🪬', name: 'Trấn Hồn Bảo Phù',  stats: { mp: 36, def: 9,  hp: 44 }, desc: 'Bảo phù trấn hồn, ổn định nguyên thần.' },
  talisman_tien: { slot: 'talisman', rarity: 'tien', emoji: '🪬', name: 'Ngũ Hành Tiên Phù', stats: { mp: 52, def: 13, hp: 64 }, desc: 'Tiên phù ngũ hành, linh lực cuộn trào.' },
  talisman_than: { slot: 'talisman', rarity: 'than', emoji: '🪬', name: 'Hỗn Độn Thần Phù',  stats: { mp: 72, def: 18, hp: 88 }, desc: 'Thần phù hỗn độn, đạo vận quy nhất.' },

  // ===================================================================
  //  DÒNG PHỤ b/c/d — mỗi (ô × độ hiếm) thêm 3 món SIDEGRADE (cùng power budget,
  //  phân bổ chỉ số khác nhau). id = '<ô>_<độ hiếm>_<b|c|d>'. Ảnh: gear_<id>.png.
  // ===================================================================

  // === 🗡️ WEAPON — dòng phụ b/c/d ===
  weapon_pham_b:         { slot: 'weapon', rarity: 'pham', emoji: '🗡️', name: 'Phàm Cuồng Đao', stats: { atk: 7, crit: 0.003, critDmg: 0.02 }, desc: 'Đao nặng chuộng sát thương thuần.' },
  weapon_linh_b:         { slot: 'weapon', rarity: 'linh', emoji: '🗡️', name: 'Chân Cuồng Đao', stats: { atk: 12, crit: 0.006, critDmg: 0.033 }, desc: 'Đao nặng chuộng sát thương thuần.' },
  weapon_bao_b:          { slot: 'weapon', rarity: 'bao', emoji: '🗡️', name: 'Huyền Cuồng Đao', stats: { atk: 19, crit: 0.009, critDmg: 0.05 }, desc: 'Đao nặng chuộng sát thương thuần.' },
  weapon_tien_b:         { slot: 'weapon', rarity: 'tien', emoji: '🗡️', name: 'Cực Cuồng Đao', stats: { atk: 26, crit: 0.013, critDmg: 0.072 }, desc: 'Đao nặng chuộng sát thương thuần.' },
  weapon_than_b:         { slot: 'weapon', rarity: 'than', emoji: '🗡️', name: 'Thánh Cuồng Đao', stats: { atk: 37, crit: 0.018, critDmg: 0.101 }, desc: 'Đao nặng chuộng sát thương thuần.' },
  weapon_pham_c:         { slot: 'weapon', rarity: 'pham', emoji: '🗡️', name: 'Phàm Truy Phong Thương', stats: { atk: 5, crit: 0.022, critDmg: 0.017 }, desc: 'Thương nhanh, thiên về tỉ lệ bạo kích.' },
  weapon_linh_c:         { slot: 'weapon', rarity: 'linh', emoji: '🗡️', name: 'Chân Truy Phong Thương', stats: { atk: 8, crit: 0.036, critDmg: 0.028 }, desc: 'Thương nhanh, thiên về tỉ lệ bạo kích.' },
  weapon_bao_c:          { slot: 'weapon', rarity: 'bao', emoji: '🗡️', name: 'Huyền Truy Phong Thương', stats: { atk: 12, crit: 0.056, critDmg: 0.043 }, desc: 'Thương nhanh, thiên về tỉ lệ bạo kích.' },
  weapon_tien_c:         { slot: 'weapon', rarity: 'tien', emoji: '🗡️', name: 'Cực Truy Phong Thương', stats: { atk: 16, crit: 0.08, critDmg: 0.061 }, desc: 'Thương nhanh, thiên về tỉ lệ bạo kích.' },
  weapon_than_c:         { slot: 'weapon', rarity: 'than', emoji: '🗡️', name: 'Thánh Truy Phong Thương', stats: { atk: 23, crit: 0.112, critDmg: 0.086 }, desc: 'Thương nhanh, thiên về tỉ lệ bạo kích.' },
  weapon_pham_d:         { slot: 'weapon', rarity: 'pham', emoji: '🗡️', name: 'Phàm Phá Quân Phủ', stats: { atk: 5, crit: 0.005, critDmg: 0.06 }, desc: 'Phủ bạo phát, thiên về sát thương bạo.' },
  weapon_linh_d:         { slot: 'weapon', rarity: 'linh', emoji: '🗡️', name: 'Chân Phá Quân Phủ', stats: { atk: 8, crit: 0.008, critDmg: 0.098 }, desc: 'Phủ bạo phát, thiên về sát thương bạo.' },
  weapon_bao_d:          { slot: 'weapon', rarity: 'bao', emoji: '🗡️', name: 'Huyền Phá Quân Phủ', stats: { atk: 12, crit: 0.012, critDmg: 0.151 }, desc: 'Phủ bạo phát, thiên về sát thương bạo.' },
  weapon_tien_d:         { slot: 'weapon', rarity: 'tien', emoji: '🗡️', name: 'Cực Phá Quân Phủ', stats: { atk: 16, crit: 0.017, critDmg: 0.215 }, desc: 'Phủ bạo phát, thiên về sát thương bạo.' },
  weapon_than_d:         { slot: 'weapon', rarity: 'than', emoji: '🗡️', name: 'Thánh Phá Quân Phủ', stats: { atk: 23, crit: 0.024, critDmg: 0.302 }, desc: 'Phủ bạo phát, thiên về sát thương bạo.' },

  // === 🛡️ ARMOR — dòng phụ b/c/d ===
  armor_pham_b:          { slot: 'armor', rarity: 'pham', emoji: '🛡️', name: 'Phàm Huyền Quy Khải', stats: { hp: 31, def: 6 }, desc: 'Trọng khải, thiên về phòng ngự.' },
  armor_linh_b:          { slot: 'armor', rarity: 'linh', emoji: '🛡️', name: 'Chân Huyền Quy Khải', stats: { hp: 50, def: 9 }, desc: 'Trọng khải, thiên về phòng ngự.' },
  armor_bao_b:           { slot: 'armor', rarity: 'bao', emoji: '🛡️', name: 'Huyền Huyền Quy Khải', stats: { hp: 76, def: 14 }, desc: 'Trọng khải, thiên về phòng ngự.' },
  armor_tien_b:          { slot: 'armor', rarity: 'tien', emoji: '🛡️', name: 'Cực Huyền Quy Khải', stats: { hp: 108, def: 20 }, desc: 'Trọng khải, thiên về phòng ngự.' },
  armor_than_b:          { slot: 'armor', rarity: 'than', emoji: '🛡️', name: 'Thánh Huyền Quy Khải', stats: { hp: 151, def: 28 }, desc: 'Trọng khải, thiên về phòng ngự.' },
  armor_pham_c:          { slot: 'armor', rarity: 'pham', emoji: '🛡️', name: 'Phàm Lưu Vân Sam', stats: { hp: 59, def: 2 }, desc: 'Khinh sam, thiên về sinh lực.' },
  armor_linh_c:          { slot: 'armor', rarity: 'linh', emoji: '🛡️', name: 'Chân Lưu Vân Sam', stats: { hp: 95, def: 3 }, desc: 'Khinh sam, thiên về sinh lực.' },
  armor_bao_c:           { slot: 'armor', rarity: 'bao', emoji: '🛡️', name: 'Huyền Lưu Vân Sam', stats: { hp: 143, def: 4 }, desc: 'Khinh sam, thiên về sinh lực.' },
  armor_tien_c:          { slot: 'armor', rarity: 'tien', emoji: '🛡️', name: 'Cực Lưu Vân Sam', stats: { hp: 203, def: 5 }, desc: 'Khinh sam, thiên về sinh lực.' },
  armor_than_c:          { slot: 'armor', rarity: 'than', emoji: '🛡️', name: 'Thánh Lưu Vân Sam', stats: { hp: 285, def: 8 }, desc: 'Khinh sam, thiên về sinh lực.' },
  armor_pham_d:          { slot: 'armor', rarity: 'pham', emoji: '🛡️', name: 'Phàm Hộ Linh Giáp', stats: { hp: 38, def: 2, mp: 13 }, desc: 'Giáp dẫn linh, thêm linh lực.' },
  armor_linh_d:          { slot: 'armor', rarity: 'linh', emoji: '🛡️', name: 'Chân Hộ Linh Giáp', stats: { hp: 61, def: 3, mp: 21 }, desc: 'Giáp dẫn linh, thêm linh lực.' },
  armor_bao_d:           { slot: 'armor', rarity: 'bao', emoji: '🛡️', name: 'Huyền Hộ Linh Giáp', stats: { hp: 92, def: 5, mp: 31 }, desc: 'Giáp dẫn linh, thêm linh lực.' },
  armor_tien_d:          { slot: 'armor', rarity: 'tien', emoji: '🛡️', name: 'Cực Hộ Linh Giáp', stats: { hp: 132, def: 7, mp: 45 }, desc: 'Giáp dẫn linh, thêm linh lực.' },
  armor_than_d:          { slot: 'armor', rarity: 'than', emoji: '🛡️', name: 'Thánh Hộ Linh Giáp', stats: { hp: 184, def: 10, mp: 63 }, desc: 'Giáp dẫn linh, thêm linh lực.' },

  // === ⛑️ HELMET — dòng phụ b/c/d ===
  helmet_pham_b:         { slot: 'helmet', rarity: 'pham', emoji: '⛑️', name: 'Phàm Kim Chiến Khôi', stats: { hp: 23, def: 2, mp: 6 }, desc: 'Chiến khôi nặng, thêm phòng ngự.' },
  helmet_linh_b:         { slot: 'helmet', rarity: 'linh', emoji: '⛑️', name: 'Chân Kim Chiến Khôi', stats: { hp: 38, def: 3, mp: 10 }, desc: 'Chiến khôi nặng, thêm phòng ngự.' },
  helmet_bao_b:          { slot: 'helmet', rarity: 'bao', emoji: '⛑️', name: 'Huyền Kim Chiến Khôi', stats: { hp: 57, def: 4, mp: 16 }, desc: 'Chiến khôi nặng, thêm phòng ngự.' },
  helmet_tien_b:         { slot: 'helmet', rarity: 'tien', emoji: '⛑️', name: 'Cực Kim Chiến Khôi', stats: { hp: 83, def: 6, mp: 23 }, desc: 'Chiến khôi nặng, thêm phòng ngự.' },
  helmet_than_b:         { slot: 'helmet', rarity: 'than', emoji: '⛑️', name: 'Thánh Kim Chiến Khôi', stats: { hp: 114, def: 8, mp: 31 }, desc: 'Chiến khôi nặng, thêm phòng ngự.' },
  helmet_pham_c:         { slot: 'helmet', rarity: 'pham', emoji: '⛑️', name: 'Phàm Tụ Linh Quan', stats: { hp: 13, mp: 22 }, desc: 'Pháp quan, dồn linh lực.' },
  helmet_linh_c:         { slot: 'helmet', rarity: 'linh', emoji: '⛑️', name: 'Chân Tụ Linh Quan', stats: { hp: 21, mp: 36 }, desc: 'Pháp quan, dồn linh lực.' },
  helmet_bao_c:          { slot: 'helmet', rarity: 'bao', emoji: '⛑️', name: 'Huyền Tụ Linh Quan', stats: { hp: 31, mp: 55 }, desc: 'Pháp quan, dồn linh lực.' },
  helmet_tien_c:         { slot: 'helmet', rarity: 'tien', emoji: '⛑️', name: 'Cực Tụ Linh Quan', stats: { hp: 45, mp: 79 }, desc: 'Pháp quan, dồn linh lực.' },
  helmet_than_c:         { slot: 'helmet', rarity: 'than', emoji: '⛑️', name: 'Thánh Tụ Linh Quan', stats: { hp: 62, mp: 109 }, desc: 'Pháp quan, dồn linh lực.' },
  helmet_pham_d:         { slot: 'helmet', rarity: 'pham', emoji: '⛑️', name: 'Phàm Tịnh Minh Quan', stats: { hp: 19, mp: 13, def: 1 }, desc: 'Minh quan tĩnh tâm, cân đối.' },
  helmet_linh_d:         { slot: 'helmet', rarity: 'linh', emoji: '⛑️', name: 'Chân Tịnh Minh Quan', stats: { hp: 31, mp: 21, def: 2 }, desc: 'Minh quan tĩnh tâm, cân đối.' },
  helmet_bao_d:          { slot: 'helmet', rarity: 'bao', emoji: '⛑️', name: 'Huyền Tịnh Minh Quan', stats: { hp: 47, mp: 31, def: 2 }, desc: 'Minh quan tĩnh tâm, cân đối.' },
  helmet_tien_d:         { slot: 'helmet', rarity: 'tien', emoji: '⛑️', name: 'Cực Tịnh Minh Quan', stats: { hp: 68, mp: 45, def: 3 }, desc: 'Minh quan tĩnh tâm, cân đối.' },
  helmet_than_d:         { slot: 'helmet', rarity: 'than', emoji: '⛑️', name: 'Thánh Tịnh Minh Quan', stats: { hp: 94, mp: 62, def: 5 }, desc: 'Minh quan tĩnh tâm, cân đối.' },

  // === 🥾 BOOTS — dòng phụ b/c/d ===
  boots_pham_b:          { slot: 'boots', rarity: 'pham', emoji: '🥾', name: 'Phàm Truy Phong Ngoa', stats: { spd: 6, hp: 12, dodge: 0.01 }, desc: 'Giày tốc, thiên về tốc độ.' },
  boots_linh_b:          { slot: 'boots', rarity: 'linh', emoji: '🥾', name: 'Chân Truy Phong Ngoa', stats: { spd: 9, hp: 20, dodge: 0.017 }, desc: 'Giày tốc, thiên về tốc độ.' },
  boots_bao_b:           { slot: 'boots', rarity: 'bao', emoji: '🥾', name: 'Huyền Truy Phong Ngoa', stats: { spd: 15, hp: 32, dodge: 0.027 }, desc: 'Giày tốc, thiên về tốc độ.' },
  boots_tien_b:          { slot: 'boots', rarity: 'tien', emoji: '🥾', name: 'Cực Truy Phong Ngoa', stats: { spd: 21, hp: 46, dodge: 0.039 }, desc: 'Giày tốc, thiên về tốc độ.' },
  boots_than_b:          { slot: 'boots', rarity: 'than', emoji: '🥾', name: 'Thánh Truy Phong Ngoa', stats: { spd: 29, hp: 64, dodge: 0.055 }, desc: 'Giày tốc, thiên về tốc độ.' },
  boots_pham_c:          { slot: 'boots', rarity: 'pham', emoji: '🥾', name: 'Phàm Vân Lý Ngoa', stats: { spd: 3, hp: 34, dodge: 0.008 }, desc: 'Giày bền, thiên về sinh lực.' },
  boots_linh_c:          { slot: 'boots', rarity: 'linh', emoji: '🥾', name: 'Chân Vân Lý Ngoa', stats: { spd: 4, hp: 54, dodge: 0.013 }, desc: 'Giày bền, thiên về sinh lực.' },
  boots_bao_c:           { slot: 'boots', rarity: 'bao', emoji: '🥾', name: 'Huyền Vân Lý Ngoa', stats: { spd: 7, hp: 88, dodge: 0.022 }, desc: 'Giày bền, thiên về sinh lực.' },
  boots_tien_c:          { slot: 'boots', rarity: 'tien', emoji: '🥾', name: 'Cực Vân Lý Ngoa', stats: { spd: 10, hp: 127, dodge: 0.031 }, desc: 'Giày bền, thiên về sinh lực.' },
  boots_than_c:          { slot: 'boots', rarity: 'than', emoji: '🥾', name: 'Thánh Vân Lý Ngoa', stats: { spd: 13, hp: 176, dodge: 0.044 }, desc: 'Giày bền, thiên về sinh lực.' },
  boots_pham_d:          { slot: 'boots', rarity: 'pham', emoji: '🥾', name: 'Phàm U Ảnh Ngoa', stats: { spd: 3, hp: 12, dodge: 0.021 }, desc: 'Giày ẩn, thiên về né tránh.' },
  boots_linh_d:          { slot: 'boots', rarity: 'linh', emoji: '🥾', name: 'Chân U Ảnh Ngoa', stats: { spd: 5, hp: 20, dodge: 0.033 }, desc: 'Giày ẩn, thiên về né tránh.' },
  boots_bao_d:           { slot: 'boots', rarity: 'bao', emoji: '🥾', name: 'Huyền U Ảnh Ngoa', stats: { spd: 8, hp: 32, dodge: 0.054 }, desc: 'Giày ẩn, thiên về né tránh.' },
  boots_tien_d:          { slot: 'boots', rarity: 'tien', emoji: '🥾', name: 'Cực U Ảnh Ngoa', stats: { spd: 12, hp: 46, dodge: 0.079 }, desc: 'Giày ẩn, thiên về né tránh.' },
  boots_than_d:          { slot: 'boots', rarity: 'than', emoji: '🥾', name: 'Thánh U Ảnh Ngoa', stats: { spd: 16, hp: 64, dodge: 0.109 }, desc: 'Giày ẩn, thiên về né tránh.' },

  // === 💍 RING — dòng phụ b/c/d ===
  ring_pham_b:           { slot: 'ring', rarity: 'pham', emoji: '💍', name: 'Phàm Sát Phá Giới', stats: { atk: 5, critDmg: 0.021, crit: 0.003 }, desc: 'Nhẫn sát, thiên về Công.' },
  ring_linh_b:           { slot: 'ring', rarity: 'linh', emoji: '💍', name: 'Chân Sát Phá Giới', stats: { atk: 9, critDmg: 0.039, crit: 0.006 }, desc: 'Nhẫn sát, thiên về Công.' },
  ring_bao_b:            { slot: 'ring', rarity: 'bao', emoji: '💍', name: 'Huyền Sát Phá Giới', stats: { atk: 13, critDmg: 0.058, crit: 0.009 }, desc: 'Nhẫn sát, thiên về Công.' },
  ring_tien_b:           { slot: 'ring', rarity: 'tien', emoji: '💍', name: 'Cực Sát Phá Giới', stats: { atk: 19, critDmg: 0.082, crit: 0.013 }, desc: 'Nhẫn sát, thiên về Công.' },
  ring_than_b:           { slot: 'ring', rarity: 'than', emoji: '💍', name: 'Thánh Sát Phá Giới', stats: { atk: 26, critDmg: 0.112, crit: 0.018 }, desc: 'Nhẫn sát, thiên về Công.' },
  ring_pham_c:           { slot: 'ring', rarity: 'pham', emoji: '💍', name: 'Phàm Huyết Hoàn', stats: { atk: 3, critDmg: 0.059, crit: 0.002 }, desc: 'Nhẫn huyết, thiên về ST bạo.' },
  ring_linh_c:           { slot: 'ring', rarity: 'linh', emoji: '💍', name: 'Chân Huyết Hoàn', stats: { atk: 5, critDmg: 0.106, crit: 0.004 }, desc: 'Nhẫn huyết, thiên về ST bạo.' },
  ring_bao_c:            { slot: 'ring', rarity: 'bao', emoji: '💍', name: 'Huyền Huyết Hoàn', stats: { atk: 7, critDmg: 0.16, crit: 0.006 }, desc: 'Nhẫn huyết, thiên về ST bạo.' },
  ring_tien_c:           { slot: 'ring', rarity: 'tien', emoji: '💍', name: 'Cực Huyết Hoàn', stats: { atk: 11, critDmg: 0.227, crit: 0.008 }, desc: 'Nhẫn huyết, thiên về ST bạo.' },
  ring_than_c:           { slot: 'ring', rarity: 'than', emoji: '💍', name: 'Thánh Huyết Hoàn', stats: { atk: 14, critDmg: 0.308, crit: 0.011 }, desc: 'Nhẫn huyết, thiên về ST bạo.' },
  ring_pham_d:           { slot: 'ring', rarity: 'pham', emoji: '💍', name: 'Phàm Linh Quang Bội', stats: { atk: 3, critDmg: 0.027, crit: 0.013 }, desc: 'Nhẫn linh, thêm tỉ lệ bạo.' },
  ring_linh_d:           { slot: 'ring', rarity: 'linh', emoji: '💍', name: 'Chân Linh Quang Bội', stats: { atk: 6, critDmg: 0.048, crit: 0.024 }, desc: 'Nhẫn linh, thêm tỉ lệ bạo.' },
  ring_bao_d:            { slot: 'ring', rarity: 'bao', emoji: '💍', name: 'Huyền Linh Quang Bội', stats: { atk: 8, critDmg: 0.073, crit: 0.036 }, desc: 'Nhẫn linh, thêm tỉ lệ bạo.' },
  ring_tien_d:           { slot: 'ring', rarity: 'tien', emoji: '💍', name: 'Cực Linh Quang Bội', stats: { atk: 12, critDmg: 0.103, crit: 0.051 }, desc: 'Nhẫn linh, thêm tỉ lệ bạo.' },
  ring_than_d:           { slot: 'ring', rarity: 'than', emoji: '💍', name: 'Thánh Linh Quang Bội', stats: { atk: 16, critDmg: 0.14, crit: 0.069 }, desc: 'Nhẫn linh, thêm tỉ lệ bạo.' },

  // === 🪬 TALISMAN — dòng phụ b/c/d ===
  talisman_pham_b:       { slot: 'talisman', rarity: 'pham', emoji: '🪬', name: 'Phàm Trấn Nhạc Phù', stats: { mp: 12, def: 4, hp: 14 }, desc: 'Phù trấn, thiên về phòng ngự.' },
  talisman_linh_b:       { slot: 'talisman', rarity: 'linh', emoji: '🪬', name: 'Chân Trấn Nhạc Phù', stats: { mp: 23, def: 7, hp: 25 }, desc: 'Phù trấn, thiên về phòng ngự.' },
  talisman_bao_b:        { slot: 'talisman', rarity: 'bao', emoji: '🪬', name: 'Huyền Trấn Nhạc Phù', stats: { mp: 34, def: 10, hp: 38 }, desc: 'Phù trấn, thiên về phòng ngự.' },
  talisman_tien_b:       { slot: 'talisman', rarity: 'tien', emoji: '🪬', name: 'Cực Trấn Nhạc Phù', stats: { mp: 50, def: 15, hp: 55 }, desc: 'Phù trấn, thiên về phòng ngự.' },
  talisman_than_b:       { slot: 'talisman', rarity: 'than', emoji: '🪬', name: 'Thánh Trấn Nhạc Phù', stats: { mp: 68, def: 21, hp: 76 }, desc: 'Phù trấn, thiên về phòng ngự.' },
  talisman_pham_c:       { slot: 'talisman', rarity: 'pham', emoji: '🪬', name: 'Phàm Hộ Linh Phù', stats: { mp: 27, def: 1, hp: 14 }, desc: 'Phù linh, dồn linh lực.' },
  talisman_linh_c:       { slot: 'talisman', rarity: 'linh', emoji: '🪬', name: 'Chân Hộ Linh Phù', stats: { mp: 49, def: 2, hp: 25 }, desc: 'Phù linh, dồn linh lực.' },
  talisman_bao_c:        { slot: 'talisman', rarity: 'bao', emoji: '🪬', name: 'Huyền Hộ Linh Phù', stats: { mp: 74, def: 2, hp: 38 }, desc: 'Phù linh, dồn linh lực.' },
  talisman_tien_c:       { slot: 'talisman', rarity: 'tien', emoji: '🪬', name: 'Cực Hộ Linh Phù', stats: { mp: 107, def: 3, hp: 55 }, desc: 'Phù linh, dồn linh lực.' },
  talisman_than_c:       { slot: 'talisman', rarity: 'than', emoji: '🪬', name: 'Thánh Hộ Linh Phù', stats: { mp: 148, def: 5, hp: 76 }, desc: 'Phù linh, dồn linh lực.' },
  talisman_pham_d:       { slot: 'talisman', rarity: 'pham', emoji: '🪬', name: 'Phàm Ngự Hồn Bài', stats: { mp: 12, def: 2, hp: 25 }, desc: 'Bài hộ hồn, thiên về sinh lực.' },
  talisman_linh_d:       { slot: 'talisman', rarity: 'linh', emoji: '🪬', name: 'Chân Ngự Hồn Bài', stats: { mp: 23, def: 4, hp: 45 }, desc: 'Bài hộ hồn, thiên về sinh lực.' },
  talisman_bao_d:        { slot: 'talisman', rarity: 'bao', emoji: '🪬', name: 'Huyền Ngự Hồn Bài', stats: { mp: 34, def: 6, hp: 68 }, desc: 'Bài hộ hồn, thiên về sinh lực.' },
  talisman_tien_d:       { slot: 'talisman', rarity: 'tien', emoji: '🪬', name: 'Cực Ngự Hồn Bài', stats: { mp: 50, def: 8, hp: 99 }, desc: 'Bài hộ hồn, thiên về sinh lực.' },
  talisman_than_d:       { slot: 'talisman', rarity: 'than', emoji: '🪬', name: 'Thánh Ngự Hồn Bài', stats: { mp: 68, def: 11, hp: 137 }, desc: 'Bài hộ hồn, thiên về sinh lực.' },
};

function isCatalog(id) { return Object.prototype.hasOwnProperty.call(CATALOG, id); }
function catalogItem(id) { return CATALOG[id] || null; }
function allCatalog() { return Object.entries(CATALOG).map(([id, c]) => ({ id, ...c })); }
// id catalog NỀN (dòng 'a') từ (ô, độ hiếm).
function catalogId(slot, rar) { return `${slot}_${rar}`; }

// Index: mọi món (gồm dòng phụ b/c/d) theo (ô × độ hiếm) -> để rớt ngẫu nhiên 1 dòng.
const BY_SLOT_RARITY = {};
for (const [id, c] of Object.entries(CATALOG)) {
  const k = `${c.slot}_${c.rarity}`;
  (BY_SLOT_RARITY[k] = BY_SLOT_RARITY[k] || []).push(id);
}
function variantsOf(slot, rar) { return BY_SLOT_RARITY[`${slot}_${rar}`] || [catalogId(slot, rar)]; }
function pickCatalogId(slot, rar) { const l = variantsOf(slot, rar); return l[Math.floor(Math.random() * l.length)]; }

// Hệ số scale CŨ (giữ export cho tương thích; KHÔNG dùng cho chỉ số nữa).
function stageScale(stage) { return 1 + 0.02 * Math.max(0, stage); }

// --- Chỉ số 1 instance ---
//  base = CATALOG[id].stats (cố định) -> × cường hóa (1+step×e) × tứ tính (nếu hợp phái).
//  Biến thể cộng thêm 1 chỉ số chủ đề (scale theo độ hiếm × variantMult × cường hóa).
//  sect (tùy chọn): phái người ĐANG MẶC -> kích tứ tính nếu it.aff === sect.
function statsOf(it, sect) {
  const out = { hp: 0, atk: 0, def: 0, spd: 0, mp: 0, crit: 0, dodge: 0, critDmg: 0 };
  if (!it) return out;
  const cat = CATALOG[it.id];
  if (!cat) return out;
  const enh = 1 + (G().enhanceStep || 0) * (it.e || 0);
  const aff = (sect && it.aff && it.aff === sect) ? (1 + affinityBonus()) : 1; // tứ tính đúng phái
  for (const [k, base] of Object.entries(cat.stats)) {
    out[k] = PCT.includes(k) ? base * enh * aff : Math.round(base * enh * aff);
  }
  // Biến thể: cộng thêm 1 chỉ số chủ đề (độc lập tứ tính). Scale theo độ hiếm.
  const vi = variantInfo(it.v);
  if (vi && VARIANT_BASE[vi.stat] != null) {
    const k = vi.stat, vb = VARIANT_BASE[k];
    const rar = rarity(it.r) || rarity(cat.rarity) || { mult: 1 };
    const add = PCT.includes(k) ? vb * rar.mult * enh * variantMult()
                                : Math.round(vb * rar.mult * enh * variantMult());
    out[k] = (out[k] || 0) + add;
  }
  return out;
}

// Cộng dồn chỉ số của danh sách instance (đã trang bị). Trả object bonus cho combat.build.
function sumBonus(items, sect) {
  const out = { hp: 0, atk: 0, def: 0, spd: 0, mp: 0, crit: 0, dodge: 0, critDmg: 0 };
  for (const it of items || []) {
    const s = statsOf(it, sect);
    for (const k of Object.keys(out)) out[k] += s[k] || 0;
  }
  for (const k of FLAT) out[k] = Math.round(out[k]);
  return out;
}

// Điểm "sức mạnh" 1 món để sắp xếp/so sánh.
function power(it) {
  const s = statsOf(it);
  return Math.round(s.hp * 0.15 + s.atk * 1.4 + s.def * 1.0 + s.spd * 0.9 + s.mp * 0.2 + s.crit * 220 + s.dodge * 220 + s.critDmg * 90);
}

// --- Sinh đồ rớt ---
function pickRarity(rarityBoost = 0) {
  const rs = G().rarities || {};
  const entries = RARITY_ORDER.filter((k) => rs[k]);
  let total = 0;
  const weighted = entries.map((k, i) => {
    const w = Math.max(0.0001, rs[k].weight * (1 + rarityBoost * i));
    total += w; return [k, w];
  });
  let roll = Math.random() * total;
  for (const [k, w] of weighted) { if ((roll -= w) <= 0) return k; }
  return entries[0];
}

// Rớt 1 món. realm/tier GIỮ trong chữ ký cho tương thích (chỉ số cố định nên KHÔNG
//  dùng tới). opts: rarity (ép), slot (ép ô), rarityBoost, aff (ép tứ tính), v (ép biến thể).
function rollDrop(realm, tier, opts = {}) {
  const slot = opts.slot && SLOT_BY[opts.slot] ? opts.slot : SLOT_KEYS[Math.floor(Math.random() * SLOT_KEYS.length)];
  const r = opts.rarity && rarity(opts.rarity) ? opts.rarity : pickRarity(opts.rarityBoost || 0);
  // Chọn 1 món (gồm dòng phụ b/c/d) trong ô×độ hiếm; opts.itemId ép 1 món cụ thể.
  const id = (opts.itemId && CATALOG[opts.itemId]) ? opts.itemId : pickCatalogId(slot, r);
  const out = { id, s: slot, r, st: rarityRank(r) * 4, e: 0 }; // st = cost proxy theo độ hiếm
  // Tứ tính: một phần đồ rớt mang "hợp phái" (ngẫu nhiên 1 phái). opts.aff ép phái.
  const aff = opts.aff && sects.getSect(opts.aff) ? opts.aff
            : (Math.random() < (G().affinityChance || 0) ? pickAffinity() : null);
  if (aff) out.aff = aff;
  // Biến thể: một phần đồ rớt mang biến thể chủ đề.
  const v = opts.v && VARIANTS[opts.v] ? opts.v
          : (Math.random() < (G().variantChance || 0) ? pickVariant() : null);
  if (v) out.v = v;
  return out;
}
function pickAffinity() {
  const all = sects.allSects();
  return all.length ? all[Math.floor(Math.random() * all.length)].id : null;
}

// --- Cường hóa ---
function enhanceRate(it) {
  const rates = G().enhanceRates || [];
  const lv = it.e || 0;
  return rates[lv] != null ? rates[lv] : (rates[rates.length - 1] || 0);
}
function enhanceCost(it) {
  const lv = it.e || 0;
  const stones = Math.round((G().enhanceStoneBase || 0) + (G().enhanceStonePerLv || 0) * lv + (G().enhanceStonePerStage || 0) * (it.st || 0));
  const refine = Math.round((G().enhanceRefineBase || 1) * (1 + lv));
  return { stones, refine };
}
function canEnhance(it) { return (it.e || 0) < (G().enhanceMax || 0); }

// --- Phân giải -> Tinh Thiết ---
function salvageYield(it) {
  const rar = rarity(it.r) || rarity(it.id && CATALOG[it.id] ? CATALOG[it.id].rarity : null) || { salvage: 1 };
  return Math.round((G().salvageRefineBase || 1) * (rar.salvage || 1) * (1 + (it.e || 0) * 0.5));
}

// --- Hiển thị ---
//  Tên = [độ hiếm] [biến thể?] TÊN RIÊNG [+cường] 〔hợp phái?〕.
function nameOf(it) {
  const cat = CATALOG[it.id];
  if (!cat) return '⚪ ?';
  const rar = rarity(cat.rarity);
  const enh = (it.e || 0) > 0 ? ` +${it.e}` : '';
  const tag = affinityTag(it.aff);
  const affTxt = tag ? ` 〔hợp ${tag}〕` : '';
  const vi = variantInfo(it.v);
  const vName = vi ? `${vi.emoji} ${vi.name} ` : '';
  return `${rar ? rar.emoji : '⚪'} ${cat.emoji} ${vName}${cat.name}${enh}${affTxt}`.replace(/\s+/g, ' ').trim();
}
// Quy bậc toàn cục -> realm index (giữ cho tương thích).
function realmOfStage(stage) {
  let s = stage;
  for (let i = 0; i < cult.REALMS.length; i++) {
    if (s < cult.REALMS[i].tiers) return i;
    s -= cult.REALMS[i].tiers;
  }
  return cult.REALMS.length - 1;
}
// Chuỗi chỉ số 1 món + dòng tứ tính.
function statsText(it, sect) {
  const matched = sect && it && it.aff && it.aff === sect;
  const s = statsOf(it, sect);
  const parts = [];
  for (const k of [...FLAT, ...PCT]) {
    const v = s[k]; if (!v) continue;
    const val = PCT.includes(k) ? `${Math.round(v * 100)}%` : Math.round(v);
    parts.push(`${STAT_EMOJI[k]}+${val} ${STAT_LABEL[k]}`);
  }
  let txt = parts.join(' · ');
  if (it && it.aff) {
    const tag = affinityTag(it.aff);
    txt += matched
      ? `\n   ✨ *Hợp phái ${tag} — +${Math.round(affinityBonus() * 100)}% chỉ số (đang kích).* `
      : `\n   🔸 *Tứ tính ${tag} — mặc đúng phái để +${Math.round(affinityBonus() * 100)}% chỉ số.*`;
  }
  return txt;
}

module.exports = {
  SLOTS, SLOT_KEYS, SLOT_BY, RARITY_ORDER, STAT_EMOJI, STAT_LABEL,
  VARIANTS, VARIANT_KEYS, variantInfo,
  CATALOG, isCatalog, catalogItem, allCatalog, catalogId,
  rarity, rarityRank, slotInfo, statsOf, sumBonus, power,
  pickRarity, rollDrop, enhanceRate, enhanceCost, canEnhance, salvageYield,
  nameOf, statsText, realmOfStage, stageScale,
};
