const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const { assignPlayerRole } = require('../util/playerrole');
const channelroles = require('../util/channelroles');

// Bước 1 — CHỌN GIỚI TÍNH (cố định). Hiển thị trước khi tạo nhân vật.
function genderView(username) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🌄 Trước Khi Nhập Đạo — Chọn Thân Phận')
    .setDescription(
      `**${username}**, trước khi bước chân vào **Tiên Đồ Lộ**, hãy chọn **giới tính** cho thân xác tu hành.\n\n` +
      '⚠️ **Giới tính là CỐ ĐỊNH** — sau khi chọn không thể tự đổi. Chỉ có thể đổi bằng 🎟️ **Vé Đổi Giới Tính** ' +
      '(mua ở **Phường Thị Cao Cấp** bằng 🔮 Tiên Ngọc).',
    )
    .setFooter({ text: 'Chọn giới tính để chính thức khai mở tu vi.' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reg_gender:nam').setLabel('Nam').setStyle(ButtonStyle.Primary).setEmoji('♂️'),
    new ButtonBuilder().setCustomId('reg_gender:nu').setLabel('Nữ').setStyle(ButtonStyle.Danger).setEmoji('♀️'),
  );
  return { embeds: [embed], components: [row] };
}

// Bước 2 — chào mừng người mới nhập đạo (sau khi đã tạo nhân vật + cấp role).
function welcome(username, gender, roleAssigned) {
  const gLabel = gender === 'nu' ? '♀️ Nữ' : '♂️ Nam';
  const roleNote = roleAssigned
    ? '\n🔔 Đã cấp **vai trò người chơi** — từ nay đạo hữu sẽ nhận thông báo của Tiên Đồ Lộ.'
    : '';
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('🌄 Một Phàm Nhân vừa bước chân vào Tiên Đồ Lộ')
    .setDescription(
      `**${username}** (${gLabel}) rời bỏ hồng trần, quyết chí tu tiên.\n` +
        `Hiện tại: **${cult.realmLabel(0, 1)}** — kẻ phàm tay trắng, chưa có một sợi linh khí.${roleNote}\n\n` +
        `📖 **Cốt truyện "Tiên Đồ Lộ Ký"** sẽ dẫn dắt đạo hữu từng bước — bấm nút bên dưới để tới **bảng Nhiệm Vụ** bắt đầu hành trình!\n\n` +
        `🧘 \`/tuluyen\` hấp thụ linh khí · 🚪 \`/bequan\` bế quan · ⚡ \`/dotpha\` đột phá\n` +
        `📜 \`/hoso\` xem bản thân · 🗝️ \`/tinhnang\` cây mở khóa · \`/trogiup\` khai mở.`,
    )
    .setFooter({ text: 'Đạo đồ vạn dặm, khởi từ một bước chân.' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('goto_quests').setLabel('🧭 Bắt đầu hành trình').setStyle(ButtonStyle.Primary),
  );
  return { embeds: [embed], components: [row] };
}

// Hướng dẫn người chơi tới kênh Nhiệm Vụ (thay vì mở cốt truyện inline).
function questsGuide() {
  const ch = config.channels.nhiemVu;
  if (ch) {
    return `🧭 **Hành trình của đạo hữu bắt đầu tại** <#${ch}>!\n` +
      'Vào kênh đó:\n' +
      '▸ Bấm **📖 Cốt truyện** để theo chính tuyến "Tiên Đồ Lộ Ký" — dẫn dắt từng bước, mở khóa tính năng theo cảnh giới.\n' +
      '▸ Bấm **📋 Nhiệm vụ ngày** để nhận thưởng mỗi ngày.\n\n' +
      '📜 Ghé kênh **Hồ Sơ** để xem bản thân, cộng thuộc tính và đọc **Cẩm nang hướng dẫn** đầy đủ.';
  }
  // Chưa cấu hình kênh (vd lúc test) -> chỉ về slash command.
  return '🧭 Bắt đầu hành trình: gõ **`/cottruyen`** để theo chính tuyến, **`/nhiemvu`** xem nhiệm vụ ngày, **`/hoso`** xem bản thân + cẩm nang.';
}

// Đã nhập đạo rồi -> nhắc nhẹ (dùng chung cho /batdau và panel).
function alreadyMsg(username) {
  return `Đạo hữu **${username}** đã nhập đạo từ lâu rồi! Gõ \`/hoso\` để xem tu vi.`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('batdau')
    .setDescription('Nhập đạo tu tiên — bắt đầu hành trình từ Phàm Nhân!'),

  async execute(interaction) {
    const existing = db.getPlayer(interaction.user.id);
    if (existing) {
      return interaction.reply({ content: alreadyMsg(interaction.user.username), flags: MessageFlags.Ephemeral });
    }
    // Bước 1: chọn giới tính trước (chưa tạo nhân vật).
    return interaction.reply({ ...genderView(interaction.user.username), flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Panel Sơ Nhập: nút "Nhập đạo" — mở bước chọn giới tính (phản hồi ẩn từng người).
    async panel_register(interaction) {
      const existing = db.getPlayer(interaction.user.id);
      if (existing) {
        return interaction.reply({
          content: `Đạo hữu **${interaction.user.username}** đã nhập đạo rồi! Tới kênh **Hồ Sơ** xem bản thân, kênh **Nhiệm Vụ** để tu luyện.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({ ...genderView(interaction.user.username), flags: MessageFlags.Ephemeral });
    },

    // Chọn giới tính -> TẠO nhân vật (giới tính cố định) + cấp role thông báo + chào mừng.
    async reg_gender(interaction) {
      const gender = interaction.customId.split(':')[1] === 'nu' ? 'nu' : 'nam';
      const existing = db.getPlayer(interaction.user.id);
      if (existing) {
        return interaction.update({ content: alreadyMsg(interaction.user.username), embeds: [], components: [] }).catch(() => {});
      }
      db.createPlayer(interaction.user.id, interaction.user.username, gender);
      const roleAssigned = await assignPlayerRole(interaction); // nuốt lỗi nếu thiếu quyền — không chặn đăng ký
      await channelroles.grantUpTo(interaction.member, 0).catch(() => {}); // role mở kênh theo cảnh giới (mốc realm 0)
      return interaction.update(welcome(interaction.user.username, gender, roleAssigned)).catch(() => {});
    },

    // Nút "Bắt đầu hành trình": dẫn người chơi tới kênh Nhiệm Vụ.
    async goto_quests(interaction) {
      return interaction.reply({ content: questsGuide(), flags: MessageFlags.Ephemeral });
    },
  },
};
