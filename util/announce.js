// =====================================================================
//  VỌNG ÂM ĐÀI — loan báo thông báo game ra kênh chung (config.channels.vongAmDai).
//  Fire-and-forget: KHÔNG bao giờ làm vỡ lệnh gọi nó (mọi lỗi nuốt êm).
//  Cách dùng: announce(interaction.client, embed)  — hoặc announce(client, { embeds }).
// =====================================================================
const config = require('../config');
const { getPlayerRole } = require('./playerrole');

// Gửi 1 thông báo (EmbedBuilder hoặc payload {embeds,content}) ra Vọng Âm Đài.
//  Không await ở chỗ gọi cũng được — trả Promise nhưng tự nuốt lỗi.
//  opts.pingPlayers: kèm @role người chơi (báo toàn bộ người đã đăng ký game).
function announce(client, embedOrPayload, opts = {}) {
  const channelId = config.channels.vongAmDai;
  if (!client || !channelId) return Promise.resolve(false);
  const payload = embedOrPayload && embedOrPayload.embeds
    ? { ...embedOrPayload }
    : { embeds: [embedOrPayload] };
  return (async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || typeof channel.send !== 'function') return false;
      if (opts.pingPlayers && channel.guild) {
        const role = await getPlayerRole(channel.guild).catch(() => null);
        if (role) {
          payload.content = `${payload.content ? payload.content + '\n' : ''}<@&${role.id}>`;
          payload.allowedMentions = { roles: [role.id] };
        }
      }
      await channel.send(payload);
      return true;
    } catch (_) {
      return false; // kênh chưa cấu hình / bot không thấy / mất quyền -> bỏ qua
    }
  })();
}

module.exports = { announce };
