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

// Phong cách theo HẠNG (1..5): màu viền figure + bệ + huy hiệu xu (coin).
//  (Bỏ emoji huy chương vì pipeline KHÔNG render emoji -> dùng XU VẼ + số hạng.)
const RANK_STYLE = {
  1: { figH: 176, fig: 104, ped: 128, edge: '#fdcb6e', pedTop: '#caa23a', pedBot: '#7a5f17', coin: '#fdcb6e', coinDark: '#7a5f17' },
  2: { figH: 150, fig: 84, ped: 102, edge: '#dfe6e9', pedTop: '#9aa4ad', pedBot: '#525a61', coin: '#eaf0f2', coinDark: '#5a636b' },
  3: { figH: 150, fig: 84, ped: 88, edge: '#e0a878', pedTop: '#b5743f', pedBot: '#5e3b20', coin: '#e7a877', coinDark: '#6b4326' },
  4: { figH: 126, fig: 70, ped: 70, edge: '#6b7790', pedTop: '#3a4456', pedBot: '#222a38', coin: '#8a97b0', coinDark: '#2c344a' },
  5: { figH: 126, fig: 70, ped: 60, edge: '#6b7790', pedTop: '#3a4456', pedBot: '#222a38', coin: '#8a97b0', coinDark: '#2c344a' },
};
const TXT_SHADOW = '0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)'; // chữ nổi trên mọi nền

// Huy hiệu XU: vòng tròn số hạng, ĐÈ TUYỆT ĐỐI lên rìa trên bệ (không chen vào chữ).
function coin(rank, s) {
  const sz = rank === 1 ? 46 : 36;
  return h('div', { style: {
      display: 'flex', position: 'absolute', top: `-${Math.round(sz * 0.5)}px`,
      alignItems: 'center', justifyContent: 'center',
      width: `${sz}px`, height: `${sz}px`, borderRadius: `${sz / 2}px`,
      backgroundImage: `linear-gradient(135deg, #fffaf0, ${s.coin})`, border: `3px solid ${s.coinDark}`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
      fontSize: rank === 1 ? '23px' : '18px', fontWeight: 700, color: '#1a1205',
    } }, String(rank));
}

