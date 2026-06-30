const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const leaderboard = require('../leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Bảng xếp hạng tu sĩ mạnh nhất Tiên Đồ Lộ.')
    .addStringOption((o) =>
      o
        .setName('loai')
        .setDescription('Xếp theo gì? (mặc định: cảnh giới)')
        .addChoices(
          { name: 'Cảnh giới', value: 'canhgioi' },
          { name: 'Linh thạch', value: 'linhthach' },
        ),
    ),

  async execute(interaction) {
    const kind = interaction.options.getString('loai') || 'canhgioi';
    await interaction.deferReply(); // render ảnh podium (fetch avatar + Satori) -> defer cho chắc < 3s
    const payload = await leaderboard.boardCard(interaction.client, kind, interaction.user.id);
    return interaction.editReply(payload);
  },

  buttons: {
    // Nút trên panel kênh Bảng Xếp Hạng -> xem bảng podium mới nhất (ẩn từng người).
    async bxh(interaction) {
      const sub = interaction.customId.split(':')[1];
      const kind = sub === 'linhthach' || sub === 'pvp' ? sub : 'canhgioi';
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const payload = await leaderboard.boardCard(interaction.client, kind, interaction.user.id);
      return interaction.editReply(payload);
    },
  },
};
