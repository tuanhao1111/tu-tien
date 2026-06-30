// =====================================================================
//  KHO SKILL MÔN PHÁI (thuần — chỉ dữ liệu + helper)
//  Mỗi skill là 1 chiêu thức combat (dùng trong PvE/PvP/đấu tập).
//
//  kind: 'passive' (tự áp dụng) | 'active' (trang bị, tối đa 3, dùng trong trận).
//
//  --- ACTIVE: các trường engine combat đọc (đều TÙY CHỌN, có cái nào xử cái đó) ---
//    mp        : tiêu hao linh lực.
//    cd        : hồi chiêu (số lượt).
//    power     : hệ số sát thương trên Công (0 = không gây sát thương trực tiếp).
//    hits      : số đòn (mặc định 1) — mỗi đòn tính bạo kích riêng.
//    ignoreDef : bỏ qua % Phòng của địch (0..1).
//    bonusCrit : cộng thêm % bạo kích cho riêng đòn này.
//    lifesteal : hút máu thêm theo % sát thương (cộng dồn với bị động).
//    selfHpCost: tự mất % máu tối đa (chiêu hiến tế).
//    dot       : { mult, turns } gây sát thương theo thời gian (thiêu/độc).
//    heal      : hồi % máu tối đa cho bản thân.
//    shield    : tạo khiên = % máu tối đa.
//    buff      : { stat:'atk'|'def'|'spd', mult, turns } tăng chỉ số bản thân.
//    debuff    : { stat, mult, turns } giảm chỉ số địch.
//    unlockRealm: cảnh giới tối thiểu để MỞ KHÓA chiêu (mặc định 2 = mở lúc
//                 gia nhập phái). Tuyệt chiêu = 4 (Nguyên Anh).
//
//  --- PASSIVE: mods engine đọc lúc dựng combatant ---
//    critChance, critDmg, dodge, dmgReduce, reflectPct, lifestealPct,
//    regen (hồi % máu/lượt), dotBonus (tăng % sát thương DoT),
//    hpMult, atkMult, defMult, spdMult.
// =====================================================================

