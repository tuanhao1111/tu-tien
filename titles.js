// =====================================================================
//  DANH HIỆU — đeo để THỂ HIỆN (hiện trên Hồ Sơ + Bảng Xếp Hạng) VÀ cộng
//  một chút CHỈ SỐ (buff) cho người đeo. Mua bằng 🔮 Tiên Ngọc / nhận từ
//  Thành Tựu. Quản lý (đeo/bỏ) ở panel HỒ SƠ.
//  Sở hữu lưu ở players.titles (JSON), đeo ở players.title.
//
//  buff: object cộng PHẲNG cùng "kênh" với trang bị/thuộc tính
//   (hp/atk/def/spd/mp + crit/dodge/critDmg là % nên KHÔNG lệ thuộc cảnh giới).
//   -> database.combatGearBonus() gộp buff này vào, chảy khắp combat + hiển thị.
//   Ưu tiên chỉ số % (bạo/né/st bạo) cho buff khỏi loãng theo bậc.
// =====================================================================
const TITLES = {
  tan_tu:     { id: 'tan_tu',     emoji: '🍃', name: 'Tán Tu Tiêu Dao',  desc: 'Ngao du thiên hạ, không vướng môn quy.',  buff: { spd: 4, dodge: 0.03 } },
  kiem_khach: { id: 'kiem_khach', emoji: '⚔️', name: 'Nhất Kiếm Khách',  desc: 'Một kiếm trong tay, thiên hạ ai địch.',   buff: { atk: 6, crit: 0.04, critDmg: 0.10 } },
  dan_vuong:  { id: 'dan_vuong',  emoji: '💊', name: 'Đan Đạo Chân Quân', desc: 'Lô hỏa thuần thanh, vạn đan quy tâm.',     buff: { hp: 30, mp: 15 } },
  chien_than: { id: 'chien_than', emoji: '🔥', name: 'Bách Chiến Chiến Thần', desc: 'Trăm trận trăm thắng, sát khí ngút trời.', buff: { atk: 8, def: 6, critDmg: 0.12 } },
  tien_ton:   { id: 'tien_ton',   emoji: '👑', name: 'Cửu Thiên Tiên Tôn', desc: 'Đứng trên vạn vật, uy chấn cửu thiên.',   buff: { hp: 40, atk: 8, def: 6, crit: 0.03, dodge: 0.02 } },
};

const ORDER = ['tan_tu', 'kiem_khach', 'dan_vuong', 'chien_than', 'tien_ton'];

// Nhãn từng chỉ số buff (cho mô tả). %-stat hiển thị theo phần trăm.
const STAT_LABEL = {
  hp: 'Sinh Lực', atk: 'Công', def: 'Phòng', spd: 'Tốc', mp: 'Linh Lực',
  crit: 'Bạo Kích', dodge: 'Né', critDmg: 'ST Bạo',
};
const PCT_STATS = new Set(['crit', 'dodge', 'critDmg']);

function get(id) { return TITLES[id] || null; }
// Chuỗi hiển thị danh hiệu đang đeo (rỗng nếu không có). vd "👑 Cửu Thiên Tiên Tôn".
function label(id) { const t = get(id); return t ? `${t.emoji} ${t.name}` : ''; }

// Bonus chỉ số PHẲNG của danh hiệu đang đeo (object key chỉ số; {} nếu không có buff).
function combatBonus(id) {
  const t = get(id);
  return t && t.buff ? t.buff : {};
}

// Mô tả buff gọn cho UI. vd "+6 Công · +4% Bạo Kích · +10% ST Bạo". '' nếu không có.
function buffText(id) {
  const b = combatBonus(id);
  const parts = [];
  for (const [k, v] of Object.entries(b)) {
    if (!v) continue;
    const lab = STAT_LABEL[k] || k;
    parts.push(PCT_STATS.has(k) ? `+${Math.round(v * 100)}% ${lab}` : `+${v} ${lab}`);
  }
  return parts.join(' · ');
}

module.exports = { TITLES, ORDER, get, label, combatBonus, buffText };
