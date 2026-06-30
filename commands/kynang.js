// =====================================================================
//  /kynang — Xem kho chiêu của môn phái & trang bị tối đa 3 chiêu chủ động.
//  Bị động luôn áp dụng. Chiêu chủ động chọn 1–3 cái mang vào trận.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const sects = require('../sects');
const skills = require('../skills');
const cult = require('../cultivation');
const { requireUnlocked } = require('../util/feature-gate');

function needSect(interaction) {
  return interaction.reply({
    content: '🏯 Bạn chưa có môn phái! Gõ `/monphai` để gia nhập rồi mới có kỹ năng.',
    flags: MessageFlags.Ephemeral,
  });
}

function realmName(r) {
  const x = cult.REALMS[r];
  return x ? `${x.emoji} ${x.name}` : `cảnh giới #${r}`;
}

function skillLine(sk, equipped, lvl, locked) {
  if (locked) {
    const note = skills.unlockRealmOf(sk) > 2
      ? `mở ở ${realmName(skills.unlockRealmOf(sk))}`   // tuyệt kỹ -> theo cảnh giới
      : 'mở qua **nhiệm vụ nhập môn**';                  // chiêu cơ bản -> theo nhiệm vụ phái
    return `🔒 ${sk.emoji} **${sk.name}** _(${note})_\n   ${sk.desc}`;
  }
  const on = equipped.includes(sk.id) ? '✅ ' : '▫️ ';
  const lvTag = lvl > 0 ? ` · ⭐${lvl}` : '';
  const meta = [`💠${sk.mp}`, `⏱️cd${sk.cd}`].join(' · ');
  return `${on}${sk.emoji} **${sk.name}**  _(${meta}${lvTag})_\n   ${sk.desc}`;
}

function buildView(player) {
  const sect = sects.getSect(player.sect);
  const passive = skills.passiveForSect(sect.id);
  const actives = skills.activesForSect(sect.id);
  const qStage = db.getSectQuestStage(player);
  const unlockedList = skills.unlockedActivesForSect(sect.id, player.realm, qStage);
  const unlockedIds = new Set(unlockedList.map((s) => s.id));
  const levels = db.getSkillLevels(player);
  let equipped = db.getEquipped(player);
  if (!equipped.length) equipped = sect.defaultLoadout;
  // chỉ giữ chiêu đã mở khóa trong loadout hiển thị (phòng dữ liệu cũ)
  equipped = equipped.filter((id) => unlockedIds.has(id));

  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`🎴 Kỹ Năng — ${sect.emoji} ${sect.name}`)
    .setDescription(
      `🌟 *Bị động (luôn bật):* **${passive.name}** — ${passive.desc}\n\n` +
        `**Chiêu chủ động** (✅ = đang trang bị, tối đa 3; ⭐ = cấp chiêu):\n\n` +
        actives.map((s) => skillLine(s, equipped, levels[s.id] || 0, !unlockedIds.has(s.id))).join('\n\n'),
    )
    .setFooter({ text: 'Chọn 1–3 chiêu ở menu dưới · nâng cấp chiêu ở panel Hồ Sơ · thử ở /dautap' });

  const options = unlockedList.map((s) => ({
    label: s.name,
    emoji: s.emoji,
    description: s.desc.slice(0, 95),
    value: s.id,
    default: equipped.includes(s.id),
  }));
  const menu = new StringSelectMenuBuilder()
    .setCustomId('skill_equip')
    .setPlaceholder('Chọn 1–3 chiêu chủ động để trang bị…')
    .setMinValues(1)
    .setMaxValues(Math.min(3, options.length))
    .addOptions(options);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kynang')
    .setDescription('Xem & trang bị tối đa 3 chiêu chủ động của môn phái.'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;
    if (!player.sect || !sects.getSect(player.sect)) return needSect(interaction);
    return interaction.reply({ ...buildView(player), flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Nút trên panel Môn Phái / view phái -> mở bảng kỹ năng ẩn của chính người bấm.
    async panel_kynang(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.', flags: MessageFlags.Ephemeral });
      if (!player.sect || !sects.getSect(player.sect)) return needSect(interaction);
      return interaction.reply({ ...buildView(player), flags: MessageFlags.Ephemeral });
    },

    async skill_equip(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player || !player.sect) return;
      const sect = sects.getSect(player.sect);
      // Chỉ nhận chiêu HỢP LỆ của đúng phái & ĐÃ MỞ KHÓA (chống chỉnh tay customId).
      const valid = new Set(skills.unlockedActivesForSect(sect.id, player.realm, db.getSectQuestStage(player)).map((s) => s.id));
      const chosen = interaction.values.filter((v) => valid.has(v)).slice(0, 3);
      if (!chosen.length) {
        return interaction.reply({ content: 'Phải chọn ít nhất 1 chiêu.', flags: MessageFlags.Ephemeral });
      }
      db.setEquipped(interaction.user.id, chosen);
      const updated = db.getPlayer(interaction.user.id);
      return interaction.update(buildView(updated));
    },
  },
};
