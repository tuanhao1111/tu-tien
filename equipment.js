// =====================================================================
//  TRANG BỊ NHẬP MÔN (thuần — dữ liệu + helper)
//  Mỗi phái 1 BỘ 3 MÓN (Vũ khí / Giáp / Phụ kiện) — phần thưởng chuỗi
//  nhiệm vụ nhập môn. Cộng CHỈ SỐ PHẲNG vào combat (giống thuộc tính: cộng
//  sau bias phái nên KHÔNG bị khuếch đại → không phá cân bằng; flat nên ở
//  bậc cao ảnh hưởng giảm dần, đúng tinh thần "trang bị khởi đầu").
//
//  bonus dùng các khóa combat: hp, atk, def, spd, mp, crit, dodge, critDmg.
//  (crit/dodge/critDmg là phân số: 0.03 = 3%).
//
//  ĐỘ HIẾM (rarity): NHÃN hiển thị cố định mỗi món (mặc định Linh Khí 🟢) — KHÔNG
//    nhân chỉ số (giữ nguyên cân bằng đã tinh chỉnh). Đổi `rarity:` trên từng món
//    để tùy biến (khóa hợp lệ: pham/linh/bao/tien/than — xem config.gear.rarities).
//  CƯỜNG HÓA: đồ nhập môn cũng cường hóa được (gộp ở /trangbi). Bậc +N lưu ở DB
//    (cột equip_enh: { itemId: level }); mỗi cấp +`config.gear.enhanceStep` chỉ số
//    NỀN của món (giống gear 6 ô) — cộng PHẲNG vào combat nên không phá spread phái.
// =====================================================================
const config = require('./config');

const DEFAULT_RARITY = 'linh'; // 🟢 Linh Khí — bậc nhãn mặc định cho đồ nhập môn

//  CÂN BẰNG: mọi bộ có Công nền tương đương (~11-12) để KHÔNG nới rộng cân bằng
//  phái (engine combat coi trọng Công); khác biệt nằm ở CHỈ SỐ PHỤ theo lối đánh
//  (crit/critDmg, mp, def/hp, spd/dodge). Đã mô phỏng: thắng mỗi phái sát baseline.
const SETS = {
  kiem_tong: [
    { id: 'eq_kt_w',   slot: 'weapon',    name: 'Thanh Phong Trường Kiếm', emoji: '🗡️', bonus: { atk: 9, crit: 0.03 },   desc: 'Kiếm khí sắc bén, tăng Công & bạo kích.' },
    { id: 'eq_kt_a',   slot: 'armor',     name: 'Kiếm Tông Chiến Bào',     emoji: '🥋', bonus: { hp: 30, def: 3 },        desc: 'Đạo bào nhẹ, tăng Sinh Lực & chút Phòng.' },
    { id: 'eq_kt_acc', slot: 'accessory', name: 'Lãnh Kiếm Ngọc Bội',      emoji: '📿', bonus: { atk: 3, critDmg: 0.14 }, desc: 'Khắc tâm kiếm ý, tăng sát thương bạo kích.' },
  ],
  huyen_hoa: [
    { id: 'eq_hh_w',   slot: 'weapon',    name: 'Liệm Hỏa Pháp Trượng', emoji: '🔥', bonus: { atk: 9, mp: 18 },    desc: 'Trượng tụ hỏa linh, tăng Công & Linh Lực.' },
    { id: 'eq_hh_a',   slot: 'armor',     name: 'Viêm Lân Bào',         emoji: '🧥', bonus: { hp: 30, def: 3 },    desc: 'Bào dệt vảy hỏa thú, tăng Sinh Lực.' },
    { id: 'eq_hh_acc', slot: 'accessory', name: 'Hỏa Tinh Giới Chỉ',    emoji: '💍', bonus: { atk: 3, mp: 10 },    desc: 'Nhẫn ngậm hỏa tinh, tăng Công & Linh Lực.' },
  ],
  dan_dinh: [
    { id: 'eq_dd_w',   slot: 'weapon',    name: 'Thanh Linh Dược Trượng', emoji: '🪈', bonus: { atk: 9, mp: 14 },  desc: 'Trượng dược linh, tăng Công & Linh Lực.' },
    { id: 'eq_dd_a',   slot: 'armor',     name: 'Bách Thảo Y',            emoji: '🧶', bonus: { hp: 38, def: 6 },   desc: 'Y phục tẩm dược, tăng Sinh Lực & Phòng.' },
    { id: 'eq_dd_acc', slot: 'accessory', name: 'Dưỡng Sinh Hồ Lô',       emoji: '🍶', bonus: { atk: 3, hp: 14 },   desc: 'Hồ lô chứa linh dược, tăng Công & Sinh Lực.' },
  ],
  cuong_the: [
    { id: 'eq_ct_w',   slot: 'weapon',    name: 'Cương Thiết Hộ Thủ', emoji: '🥊', bonus: { atk: 9, def: 4 },  desc: 'Hộ thủ nặng nề, tăng Công & Phòng.' },
    { id: 'eq_ct_a',   slot: 'armor',     name: 'Kim Cương Giáp',      emoji: '🛡️', bonus: { hp: 36, def: 9 }, desc: 'Giáp cương mãnh, tăng Sinh Lực & Phòng.' },
    { id: 'eq_ct_acc', slot: 'accessory', name: 'Trấn Nhạc Hộ Phù',    emoji: '🪨', bonus: { atk: 3, def: 6 },  desc: 'Phù trấn núi, tăng Công & Phòng Ngự.' },
  ],
  huyet_ma: [
    { id: 'eq_hm_w',   slot: 'weapon',    name: 'Huyết Hồn Đao',        emoji: '🔪', bonus: { atk: 9, crit: 0.02 }, desc: 'Đao khát huyết, tăng Công & bạo kích.' },
    { id: 'eq_hm_a',   slot: 'armor',     name: 'Huyết Sắt Chiến Khải', emoji: '🩸', bonus: { hp: 32, def: 3 },    desc: 'Khải nhuộm huyết khí, tăng Sinh Lực.' },
    { id: 'eq_hm_acc', slot: 'accessory', name: 'Nhiếp Hồn Linh Châu',  emoji: '🔮', bonus: { atk: 3, hp: 12 },   desc: 'Châu hút hồn, tăng Công & Sinh Lực.' },
  ],
  phong_linh: [
    { id: 'eq_pl_w',   slot: 'weapon',    name: 'Phong Nhận Song Đao', emoji: '🌪️', bonus: { atk: 9, spd: 4 },     desc: 'Đao nhẹ như gió, tăng Công & Tốc Độ.' },
    { id: 'eq_pl_a',   slot: 'armor',     name: 'Lưu Vân Khinh Bào',   emoji: '🍃', bonus: { hp: 30, def: 2 },     desc: 'Bào mỏng theo gió, tăng Sinh Lực.' },
    { id: 'eq_pl_acc', slot: 'accessory', name: 'Phong Linh Bội',      emoji: '🎐', bonus: { atk: 3, dodge: 0.04 }, desc: 'Linh bội theo gió, tăng Công & Né Tránh.' },
  ],
};

