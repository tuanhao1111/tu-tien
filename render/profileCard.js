// =====================================================================
//  PROFILE CARD — thẻ HỒ SƠ + TRANG BỊ dạng ẢNH ĐỘNG (Satori), 3 cột:
//    [TRÁI] avatar · tên · title · tài phú
//    [GIỮA] 6 ô trang bị (3 trái + 3 phải) ôm lấy ẢNH NHÂN VẬT toàn thân
//    [PHẢI] bảng THUỘC TÍNH (2 cột: chỉ số chiến đấu | thuộc tính cộng điểm)
//
//  Nhận DATA THUẦN (không đụng db) -> Buffer PNG. hoso.js gom data rồi gọi.
//  RÀNG BUỘC SATORI: chỉ flexbox; node >1 con phải display:flex; ảnh = data URI
//  (object form qua h(), KHÔNG HTML string — xem util/card.js). px cố định.
// =====================================================================
const { h, toPng } = require('../util/card');
const assets = require('../assets');

const W = 1000, H = 580;
const GOLD = 'rgba(212,175,55,0.55)';
const GOLD_SOFT = 'rgba(212,175,55,0.3)';
const PANEL = 'rgba(10,16,28,0.55)';
const BOX = 'rgba(8,12,20,0.5)';
const VAL = '#ffe6a3'; // màu giá trị chỉ số (vàng nhạt cho nổi bật, dễ đọc)

// '#rrggbb' + alpha -> 'rgba(r,g,b,a)' (cho nền tint theo độ hiếm).
function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(120,120,120,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- Ô TRANG BỊ: icon món (viền theo ĐỘ HIẾM) + badge BẬC CƯỜNG HÓA (+N) góc dưới.
//  filled = có món đang mặc (kể cả khi THIẾU ảnh art -> vẫn tô viền hiếm + emoji ô rõ). ---
function slotBox(slot) {
  const equipped = !!slot.filled;
  const rc = slot.rarityColor || '#b2bec3';
  const inner = slot.icon
    ? h('img', { src: slot.icon, width: 58, height: 58, style: { borderRadius: '9px' } })
    : h('div', { style: { display: 'flex', fontSize: '26px', opacity: equipped ? 0.85 : 0.3 } }, slot.emoji);
  const children = [inner];
  // Badge "+N" cường hóa (nền màu theo độ hiếm) — chỉ khi đã cường hóa.
  if (equipped && slot.enhance > 0) {
    children.push(h('div', { style: {
        display: 'flex', position: 'absolute', bottom: '-6px', right: '-6px',
        paddingLeft: '5px', paddingRight: '5px', height: '20px',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: 700, color: '#1a1205',
        backgroundColor: rc, border: '1px solid rgba(0,0,0,0.4)', borderRadius: '10px',
      } }, `+${slot.enhance}`));
  }
  return h('div', { style: {
      display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center',
      width: '72px', height: '72px', margin: '8px 0',
      backgroundColor: equipped ? hexToRgba(rc, 0.18) : BOX,
      border: `${equipped ? 3 : 2}px solid ${equipped ? rc : GOLD_SOFT}`,
      borderRadius: '14px',
    } }, ...children);
}

function slotColumn(slots) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
    ...slots.map(slotBox));
}

// --- 1 DÒNG chỉ số trong bảng thuộc tính (icon + nhãn trái, giá trị phải) ---
function statRow(icon, label, value, valueColor) {
  return h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '30px' } },
    h('div', { style: { display: 'flex', fontSize: '15px', color: '#cbd3e1' } }, `${icon} ${label}`),
    h('div', { style: { display: 'flex', fontSize: '15px', fontWeight: 700, color: valueColor || VAL } }, String(value)),
  );
}

// --- Cột con của bảng thuộc tính (header nhóm + list statRow) ---
function statSubCol(title, rows) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', width: '144px' } },
    h('div', { style: { display: 'flex', fontSize: '13px', fontWeight: 700, color: '#8fa0bf', marginBottom: '4px', letterSpacing: '1px' } }, title),
    ...rows.map((r) => statRow(r.icon, r.label, r.value, r.color)));
}