const SKILLS = {
  // ====================== ⚔️ KIẾM TÔNG — bạo kích, bùng nổ ======================
  kt_kiemtam:   { sect: 'kiem_tong', kind: 'passive', name: 'Kiếm Tâm Thông Minh', emoji: '🗡️', mods: { critChance: 0.15, critDmg: 0.25 }, desc: '+15% bạo kích, +25% sát thương bạo kích.' },
  kt_tramphong: { sect: 'kiem_tong', kind: 'active', name: 'Trảm Phong Kiếm', emoji: '🌀', mp: 20, cd: 0, power: 1.6, desc: 'Một kiếm mạnh, hồi chiêu tức thì.' },
  kt_lienhoan:  { sect: 'kiem_tong', kind: 'active', name: 'Liên Hoàn Kiếm', emoji: '⚡', mp: 35, cd: 2, power: 0.7, hits: 3, desc: '3 đòn liên tiếp, mỗi đòn tính bạo kích riêng.' },
  kt_kiemkhi:   { sect: 'kiem_tong', kind: 'active', name: 'Kiếm Khí Trảm', emoji: '💥', mp: 45, cd: 3, power: 2.6, bonusCrit: 0.20, desc: 'Sát thương lớn, +20% bạo kích.' },
  kt_phathan:   { sect: 'kiem_tong', kind: 'active', name: 'Phá Thần Nhất Kiếm', emoji: '🌟', mp: 70, cd: 4, power: 3.4, ignoreDef: 0.5, unlockRealm: 4, desc: 'Tuyệt kỹ: sát thương cực lớn, bỏ qua 50% Phòng.' },

  // ====================== 🔥 HUYỀN HỎA MÔN — thiêu đốt theo thời gian ======================
  hh_hoaphach: { sect: 'huyen_hoa', kind: 'passive', name: 'Hỏa Phách', emoji: '🔥', mods: { dotBonus: 0.15, critChance: 0.05 }, desc: '+15% sát thương thiêu đốt, +5% bạo kích.' }, // GĐ19: dotBonus 0.30→0.15 (huyen áp đảo mọi bậc)
  hh_hoacau:   { sect: 'huyen_hoa', kind: 'active', name: 'Hỏa Cầu Thuật', emoji: '☄️', mp: 25, cd: 1, power: 1.3, dot: { mult: 0.30, turns: 2 }, desc: 'Cầu lửa + thiêu đốt nhẹ 2 lượt.' },
  hh_liemdiem: { sect: 'huyen_hoa', kind: 'active', name: 'Liệm Diễm Chú', emoji: '🕯️', mp: 40, cd: 2, power: 0.9, dot: { mult: 0.40, turns: 3 }, desc: 'Sát thương nhỏ nhưng thiêu đốt mạnh 3 lượt.' }, // GĐ19: dot 0.45→0.40
  hh_phunhoa:  { sect: 'huyen_hoa', kind: 'active', name: 'Phần Thiên Hỏa', emoji: '🌋', mp: 55, cd: 3, power: 2.2, dot: { mult: 0.36, turns: 2 }, desc: 'Nổ lửa lớn + thiêu đốt.' }, // GĐ19: dot 0.40→0.36
  hh_hoanguc:  { sect: 'huyen_hoa', kind: 'active', name: 'Hỏa Ngục Quyết', emoji: '👹', mp: 75, cd: 4, power: 1.9, dot: { mult: 0.74, turns: 3 }, unlockRealm: 4, desc: 'Tuyệt kỹ: thiêu đốt cực mạnh 3 lượt.' }, // GĐ19: dot 1.10→0.74 (tuyệt kỹ huyen 80%→~52%)

  // ====================== 💊 ĐAN ĐỈNH LÂU — hồi máu, độc, trường kỳ ======================
  dd_duoclinh: { sect: 'dan_dinh', kind: 'passive', name: 'Dược Linh Thể', emoji: '🌿', mods: { regen: 0.03 }, desc: 'Hồi 3% máu tối đa mỗi lượt.' },
  dd_liemdoc:  { sect: 'dan_dinh', kind: 'active', name: 'Liệm Độc Chưởng', emoji: '☠️', mp: 25, cd: 1, power: 1.1, dot: { mult: 0.40, turns: 3 }, desc: 'Chưởng độc + trúng độc 3 lượt.' },
  dd_hoixuan:  { sect: 'dan_dinh', kind: 'active', name: 'Hồi Xuân Đan', emoji: '💚', mp: 35, cd: 2, heal: 0.25, desc: 'Hồi 25% máu tối đa.' },
  dd_donghoa:  { sect: 'dan_dinh', kind: 'active', name: 'Đỗng Hỏa Đan', emoji: '🍶', mp: 45, cd: 2, heal: 0.10, buff: { stat: 'atk', mult: 1.25, turns: 3 }, desc: 'Tăng 25% Công 3 lượt + hồi 10% máu.' },
  dd_kichdoc:  { sect: 'dan_dinh', kind: 'active', name: 'Kịch Độc Tán', emoji: '🧪', mp: 60, cd: 3, power: 0.78, dot: { mult: 0.38, turns: 4 }, debuff: { stat: 'def', mult: 0.92, turns: 3 }, unlockRealm: 4, desc: 'Tuyệt kỹ: kịch độc 4 lượt + giảm 8% Phòng địch.' }, // GĐ19: dot 0.50→0.38, debuff 0.86→0.92 (dan_dinh tuyệt 77%→~55%)

  // ====================== 👊 CƯƠNG THỂ MÔN — trâu bò, phản đòn ======================
  ct_kimcuong:  { sect: 'cuong_the', kind: 'passive', name: 'Kim Cương Bất Hoại', emoji: '🛡️', mods: { dmgReduce: 0.20, reflectPct: 0.18 }, desc: 'Giảm 20% sát thương nhận, phản 18% sát thương.' },
  ct_thietbosam:{ sect: 'cuong_the', kind: 'active', name: 'Thiết Bố Sam', emoji: '🧱', mp: 25, cd: 2, shield: 0.30, buff: { stat: 'def', mult: 1.30, turns: 2 }, desc: 'Khiên = 30% máu + tăng 30% Phòng 2 lượt.' },
  ct_bangson:   { sect: 'cuong_the', kind: 'active', name: 'Băng Sơn Kích', emoji: '⛰️', mp: 30, cd: 1, power: 1.4, desc: 'Một quyền nặng nề.' },
  ct_phanchan:  { sect: 'cuong_the', kind: 'active', name: 'Phản Chấn Quyền', emoji: '🔨', mp: 40, cd: 2, power: 1.5, buff: { stat: 'def', mult: 1.20, turns: 2 }, desc: 'Đấm + thủ thế tăng Phòng.' },
  ct_thaison:   { sect: 'cuong_the', kind: 'active', name: 'Thái Sơn Áp Đỉnh', emoji: '🏔️', mp: 65, cd: 3, power: 2.05, debuff: { stat: 'spd', mult: 0.70, turns: 2 }, unlockRealm: 4, desc: 'Tuyệt kỹ: sát thương lớn + giảm 30% Tốc địch.' }, // GĐ19: power 2.4→2.05 (cuong tuyệt 66→~58%)

  // ====================== 🩸 HUYẾT MA GIÁO — hút máu, suy yếu ======================
  hm_hapsinh:  { sect: 'huyet_ma', kind: 'passive', name: 'Hấp Tinh Đại Pháp', emoji: '🩸', mods: { lifestealPct: 0.13 }, desc: 'Mọi đòn đánh hút 13% sát thương thành máu.' }, // GĐ19: 0.18→0.13 (huyet_ma sustain mạnh nhất mọi bậc)
  hm_huyetdao: { sect: 'huyet_ma', kind: 'active', name: 'Huyết Đao Trảm', emoji: '🔪', mp: 25, cd: 0, power: 1.6, lifesteal: 0.16, desc: 'Chém + hút thêm 16% sát thương.' }, // GĐ19: lifesteal 0.20→0.16
  hm_nhiephon: { sect: 'huyet_ma', kind: 'active', name: 'Nhiếp Hồn Chú', emoji: '👁️', mp: 35, cd: 2, power: 0.9, debuff: { stat: 'atk', mult: 0.72, turns: 3 }, desc: 'Giảm 28% Công địch 3 lượt + đòn nhẹ.' },
  hm_huyette:  { sect: 'huyet_ma', kind: 'active', name: 'Huyết Tế', emoji: '🟥', mp: 45, cd: 3, power: 2.6, lifesteal: 0.28, desc: 'Sát thương lớn + hút thêm 28%.' }, // GĐ19: lifesteal 0.35→0.28
  hm_mahon:    { sect: 'huyet_ma', kind: 'active', name: 'Ma Hồn Phệ Tâm', emoji: '😈', mp: 70, cd: 4, power: 2.85, lifesteal: 0.30, selfHpCost: 0.03, unlockRealm: 4, desc: 'Tuyệt kỹ: sát thương cực lớn + hút máu mạnh, tự mất 3% máu.' }, // GĐ19: power 3.2→2.85, lifesteal 0.48→0.30 (huyet tuyệt 67→~64%)

  // ====================== 🌀 PHONG LINH TÔNG — tốc độ, né tránh, đa đòn ======================
  pl_phongthan: { sect: 'phong_linh', kind: 'passive', name: 'Phong Thần Bộ', emoji: '🌪️', mods: { dodge: 0.15, spdMult: 1.05 }, desc: '+15% né tránh, +5% Tốc.' },
  pl_phongnhan: { sect: 'phong_linh', kind: 'active', name: 'Phong Nhận', emoji: '🍃', mp: 20, cd: 0, power: 0.8, hits: 2, desc: '2 đòn gió sắc.' },
  pl_cuongphong:{ sect: 'phong_linh', kind: 'active', name: 'Cuồng Phong Trảm', emoji: '💨', mp: 35, cd: 2, power: 0.55, hits: 4, desc: '4 đòn liên hoàn.' },
  pl_phongton:  { sect: 'phong_linh', kind: 'active', name: 'Phong Tốn Thuật', emoji: '🌬️', mp: 30, cd: 2, power: 0.5, buff: { stat: 'spd', mult: 1.25, turns: 3 }, desc: 'Tăng 25% Tốc 3 lượt + đòn nhẹ.' },
  pl_vanphong:  { sect: 'phong_linh', kind: 'active', name: 'Vạn Phong Quy Tâm', emoji: '🌀', mp: 60, cd: 3, power: 0.62, hits: 5, bonusCrit: 0.10, unlockRealm: 4, desc: 'Tuyệt kỹ: 5 đòn, +10% bạo kích.' }, // GĐ19: power 0.56→0.62 (vanphong vốn là "bẫy" yếu hơn default ~40%)

  // =====================================================================
  //  CHIÊU MỞ RỘNG (mở theo CẢNH GIỚI: Kim Đan=3 · Nguyên Anh=4 · Hóa Thần=5 ·
  //  Luyện Hư=6). KHÔNG nằm trong defaultLoadout -> KHÔNG đổi cân bằng mặc định
  //  của mô phỏng GĐ19; là TÙY CHỌN build thêm khi lên cảnh giới (chọn tối đa 3).
  //  Ngân sách sức mạnh bám sát các chiêu cùng phái đã cân -> sidegrade, không
  //  áp đảo. Nếu lệch meta, tinh chỉnh số ở đây (hoặc config.skills.*).
  // =====================================================================

  // ⚔️ KIẾM TÔNG — thêm lựa chọn bạo kích/đa đòn
  kt_phithien:    { sect: 'kiem_tong', kind: 'active', name: 'Phi Thiên Ngự Kiếm', emoji: '🛩️', mp: 22, cd: 1, power: 1.5, bonusCrit: 0.10, unlockRealm: 3, desc: 'Lao kiếm tốc độ, +10% bạo kích.' },
  kt_kiemvu:      { sect: 'kiem_tong', kind: 'active', name: 'Kiếm Vũ Phiên Phi', emoji: '🍂', mp: 38, cd: 2, power: 0.65, hits: 4, unlockRealm: 4, desc: '4 đòn kiếm múa, mỗi đòn tính bạo riêng.' },
  kt_dietinh:     { sect: 'kiem_tong', kind: 'active', name: 'Diệt Tinh Kiếm Quyết', emoji: '🌠', mp: 55, cd: 3, power: 2.6, bonusCrit: 0.15, unlockRealm: 5, desc: 'Một kiếm diệt tinh, +15% bạo kích.' },
  kt_thuongkhung: { sect: 'kiem_tong', kind: 'active', name: 'Thương Khung Nhất Kiếm', emoji: '☄️', mp: 75, cd: 4, power: 3.1, ignoreDef: 0.35, bonusCrit: 0.20, unlockRealm: 6, desc: 'Đại kiếm phá thương khung, bỏ 35% Phòng, +20% bạo kích.' },

  // 🔥 HUYỀN HỎA MÔN — thêm thiêu đốt / hồi sinh hỏa
  hh_hoavu:       { sect: 'huyen_hoa', kind: 'active', name: 'Hỏa Vũ Thuật', emoji: '🎆', mp: 26, cd: 1, power: 1.2, dot: { mult: 0.32, turns: 2 }, unlockRealm: 3, desc: 'Mưa lửa + thiêu đốt nhẹ 2 lượt.' }, // tuned
  hh_diemthien:   { sect: 'huyen_hoa', kind: 'active', name: 'Diễm Thiên Phần', emoji: '🔥', mp: 40, cd: 2, power: 1.6, dot: { mult: 0.40, turns: 3 }, unlockRealm: 4, desc: 'Lửa trời thiêu đốt 3 lượt.' }, // tuned
  hh_luuhoa:      { sect: 'huyen_hoa', kind: 'active', name: 'Lưu Hỏa Liên Hoàn', emoji: '🧨', mp: 50, cd: 2, power: 0.75, hits: 3, dot: { mult: 0.24, turns: 2 }, unlockRealm: 5, desc: '3 đòn lửa + thiêu đốt nhẹ.' }, // tuned
  hh_phuonghoang: { sect: 'huyen_hoa', kind: 'active', name: 'Phượng Hoàng Niết Bàn', emoji: '🦅', mp: 72, cd: 4, power: 2.5, ignoreDef: 0.35, dot: { mult: 0.52, turns: 3 }, heal: 0.10, unlockRealm: 6, desc: 'Nổ lửa lớn bỏ 35% Phòng + thiêu đốt mạnh + hồi 10% máu (niết bàn).' }, // tuned: thêm ignoreDef làm đòn kết ổn định (DoT bị Phòng cản)

  // 💊 ĐAN ĐỈNH LÂU — thêm hộ thân / độc trường kỳ
  dd_thanhtam:    { sect: 'dan_dinh', kind: 'active', name: 'Thanh Tâm Đan', emoji: '🫧', mp: 28, cd: 2, heal: 0.18, shield: 0.12, unlockRealm: 3, desc: 'Hồi 18% máu + khiên 12% máu.' },
  dd_doclong:     { sect: 'dan_dinh', kind: 'active', name: 'Độc Long Tán', emoji: '🐍', mp: 42, cd: 2, power: 1.0, dot: { mult: 0.36, turns: 3 }, debuff: { stat: 'spd', mult: 0.85, turns: 2 }, unlockRealm: 4, desc: 'Đòn độc 3 lượt + giảm 15% Tốc địch.' }, // tuned
  dd_bachdoc:     { sect: 'dan_dinh', kind: 'active', name: 'Bách Độc Chân Kinh', emoji: '🧫', mp: 55, cd: 3, power: 0.7, dot: { mult: 0.30, turns: 4 }, debuff: { stat: 'atk', mult: 0.90, turns: 3 }, unlockRealm: 5, desc: 'Kịch độc 4 lượt + giảm 10% Công địch.' }, // tuned
  dd_truongsinh:  { sect: 'dan_dinh', kind: 'active', name: 'Trường Sinh Đại Pháp', emoji: '🧬', mp: 70, cd: 4, heal: 0.20, shield: 0.13, buff: { stat: 'def', mult: 1.18, turns: 3 }, unlockRealm: 6, desc: 'Hồi 20% máu + khiên 13% + tăng 18% Phòng 3 lượt.' }, // tuned: ghìm sustain (thắng ván dài quá mạnh)

  // 👊 CƯƠNG THỂ MÔN — thêm thủ/khống chế
  ct_thiethoa:    { sect: 'cuong_the', kind: 'active', name: 'Thiết Hóa Thân', emoji: '🪨', mp: 24, cd: 2, shield: 0.20, buff: { stat: 'def', mult: 1.25, turns: 2 }, unlockRealm: 3, desc: 'Khiên 20% máu + tăng 25% Phòng 2 lượt.' }, // tuned
  ct_locson:      { sect: 'cuong_the', kind: 'active', name: 'Lộc Sơn Áp Kích', emoji: '⛰️', mp: 42, cd: 2, power: 1.7, debuff: { stat: 'spd', mult: 0.80, turns: 2 }, unlockRealm: 4, desc: 'Quyền nặng + giảm 20% Tốc địch.' },
  ct_batdong:     { sect: 'cuong_the', kind: 'active', name: 'Bất Động Minh Vương', emoji: '🗿', mp: 55, cd: 3, shield: 0.25, buff: { stat: 'atk', mult: 1.15, turns: 2 }, unlockRealm: 5, desc: 'Khiên 25% máu + tăng 15% Công 2 lượt.' }, // tuned
  ct_hongmong:    { sect: 'cuong_the', kind: 'active', name: 'Hồng Mông Trấn Nhạc', emoji: '🏔️', mp: 72, cd: 4, power: 2.05, debuff: { stat: 'spd', mult: 0.70, turns: 2 }, unlockRealm: 6, desc: 'Đại kích + giảm 30% Tốc địch 2 lượt.' },

  // 🩸 HUYẾT MA GIÁO — thêm hút máu/đa đòn
  hm_huyetlinh:   { sect: 'huyet_ma', kind: 'active', name: 'Huyết Linh Trảo', emoji: '🦅', mp: 24, cd: 1, power: 1.5, lifesteal: 0.15, unlockRealm: 3, desc: 'Trảo huyết + hút 15% sát thương.' },
  hm_xichnguc:    { sect: 'huyet_ma', kind: 'active', name: 'Xích Ngục Huyết Trảm', emoji: '🩹', mp: 42, cd: 2, power: 1.0, hits: 2, lifesteal: 0.20, unlockRealm: 4, desc: '2 đòn + hút 20% sát thương.' }, // tuned
  hm_phelinh:     { sect: 'huyet_ma', kind: 'active', name: 'Phệ Linh Chú', emoji: '🫀', mp: 52, cd: 3, power: 2.5, lifesteal: 0.22, debuff: { stat: 'atk', mult: 0.85, turns: 2 }, unlockRealm: 5, desc: 'Sát thương lớn + hút 22% + giảm 15% Công địch.' }, // tuned
  hm_thienma:     { sect: 'huyet_ma', kind: 'active', name: 'Thiên Ma Giải Thể', emoji: '👺', mp: 72, cd: 4, power: 2.9, lifesteal: 0.28, selfHpCost: 0.04, unlockRealm: 6, desc: 'Sát thương cực lớn + hút 28%, tự mất 4% máu.' }, // tuned

  // 🌀 PHONG LINH TÔNG — thêm đa đòn/tốc
  pl_liemphong:   { sect: 'phong_linh', kind: 'active', name: 'Liêm Phong Nhận', emoji: '🌬️', mp: 22, cd: 1, power: 0.7, hits: 3, unlockRealm: 3, desc: '3 đòn gió liềm.' },
  pl_phongtieu:   { sect: 'phong_linh', kind: 'active', name: 'Phong Tiêu Thiên Vũ', emoji: '🪶', mp: 40, cd: 2, power: 0.54, hits: 5, unlockRealm: 4, desc: '5 đòn gió xoáy.' }, // tuned
  pl_tuyetphong:  { sect: 'phong_linh', kind: 'active', name: 'Tuyệt Phong Thân Pháp', emoji: '💫', mp: 48, cd: 3, power: 0.5, hits: 2, buff: { stat: 'spd', mult: 1.30, turns: 3 }, unlockRealm: 5, desc: '2 đòn + tăng 30% Tốc 3 lượt.' }, // tuned
  pl_caphong:     { sect: 'phong_linh', kind: 'active', name: 'Cuồng Phong Phệ Thiên', emoji: '🌀', mp: 70, cd: 4, power: 0.48, hits: 6, bonusCrit: 0.10, unlockRealm: 6, desc: '6 đòn liên hoàn, +10% bạo kích.' }, // tuned: ghìm phong (đa đòn + đòn thêm theo Tốc rất mạnh)
};

