const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const cult = require('../cultivation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trogiup')
    .setDescription('Hướng dẫn nhập môn tu tiên & danh sách cảnh giới.'),

  async execute(interaction) {
    // Liệt kê con đường cảnh giới (bỏ Phàm Nhân ở đầu cho gọn dòng).
    const path = cult.REALMS.map((r) => `${r.emoji} ${r.name}`).join(' → ');

    const embed = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('📖 Tiên Đồ Lộ — Khẩu Quyết Nhập Môn')
      .setDescription(
        '**Vòng tu luyện:** tích **tu vi** → **đột phá** cảnh giới → mạnh hơn → lặp lại.\n\n' +
          '**Lệnh chính:**\n' +
          '🌄 `/batdau` — nhập đạo, tạo nhân vật.\n' +
          '🧘 `/tuluyen` — vận công tích tu vi (có thời gian hồi).\n' +
          '🚪 `/bequan` — bế quan tích tu vi theo thời gian (cả khi offline). Gõ lần nữa để xuất quan.\n' +
          '⚡ `/dotpha` — đột phá khi đủ tu vi. Vượt **cảnh giới** = **độ kiếp**, có rủi ro!\n' +
          '📖 `/cottruyen` — cốt truyện chính dẫn dắt từng bước.\n' +
          '🏯 `/monphai` — gia nhập môn phái (từ Trúc Cơ) · 🎴 `/kynang` đổi chiêu · 🥊 `/dautap` thử sức.\n' +
          '📜 `/hoso [ai]` — xem đạo tịch.\n' +
          '🗝️ `/tinhnang` — cây mở khóa tính năng theo cảnh giới.\n' +
          '🏔️ `/top [loại]` — bảng xếp hạng.\n\n' +
          '💬 *Mẹo:* trò chuyện trong server cũng tích chút **ngộ tính** (tu vi).',
      )
      .addFields({ name: 'Con đường cảnh giới', value: path })
      .setFooter({ text: 'Đạo đồ vạn dặm, khởi từ một bước chân.' });

    return interaction.reply({ embeds: [embed] });
  },
};
