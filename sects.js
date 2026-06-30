// =====================================================================
//  MÔN PHÁI (thuần — dữ liệu + helper)
//  Mỗi phái = 1 nguyên mẫu combat: thiên hướng chỉ số (bias, đánh đổi
//  cân bằng) + 1 bị động + kho chiêu chủ động + loadout mặc định.
//
//  bias: hệ số nhân chỉ số gốc (đánh đổi NET để cân bằng — mạnh mặt này
//        thì yếu mặt kia). 1.0 = không đổi.
//  primaryAttrs: 2 thuộc tính gốc HỢP với phái (chỉ để GỢI Ý cộng điểm trên
//        panel + dòng "tương hợp"; KHÔNG ép buộc — cộng điểm vẫn tự do).
//  joinRealm: cảnh giới tối thiểu để gia nhập (2 = Trúc Cơ).
// =====================================================================
const skills = require('./skills');

const SECTS = [
  {
    id: 'kiem_tong', name: 'Kiếm Tông', emoji: '⚔️',
    archetype: 'Sát thủ bùng nổ — sát thương đơn mục tiêu cực cao, bạo kích.',
    bias: { atk: 0.99, hp: 0.92 }, // GĐ19: hạ atk (1.08→0.99) — kiem đều ~60-65% mọi bậc, ghìm về ~58-62%
    primaryAttrs: ['linh_luc', 'ngo_tinh'],
    defaultLoadout: ['kt_tramphong', 'kt_lienhoan', 'kt_kiemkhi'],
  },
  {
    id: 'huyen_hoa', name: 'Huyền Hỏa Môn', emoji: '🔥',
    archetype: 'Pháp sư hỏa hệ — thiêu đốt theo thời gian, càng đánh lâu càng đau.',
    bias: { atk: 0.92, def: 0.90 }, // GĐ19: DoT mạnh nên atk nền thấp (0.93→0.92); DoT cũng đã nerf ở skills
    primaryAttrs: ['linh_luc', 'ngo_tinh'],
    defaultLoadout: ['hh_hoacau', 'hh_liemdiem', 'hh_phunhoa'],
  },
  {
    id: 'dan_dinh', name: 'Đan Đỉnh Lâu', emoji: '💊',
    archetype: 'Đan sư trường kỳ — hồi máu, gây độc, bền bỉ hao mòn địch.',
    bias: { hp: 1.32, atk: 1.14 }, // GĐ19: bù mất tuyệt kỹ độc ở đầu; atk 1.16→1.14 (kéo dan_dinh về ~50-62%)
    primaryAttrs: ['can_cot', 'the_phach'],
    defaultLoadout: ['dd_liemdoc', 'dd_hoixuan', 'dd_donghoa'], // dd_kichdoc (tuyệt kỹ) mở ở Nguyên Anh
  },
  {
    id: 'cuong_the', name: 'Cương Thể Môn', emoji: '👊',
    archetype: 'Thể tu trâu bò — máu/phòng cao, phản đòn, càng đánh càng lì.',
    bias: { hp: 1.22, def: 1.22, atk: 0.89, spd: 0.85 }, // GĐ19: atk 0.86→0.89 (cuong_the vốn yếu ~43-45% bậc cao)
    primaryAttrs: ['the_phach', 'can_cot'],
    defaultLoadout: ['ct_thietbosam', 'ct_bangson', 'ct_phanchan'], // ct_thaison (tuyệt kỹ) mở ở Nguyên Anh
  },
  {
    id: 'huyet_ma', name: 'Huyết Ma Giáo', emoji: '🩸',
    archetype: 'Ma đạo hút máu — vừa đánh vừa hồi, làm suy yếu địch, liều ăn nhiều.',
    bias: { atk: 1.00, hp: 1.00 },
    primaryAttrs: ['linh_luc', 'can_cot'],
    defaultLoadout: ['hm_huyetdao', 'hm_nhiephon', 'hm_huyette'],
  },
  {
    id: 'phong_linh', name: 'Phong Linh Tông', emoji: '🌀',
    archetype: 'Thân pháp gió — tốc độ cao, né tránh, tung nhiều đòn liên hoàn.',
    bias: { spd: 1.36, hp: 1.0, atk: 1.03 }, // GĐ19: spd 1.45→1.36, atk 1.05→1.03 — ghìm phong_linh default OP (~70%) ở bậc cao
    primaryAttrs: ['than_phap', 'ngo_tinh'],
    defaultLoadout: ['pl_phongnhan', 'pl_cuongphong', 'pl_phongton'], // pl_vanphong (tuyệt kỹ) mở ở Nguyên Anh
  },
];

const JOIN_REALM = 2; // Trúc Cơ

const byId = new Map(SECTS.map((s) => [s.id, s]));

function getSect(id) {
  return byId.get(id) || null;
}
function allSects() {
  return SECTS;
}
// Bị động của phái (object skill, có .id).
function passiveOf(sectId) {
  return skills.passiveForSect(sectId);
}

module.exports = { SECTS, JOIN_REALM, getSect, allSects, passiveOf };
