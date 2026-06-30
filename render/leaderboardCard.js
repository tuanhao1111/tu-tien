// =====================================================================
//  LEADERBOARD CARD — BẢNG XẾP HẠNG dạng ẢNH ĐỘNG (Satori), kiểu "podium":
//    [TIÊU ĐỀ]  ·  [BỤC TOP 5 — sắp 4·2·1·3·5, #1 cao nhất giữa]
//    [HẠNG CỦA BẠN]            [DANH SÁCH hạng 6–10]
//
//  Nhận DATA THUẦN -> Buffer PNG. leaderboard.js gom data (fetch avatar) rồi gọi.
//  RÀNG BUỘC SATORI: chỉ flexbox; node >1 con phải display:flex; ảnh = data URI.
// =====================================================================
const { h, toPng } = require('../util/card');
const assets = require('../assets');

const W = 1000, H = 668;
const GOLD = 'rgba(212,175,55,0.55)';
const GOLD_SOFT = 'rgba(212,175,55,0.3)';
const PANEL = 'rgba(10,16,28,0.62)';
const BOX = 'rgba(8,12,20,0.5)';
const VAL = '#ffe6a3';

// Phong cách theo HẠNG (1..5): màu viền figure + bệ + nhãn.
const RANK_STYLE = {
  1: { figH: 190, fig: 104, ped: 132, medal: '🥇', edge: '#fdcb6e', pedTop: '#caa23a', pedBot: '#7a5f17' },
  2: { figH: 158, fig: 84, ped: 104, medal: '🥈', edge: '#dfe6e9', pedTop: '#9aa4ad', pedBot: '#525a61' },
  3: { figH: 158, fig: 84, ped: 90, medal: '🥉', edge: '#e0a878', pedTop: '#b5743f', pedBot: '#5e3b20' },
  4: { figH: 132, fig: 70, ped: 70, medal: '4', edge: GOLD_SOFT, pedTop: '#3a4456', pedBot: '#222a38' },
  5: { figH: 132, fig: 70, ped: 60, medal: '5', edge: GOLD_SOFT, pedTop: '#3a4456', pedBot: '#222a38' },
};

// 1 CỘT bục cho 1 người. entry: {rank,name,score,charDataUri,avatarDataUri} | null.
//  Ưu tiên ẢNH NHÂN VẬT (đã tách nền) đứng trên bục; thiếu -> avatar tròn; thiếu nữa -> khung trống.
function podiumCol(entry, rank) {
  const s = RANK_STYLE[rank];
  let figure;
  if (entry && entry.charDataUri) {
    // Ảnh char là canvas RỘNG (640×349) với nhân vật ở giữa, 2 bên trong suốt.
    //  KHUNG DỌC có NỀN TỐI + quầng sáng (như niche trưng bày): phần trong suốt của
    //  ảnh để lộ nền tối -> nhân vật (kể cả áo trắng) NỔI BẬT trên mọi nền. objectFit
    //  cover cắt lề, nhân vật cao đúng figH, đứng sát bục.
    const figW = Math.round(s.figH * 0.66);
    figure = h('div', { style: {
        display: 'flex', position: 'relative', width: `${figW}px`, height: `${s.figH}px`, overflow: 'hidden',
        borderRadius: '14px 14px 6px 6px', border: `1px solid ${s.edge}`,
        backgroundImage: 'radial-gradient(ellipse at 50% 38%, rgba(120,170,235,0.22), rgba(6,10,18,0.82) 72%)',
      } },
      h('img', { src: entry.charDataUri, width: figW, height: s.figH, style: { position: 'absolute', left: 0, top: 0, objectFit: 'cover' } }),
      // feather mép dưới -> hòa vào bục (nhân vật như mọc lên từ bệ)
      h('div', { style: { display: 'flex', position: 'absolute', left: 0, bottom: 0, width: `${figW}px`, height: '30px', backgroundImage: `linear-gradient(to top, ${s.pedTop}, rgba(0,0,0,0))` } }),
    );
  } else if (entry && entry.avatarDataUri) {
    figure = h('div', { style: { display: 'flex', alignItems: 'flex-end', height: `${s.figH}px` } },
      h('img', { src: entry.avatarDataUri, width: s.fig, height: s.fig, style: { borderRadius: `${s.fig / 2}px`, border: `3px solid ${s.edge}` } }));
  } else {
    figure = h('div', { style: { display: 'flex', width: `${s.fig}px`, height: `${s.figH}px` } });
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '184px' } },
    figure,
    h('div', { style: { display: 'flex', fontSize: rank === 1 ? '19px' : '16px', fontWeight: 700, color: '#ffffff', marginTop: '4px', maxWidth: '178px' } }, entry ? entry.name : '—'),
    entry && entry.title && h('div', { style: { display: 'flex', fontSize: '12px', color: '#ffd86b', marginTop: '1px', maxWidth: '178px' } }, entry.title),
    entry && h('div', { style: { display: 'flex', fontSize: '14px', color: VAL, marginTop: '2px' } }, entry.score),
    // Bệ: cao theo hạng, mặt trên có số hạng / huy chương.
    h('div', { style: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        width: `${rank === 1 ? 168 : 150}px`, height: `${s.ped}px`, marginTop: '8px',
        backgroundImage: `linear-gradient(to bottom, ${s.pedTop}, ${s.pedBot})`,
        border: `1px solid ${GOLD_SOFT}`, borderRadius: '10px 10px 4px 4px', paddingTop: '8px',
      } },
      h('div', { style: { display: 'flex', fontSize: rank === 1 ? '34px' : '26px', fontWeight: 700, color: '#fff' } }, s.medal),
    ),
  );
}

