// =====================================================================
//  ĐẤU PHÁP — LUẬN VÕ ĐÀI (thuần — KHÔNG đụng DB)
//  Hệ điểm xếp hạng (ELO) + danh hiệu theo điểm + đối thủ NPC dự phòng.
//  Trận đấu dùng chung engine combat.js: ghép 1 đối thủ rồi đánh "bản sao"
//  chỉ số của họ (không cần cả hai online). Logic ghép cặp + ghi điểm nằm ở
//  database.js (đụng DB); file này chỉ giữ CÔNG THỨC thuần để dễ test/cân.
// =====================================================================
const cult = require('./cultivation');
const sects = require('./sects');
const config = require('./config');

const START_RATING = 1000; // điểm đấu khởi điểm của mọi tu sĩ
const K = 32;              // hệ số ELO (đổi điểm mỗi trận)

// Danh hiệu theo điểm đấu (chọn mốc cao nhất <= rating).
const RANKS = [
  { min: 0,    name: 'Vô Danh Tiểu Tốt',    emoji: '🥋' },
  { min: 1000, name: 'Sơ Xuất Mao Lư',      emoji: '🔰' },
  { min: 1150, name: 'Tiểu Hữu Danh Khí',   emoji: '🏅' },
  { min: 1300, name: 'Nhất Phương Hảo Thủ', emoji: '🎖️' },
  { min: 1450, name: 'Danh Chấn Thiên Hạ',  emoji: '⚔️' },
  { min: 1600, name: 'Cái Thế Tông Sư',     emoji: '👑' },
  { min: 1800, name: 'Võ Đạo Chí Tôn',      emoji: '🐉' },
  { min: 2000, name: 'Thiên Hạ Đệ Nhất',    emoji: '🌟' },
];

function rankOf(rating) {
  let r = RANKS[0];
  for (const t of RANKS) if (rating >= t.min) r = t;
  return r;
}

// Kỳ vọng thắng của A trước B theo công thức ELO.
function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

// Số điểm A thay đổi sau trận. score: 1 thắng / 0.5 hòa / 0 thua.
function eloDelta(ra, rb, score, k = K) {
  return Math.round(k * (score - expectedScore(ra, rb)));
}

// --- Đối thủ NPC (dự phòng khi chưa có tu sĩ nào ngang điểm để ghép) ---
const NPC_NAMES = [
  'Lôi Đài Thủ Hộ Giả', 'Hắc Y Kiếm Khách', 'Du Phương Tán Nhân', 'Ma Đạo Cuồng Đồ',
  'Vô Danh Lão Quái', 'Diện Cụ Cao Nhân', 'Bách Chiến Đao Khách', 'Ẩn Thế Kiếm Tiên',
];
function npcName(i) {
  const idx = Number.isInteger(i) ? i % NPC_NAMES.length : Math.floor(Math.random() * NPC_NAMES.length);
  return NPC_NAMES[idx];
}
function randomSectId() {
  const all = sects.allSects();
  return all[Math.floor(Math.random() * all.length)].id;
}

// Phân bổ điểm thuộc tính cho NPC ở cảnh giới realm/tier sao cho ngang ngửa một
// tu sĩ thật cùng bậc: tổng điểm = số bậc đã qua × điểm/bậc, dồn vào thuộc tính
// chính của phái (giống người chơi tối ưu vừa phải).
function npcAttrs(realm, tier, sectId) {
  const sect = sects.getSect(sectId);
  const primary = (sect && sect.primaryAttrs && sect.primaryAttrs.length) ? sect.primaryAttrs : ['can_cot', 'linh_luc'];
  const total = cult.globalStage(realm, tier) * (config.attributes.pointsPerTier || 2);
  const attrs = { can_cot: 0, linh_luc: 0, the_phach: 0, than_phap: 0, ngo_tinh: 0 };
  let left = total;
  const part = Math.round(total / primary.length);
  for (const k of primary) {
    const give = Math.min(left, part);
    attrs[k] = (attrs[k] || 0) + give;
    left -= give;
  }
  if (left > 0) attrs[primary[0]] += left; // dồn dư vào thuộc tính chính đầu
  return attrs;
}

module.exports = {
  START_RATING, K, RANKS,
  rankOf, expectedScore, eloDelta,
  npcName, randomSectId, npcAttrs,
};
