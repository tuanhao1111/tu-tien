// =====================================================================
//  GACHA BANNER CARD — thẻ "dàn Ngự Thú có thể triệu hồn" ở Chiêu Hồn Đài
//  (Satori). Kiểu banner gacha RPG: nhóm thú theo BẬC, mỗi bậc 1 dải màu +
//  tỉ lệ (thường/cao cấp) + ô ảnh từng con (pet_<key>) hoặc emoji fallback.
//  Nhận DATA THUẦN -> Buffer PNG. Lỗi render -> shop.js tự fallback embed.
// =====================================================================
const { h, toPng } = require('../util/card');

const W = 760;

function hexToRgba(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(150,150,150,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// 1 ô thú: khung viền theo bậc + ảnh (pet_<key>) hoặc emoji + tên.
function petCell(p, col) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '128px', marginRight: '6px' } },
    h('div', { style: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '76px', height: '76px', borderRadius: '14px',
        backgroundColor: hexToRgba(col, 0.20), border: `3px solid ${col}`,
      } },
      p.icon
        ? h('img', { src: p.icon, width: 66, height: 66, style: { borderRadius: '10px' } })
        : h('div', { style: { display: 'flex', fontSize: '40px' } }, p.emoji || '🐾')),
    h('div', { style: { display: 'flex', marginTop: '5px', fontSize: '14px', fontWeight: 700, color: '#e8ecf4' } }, p.name || ''),
  );
}

// 1 dải bậc: header (tên bậc + tỉ lệ) + hàng ô thú.
function tierBand(t) {
  const col = t.color || '#b2bec3';
  return h('div', { style: {
      display: 'flex', flexDirection: 'column', width: '100%',
      backgroundColor: hexToRgba(col, 0.10), border: `2px solid ${hexToRgba(col, 0.55)}`,
      borderRadius: '16px', padding: '10px 14px', marginBottom: '10px',
    } },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' } },
      h('div', { style: { display: 'flex', alignItems: 'center' } },
        h('div', { style: { display: 'flex', width: '16px', height: '16px', borderRadius: '8px', backgroundColor: col, marginRight: '9px' } }, ''),
        h('div', { style: { display: 'flex', fontSize: '21px', fontWeight: 700, color: '#ffffff' } }, `${t.emoji || ''} ${t.name}`),
      ),
      h('div', { style: { display: 'flex', fontSize: '14px', color: '#cfd6e4' } }, `Thường ${t.rateLt}%  ·  Cao cấp ${t.ratePremium}%`),
    ),
    h('div', { style: { display: 'flex', flexWrap: 'wrap' } }, ...t.pets.map((p) => petCell(p, col))),
  );
}

function markup(d) {
  return h('div', { style: {
      display: 'flex', flexDirection: 'column', width: `${W}px`,
      backgroundImage: 'linear-gradient(160deg, #0d1220, #171f31)',
      padding: '20px', fontFamily: 'BVP',
    } },
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' } },
      h('div', { style: { display: 'flex', fontSize: '30px', fontWeight: 700, color: '#ffd86b', letterSpacing: '2px' } }, '🎰 CHIÊU HỒN ĐÀI'),
      h('div', { style: { display: 'flex', marginTop: '2px', fontSize: '15px', color: '#9fb0c8' } }, 'Dàn Ngự Thú có thể triệu hồn'),
    ),
    ...(d.tiers || []).map(tierBand),
  );
}

// Chiều cao suy theo số bậc (mỗi dải ~ cao đều nhau) để khỏi bị cắt.
function heightOf(d) {
  const bands = (d.tiers || []).length || 4;
  return 100 + bands * 168 + 24;
}

async function render(d) { return toPng(markup(d), { width: W, height: heightOf(d) }); }
module.exports = { render, markup, W };
