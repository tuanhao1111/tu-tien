// =====================================================================
//  /setup (ADMIN) — đăng/cập nhật PANEL cố định ở các kênh đã cấu hình.
//  Cần điền CHANNEL_ID qua .env (config.channels). Chạy lại = SỬA tại chỗ
//  (lưu message_id ở bảng panels) nên không đăng trùng.
//  Quyền: có role config.adminRoleId, HOẶC quyền Manage Guild.
// =====================================================================
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const { PANELS } = require('../panels');
const { isAdmin } = require('../util/admin');
const channelroles = require('../util/channelroles');

// Đăng MỚI hoặc SỬA panel ở 1 kênh. Trả chuỗi mô tả kết quả.
async function syncPanel(client, key) {
  const channelId = config.channels[key];
  const meta = PANELS[key];
  if (!channelId) return `⚠️ **${meta.name}**: chưa cấu hình \`CH_${key.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}\` trong .env.`;

  let channel;
  try {
    channel = await client.channels.fetch(channelId);
  } catch (_) {
    channel = null;
  }
  if (!channel || typeof channel.send !== 'function') {
    return `❌ **${meta.name}**: không tìm thấy kênh \`${channelId}\` (hoặc bot không thấy kênh).`;
  }

  const payload = await meta.build(); // build có thể async (BXH render ảnh)

  // LÁ CHẮN: Discord từ chối tin RỖNG (không content/embeds/files/components) -> "Cannot send
  //  an empty message" làm crash /setup. Bỏ qua panel rỗng + báo rõ (thay vì để vỡ).
  const isEmpty = !payload || (
    !payload.content &&
    !(payload.embeds && payload.embeds.length) &&
    !(payload.files && payload.files.length) &&
    !(payload.components && payload.components.length)
  );
  if (isEmpty) {
    console.error(`[setup] ${key}: payload RỖNG ->`, {
      embeds: payload && payload.embeds && payload.embeds.length,
      files: payload && payload.files && payload.files.length,
      components: payload && payload.components && payload.components.length,
    });
    return `⚠️ **${meta.name}**: builder trả payload rỗng — bỏ qua (xem log để biết lý do).`;
  }

  const saved = db.getPanel(key);

  // Thử SỬA message cũ.
  if (saved && saved.channel_id === channelId) {
    try {
      const msg = await channel.messages.fetch(saved.message_id);
      // attachments:[] xóa ảnh cũ trước, rồi files (nếu có) thêm ảnh mới -> không nhân đôi/đọng.
      await msg.edit({ ...payload, attachments: [] });
      return `♻️ **${meta.name}**: đã cập nhật panel tại <#${channelId}>.`;
    } catch (_) {
      // message cũ mất -> đăng mới bên dưới
    }
  }

  const sent = await channel.send(payload);
  db.setPanel(key, channelId, sent.id);
  return `✅ **${meta.name}**: đã đăng panel mới tại <#${channelId}>.`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('[Admin] Đăng/cập nhật panel cố định ở các kênh đã cấu hình.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      return interaction.reply({ content: '⛔ Lệnh này chỉ dành cho quản trị (role admin hoặc quyền Manage Guild).', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ content: '⏳ Đang đăng/cập nhật panel…', flags: MessageFlags.Ephemeral });

    const results = [];
    for (const key of Object.keys(PANELS)) {
      try {
        results.push(await syncPanel(interaction.client, key));
      } catch (err) {
        console.error(`[setup] ${key}:`, err);
        results.push(`❌ **${PANELS[key].name}**: lỗi khi đăng (${err.message || err}).`);
      }
    }

    // DỌN panel MỒ CÔI: panel cũ đã bị bỏ khỏi PANELS (vd Đột Phá, Trang Bị) -> xóa message + bản ghi.
    for (const saved of db.allPanels()) {
      if (PANELS[saved.channel_key]) continue; // còn dùng -> bỏ qua
      try {
        const ch = await interaction.client.channels.fetch(saved.channel_id).catch(() => null);
        if (ch && typeof ch.messages?.fetch === 'function') {
          const msg = await ch.messages.fetch(saved.message_id).catch(() => null);
          if (msg) await msg.delete().catch(() => {});
        }
      } catch (_) { /* bỏ qua */ }
      db.deletePanel(saved.channel_key);
      results.push(`🗑️ Đã gỡ panel cũ **${saved.channel_key}** (không còn dùng).`);
    }

    // ROLE MỞ KHÓA KÊNH: tạo role + đặt quyền ẩn/hiện kênh theo cảnh giới (GĐ23).
    try {
      const crLines = await channelroles.applyChannelPermissions(interaction.client);
      results.push(...crLines);
    } catch (err) {
      console.error('[setup] channelroles:', err);
      results.push(`⚠️ Role kênh: lỗi khi đặt quyền (${err.message || err}).`);
    }

    const text = `🛠️ **Kết quả /setup:**\n${results.join('\n')}`;
    return interaction.editReply({ content: text.length > 1900 ? text.slice(0, 1900) + '\n… (rút gọn)' : text });
  },
};
