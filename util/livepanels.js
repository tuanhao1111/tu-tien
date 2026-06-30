// =====================================================================
//  PANEL CHUNG CẬP NHẬT THỜI GIAN THỰC + STICKY (GĐ16)
//  Discord KHÔNG đẩy real-time tới tin nhắn người dùng đang xem -> cách khả thi:
//   • AUTO-REFRESH: bot tự EDIT các panel chung (boss/BXH/đấu pháp) mỗi
//     config.ui.liveRefreshMs (10s) -> coi như real-time.
//   • STICKY: khi kênh có tin nhắn mới đẩy panel lên, bot tự ĐĂNG LẠI panel
//     xuống đáy (xóa cái cũ), có debounce.
//
//  Mỗi command tự ĐĂNG KÝ builder của mình (tránh require vòng):
//    livepanels.register('bossTheGioi', () => bossLiveView(), { sticky: true });
//  index.js gọi livepanels.tick(client) định kỳ + livepanels.onMessage(msg).
// =====================================================================
const db = require('../database');
const config = require('../config');

const registry = new Map(); // key -> { build, sticky, stickyOnly, intervalMs, lastRun }
function register(key, build, opts = {}) {
  registry.set(key, { build, sticky: !!opts.sticky, stickyOnly: !!opts.stickyOnly, image: !!opts.image, intervalMs: opts.intervalMs || 0, lastRun: 0 });
}
function isLive(key) { return registry.has(key); }

// EDIT tại chỗ các panel đã đăng ký (giữ message id). Mỗi panel tôn trọng intervalMs
//  riêng (vd boss 5s, BXH 10s); tick nền gọi thường xuyên hơn, panel tự bỏ qua nếu chưa tới hạn.
async function tick(client) {
  if (!client) return;
  const now = Date.now();
  for (const [key, reg] of registry) {
    if (reg.stickyOnly) continue; // panel tĩnh chỉ sticky, KHÔNG auto-edit
    if (reg.intervalMs && now - reg.lastRun < reg.intervalMs) continue;
    reg.lastRun = now;
    const saved = db.getPanel(key);
    if (!saved || !saved.message_id) continue;
    try {
      const ch = await client.channels.fetch(saved.channel_id).catch(() => null);
      if (!ch || typeof ch.messages?.fetch !== 'function') continue;
      const msg = await ch.messages.fetch(saved.message_id).catch(() => null);
      if (!msg) continue;
      const payload = await safeBuild(reg.build);
      if (isEmptyPayload(payload)) continue; // KHÔNG edit rỗng -> tránh "Cannot send an empty message"
      if (reg.image) {
        // Panel ẢNH: edit KÈM files (re-upload ảnh mới) + xóa attachment cũ -> ảnh cập nhật.
        await msg.edit({ ...payload, attachments: [] }).catch(() => {});
      } else {
        // Panel embed: edit KHÔNG kèm files (banner đã upload lúc /setup persists) -> không re-upload.
        const { files, ...rest } = payload; await msg.edit(rest).catch(() => {});
      }
    } catch (_) { /* nuốt lỗi: panel real-time không bao giờ làm vỡ bot */ }
  }
}

async function safeBuild(build) {
  try { return await build(); } catch (_) { return null; }
}

// Payload "rỗng" theo Discord (không content/embeds/files/components) -> gửi/edit sẽ lỗi 50006.
function isEmptyPayload(p) {
  return !p || (
    !p.content &&
    !(p.embeds && p.embeds.length) &&
    !(p.files && p.files.length) &&
    !(p.components && p.components.length)
  );
}

// STICKY: tin nhắn mới trong kênh có panel sticky -> đăng lại panel xuống đáy (debounce).
const pending = new Map(); // channelId -> timeout
function onMessage(message) {
  if (!config.ui || !config.ui.stickyEnabled) return;
  if (!message || !message.channelId) return;
  if (message.author && message.author.bot) return; // bỏ qua tin của chính bot
  for (const [key, { sticky, build }] of registry) {
    if (!sticky) continue;
    const saved = db.getPanel(key);
    if (!saved || saved.channel_id !== message.channelId) continue;
    if (pending.has(message.channelId)) return; // đã hẹn đăng lại -> gộp
    const t = setTimeout(() => {
      pending.delete(message.channelId);
      repost(message.channel, key, build).catch(() => {});
    }, (config.ui.stickyDebounceMs) || 4000);
    if (typeof t.unref === 'function') t.unref();
    pending.set(message.channelId, t);
    return;
  }
}

async function repost(channel, key, build) {
  if (!channel || typeof channel.send !== 'function') return;
  const saved = db.getPanel(key);
  const payload = await safeBuild(build);
  if (isEmptyPayload(payload)) return;
  const sent = await channel.send(payload).catch(() => null);
  if (!sent) return;
  db.setPanel(key, channel.id, sent.id); // cập nhật id mới TRƯỚC khi xóa cũ
  if (saved && saved.message_id && saved.message_id !== sent.id) {
    const old = await channel.messages.fetch(saved.message_id).catch(() => null);
    if (old) old.delete().catch(() => {});
  }
}

module.exports = { register, isLive, tick, onMessage };
