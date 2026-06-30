// =====================================================================
//  NHIỆM VỤ HẰNG NGÀY (thuần — chỉ dữ liệu + helper)
//  Nhiệm vụ phụ lặp lại mỗi ngày, song song với CỐT TRUYỆN (chính tuyến).
//  Tiến độ bám vào các "type" hành động đã có hook sẵn:
//    tuluyen | bequan | dotpha | chat | bicanh_floor | craft | sanyeu | thap_floor | pvp_win
//  -> database.addDailyProgress(id, type, n) gọi cạnh addStoryProgress.
//  Reset theo NGÀY (giờ VN, xem config.quests.resetTzOffsetMin).
// =====================================================================
const config = require('./config');
const features = require('./features'); // gate nhiệm vụ theo TÍNH NĂNG đã mở khóa

// `feature`: key tính năng cần MỞ KHÓA để nhiệm vụ này xuất hiện (xem features.js).
//  Chưa mở tính năng -> KHÔNG giao nhiệm vụ (tránh nhiệm vụ "vô hiệu" với người mới).
const DAILIES = [
  { id: 'd_tuluyen', emoji: '🧘', name: 'Cần Tu Bất Đãi',     type: 'tuluyen',      goal: 3,  minRealm: 0, feature: 'tuluyen',     reward: { tuVi: 40, stones: 8 },  desc: 'Vận công tu luyện 3 lần.' },
  { id: 'd_chat',    emoji: '💬', name: 'Đạo Hữu Luận Đạo',    type: 'chat',         goal: 10, minRealm: 0, feature: null,          reward: { tuVi: 20 },            desc: 'Luận đạo (chat) 10 câu trong tông môn.' },
  { id: 'd_dotpha',  emoji: '⚡', name: 'Tinh Tiến Bất Tức',   type: 'dotpha',       goal: 1,  minRealm: 1, feature: 'dotpha',      reward: { tuVi: 120, stones: 15 }, desc: 'Đột phá 1 lần (tầng hoặc cảnh giới).' },
  { id: 'd_bicanh',  emoji: '🗺️', name: 'Lịch Luyện Bí Cảnh',  type: 'bicanh_floor', goal: 3,  minRealm: 3, feature: 'bicanh',      reward: { stones: 25 },          desc: 'Vượt 3 tầng bí cảnh.' },
  { id: 'd_luyendan',emoji: '💊', name: 'Đỉnh Lô Bất Tức',     type: 'craft',        goal: 1,  minRealm: 3, feature: 'luyendan',    reward: { tuVi: 60, stones: 12 }, desc: 'Luyện thành công 1 mẻ đan.' },
  { id: 'd_sanyeu',  emoji: '🐗', name: 'Trừ Yêu Vệ Đạo',      type: 'sanyeu',       goal: 3,  minRealm: 3, feature: 'luyentruong', reward: { tuVi: 50, stones: 15 }, desc: 'Săn hạ 3 yêu hoang ở Luyện Trường.' },
  { id: 'd_thap',    emoji: '🗼', name: 'Đăng Tháp Vấn Đạo',   type: 'thap_floor',   goal: 1,  minRealm: 3, feature: 'luyentruong', reward: { tuVi: 80, stones: 20 }, desc: 'Vượt 1 tầng Thí Luyện Tháp.' },
  { id: 'd_dauphap', emoji: '⚔️', name: 'Luận Võ Tranh Phong', type: 'pvp_win',      goal: 1,  minRealm: 4, feature: 'dauphap',     reward: { tuVi: 90, stones: 25 }, desc: 'Thắng 1 trận Đấu Pháp ở Luận Võ Đài.' },
];

const byId = new Map(DAILIES.map((q) => [q.id, q]));
const featByKey = new Map(features.FEATURES.map((f) => [f.key, f]));

function dailies() { return DAILIES; }
function getQuest(id) { return byId.get(id) || null; }

// 1 nhiệm vụ có mở cho người chơi này không: đủ cảnh giới VÀ đã mở khóa tính năng cần thiết.
function questOpen(player, q) {
  const realm = player?.realm ?? 0;
  if (realm < (q.minRealm || 0)) return false;
  if (q.feature) {
    const f = featByKey.get(q.feature);
    if (f && !features.isUnlocked(player, f)) return false;
  }
  return true;
}

// Nhiệm vụ mở cho người chơi (theo cảnh giới + tính năng đã mở khóa).
//  Nhận PLAYER (ưu tiên) hoặc realm số (tương thích lệnh gọi cũ).
function dailiesFor(playerOrRealm) {
  const player = (typeof playerOrRealm === 'object' && playerOrRealm)
    ? playerOrRealm
    : { realm: playerOrRealm ?? 0 };
  return DAILIES.filter((q) => questOpen(player, q));
}

// Mốc "ngày" hiện tại theo múi giờ cấu hình (YYYY-MM-DD). nowMs truyền vào để test được.
function dayKey(nowMs) {
  const off = (config.quests.resetTzOffsetMin || 0) * 60 * 1000;
  return new Date((nowMs ?? Date.now()) + off).toISOString().slice(0, 10);
}

module.exports = { DAILIES, dailies, getQuest, dailiesFor, questOpen, dayKey };
