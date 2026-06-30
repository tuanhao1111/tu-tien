// =====================================================================
//  CARD — ENGINE dựng ẢNH ĐỘNG (HTML/CSS -> PNG) bằng Satori + resvg.
//
//  Ý tưởng: thay vì gắn ảnh TĨNH vào embed, ta "vẽ" tên/chỉ số/avatar/thanh
//  tiến độ THẲNG vào 1 tấm ảnh -> mỗi người chơi nhận 1 ảnh riêng (cảm giác
//  "tương tác trực tiếp với game"). Quy trình:
//     HTML/CSS string  --satori-->  SVG  --resvg-->  PNG Buffer  --> Discord
//
//  Layout viết bằng HTML/CSS string (satori-html) cho dễ bảo trì. Lưu ý SATORI
//  CHỈ hỗ trợ MỘT TẬP CON của CSS (flexbox; KHÔNG có grid/float; mọi phần tử có
//  >1 con PHẢI display:flex). Ảnh nhúng phải là data URI base64 (xem assets.dataUri).
//
//  satori là ESM -> nạp động (await import) + cache. Font nạp 1 lần từ đĩa.
//  Mọi lỗi -> ném ra để caller tự fallback về embed (game không được sập).
// =====================================================================
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');

// --- HYPERSCRIPT h() — dựng node Satori bằng object (KHÔNG dùng HTML string) ---
//  LÝ DO: satori-html parse HTML string làm VỠ data URI dài (dấu ';'/',' trong
//  `data:image/png;base64,…` bị cắt nhầm -> satori treo chờ tải ảnh). Object form
//  (style camelCase) nhận data URI an toàn. Dùng h() cho MỌI layout có ảnh.
//   h(type, props, ...children)  — props.style = object CSS camelCase; img: props.src/width/height.
//  Bỏ qua children null/false/'' để viết điều kiện gọn (a && h(...)).
function h(type, props, ...children) {
  const kids = children.flat(Infinity).filter((c) => c != null && c !== false && c !== '');
  const out = { type, props: { ...(props || {}) } };
  if (kids.length === 1 && typeof kids[0] !== 'object') out.props.children = kids[0];
  else if (kids.length) out.props.children = kids;
  return out;
}

// --- Font: nạp 1 lần, giữ trong RAM (Satori cần ÍT NHẤT 1 font) ---
let _fonts = null;
function fonts() {
  if (_fonts) return _fonts;
  _fonts = [
    { name: 'BVP', data: fs.readFileSync(path.join(FONT_DIR, 'BeVietnamPro-Regular.ttf')), weight: 400, style: 'normal' },
    { name: 'BVP', data: fs.readFileSync(path.join(FONT_DIR, 'BeVietnamPro-Bold.ttf')), weight: 700, style: 'normal' },
  ];
  return _fonts;
}

// --- satori (ESM) nạp động + cache ---
let _satori = null;
async function getSatori() {
  if (!_satori) _satori = (await import('satori')).default;
  return _satori;
}

// Dựng PNG từ node Satori (build bằng h()). Trả Buffer PNG. Ném lỗi nếu satori/
//  resvg vỡ -> caller bắt để fallback. (KHÔNG nhận HTML string — xem ghi chú h().)
async function toPng(tree, { width, height } = {}) {
  const satori = await getSatori();
  const svg = await satori(tree, { width, height, fonts: fonts() });
  // fitTo: dùng đúng width SVG (đã set), resvg tự suy ra height theo tỉ lệ.
  const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
  return png;
}

// Tải 1 ảnh từ URL (vd avatar Discord) -> data URI base64 để nhúng vào layout.
//  ÉP định dạng PNG ở phía gọi (Discord: displayAvatarURL({extension:'png'})) vì
//  resvg decode webp không ổn định. Lỗi/timeout -> trả null (caller bỏ avatar).
//  CACHE theo URL (TTL) để các lần render sau khỏi tải lại -> kịp trong 3s/Discord.
const _imgCache = new Map(); // url -> { uri, exp }
const IMG_TTL = 10 * 60 * 1000; // 10 phút (avatar đổi URL khi đổi ảnh nên cache an toàn)
async function fetchImageDataUri(url, { timeoutMs = 2500 } = {}) {
  if (!url) return null;
  const now = Date.now();
  const hit = _imgCache.get(url);
  if (hit && hit.exp > now) return hit.uri;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') || 'image/png';
    const buf = Buffer.from(await res.arrayBuffer());
    const uri = `data:${mime};base64,` + buf.toString('base64');
    _imgCache.set(url, { uri, exp: now + IMG_TTL });
    return uri;
  } catch (_) {
    return null;
  }
}

// Làm nóng engine (nạp satori ESM + font) lúc khởi động để LẦN render đầu của
//  người chơi không bị cộng ~150ms nạp module. Gọi 1 lần ở index.js (on ready).
async function warmup() {
  try {
    await toPng(h('div', { style: { display: 'flex', width: '8px', height: '8px', fontFamily: 'BVP' } }, '·'), { width: 8, height: 8 });
  } catch (_) { /* không sao — render thật sẽ tự thử lại */ }
}

module.exports = { h, toPng, fetchImageDataUri, warmup };
