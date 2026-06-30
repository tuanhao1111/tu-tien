// =====================================================================
//  /nhiemvu — NHIỆM VỤ HẰNG NGÀY (panel Nhiệm Vụ, phần phụ).
//  Cốt truyện chính ở /cottruyen (nút riêng trên panel). Đây là nhiệm vụ
//  lặp lại mỗi ngày: tu luyện, luận đạo, đột phá, bí cảnh… lãnh thưởng.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const quests = require('../quests');

const c = config.currency;

function rewardText(r) {
  const parts = [];
  if (r.tuVi) parts.push(`🧘 ${r.tuVi} tu vi`);
  if (r.stones) parts.push(`${c.emoji} ${r.stones}${c.short}`);
  return parts.join(' + ') || '—';
}

function dailyView(player) {
  const list = quests.dailiesFor(player);
  const d = db.getDaily(player);

  const lines = list.map((q) => {
    const cur = Math.min(q.goal, d.progress[q.id] || 0);
    const claimed = !!d.claimed[q.id];
    const bar = cult.progressBar(cur, q.goal, 10);
    const status = claimed ? '✅ *Đã nhận*' : cur >= q.goal ? '🎁 *Sẵn sàng lãnh!*' : '';
    return `${q.emoji} **${q.name}** — ${q.desc}\n   \`${bar}\` ${cur}/${q.goal} · 🎁 ${rewardText(q.reward)} ${status}`;
  });

  const e = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle('📋 Nhiệm Vụ Hằng Ngày')
    .setDescription(lines.join('\n\n') || '*(Chưa có nhiệm vụ nào mở ở cảnh giới này.)*')
    .setFooter({ text: 'Reset mỗi ngày · cốt truyện chính ở nút "Cốt truyện".' });

  // Mỗi hàng tối đa 5 nút (Discord giới hạn) -> chia nhiều hàng, tối đa 5 hàng (25 nút).
  const btns = list.map((q) => {
    const cur = d.progress[q.id] || 0;
    const ready = cur >= q.goal && !d.claimed[q.id];
    return new ButtonBuilder().setCustomId(`daily_claim:${q.id}`).setLabel(`🎁 ${q.name}`.slice(0, 80))
      .setStyle(ready ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!ready);
  });
  const components = [];
  for (let i = 0; i < btns.length && components.length < 5; i += 5) {
    components.push(new ActionRowBuilder().addComponents(btns.slice(i, i + 5)));
  }
  return { embeds: [e], components };
}

async function open(interaction) {
  const player = db.getPlayer(interaction.user.id);
  if (!player) {
    return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" đã.', flags: MessageFlags.Ephemeral });
  }
  return interaction.reply({ ...dailyView(player), flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nhiemvu')
    .setDescription('Xem & lãnh thưởng nhiệm vụ hằng ngày.'),

  async execute(interaction) {
    return open(interaction);
  },

  buttons: {
    // Panel Nhiệm Vụ: mở hub nhiệm vụ ngày (ẩn từng người).
    async panel_quests(interaction) {
      return open(interaction);
    },

    async daily_claim(interaction) {
      const questId = interaction.customId.split(':')[1];
      const res = db.claimDaily(interaction.user.id, questId);
      if (res.err) {
        const msg = {
          incomplete: 'Nhiệm vụ chưa hoàn thành!',
          claimed: 'Phần thưởng này đã nhận rồi 😅',
          invalid: 'Nhiệm vụ không hợp lệ.',
        }[res.err] || 'Không lãnh được.';
        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
      const player = db.getPlayer(interaction.user.id);
      await interaction.update(dailyView(player));
      return interaction.followUp({ content: `🎁 Đã nhận: ${rewardText(res.reward)}!`, flags: MessageFlags.Ephemeral });
    },
  },
};
