// =====================================================================
//  ASSETS — registry ẢNH cho game (thuần, KHÔNG đụng DB).
//  Mục tiêu: gắn ảnh cho cảnh giới / môn phái / panel mà KHÔNG vỡ gì khi
//  chưa có ảnh (giống util/announce: thiếu thì lặng lẽ bỏ qua).
//
//  2 cách cung cấp ảnh (đều hỗ trợ, có thể trộn):
//    1) FILE LOCAL theo quy ước — bỏ file vào `assets/img/` đúng tên:
//         • Cảnh giới:  realm_<index>.png   (index 0..9 khớp cultivation.REALMS)
//         • Môn phái:   sect_<id>.png       (id: kiem_tong, huyen_hoa, …)
//         • Panel:      panel_<key>.png     (key: soNhap, tuLuyen, dotPha, …)
//       Bỏ file vào là TỰ hiện, không cần sửa code. (png/jpg/gif đều được —
//       đổi đuôi ở `EXTS` nếu muốn.)
//    2) URL đã host — điền vào 3 map override bên dưới (ưu tiên hơn file local).
//       vd: REALM_URL[3] = 'https://.../kim-dan.png';
//
//  Để TRỐNG cả hai = không có ảnh -> embed không gắn gì (game chạy bình thường).
// =====================================================================
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');

const IMG_DIR = path.join(__dirname, 'assets', 'img');
const ORIG_DIR = path.join(IMG_DIR, '_originals_backup'); // PNG gốc (cho Satori — xem dataUri)
const EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']; // thứ tự ưu tiên khi dò file local

// --- OVERRIDE bằng URL (điền nếu host ảnh ngoài; ưu tiên hơn file local) ---
const REALM_URL = {}; // { <realmIndex>: 'https://…' }   vd: { 3: 'https://i.imgur.com/abc.png' }
const SECT_URL = {};  // { '<sectId>':  'https://…' }
const PANEL_URL = {}; // { '<panelKey>':'https://…' }
const GEAR_URL = {};  // { '<slot>_<rarity>': 'https://…' }  vd: { 'weapon_than': 'https://…' }
const SKILL_URL = {}; // { '<skillId>': 'https://…' }
const MISC_URL = {};  // { '<key>': 'https://…' }  (shop, bag, quest, …)

// Dò file local theo prefix (vd 'realm_3') với các đuôi cho phép. Trả tên file
//  (vd 'realm_3.png') nếu tồn tại, ngược lại null. Có cache để khỏi stat mỗi lần.
const _fileCache = new Map();
function findLocal(prefix) {
  if (_fileCache.has(prefix)) return _fileCache.get(prefix);
  let found = null;
  for (const ext of EXTS) {
    const name = `${prefix}.${ext}`;
    try {
      if (fs.existsSync(path.join(IMG_DIR, name))) { found = name; break; }
    } catch (_) { /* bỏ qua lỗi fs */ }
  }
  _fileCache.set(prefix, found);
  return found;
}