const SLOT_NAMES = { weapon: '🗡️ Vũ Khí', armor: '🛡️ Phòng Cụ', accessory: '📿 Phụ Kiện' };

// Index toàn bộ item -> info (kèm sect).
const byId = new Map();
for (const [sectId, items] of Object.entries(SETS)) {
  items.forEach((it) => byId.set(it.id, { ...it, sect: sectId }));
}

function itemInfo(id) { return byId.get(id) || null; }
function setFor(sectId) { return SETS[sectId] || []; }
function isItem(id) { return byId.has(id); }

// --- Độ hiếm (nhãn) + cường hóa ---
function enhanceStep() { return (config.gear && config.gear.enhanceStep) || 0; }
function enhanceMax() { return (config.gear && config.gear.enhanceMax) || 0; }
// Khóa độ hiếm của 1 món (mặc định Linh Khí).
function rarityKeyOf(id) { const it = byId.get(id); return (it && it.rarity) || DEFAULT_RARITY; }
// Object độ hiếm { name, emoji, color, ... } từ config (null nếu khóa lạ).
function rarityOf(id) { const r = (config.gear && config.gear.rarities) || {}; return r[rarityKeyOf(id)] || null; }
// Chỉ số HIỆU DỤNG của 1 món ở bậc cường hóa `level` = bonus × (1 + step×level).
function effectiveBonus(id, level = 0) {
  const it = byId.get(id);
  if (!it) return {};
  const mult = 1 + enhanceStep() * Math.max(0, level || 0);
  const out = {};
  for (const [k, v] of Object.entries(it.bonus)) {
    out[k] = (k === 'crit' || k === 'dodge' || k === 'critDmg') ? v * mult : Math.round(v * mult);
  }
  return out;
}
// Tên hiển thị: "🟢 Linh Khí · Thanh Phong Trường Kiếm +3".
function displayName(id, level = 0) {
  const it = byId.get(id);
  if (!it) return '';
  const rar = rarityOf(id);
  const enh = (level || 0) > 0 ? ` +${level}` : '';
  return `${rar ? rar.emoji : '⚪'} ${it.emoji} **${it.name}**${enh}`;
}

// Cộng dồn chỉ số danh sách item id (có cường hóa) -> { hp, atk, def, spd, mp, crit, dodge, critDmg }.
//  enhMap (tùy chọn): { itemId: level } — vắng/0 => dùng chỉ số nền (tương thích ngược).
function gearBonus(itemIds, enhMap = {}) {
  const out = { hp: 0, atk: 0, def: 0, spd: 0, mp: 0, crit: 0, dodge: 0, critDmg: 0 };
  for (const id of itemIds || []) {
    if (!byId.has(id)) continue;
    const eff = effectiveBonus(id, (enhMap && enhMap[id]) || 0);
    for (const [k, v] of Object.entries(eff)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// Mô tả ngắn 1 item cho hiển thị: "🗡️ Tên (+11 Công, +3% Bạo)".
const STAT_LABEL = { hp: 'Sinh Lực', atk: 'Công', def: 'Phòng', spd: 'Tốc', mp: 'Linh Lực', crit: 'Bạo', dodge: 'Né', critDmg: 'ST Bạo' };
function bonusText(bonus) {
  return Object.entries(bonus).map(([k, v]) => {
    const pct = (k === 'crit' || k === 'dodge' || k === 'critDmg');
    return `+${pct ? Math.round(v * 100) + '%' : v} ${STAT_LABEL[k] || k}`;
  }).join(', ');
}

module.exports = {
  SETS, SLOT_NAMES, itemInfo, setFor, isItem, gearBonus, bonusText,
  rarityKeyOf, rarityOf, effectiveBonus, displayName, enhanceMax,
};
