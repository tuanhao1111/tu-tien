// =====================================================================
//  SHOP CARD — PHƯỜNG THỊ dạng ẢNH ĐỘNG (Satori): kệ vật phẩm kiểu RPG.
//    [TIÊU ĐỀ + túi tiền]  ·  [LƯỚI Ô VẬT PHẨM: tile màu · tên · mô tả · giá]
//  Nhận DATA THUẦN -> Buffer PNG. commands/shop.js gom data rồi gọi.
//  RÀNG BUỘC SATORI: chỉ flexbox; node >1 con phải display:flex; px cố định.
//  LƯU Ý: pipeline (Satori + resvg + font BVP) KHÔNG render được emoji màu ->
//  icon dùng TILE GRADIENT theo nhóm + chữ cái đầu; "đồng xu" vẽ bằng div tròn.
// =====================================================================
const { h, toPng } = require('../util/card');
const assets = require('../assets');

const W = 1000;
const GOLD = 'rgba(212,175,55,0.55)';
const GOLD_SOFT = 'rgba(212,175,55,0.3)';
const PANEL = 'rgba(10,16,28,0.66)';
const BOX = 'rgba(8,12,20,0.62)';
const VAL = '#ffe6a3';

// Màu theo nhóm vật phẩm (viền trái + tile icon). Gồm cả nhóm SHOP XỊN.
const CAT = {
  mat:    { edge: '#6fcf97', g1: '#1f6b46', g2: '#0e3322' },
  refine: { edge: '#9aa4ad', g1: '#4a525c', g2: '#262b31' },
  pill:   { edge: '#bb6bd9', g1: '#6b3a86', g2: '#331842' },
  // --- Phường Thị Cao Cấp ---
  gender: { edge: '#ff7675', g1: '#7a2e2e', g2: '#3a1414' },
  chest:  { edge: '#ffd86b', g1: '#7a5f17', g2: '#3a2e0a' },
  charm:  { edge: '#e17055', g1: '#7a3a2e', g2: '#3a1a14' },
  title:  { edge: '#ffd86b', g1: '#6b5417', g2: '#332a0a' },
};

const COLS = 3;
const SLOT_W = 296, SLOT_H = 150, GAP = 14;

// Đồng tiền vẽ bằng div: 'gold' = linh thạch (vàng), 'gem' = Tiên Ngọc (tím).
function coin(size, type) {
  const grad = type === 'gem' ? 'linear-gradient(135deg,#e6b3ff,#9b59b6)' : 'linear-gradient(135deg,#ffe9a8,#caa23a)';
  const bd = type === 'gem' ? '#6b2d8a' : '#7a5f17';
  return h('div', { style: {
    display: 'flex', width: `${size}px`, height: `${size}px`, borderRadius: `${size / 2}px`,
    backgroundImage: grad, border: `1px solid ${bd}`,
  } });
}

// 1 ô vật phẩm trên kệ: ICON (ảnh vật phẩm nếu có, thiếu -> tile màu + chữ cái đầu)
//  + tên + mô tả ngắn + giá (đồng xu).
function iconBox(it, c) {
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '64px', height: '64px', marginRight: '12px', flexShrink: 0,
    border: `1px solid ${c.edge}`, borderRadius: '12px',
  };
  // Có ảnh vật phẩm -> dùng ảnh (object form, đã là data URI).
  if (it.iconDataUri) {
    return h('div', { style: { ...base, overflow: 'hidden' } },
      h('img', { src: it.iconDataUri, width: 64, height: 64, style: { objectFit: 'cover', borderRadius: '11px' } }));
  }
  // Thiếu ảnh -> tile gradient nhóm + chữ cái đầu (fallback).
  const initial = (it.name || '?').trim().charAt(0).toUpperCase();
  return h('div', { style: { ...base, backgroundImage: `linear-gradient(135deg, ${c.g1}, ${c.g2})`, fontSize: '30px', fontWeight: 700, color: '#ffffff' } }, initial);
}

function slot(it, coinType) {
  const c = CAT[it.cat] || { edge: GOLD_SOFT, g1: '#3a4456', g2: '#222a38' };
  return h('div', { style: {
      display: 'flex', flexDirection: 'row', width: `${SLOT_W}px`, height: `${SLOT_H}px`,
      margin: `${GAP / 2}px`, backgroundColor: BOX, border: `1px solid ${GOLD_SOFT}`,
      borderLeft: `4px solid ${c.edge}`, borderRadius: '12px', padding: '12px',
    } },
    iconBox(it, c),
    // Cột chữ: tên · mô tả · giá
    h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' } },
      h('div', { style: { display: 'flex', fontSize: '17px', fontWeight: 700, color: '#ffffff' } }, it.name),
      it.desc ? h('div', { style: { display: 'flex', fontSize: '12px', color: '#aab3c5', marginTop: '3px', maxHeight: '46px', overflow: 'hidden' } }, it.desc) : null,
      h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: '8px' } },
        coin(15, coinType),
        h('div', { style: { display: 'flex', fontSize: '16px', fontWeight: 700, color: VAL, marginLeft: '6px' } }, String(it.price)),
      ),
    ),
  );
}

function markupAndH(d) {
  const items = d.items || [];
  const rows = Math.max(1, Math.ceil(items.length / COLS));
  const H = 96 + rows * (SLOT_H + GAP) + 28;
  const rootStyle = {
    display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
    fontFamily: 'BVP', padding: '24px 30px', alignItems: 'center',
  };
  if (d.bgDataUri) { rootStyle.backgroundImage = `url(${d.bgDataUri})`; rootStyle.backgroundSize = `${W}px ${H}px`; }
  else rootStyle.backgroundImage = 'linear-gradient(135deg,#241a10,#13100a)';

  const tree = h('div', { style: rootStyle },
    // Tiêu đề + túi tiền (đồng xu vẽ thay emoji)
    h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: `${W - 60}px`, marginBottom: '14px' } },
      h('div', { style: { display: 'flex', flexDirection: 'column' } },
        h('div', { style: { display: 'flex', fontSize: '32px', fontWeight: 700, color: '#ffd86b', letterSpacing: '3px' } }, d.title || 'PHƯỜNG THỊ'),
        d.subtitle ? h('div', { style: { display: 'flex', fontSize: '14px', color: '#c4ccdb', marginTop: '2px' } }, d.subtitle) : null,
      ),
      h('div', { style: {
          display: 'flex', flexDirection: 'row', alignItems: 'center', backgroundColor: PANEL, border: `1px solid ${GOLD}`,
          borderRadius: '12px', padding: '8px 16px',
        } }, coin(18, d.coin), h('div', { style: { display: 'flex', fontSize: '18px', fontWeight: 700, color: VAL, marginLeft: '8px' } }, d.walletText || '')),
    ),
    // Lưới ô vật phẩm (kệ)
    h('div', { style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: `${W - 40}px` } },
      ...items.map((it) => slot(it, d.coin)),
    ),
  );
  return { tree, H };
}

async function render(d) {
  const { tree, H } = markupAndH(d);
  return toPng(tree, { width: W, height: H });
}

module.exports = { render, W };
module.exports.bgDataUri = () => assets.dataUri('panel_shopCard') || assets.dataUri('panel_shop');