// Phân giải nguồn ảnh -> { url } (gắn thẳng) hoặc { file, name } (đính kèm) hoặc null.
function resolve(urlOverride, localPrefix) {
  if (urlOverride && /^https?:\/\//i.test(urlOverride)) return { url: urlOverride };
  const name = findLocal(localPrefix);
  if (name) return { file: path.join(IMG_DIR, name), name };
  return null;
}

// Gắn ảnh vào embed. kind: 'thumbnail' (nhỏ góc phải) | 'image' (banner lớn cuối).
//  Trả MẢNG files (rỗng nếu không có ảnh / dùng URL) để spread vào payload gửi đi.
function apply(embed, src, kind = 'thumbnail') {
  if (!src) return [];
  if (src.url) {
    if (kind === 'image') embed.setImage(src.url); else embed.setThumbnail(src.url);
    return [];
  }
  const link = `attachment://${src.name}`;
  if (kind === 'image') embed.setImage(link); else embed.setThumbnail(link);
  return [new AttachmentBuilder(src.file, { name: src.name })];
}

// --- API tiện dụng cho từng loại ---
function realm(embed, index, kind = 'image') {
  return apply(embed, resolve(REALM_URL[index], `realm_${index}`), kind);
}
function sect(embed, sectId, kind = 'image') {
  return apply(embed, resolve(SECT_URL[sectId], `sect_${sectId}`), kind);
}
function panel(embed, panelKey, kind = 'image') {
  return apply(embed, resolve(PANEL_URL[panelKey], `panel_${panelKey}`), kind);
}
// Ảnh TRANG BỊ theo (ô × độ hiếm): gear_<slot>_<rarity>.png — vd gear_weapon_than.png.
//  -> "mỗi người thấy hình món đồ của họ" (khớp loại + độ hiếm món đang xem).
function gear(embed, slot, rarity, kind = 'image') {
  const key = `${slot}_${rarity}`;
  return apply(embed, resolve(GEAR_URL[key], `gear_${key}`), kind);
}
// Ảnh TRANG BỊ theo ID MÓN (catalog có dòng phụ): gear_<id>.png — vd gear_weapon_than_b.png.
//  Dòng nền (id = '<slot>_<rarity>') trùng key cũ nên dùng lại 30 ảnh sẵn có.
function gearById(embed, id, kind = 'image') {
  return apply(embed, resolve(GEAR_URL[id], `gear_${id}`), kind);
}
// Ảnh KỸ NĂNG: skill_<id>.png.
function skill(embed, skillId, kind = 'image') {
  return apply(embed, resolve(SKILL_URL[skillId], `skill_${skillId}`), kind);
}
// Ảnh CHUNG theo key tùy ý: <key>.png (shop, bag, quest, …).
function misc(embed, key, kind = 'image') {
  return apply(embed, resolve(MISC_URL[key], key), kind);
}
// Trả NGUỒN ảnh ({url}|{file,name}|null) theo prefix (KHÔNG gắn vào embed) — để
//  caller tự quyết khi nào upload (vd trận đánh: upload 1 lần rồi giữ qua các update).
//  Dò URL override ở mọi map rồi tới file local `<prefix>.png`.
function src(prefix) {
  return resolve(MISC_URL[prefix] || SKILL_URL[prefix] || GEAR_URL[prefix] || PANEL_URL[prefix], prefix);
}
// Gắn LINK ảnh vào embed mà KHÔNG upload file (dùng cho panel live auto-edit: file đã
//  upload 1 lần lúc /setup, các lần edit sau chỉ THAM CHIẾU attachment đã có -> không re-upload).
function imageRef(embed, prefix, kind = 'image') {
  const s = src(prefix);
  if (!s) return false;
  const link = s.url ? s.url : `attachment://${s.name}`;
  if (kind === 'image') embed.setImage(link); else embed.setThumbnail(link);
  return true;
}

// =====================================================================
//  DATA URI cho SATORI (dựng ẢNH ĐỘNG) — KHÁC hẳn cách embed ở trên.
//  Satori render layout HTML/CSS -> SVG, nên ảnh nhúng PHẢI là chuỗi base64
//  `data:image/png;base64,…` (không nhận `attachment://` hay đường file).
//  Rasterizer @resvg/resvg-js decode WEBP không ổn định -> ƯU TIÊN ĐỌC PNG:
//    1) assets/img/_originals_backup/<prefix>.png   (bản gốc, chắc ăn nhất)
//    2) assets/img/<prefix>.{png,jpg,jpeg}           (nếu có để PNG ngoài đó)
//  Không tìm thấy PNG -> trả null (caller tự bỏ qua, KHÔNG fallback webp vì
//  resvg dễ vỡ). Cache theo prefix để khỏi đọc đĩa + encode base64 mỗi lần.
// =====================================================================
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif' };
const _uriCache = new Map();
function dataUri(prefix) {
  if (_uriCache.has(prefix)) return _uriCache.get(prefix);
  let uri = null;
  // Thứ tự dò: PNG gốc trước, rồi PNG/JPG trong IMG_DIR (KHÔNG lấy webp).
  const candidates = [
    [path.join(ORIG_DIR, `${prefix}.png`), 'png'],
    [path.join(IMG_DIR, `${prefix}.png`), 'png'],
    [path.join(IMG_DIR, `${prefix}.jpg`), 'jpg'],
    [path.join(IMG_DIR, `${prefix}.jpeg`), 'jpeg'],
  ];
  for (const [file, ext] of candidates) {
    try {
      if (fs.existsSync(file)) {
        uri = `data:${MIME[ext]};base64,` + fs.readFileSync(file).toString('base64');
        break;
      }
    } catch (_) { /* bỏ qua lỗi fs */ }
  }
  _uriCache.set(prefix, uri);
  return uri;
}

module.exports = {
  REALM_URL, SECT_URL, PANEL_URL, GEAR_URL, SKILL_URL, MISC_URL,
  resolve, apply, realm, sect, panel, gear, gearById, skill, misc, src, imageRef,
  dataUri,
};