// --- DẢI CHIÊU THỨC: nội công (viền vàng) + chiêu chủ động đang trang bị (viền vàng mờ) ---
function skillStrip(skills) {
  if (!skills || !skills.length) return null;
  const box = (s) => h('div', { style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '42px', height: '42px', margin: '3px',
      backgroundColor: s.passive ? hexToRgba('#d4af37', 0.16) : BOX,
      border: `2px solid ${s.passive ? GOLD : GOLD_SOFT}`, borderRadius: '10px',
    } }, s.icon
      ? h('img', { src: s.icon, width: 36, height: 36, style: { borderRadius: '7px' } })
      : h('div', { style: { display: 'flex', fontSize: '20px' } }, s.emoji));
  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '178px', marginTop: '14px' } },
    h('div', { style: { display: 'flex', fontSize: '13px', fontWeight: 700, color: '#8fa0bf', letterSpacing: '1px', marginBottom: '4px' } }, '🎴 CHIÊU THỨC'),
    h('div', { style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' } }, ...skills.map(box)),
  );
}

// --- CỘT TRÁI: avatar tròn + tên + title + tài phú ---
function leftCol(d) {
  const avatar = d.avatarDataUri
    ? h('img', { src: d.avatarDataUri, width: 92, height: 92, style: { borderRadius: '46px', border: '3px solid rgba(212,175,55,0.85)' } })
    : h('div', { style: { display: 'flex', width: '92px', height: '92px', borderRadius: '46px', border: '3px solid rgba(212,175,55,0.85)', backgroundColor: BOX } });
  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '210px', backgroundColor: PANEL, border: `1px solid ${GOLD_SOFT}`, borderRadius: '16px', padding: '18px 14px' } },
    avatar,
    h('div', { style: { display: 'flex', fontSize: '22px', fontWeight: 700, color: '#ffffff', marginTop: '12px', textAlign: 'center' } }, d.name),
    d.title && h('div', { style: { display: 'flex', fontSize: '14px', color: '#ffd86b', marginTop: '4px', textAlign: 'center' } }, d.title),
    // Danh hiệu đang đeo: badge nổi (viền vàng mờ) ngay dưới cảnh giới.
    d.titleBadge && h('div', { style: {
        display: 'flex', maxWidth: '186px', marginTop: '6px', padding: '3px 10px',
        backgroundColor: 'rgba(212,175,55,0.16)', border: `1px solid ${GOLD}`, borderRadius: '10px',
        fontSize: '13px', fontWeight: 700, color: '#ffe6a3', textAlign: 'center',
      } }, d.titleBadge),
    h('div', { style: { display: 'flex', width: '170px', height: '1px', backgroundColor: GOLD_SOFT, margin: '14px 0' } }),
    h('div', { style: { display: 'flex', fontSize: '14px', color: '#cfd6e4' } }, '💎 Tài Phú'),
    h('div', { style: { display: 'flex', fontSize: '20px', fontWeight: 700, color: '#ffd86b', marginTop: '2px' } }, `${d.stones}${d.currencyShort}`),
    h('div', { style: { display: 'flex', flexDirection: 'column', width: '174px', marginTop: '14px' } },
      d.subInfo && d.subInfo.length
        ? h('div', { style: { display: 'flex', flexDirection: 'column' } }, ...d.subInfo.map((s) =>
            h('div', { style: { display: 'flex', fontSize: '13px', color: '#aab3c5', marginTop: '3px' } }, s)))
        : null,
    ),
    skillStrip(d.skills),
  );
}

