// =====================================================================
//  SHOP — PHƯỜNG THỊ (thuần — catalog + giá). Bán VẬT PHẨM TIÊU HAO:
//  nguyên liệu Bí Cảnh · 🔩 Tinh Thiết (cường hóa) · đan dược cơ bản.
//  KHÔNG bán trang bị (trang bị chỉ từ rớt/boss). Giá nhân config.shop.priceMult.
// =====================================================================
const config = require('./config');

// cat: 'mat' (nguyên liệu) · 'refine' (Tinh Thiết) · 'pill' (đan dược).
const STOCK = [
  { id: 'linh_chung',    cat: 'mat',    price: 8 },   // 🌰 hạt giống Linh Điền
  { id: 'linh_thao',     cat: 'mat',    price: 12 },
  { id: 'yeu_dan',       cat: 'mat',    price: 35 },
  { id: 'huyet_tinh',    cat: 'mat',    price: 55 },
  { id: 'long_can',      cat: 'mat',    price: 140 },
  { id: 'hu_tinh',       cat: 'mat',    price: 300 },
  { id: 'co_phach',      cat: 'mat',    price: 480 },
  { id: 'yeu_thu_luong', cat: 'mat',    price: 45 },  // 🍖 thức ăn Ngự Thú
  { id: 'refine',        cat: 'refine', price: 50 },
  { id: 'tu_khi_dan',    cat: 'pill',   price: 70 },
  { id: 'boi_nguyen_dan', cat: 'pill',  price: 150 },
  { id: 'ho_dao_dan',    cat: 'pill',   price: 130 },
];

function priceOf(item) {
  const m = (config.shop && config.shop.priceMult) || 1;
  return Math.max(1, Math.round((item.price || 0) * m));
}
function get(id) { return STOCK.find((s) => s.id === id) || null; }

module.exports = { STOCK, priceOf, get };
