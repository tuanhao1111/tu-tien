// =====================================================================
//  Helper KHÓA CỨNG tính năng theo cảnh giới (dùng chung cho mọi lệnh).
//  - requireUnlocked(interaction): trả player nếu mở khóa, hoặc null + đã
//    tự trả lời thông báo khóa (gọi xong cứ `if (!p) return;`).
//  - makeStub(cmdName, opts): tạo nhanh 1 lệnh "sắp ra mắt" có khóa cứng,
//    để khung mở khóa chạy thật + test được ngay từ bây giờ.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const features = require('../features');
const cult = require('../cultivation');

// Kiểm tra người chơi + khóa cứng lệnh. Trả player hoặc null (đã reply).
async function requireUnlocked(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) {
    await interaction.reply({
      content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.',
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  const chk = features.checkCommand(p, interaction.commandName);
  if (!chk.ok) {
    await interaction.reply({
      content:
        `🔒 **${chk.feature.emoji} ${chk.feature.name}** chưa mở khóa!\n` +
        `Cần đạt cảnh giới **${features.realmName(chk.needRealm)}** mới dùng được.\n` +
        `Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}** — tu luyện thêm nhé!`,
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  return p;
}

// Tạo 1 lệnh stub "đã mở khóa nhưng sắp ra mắt" (vẫn bị khóa cứng nếu chưa đủ cảnh giới).
function makeStub(cmdName, { description }) {
  return {
    data: new SlashCommandBuilder().setName(cmdName).setDescription(description),
    async execute(interaction) {
      const p = await requireUnlocked(interaction);
      if (!p) return;
      const f = features.featureForCommand(cmdName);
      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`${f.emoji} ${f.name} — đã mở khóa!`)
        .setDescription(
          `Đạo hữu đã đủ cảnh giới để dùng **${f.name}**. 🎉\n` +
            `*Tính năng đang được khai phá, sắp ra mắt ở bản cập nhật tới.*\n\n${f.desc}`,
        )
        .setFooter({ text: 'Cảm ơn đạo hữu đã kiên nhẫn tu luyện!' });
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
  };
}

module.exports = { requireUnlocked, makeStub };
