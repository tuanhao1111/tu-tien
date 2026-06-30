const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const features = require('../features');
const cult = require('../cultivation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tinhnang')
    .setDescription('Xem cây mở khóa tính năng theo cảnh giới.'),

  async execute(interaction) {
    const p = db.getPlayer(interaction.user.id);
    if (!p) {
      return interaction.reply({
        content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const lines = features.FEATURES.map((f) => {
      const unlocked = features.isUnlocked(p, f);
      const tag = unlocked
        ? f.status === 'soon'
          ? '🟡 *(đã mở — sắp ra mắt)*'
          : '✅'
        : `🔒 cần ${features.realmName(f.realm)}`;
      const cmds = (f.commands || []).map((c) => `\`/${c}\``).join(' ');
      return `${f.emoji} **${f.name}** ${cmds}\n   ${f.desc}\n   ${tag}`;
    });

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🗝️ Cây Mở Khóa Tính Năng')
      .setDescription(
        `Cảnh giới hiện tại của đạo hữu: **${cult.realmLabel(p.realm, p.tier)}**\n` +
          'Lên cảnh giới cao hơn để mở khóa thêm tính năng mới.\n\n' +
          lines.join('\n\n'),
      )
      .setFooter({ text: 'Tiên Đồ Lộ — đạo đồ vạn dặm.' });

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