// --- KHUNG NHÂN VẬT: panel tối CÙNG KIỂU 2 cột bên + ảnh feather mép trên/dưới
//  tan vào panel (như "hiện ra từ sương") + quầng sáng mờ phía sau -> hòa hợp. ---
const CW = 252, CH = 462;
const FADE = 'rgba(10,16,28,'; // = PANEL base color, để feather ảnh tan đúng vào panel
function characterFrame(d) {
  const frameStyle = {
    display: 'flex', position: 'relative', width: `${CW}px`, height: `${CH}px`,
    backgroundColor: PANEL, border: `1px solid ${GOLD_SOFT}`, borderRadius: '16px', overflow: 'hidden',
  };
  if (!d.charDataUri) {
    return h('div', { style: { ...frameStyle, alignItems: 'center', justifyContent: 'center', padding: '0 18px' } },
      h('div', { style: { display: 'flex', fontSize: '15px', color: '#7e879b', textAlign: 'center' } }, '(chưa có ảnh nhân vật — xem CHAR_PROMPTS.md)'));
  }
  const abs = (extra) => ({ display: 'flex', position: 'absolute', left: 0, ...extra });
  return h('div', { style: frameStyle },
    // 1) quầng sáng mờ phía sau cho chiều sâu (huyền ảo, tông lạnh nhẹ)
    h('div', { style: abs({ top: 0, width: `${CW}px`, height: `${CH}px`, backgroundImage: 'radial-gradient(ellipse at 50% 42%, rgba(150,200,255,0.20), rgba(10,16,28,0) 68%)' }) }),
    // 2) ảnh nhân vật (lấp đầy khung, giữ tỉ lệ)
    h('img', { src: d.charDataUri, width: CW, height: CH, style: abs({ top: 0, objectFit: 'cover' }) }),
    // 3) feather mép TRÊN -> tan vào panel (đầu nhân vật ẩn dần trong sương)
    h('div', { style: abs({ top: 0, width: `${CW}px`, height: '90px', backgroundImage: `linear-gradient(to bottom, ${FADE}0.95), ${FADE}0))` }) }),
    // 4) feather mép DƯỚI -> tan vào panel (chân ẩn vào khung)
    h('div', { style: abs({ bottom: 0, width: `${CW}px`, height: '130px', backgroundImage: `linear-gradient(to top, ${FADE}0.95), ${FADE}0))` }) }),
  );
}

// --- CỘT GIỮA: slot trái · khung nhân vật · slot phải ---
function centerCol(d) {
  return h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1 } },
    slotColumn(d.slots.slice(0, 3)),
    h('div', { style: { display: 'flex', margin: '0 8px' } }, characterFrame(d)),
    slotColumn(d.slots.slice(3, 6)),
  );
}

// --- CỘT PHẢI: bảng THUỘC TÍNH (2 cột con) ---
function rightCol(d) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', width: '330px', backgroundColor: PANEL, border: `1px solid ${GOLD_SOFT}`, borderRadius: '16px', padding: '16px' } },
    h('div', { style: { display: 'flex', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#ffd86b', marginBottom: '6px' } }, '✦ THUỘC TÍNH ✦'),
    h('div', { style: { display: 'flex', width: '298px', height: '1px', backgroundColor: GOLD_SOFT, marginBottom: '10px' } }),
    h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' } },
      statSubCol('⚔ CHIẾN ĐẤU', d.statCols[0]),
      h('div', { style: { display: 'flex', width: '1px', backgroundColor: GOLD_SOFT } }),
      statSubCol('🌱 TIÊN THIÊN', d.statCols[1]),
    ),
  );
}

function markup(d) {
  const rootStyle = {
    display: 'flex', flexDirection: 'row', width: `${W}px`, height: `${H}px`,
    fontFamily: 'BVP', padding: '22px', alignItems: 'stretch',
  };
  if (d.bgDataUri) { rootStyle.backgroundImage = `url(${d.bgDataUri})`; rootStyle.backgroundSize = `${W}px ${H}px`; }
  else rootStyle.backgroundImage = 'linear-gradient(135deg,#1b2436,#0d1320)';

  return h('div', { style: rootStyle },
    leftCol(d),
    centerCol(d),
    rightCol(d),
  );
}

async function render(d) {
  return toPng(markup(d), { width: W, height: H });
}

module.exports = { render, markup, W, H };
// Nền thẻ Hồ Sơ: ưu tiên ảnh RIÊNG kiểu "bảng nhân vật RPG" (panel_hoSoCard) nếu có,
//  rồi mới tới armory (panel_trangBi) / slip hồ sơ (panel_hoSo). Thiếu hết -> gradient.
module.exports.bgDataUri = () => assets.dataUri('panel_hoSoCard') || assets.dataUri('panel_trangBi') || assets.dataUri('panel_hoSo');
// Ảnh nhân vật: ưu tiên biến thể theo bậc giáp (char_<realm>_<gender>_<rarity>), thiếu thì bản gốc.
module.exports.charDataUri = (realm, gender, armorTier) => {
  const g = gender === 'nu' ? 'nu' : 'nam';
  return (armorTier && assets.dataUri(`char_${realm}_${g}_${armorTier}`)) || assets.dataUri(`char_${realm}_${g}`);
};
