// =====================================================================
//  PET GACHA CARD — thẻ kết quả quay "Chiêu Hồn Đài" (Satori).
//  Khung thú viền theo BẬC + ảnh thú (pet_<key>) hoặc emoji + tên + badge bậc.
//  Nhận DATA THUẦN -> Buffer PNG. Lỗi render -> shop.js tự fallback embed.
// =====================================================================
const { h, toPng } = require('../util/card');

const W = 620, H = 440;
function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(150,150,150,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function markup(d) {
  const col = d.tierColor || '#b2bec3';
  return h('div', { style: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: `${W}px`, height: `${H}px`, fontFamily: 'BVP',
      backgroundImage: `radial-gradient(ellipse at 50% 38%, ${hexToRgba(col, 0.30)}, rgba(8,12,20,0.96) 72%)`,
      padding: '24px',
    } },
    h('div', { style: { display: 'flex', fontSize: '20px', fontWeight: 700, color: '#cfd6e4', letterSpacing: '3px' } }, d.header || 'CHIÊU HỒN'),
    h('div', { style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '210px', height: '210px', margin: '20px 0',
        borderRadius: '26px', backgroundColor: hexToRgba(col, 0.18), border: `5px solid ${col}`,
      } },
      d.petDataUri
        ? h('img', { src: d.petDataUri, width: 188, height: 188, style: { borderRadius: '20px' } })
        : h('div', { style: { display: 'flex', fontSize: '130px' } }, d.emoji || '🐾')),
    h('div', { style: { display: 'flex', fontSize: '36px', fontWeight: 700, color: '#ffffff' } }, d.name || ''),
    h('div', { style: {
        display: 'flex', marginTop: '10px', padding: '5px 18px', borderRadius: '14px',
        backgroundColor: hexToRgba(col, 0.32), border: `2px solid ${col}`,
        fontSize: '19px', fontWeight: 700, color: '#ffffff',
      } }, `${d.tierEmoji || ''} ${d.tierName || ''}`),
    d.sub ? h('div', { style: { display: 'flex', marginTop: '14px', fontSize: '16px', color: '#ffd86b' } }, d.sub) : null,
  );
}

async function render(d) { return toPng(markup(d), { width: W, height: H }); }
module.exports = { render, markup, W, H };
