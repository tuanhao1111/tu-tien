// =====================================================================
//  THÀNH TỰU — mốc thành tích, đạt được thì LÃNH 🔮 Tiên Ngọc (tiền hiếm),
//  vài mốc lớn còn tặng DANH HIỆU. Nhiều mốc từ DỄ → KHÓ.
//  THUẦN (dữ liệu + check). Tiến độ ĐỌC THẲNG state người chơi (realm,
//  stones, pvp_wins, thap_best, bậc toàn cục…) -> bền, không cần đếm sự kiện.
//  Đã lãnh lưu ở players.achievements (JSON mảng id). Lãnh thưởng ở HỒ SƠ.
// =====================================================================
const cult = require('./cultivation');

// Số phần tử mảng JSON (an toàn). Dùng đếm danh hiệu/đồ sở hữu.
function jlen(json) { try { const a = JSON.parse(json || '[]'); return Array.isArray(a) ? a.length : 0; } catch (_) { return 0; } }
// Tầng bí cảnh sâu nhất đã đạt (max trên mọi vùng trong bicanh_best).
function maxBicanh(p) { try { const o = JSON.parse(p.bicanh_best || '{}'); const v = Object.values(o).map(Number); return v.length ? Math.max(0, ...v) : 0; } catch (_) { return 0; } }

