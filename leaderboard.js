// =====================================================================
//  BẢNG XẾP HẠNG (dựng embed dùng chung cho /top, panel BXH, nút BXH).
//  Đụng DB (đọc) nên KHÔNG thuần — nhưng tách riêng để /top + panel xài chung.
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const db = require('./database');
const config = require('./config');
const cult = require('./cultivation');
const pvp = require('./pvp');
const assets = require('./assets');
const titles = require('./titles'); // danh hiệu đang đeo (hiện trên podium)
const card = require('./util/card'); // fetch avatar -> data URI
const leaderboardCard = require('./render/leaderboardCard'); // thẻ podium
const profileCard = require('./render/profileCard'); // charDataUri (ảnh nhân vật)

// Ảnh NHÂN VẬT của 1 người chơi cho podium: theo cảnh giới × giới tính × bậc giáp đang mặc.
function playerCharUri(p) {
  let armorTier = null;
  try { const eq = db.getEquippedItems(p).find((it) => it.s === 'armor'); armorTier = eq ? eq.r : null; } catch (_) { /* bỏ qua */ }
  return profileCard.charDataUri(p.realm, p.gender, armorTier);
}

const MEDALS = ['🥇', '🥈', '🥉'];

// Tiêu đề + phụ đề + cách lấy hàng + cách tính "điểm" hiển thị cho từng loại bảng.
const BOARD = {
  canhgioi:  { title: '🏔️ PHONG VÂN BẢNG', sub: 'Cảnh giới cao nhất Tiên Đồ Lộ', rows: (n) => db.topByStage(n), score: (p) => cult.realmLabel(p.realm, p.tier) },
  linhthach: { title: '💎 PHÚ HÀO BẢNG', sub: 'Giàu linh thạch nhất',          rows: (n) => db.topByStones(n), score: (p) => `${p.stones}${config.currency.short}` },
  pvp:       { title: '⚔️ LUẬN VÕ BẢNG', sub: 'Cao thủ Đấu Pháp',              rows: (n) => db.topByPvp(n),    score: (p) => `${pvp.rankOf(p.pvp_rating).emoji} ${p.pvp_rating}` },
};

// Gom data + fetch avatar rồi render THẺ PODIUM. Trả { files:[png] } | lỗi -> { embeds:[boardEmbed] }.
//  client: để fetch avatar người chơi; meId: id người xem (panel "hạng của bạn").
async function boardCard(client, kind = 'canhgioi', meId = null) {
  const b = BOARD[kind] || BOARD.canhgioi;
  try {
    const rows = b.rows(10);
    const top5 = rows.slice(0, 5);
    // Ảnh nhân vật top 5 (ưu tiên). Avatar chỉ fetch để DỰ PHÒNG khi thiếu ảnh char.
    const avatars = await Promise.all(top5.map(async (p) => {
      if (!client || playerCharUri(p)) return null; // có char (hoặc không có client) -> khỏi fetch avatar
      try {
        const u = await client.users.fetch(p.discord_id);
        return await card.fetchImageDataUri(u.displayAvatarURL({ extension: 'png', size: 128 }));
      } catch (_) { return null; }
    }));
    const podium = top5.map((p, i) => ({ rank: i + 1, name: p.username, score: b.score(p), title: titles.label(p.title), charDataUri: playerCharUri(p), avatarDataUri: avatars[i] }));
    const rest = rows.slice(5, 10).map((p, i) => ({ rank: i + 6, name: p.username, score: b.score(p) }));

    // Hạng của bạn (null = panel chung, không hiện): trong top10 -> theo vị trí;
    //  ngoài top + bảng cảnh giới -> rankOf; còn lại -> null.
    let me = null;
    if (meId) {
      const mp = db.getPlayer(meId);
      if (mp) {
        const idx = rows.findIndex((p) => p.discord_id === meId);
        const rank = idx >= 0 ? idx + 1 : (kind === 'canhgioi' ? db.rankOf(mp) : null);
        me = { rank, name: mp.username, score: b.score(mp) };
      }
    }

    const buf = await leaderboardCard.render({
      title: b.title, subtitle: b.sub, podium, rest, me, bgDataUri: leaderboardCard.bgDataUri(),
    });
    return { files: [new AttachmentBuilder(buf, { name: 'bxh.png' })] };
  } catch (err) {
    console.error('[boardCard] render fail:', err && err.message);
    return { embeds: [boardEmbed(kind)] }; // fallback embed cũ
  }
}

// 1 bảng (kind: 'canhgioi' | 'linhthach' | 'pvp'). Trả EmbedBuilder (rỗng cũng có tiêu đề).
function boardEmbed(kind = 'canhgioi', limit = 10) {
  const c = config.currency;
  if (kind === 'pvp') {
    const rows = db.topByPvp(limit);
    const lines = rows.map((p, i) => {
      const medal = MEDALS[i] || `**${i + 1}.**`;
      const r = pvp.rankOf(p.pvp_rating);
      return `${medal} **${p.username}** — ${r.emoji} ${p.pvp_rating} _(${p.pvp_wins}T/${p.pvp_losses}B)_`;
    });
    return new EmbedBuilder()
      .setColor(config.colors.danger)
      .setTitle('⚔️ Luận Võ Bảng — cao thủ Đấu Pháp')
      .setDescription(lines.join('\n') || '*Chưa có ai bước lên Luận Võ Đài. Đạt Nguyên Anh rồi `/dauphap` để khai đài!*')
      .setFooter({ text: 'Tiên Đồ Lộ — xếp theo điểm đấu (ELO)' });
  }
  const rows = kind === 'linhthach' ? db.topByStones(limit) : db.topByStage(limit);
  const lines = rows.map((p, i) => {
    const medal = MEDALS[i] || `**${i + 1}.**`;
    const right = kind === 'linhthach' ? `${p.stones}${c.short} ${c.emoji}` : cult.realmLabel(p.realm, p.tier);
    return `${medal} **${p.username}** — ${right}`;
  });
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(kind === 'linhthach' ? '💎 Phú Hào Bảng — giàu linh thạch nhất' : '🏔️ Phong Vân Bảng — cảnh giới cao nhất')
    .setDescription(lines.join('\n') || '*Chưa có tu sĩ nào nhập đạo. Gõ `/batdau` để mở màn!*')
    .setFooter({ text: 'Tiên Đồ Lộ — top 10' });
}

// Hàng nút xem live (đặt trên panel kênh BXH; phản hồi ẩn từng người).
function boardButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bxh:canhgioi').setLabel('🏔️ Cảnh giới').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('bxh:linhthach').setLabel('💎 Linh thạch').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('bxh:pvp').setLabel('⚔️ Đấu Pháp').setStyle(ButtonStyle.Danger),
  );
}

// View cho PANEL cố định ở kênh Bảng Xếp Hạng: ẢNH PODIUM (cảnh giới) + nút đổi bảng.
//  KHÔNG chữ — mọi thứ trong ảnh. Không client -> dùng ảnh nhân vật (char), bỏ panel "hạng bạn".
//  Lỗi render -> boardCard tự fallback embed cũ (không sập panel).
async function panelView() {
  const payload = await boardCard(null, 'canhgioi', null);
  return { ...payload, components: [boardButtons()] };
}

// Panel BXH = ẢNH, tự cập nhật mỗi 60s (re-upload ảnh). Không sticky (ít đổi vị trí).
require('./util/livepanels').register('bangXepHang', panelView, { sticky: false, image: true, intervalMs: 60 * 1000 });

module.exports = { boardEmbed, boardButtons, panelView, boardCard };