// 1 CỘT bục cho 1 người. entry: {rank,name,score,title,charDataUri,avatarDataUri} | null.
//  Nhân vật HÒA vào nền nhờ QUẦNG SÁNG MỀM (không khung hộp) + đứng trên bục vinh quang.
function podiumCol(entry, rank) {
  const s = RANK_STYLE[rank];
  let figure;
  if (entry && entry.charDataUri) {
    const figW = Math.round(s.figH * 0.74);
    figure = h('div', { style: { display: 'flex', position: 'relative', width: `${figW}px`, height: `${s.figH}px` } },
      // Quầng sáng MỀM toả ra sau lưng (fade hết viền) -> nhân vật như được rọi đèn,
      //  hoà vào nền chứ không phải dán 1 cái hộp.
      h('div', { style: {
          display: 'flex', position: 'absolute', left: `${-Math.round(figW * 0.24)}px`, top: '4px',
          width: `${Math.round(figW * 1.48)}px`, height: `${s.figH}px`,
          backgroundImage: rank === 1
            ? 'radial-gradient(ellipse at 50% 50%, rgba(253,203,110,0.45), rgba(253,203,110,0) 62%)'
            : 'radial-gradient(ellipse at 50% 54%, rgba(150,190,245,0.28), rgba(0,0,0,0) 62%)',
        } }),
      // Ảnh nhân vật (cover, tự cắt lề trong suốt) — KHÔNG viền/hộp.
      h('img', { src: entry.charDataUri, width: figW, height: s.figH, style: { position: 'absolute', left: 0, top: 0, objectFit: 'cover' } }),
    );
  } else if (entry && entry.avatarDataUri) {
    figure = h('div', { style: { display: 'flex', alignItems: 'flex-end', height: `${s.figH}px` } },
      h('img', { src: entry.avatarDataUri, width: s.fig, height: s.fig, style: { borderRadius: `${s.fig / 2}px`, border: `3px solid ${s.edge}` } }));
  } else {
    figure = h('div', { style: { display: 'flex', width: `${s.fig}px`, height: `${s.figH}px` } });
  }

  // Nhãn: tên · danh hiệu · cảnh giới (đều có bóng đổ -> không bị nền nuốt).
  const label = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '5px', maxWidth: '188px' } },
    h('div', { style: { display: 'flex', fontSize: rank === 1 ? '19px' : '16px', fontWeight: 700, color: '#ffffff', textShadow: TXT_SHADOW } }, entry ? entry.name : '—'),
    entry && entry.title && h('div', { style: { display: 'flex', fontSize: '12px', fontWeight: 700, color: '#ffd86b', marginTop: '1px', textShadow: TXT_SHADOW } }, entry.title),
    entry && h('div', { style: { display: 'flex', fontSize: '13px', color: VAL, marginTop: '1px', textShadow: TXT_SHADOW } }, entry.score),
  );

  // Bệ (relative) + xu đè lên rìa trên.
  const pedestal = h('div', { style: {
      display: 'flex', position: 'relative', width: `${rank === 1 ? 170 : 150}px`, height: `${s.ped}px`, marginTop: '12px',
      backgroundImage: `linear-gradient(to bottom, ${s.pedTop}, ${s.pedBot})`,
      border: `1px solid ${s.edge}`, borderTop: `2px solid ${s.coin}`, borderRadius: '10px 10px 4px 4px',
      boxShadow: rank === 1 ? '0 0 20px rgba(253,203,110,0.35)' : '0 2px 8px rgba(0,0,0,0.4)',
    } }, coin(rank, s));

  return h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '190px' } },
    figure, label, pedestal,
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
  // Phủ SCRIM tối lên nền -> coin/nhân vật nổi rõ trên nền sáng (đền hoàng hôn…).
  if (d.bgDataUri) { rootStyle.backgroundImage = `linear-gradient(rgba(7,11,20,0.42), rgba(7,11,20,0.58)), url(${d.bgDataUri})`; rootStyle.backgroundSize = `${W}px ${H}px`; }
  else rootStyle.backgroundImage = 'linear-gradient(135deg,#1b2436,#0d1320)';

  const p = d.podium || []; // index 0..4 = hạng 1..5
  const order = [4, 2, 1, 3, 5]; // thứ tự hiển thị trái -> phải

  // Hàng dưới: có me -> [hạng của bạn | 6–10]; không có me (panel chung) -> 6–10 full.
  const bottom = d.me
    ? h('div', { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: `${W - 48}px`, marginTop: '4px' } },
        mePanel(d.me), restPanel(d.rest || []))
    : h('div', { style: { display: 'flex', width: `${W - 48}px`, marginTop: '4px' } }, restPanel(d.rest || []));

  return h('div', { style: rootStyle },
    // TIÊU ĐỀ: gói trong 1 dải đầu (căn giữa, có bóng đổ + gạch vàng) cho cân & dễ đọc.
    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' } },
      h('div', { style: { display: 'flex', fontSize: '36px', fontWeight: 700, color: '#ffd86b', letterSpacing: '3px', textShadow: '0 2px 8px rgba(0,0,0,0.85)' } }, d.title),
      h('div', { style: { display: 'flex', fontSize: '14px', color: '#dbe2ee', marginTop: '3px', letterSpacing: '1px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' } }, d.subtitle),
      h('div', { style: { display: 'flex', width: '210px', height: '2px', marginTop: '7px', backgroundImage: 'linear-gradient(to right, rgba(212,175,55,0), rgba(212,175,55,0.85), rgba(212,175,55,0))' } }),
    ),
    // Bục (cao để chứa nhân vật đứng) — căn đáy.
    h('div', { style: { display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: '360px' } },
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
