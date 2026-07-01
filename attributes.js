// =====================================================================
//  THUỘC TÍNH GỐC (thuần — dữ liệu + công thức quy ra chỉ số combat)
//  Người chơi cộng điểm thuộc tính mỗi khi lên bậc (đột phá). Mỗi điểm
//  cộng PHẲNG vào chỉ số combat (cộng SAU bias/mods của phái nên không bị
//  khuếch đại) → tùy biến build, nhưng bậc tu luyện vẫn là nguồn sức mạnh
//  chính. Secondary (né/bạo kích) có TRẦN để không phá ngưỡng cân bằng.
//
//  combatBonus(attrs) là nguồn sự thật DUY NHẤT — combat.build() gọi nó.
//  Khi attrs rỗng → mọi bonus = 0 → build ra y hệt khi chưa có hệ này.
// =====================================================================

const ATTRIBUTES = {
  can_cot:   { name: 'Căn Cốt',  emoji: '🪨', short: 'Sinh Lực',        desc: 'Nền tảng nhục thân — tăng Sinh Lực.' },
  linh_luc:  { name: 'Linh Lực', emoji: '🌟', short: 'Công + Linh Lực',  desc: 'Linh khí công kích — tăng Công & Linh Lực.' },
  the_phach: { name: 'Thể Phách',emoji: '🛡️', short: 'Phòng Ngự',        desc: 'Da thịt cường hãn — tăng Phòng Ngự.' },
  than_phap: { name: 'Thân Pháp',emoji: '🌀', short: 'Tốc + Né',         desc: 'Bộ pháp linh hoạt — tăng Tốc Độ & Né Tránh.' },
  ngo_tinh:  { name: 'Ngộ Tính', emoji: '🔮', short: 'Bạo Kích',         desc: 'Lĩnh ngộ thiên cơ — tăng Bạo Kích & ST bạo kích.' },
};

const ORDER = ['can_cot', 'linh_luc', 'the_phach', 'than_phap', 'ngo_tinh'];

// --- Hệ số mỗi điểm (cần gạt cân bằng) ---
//  Đã hiệu chỉnh bằng mô phỏng: full-dump-vs-0-điểm (chéo phái) ≈ 60-63%
//  → cộng điểm có cảm giác đáng kể nhưng KHÔNG áp đảo; bậc tu luyện vẫn là
//  nguồn sức mạnh chính. (Lưu ý: combat tự nó đã lệch cân bằng ở bậc CAO —
//  vấn đề có sẵn, không phải do thuộc tính.)
const PER = {
  hpPerCanCot: 1.2,
  atkPerLinhLuc: 0.3,
  mpPerLinhLuc: 0.3,
  defPerThePhach: 0.3,
  spdPerThanPhap: 0.25,
  // GĐ24: nới TRẦN né/bạo (giữ nguyên hệ số/điểm) để dồn điểm không bị phí ở bậc cao.
  //  Trần chỉ "chạm" sau ~67-83 điểm (rất muộn) nên PvP Trúc Cơ/đầu game gần như không đổi.
  dodgePerThanPhap: 0.0012, dodgeCap: 0.08, // né mạnh (né trắng) -> nới dè dặt
  critPerNgoTinh: 0.0012,   critCap: 0.10,
  critDmgPerNgoTinh: 0.002,
};

function emptyAttrs() {
  return { can_cot: 0, linh_luc: 0, the_phach: 0, than_phap: 0, ngo_tinh: 0 };
}
function getAttr(key) {
  return ATTRIBUTES[key] || null;
}
function isAttr(key) {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTES, key);
}

// Quy điểm thuộc tính -> cộng dồn chỉ số combat. attrs = { key: điểm }.
function combatBonus(attrs) {
  const a = attrs || {};
  const g = (k) => a[k] || 0;
  return {
    hp:  PER.hpPerCanCot * g('can_cot'),
    atk: PER.atkPerLinhLuc * g('linh_luc'),
    mp:  PER.mpPerLinhLuc * g('linh_luc'),
    def: PER.defPerThePhach * g('the_phach'),
    spd: PER.spdPerThanPhap * g('than_phap'),
    dodge:   Math.min(PER.dodgeCap, PER.dodgePerThanPhap * g('than_phap')),
    crit:    Math.min(PER.critCap, PER.critPerNgoTinh * g('ngo_tinh')),
    critDmg: PER.critDmgPerNgoTinh * g('ngo_tinh'),
  };
}

module.exports = { ATTRIBUTES, ORDER, PER, emptyAttrs, getAttr, isAttr, combatBonus };