// Panel "HẠNG CỦA BẠN".
function mePanel(me) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', width: '300px', backgroundColor: PANEL, border: `1px solid ${GOLD_SOFT}`, borderRadius: '14px', padding: '14px 16px' } },
    h('div', { style: { display: 'flex', fontSize: '14px', fontWeight: 700, color: '#8fa0bf', letterSpacing: '1px', marginBottom: '8px' } }, '★ HẠNG CỦA BẠN'),
    h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } },
      h('div', { style: { display: 'flex', fontSize: '40px', fontWeight: 700, color: VAL } }, me.rank ? `#${me.rank}` : '—'),
      h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
        h('div', { style: { display: 'flex', fontSize: '18px', fontWeight: 700, color: '#fff' } }, me.name),
        h('div', { style: { display: 'flex', fontSize: '14px', color: '#c4ccdb', marginTop: '2px' } }, me.score),
      ),
    ),
  );
}

// Panel danh sách hạng 6–10 (rest). Rỗng -> lời nhắn.
function restPanel(rest) {
  const rows = rest && rest.length
    ? rest.map((r) => h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '28px' } },
        h('div', { style: { display: 'flex', fontSize: '15px', color: '#cbd3e1' } }, `#${r.rank}  ${r.name}`),
        h('div', { style: { display: 'flex', fontSize: '15px', fontWeight: 700, color: VAL } }, r.score),
      ))
    : [h('div', { style: { display: 'flex', fontSize: '14px', color: '#7e879b' } }, '(chưa có thêm tu sĩ nào)')];
  return h('div', { style: { display: 'flex', flexDirection: 'column', width: '560px', backgroundColor: PANEL, border: `1px solid ${GOLD_SOFT}`, borderRadius: '14px', padding: '12px 18px' } },
    h('div', { style: { display: 'flex', fontSize: '14px', fontWeight: 700, color: '#8fa0bf', letterSpacing: '1px', marginBottom: '6px' } }, '📜 BẢNG XẾP HẠNG (6–10)'),
    ...rows,
  );
}

function markup(d) {
  const rootStyle = {
    display: 'flex', flexDirection: 'column', width: `${W}px`, height: `${H}px`,
    fontFamily: 'BVP', padding: '24px', alignItems: 'center',
  };
  if (d.bgDataUri) { rootStyle.backgroundImage = `url(${d.bgDataUri})`; rootStyle.backgroundSize = `${W}px ${H}px`; }
  else rootStyle.backgroundImage = 'linear-gradient(135deg,#1b2436,#0d1320)';

  const p = d.podium || []; // index 0..4 = hạng 1..5
  const order = [4, 2, 1, 3, 5]; // thứ tự hiển thị trái -> phải

  // Hàng dưới: có me -> [hạng của bạn | 6–10]; không có me (panel chung) -> 6–10 full.
  const bottom = d.me
    ? h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: `${W - 48}px`, marginTop: '4px' } },
        mePanel(d.me), restPanel(d.rest || []))
    : h('div', { style: { display: 'flex', width: `${W - 48}px`, marginTop: '4px' } }, restPanel(d.rest || []));

  return h('div', { style: rootStyle },
    // Tiêu đề
    h('div', { style: { display: 'flex', fontSize: '34px', fontWeight: 700, color: '#ffd86b', letterSpacing: '2px' } }, d.title),
    h('div', { style: { display: 'flex', fontSize: '15px', color: '#c4ccdb', marginTop: '2px', marginBottom: '4px' } }, d.subtitle),
    // Bục (cao hơn để chứa ảnh nhân vật đứng)
    h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: '372px' } },
      ...order.map((rank) => podiumCol(p[rank - 1] || null, rank)),
    ),
    bottom,
  );
}

async function render(d) {
  return toPng(markup(d), { width: W, height: H });
}

module.exports = { render, markup, W, H };
module.exports.bgDataUri = () => assets.dataUri('panel_bangXepHang');