// goal: mốc cần đạt · cur(p): tiến độ hiện tại · reward: { premium?, stones?, title? }.
const ACHIEVEMENTS = [
  // --- Cảnh giới (dễ → khó) ---
  { id: 'a_nhapdao',   emoji: '🌱', name: 'Bước Vào Tiên Đồ',     desc: 'Khởi đầu hành trình tu tiên.',          goal: 1, cur: () => 1,                  reward: { premium: 1 } },
  { id: 'a_luyenkhi',  emoji: '🌬️', name: 'Luyện Khí Hữu Thành',   desc: 'Đạt cảnh giới Luyện Khí.',              goal: 1, cur: (p) => (p.realm >= 1 ? 1 : 0), reward: { premium: 1, stones: 50 } },
  { id: 'a_trucco',    emoji: '🏛️', name: 'Trúc Cơ Lập Đạo',       desc: 'Đạt cảnh giới Trúc Cơ.',                goal: 1, cur: (p) => (p.realm >= 2 ? 1 : 0), reward: { premium: 2, stones: 150 } },
  { id: 'a_kimdan',    emoji: '🟡', name: 'Kim Đan Ngưng Tụ',      desc: 'Đạt cảnh giới Kim Đan.',                goal: 1, cur: (p) => (p.realm >= 3 ? 1 : 0), reward: { premium: 3, stones: 300 } },
  { id: 'a_nguyenanh', emoji: '👶', name: 'Nguyên Anh Xuất Khiếu',  desc: 'Đạt cảnh giới Nguyên Anh.',             goal: 1, cur: (p) => (p.realm >= 4 ? 1 : 0), reward: { premium: 5 } },
  { id: 'a_hoathan',   emoji: '✨', name: 'Hóa Thần Trấn Thế',     desc: 'Đạt cảnh giới Hóa Thần.',               goal: 1, cur: (p) => (p.realm >= 5 ? 1 : 0), reward: { premium: 8 } },
  { id: 'a_daithua',   emoji: '☯️', name: 'Đại Thừa Khí Tượng',    desc: 'Đạt cảnh giới Đại Thừa — tặng danh hiệu 🔥.', goal: 1, cur: (p) => (p.realm >= 7 ? 1 : 0), reward: { premium: 15, title: 'chien_than' } },
  { id: 'a_tiennhan',  emoji: '🪙', name: 'Phi Thăng Thành Tiên',  desc: 'Viên mãn đại đạo — tu thành Tiên Nhân. Tặng 👑.', goal: 1, cur: (p) => (p.realm >= 9 ? 1 : 0), reward: { premium: 50, title: 'tien_ton' } },

  // --- Tài phú ---
  { id: 'a_giau1', emoji: '💰', name: 'Tiểu Phú Chi Gia',  desc: 'Tích lũy 1.000 linh thạch.',  goal: 1000,  cur: (p) => p.stones || 0, reward: { premium: 1 } },
  { id: 'a_giau2', emoji: '💎', name: 'Cự Phú Nhất Phương', desc: 'Tích lũy 10.000 linh thạch.', goal: 10000, cur: (p) => p.stones || 0, reward: { premium: 3 } },

  // --- Đột phá (bậc toàn cục) ---
  { id: 'a_dotpha10', emoji: '⚡', name: 'Thập Bộ Tinh Tiến',  desc: 'Đột phá tổng cộng 10 bậc.', goal: 10, cur: (p) => cult.globalStage(p.realm, p.tier), reward: { premium: 2 } },
  { id: 'a_dotpha30', emoji: '🌩️', name: 'Tam Thập Trùng Thiên', desc: 'Đột phá tổng cộng 30 bậc.', goal: 30, cur: (p) => cult.globalStage(p.realm, p.tier), reward: { premium: 5 } },

  // --- Môn phái ---
  { id: 'a_nhapphai', emoji: '🏯', name: 'Bái Nhập Sư Môn', desc: 'Gia nhập một môn phái.', goal: 1, cur: (p) => (p.sect ? 1 : 0), reward: { premium: 1, stones: 80 } },

  // --- Đấu Pháp (PvP) ---
  { id: 'a_pvp1',  emoji: '⚔️', name: 'Sơ Thí Luận Võ', desc: 'Thắng 1 trận Đấu Pháp.',  goal: 1,  cur: (p) => p.pvp_wins || 0, reward: { premium: 1 } },
  { id: 'a_pvp25', emoji: '🏆', name: 'Luận Võ Cao Thủ', desc: 'Thắng 25 trận Đấu Pháp — tặng danh hiệu ⚔️.', goal: 25, cur: (p) => p.pvp_wins || 0, reward: { premium: 5, title: 'kiem_khach' } },

  // --- Luyện Trường / Bí Cảnh ---
  { id: 'a_thap10',   emoji: '🗼', name: 'Đăng Tháp Vấn Đạo', desc: 'Vượt tầng 10 Thí Luyện Tháp.', goal: 10, cur: (p) => p.thap_best || 0, reward: { premium: 2 } },
  { id: 'a_bicanh10', emoji: '🗺️', name: 'Bí Cảnh Lịch Luyện', desc: 'Vào sâu tới tầng 10 bí cảnh.', goal: 10, cur: (p) => maxBicanh(p), reward: { premium: 2 } },

  // --- Sưu tập ---
  { id: 'a_title3', emoji: '🏷️', name: 'Danh Chấn Tứ Phương', desc: 'Sở hữu 3 danh hiệu.', goal: 3, cur: (p) => jlen(p.titles), reward: { premium: 3 } },
];

const byId = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
function get(id) { return byId.get(id) || null; }

// Trạng thái mọi thành tựu cho 1 người (claimed = mảng id đã lãnh).
//  Trả [{ a, cur, done, claimed, claimable }] — cur đã kẹp trần goal để vẽ bar.
function statusFor(player, claimed) {
  const set = new Set(claimed || []);
  return ACHIEVEMENTS.map((a) => {
    const raw = a.cur(player) || 0;
    const done = raw >= a.goal;
    const isClaimed = set.has(a.id);
    return { a, cur: Math.min(raw, a.goal), done, claimed: isClaimed, claimable: done && !isClaimed };
  });
}

// Mô tả phần thưởng gọn. vd "🔮 +5 · 💰 +300 · 🏷️ Nhất Kiếm Khách".
function rewardText(reward) {
  const parts = [];
  if (reward.premium) parts.push(`🔮 +${reward.premium}`);
  if (reward.stones) parts.push(`💰 +${reward.stones}`);
  if (reward.title) parts.push(`🏷️ ${reward.title}`);
  return parts.join(' · ') || '—';
}

module.exports = { ACHIEVEMENTS, get, statusFor, rewardText };