// --- Helper ---
function getSkill(id) {
  return SKILLS[id] || null;
}
function skillsForSect(sectId) {
  return Object.entries(SKILLS)
    .filter(([, s]) => s.sect === sectId)
    .map(([id, s]) => ({ id, ...s }));
}
function activesForSect(sectId) {
  return skillsForSect(sectId).filter((s) => s.kind === 'active');
}
// Cảnh giới tối thiểu để mở khóa 1 chiêu chủ động (mặc định 2 nếu không khai báo).
function unlockRealmOf(skill) {
  return skill && skill.unlockRealm != null ? skill.unlockRealm : 2;
}
// Chiêu "cơ bản" = không phải tuyệt kỹ (tuyệt kỹ có unlockRealm > 2, mở theo cảnh giới).
function isCoreActive(skill) {
  return skill && (skill.unlockRealm == null || skill.unlockRealm <= 2);
}
// Chiêu chủ động ĐÃ MỞ KHÓA của phái.
//  - Chiêu CƠ BẢN (3 cái, thứ tự = defaultLoadout): mở dần theo BẬC NHIỆM VỤ NHẬP
//    MÔN questStage (cái thứ k mở khi questStage >= k). questStage == null = thành
//    viên cũ / không theo chuỗi -> mở hết (tương thích ngược).
//  - TUYỆT KỸ: mở theo cảnh giới (unlockRealm, mặc định Nguyên Anh).
function unlockedActivesForSect(sectId, realm, questStage) {
  let coreIdx = 0;
  return activesForSect(sectId).filter((s) => {
    if (isCoreActive(s)) {
      const step = coreIdx++;
      return questStage == null || questStage >= step;
    }
    return (realm ?? 0) >= unlockRealmOf(s);
  });
}
function passiveForSect(sectId) {
  return skillsForSect(sectId).find((s) => s.kind === 'passive') || null;
}

module.exports = { SKILLS, getSkill, skillsForSect, activesForSect, unlockedActivesForSect, unlockRealmOf, passiveForSect };
