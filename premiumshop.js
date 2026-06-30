// =====================================================================
//  PHƯỜNG THỊ CAO CẤP — catalog vật phẩm mua bằng 🔮 TIÊN NGỌC (tiền khó cày).
//  THUẦN dữ liệu (catalog + giá). Logic mua/áp dụng nằm ở commands/shop.js.
//  cat:
//   'gender'  — 🎟️ Vé Đổi Giới Tính (cộng 1 vé vào gender_tickets)
//   'chest'   — rương trang bị: roll 1 món ĐẢM BẢO độ hiếm `rarity`, kèm tứ tính đúng phái
//   'refine'  — túi Tinh Thiết số lượng lớn (qty)
//   'pill'    — đan dược hiếm theo bó (pillId × qty)
//   'title'   — danh hiệu (titleId) — cosmetic, mua 1 lần
// =====================================================================
const PREMIUM = [
  // --- Đặc biệt ---
  { id: 'gender_ticket', cat: 'gender', emoji: '🎟️', name: 'Vé Đổi Giới Tính', price: 5,
    desc: 'Đổi giới tính nhân vật 1 lần (giới tính vốn cố định khi nhập đạo). Dùng ngay trong Phường Thị Cao Cấp.' },

  // --- Rương trang bị cao cấp (đảm bảo độ hiếm) ---
  { id: 'chest_tien', cat: 'chest', emoji: '🟣', name: 'Rương Tiên Khí', price: 12, rarity: 'tien',
    desc: 'Mở ra 1 trang bị ĐẢM BẢO độ hiếm ≥ Tiên Khí 🟣, mang tứ tính ĐÚNG phái của bạn.' },
  { id: 'chest_than', cat: 'chest', emoji: '🟡', name: 'Rương Thần Khí', price: 30, rarity: 'than',
    desc: 'Mở ra 1 trang bị độ hiếm Thần Khí 🟡 — đỉnh cao, mang tứ tính ĐÚNG phái của bạn.' },

  // --- Tinh Thiết & đan dược hiếm ---
  { id: 'bulk_refine', cat: 'refine', emoji: '🔩', name: 'Túi Tinh Thiết (×50)', price: 6, qty: 50,
    desc: '50 🔩 Tinh Thiết để cường hóa trang bị — đỡ phải cày phân giải.' },
  { id: 'bundle_taohoa', cat: 'pill', pillId: 'tao_hoa_dan', emoji: '💊', name: 'Tạo Hóa Đan (×5)', price: 10, qty: 5,
    desc: '5 viên Tạo Hóa Đan — hộ đạo độ kiếp cấp cao (không bán ở Phường Thị thường).' },
  { id: 'bundle_boinguyen', cat: 'pill', pillId: 'boi_nguyen_dan', emoji: '💊', name: 'Bồi Nguyên Đan (×10)', price: 8, qty: 10,
    desc: '10 viên Bồi Nguyên Đan — bổ sung tu vi lớn tức thì.' },

  // --- Phù Rèn (buff Lò Rèn) — tiêu hao, mua theo bó ---
  { id: 'charm_hokhi', cat: 'charm', charmId: 'ho_khi', emoji: '🧧', name: 'Hộ Khí Phù (×3)', price: 5, qty: 3,
    desc: 'Khi RÈN thất bại sẽ KHÔNG bị tụt cấp/tụt bậc (vẫn mất tài nguyên). Chỉ tốn khi thực sự cứu.' },
  { id: 'charm_thienmenh', cat: 'charm', charmId: 'thien_menh', emoji: '📜', name: 'Thiên Mệnh Phù (×3)', price: 6, qty: 3,
    desc: 'Mỗi viên +15% tỉ lệ thành công cho 1 lần rèn (cường hóa / nâng bậc / chế tạo).' },

  // --- Danh hiệu (cosmetic, mua 1 lần) ---
  { id: 'title_kiem_khach', cat: 'title', titleId: 'kiem_khach', emoji: '⚔️', name: 'Danh hiệu: Nhất Kiếm Khách', price: 15,
    desc: 'Danh hiệu thể hiện trên Hồ Sơ. Một kiếm trong tay, thiên hạ ai địch.' },
  { id: 'title_dan_vuong', cat: 'title', titleId: 'dan_vuong', emoji: '💊', name: 'Danh hiệu: Đan Đạo Chân Quân', price: 15,
    desc: 'Danh hiệu thể hiện trên Hồ Sơ. Lô hỏa thuần thanh, vạn đan quy tâm.' },
  { id: 'title_chien_than', cat: 'title', titleId: 'chien_than', emoji: '🔥', name: 'Danh hiệu: Bách Chiến Chiến Thần', price: 25,
    desc: 'Danh hiệu thể hiện trên Hồ Sơ. Trăm trận trăm thắng, sát khí ngút trời.' },
  { id: 'title_tien_ton', cat: 'title', titleId: 'tien_ton', emoji: '👑', name: 'Danh hiệu: Cửu Thiên Tiên Tôn', price: 60,
    desc: 'Danh hiệu tối thượng. Đứng trên vạn vật, uy chấn cửu thiên.' },
];

function get(id) { return PREMIUM.find((p) => p.id === id) || null; }

module.exports = { PREMIUM, get };
