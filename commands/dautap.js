// =====================================================================
//  /dautap — Đấu tập với "Mộc Nhân Hư Ảnh" cùng cảnh giới để THỬ kỹ năng.
//  Không mất gì, không thưởng gì — đánh THEO LƯỢT (chọn chiêu từng lượt).
//  Dùng chung engine combat.js + controller fight.js.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const sects = require('../sects');
const cult = require('../cultivation');
const combat = require('../combat');
const equipment = require('../equipment');
const assets = require('../assets'); // emblem phái mộc nhân làm thumbnail
const fight = require('./fight');
const { requireUnlocked } = require('../util/feature-gate');

function needSect(interaction) {
  return interaction.reply({ content: '🏯 Bạn chưa có môn phái! Gõ `/monphai` để gia nhập đã.', flags: MessageFlags.Ephemeral });
}

// Dựng combatant người chơi (đầy đủ thuộc tính/cấp chiêu/buff bậc/trang bị).
function buildMe(player, username) {
  return combat.build(username, player.realm, player.tier, player.sect, db.getEquipped(player), {
    attrs: db.getAttributes(player),
    skillLevels: db.getSkillLevels(player),
    stagesSinceJoin: Math.max(0, cult.globalStage(player.realm, player.tier) - (player.sect_join_stage || 0)),
    gearBonus: db.combatGearBonus(player, true), // PvE -> gộp Ngự Thú
    pet: db.petStrike(player),
  });
}

function startSpar(interaction, player, useUpdate) {
  const me = buildMe(player, interaction.user.username);
  const all = sects.allSects();
  const foeSect = all[Math.floor(Math.random() * all.length)];
  const dummy = combat.build(`Mộc Nhân (${foeSect.name})`, player.realm, player.tier, foeSect.id);
  const ctx = {
    type: 'dautap',
    title: '🥊 Đấu Tập — Mộc Nhân Hư Ảnh',
    footer: 'Đánh theo lượt · đổi chiêu ở 🎴 Kỹ năng · đấu tập không ảnh hưởng gì.',
    thumbSrc: assets.src(`sect_${foeSect.id}`),
  };
  return fight.start(interaction, me, dummy, ctx, { useUpdate });
}

// Khi trận đấu tập kết thúc -> tổng kết + nút Đấu lại (không thưởng, trừ nhiệm vụ nhập môn khi thắng).
fight.registerOutcome('dautap', async (interaction, f) => {
  const win = f.winner === 'A', draw = f.winner === 'draw';
  if (win) db.addSectQuestProgress(interaction.user.id, 'dautap_win', 1); // nhiệm vụ "Diễn Võ Trường"
  const e = new EmbedBuilder()
    .setColor(draw ? config.colors.info : win ? config.colors.success : config.colors.danger)
    .setTitle('🥊 Đấu Tập — Kết Thúc')
    .setDescription(
      `🆚 **${f.B.name}** ${f.B.sectName}\n\n` +
      `Kết quả sau **${f.round} hiệp**: ${draw ? '🤝 **Hòa!**' : win ? '🏆 **Bạn THẮNG!**' : '☠️ **Bạn THUA!**'}\n` +
      `❤️ Máu còn lại: Bạn ${Math.max(0, Math.round(f.A.hp))}/${f.A.maxHp} · Địch ${Math.max(0, Math.round(f.B.hp))}/${f.B.maxHp}`,
    )
    .setFooter({ text: 'Đổi chiêu ở 🎴 Kỹ năng rồi đấu lại thử.' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dautap:again').setLabel('🔁 Đấu lại').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_kynang').setLabel('🎴 Kỹ năng').setStyle(ButtonStyle.Secondary),
  );
  return { content: '', embeds: [e], components: [row] };
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dautap')
    .setDescription('Đấu tập với mộc nhân để thử kỹ năng môn phái (đánh theo lượt, không mất gì).'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;
    if (!player.sect || !sects.getSect(player.sect)) return needSect(interaction);
    return startSpar(interaction, player, false);
  },

  buttons: {
    // Nút panel Môn Phái / view phái -> mở đấu tập (đánh theo lượt) của chính người bấm.
    async panel_dautap(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.', flags: MessageFlags.Ephemeral });
      if (!player.sect || !sects.getSect(player.sect)) return needSect(interaction);
      return startSpar(interaction, player, false);
    },
    // Đấu lại (từ màn tổng kết) -> bắt đầu trận mới tại chỗ.
    async dautap(interaction) {
      const action = interaction.customId.split(':')[1];
      if (action !== 'again') return;
      const player = db.getPlayer(interaction.user.id);
      if (!player) return;
      if (!player.sect || !sects.getSect(player.sect)) return needSect(interaction);
      return startSpar(interaction, player, true);
    },
  },
};
