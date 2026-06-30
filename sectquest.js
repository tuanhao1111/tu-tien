// =====================================================================
//  CHUỖI NHIỆM VỤ NHẬP MÔN (thuần — dữ liệu + helper)
//  Sau khi GIA NHẬP phái (qua nghi thức ở cốt truyện), người chơi nhận chuỗi
//  nhiệm vụ nhập môn. Mỗi bước hoàn thành:
//    • MỞ DẦN chiêu cơ bản (vào phái chỉ có chiêu #1; xong bước 1 → mở chiêu #2;
//      xong bước 2 → mở chiêu #3). Việc mở chiêu do BẬC (stage) điều khiển qua
//      skills.unlockedActivesForSect(sectId, realm, stage) — xem skills.js.
//    • Thưởng 1 MÓN trang bị nhập môn (equipment.setFor(sect)[equipIndex]).
//    • Thưởng linh thạch + tu vi.
//
//  stage của người chơi = SỐ BƯỚC ĐÃ HOÀN THÀNH (0..TOTAL). progress = tiến độ
//  bước hiện tại. Objective dùng các "type" đã có hook nền:
//    tuluyen | dautap_win | dotpha   (đều làm được từ Trúc Cơ — lúc vào phái).
// =====================================================================

const STEPS = [
  {
    id: 'sq0', name: 'Tạp Dịch Đường', emoji: '🧹',
    desc: 'Đệ tử mới phải làm tạp dịch rèn tâm tính. Vận công tu luyện **3 lần**.',
    objective: { type: 'tuluyen', goal: 3 },
    reward: { equipIndex: 0, stones: 30, tuVi: 60 }, // + mở chiêu cơ bản #2
  },
  {
    id: 'sq1', name: 'Diễn Võ Trường', emoji: '🥊',
    desc: 'Chứng minh thân thủ trước đồng môn. **Thắng 2 trận đấu tập** (`/dautap`).',
    objective: { type: 'dautap_win', goal: 2 },
    reward: { equipIndex: 1, stones: 60, tuVi: 120 }, // + mở chiêu cơ bản #3
  },
  {
    id: 'sq2', name: 'Lĩnh Ngộ Chân Truyền', emoji: '📿',
    desc: 'Bế quan lĩnh ngộ tâm pháp. **Đột phá 1 lần** (tầng hoặc cảnh giới).',
    objective: { type: 'dotpha', goal: 1 },
    reward: { equipIndex: 2, stones: 120, tuVi: 200 },
  },
];

const TOTAL = STEPS.length;

function steps() { return STEPS; }
function stepAt(i) { return (i != null && i >= 0 && i < STEPS.length) ? STEPS[i] : null; }

module.exports = { STEPS, TOTAL, steps, stepAt };
