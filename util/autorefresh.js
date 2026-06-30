// =====================================================================
//  AUTO-REFRESH VIEW CÁ NHÂN ẨN (GĐ17) — "thời gian thực" cho ephemeral.
//  Discord không đẩy real-time, NHƯNG trong 15' kể từ lúc tương tác, bot có thể
//  gọi interaction.editReply() để sửa chính tin nhắn ẩn đó. Helper này lặp
//  editReply theo nhịp (vd 5s) để đếm ngược cooldown / tiến trình tu luyện tự
//  cập nhật mà người chơi KHÔNG cần bấm 🔄.
//
//  Cách dùng (sau khi đã interaction.reply view ẩn):
//    autorefresh.start(interaction, () => {
//       const p = db.getPlayer(id);
//       return { view: someView(p, Date.now()), done: <điều kiện dừng> };
//    });
//  - rebuild() trả { view, done } — done=true thì cập nhật lần cuối rồi DỪNG.
//  - Tự dừng sau autoRefreshMaxMs (< 15' token ẩn) hoặc khi editReply lỗi
//    (người chơi đóng view / mở view khác).
//  - Mỗi người 1 vòng refresh (mở view mới tự hủy vòng cũ).
// =====================================================================
const config = require('../config');

const active = new Map(); // userId -> timer

function stop(userId) {
  const t = active.get(userId);
  if (t) { clearInterval(t); active.delete(userId); }
}

function start(interaction, rebuild, opts = {}) {
  const userId = interaction.user.id;
  stop(userId); // hủy vòng refresh cũ của người này
  const ui = config.ui || {};
  const intervalMs = opts.intervalMs || ui.autoRefreshMs || 5000;
  const maxMs = opts.maxMs || ui.autoRefreshMaxMs || 14 * 60 * 1000;
  const startTs = Date.now();
  const timer = setInterval(async () => {
    if (Date.now() - startTs > maxMs) return stop(userId);
    let r;
    try { r = rebuild(); } catch (_) { return stop(userId); }
    if (!r || !r.view) return stop(userId);
    try { await interaction.editReply(r.view); } catch (_) { return stop(userId); } // view đã đóng/đổi
    if (r.done) stop(userId);
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  active.set(userId, timer);
}

module.exports = { start, stop };
