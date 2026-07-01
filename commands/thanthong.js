// =====================================================================
//  /thanthong — THẦN THÔNG: nhánh tu NGUYÊN THẦN (mở ở Hóa Thần)
//  Nuôi Nguyên Thần lên cấp (tốn linh thạch + nguyên liệu) -> mở dần các Thần
//  Thông (buff chỉ số PHẲNG). Vận tối đa N Thần Thông -> cộng combat CẢ PvE
//  LẪN PvP. customId: panel_thanthong · tt_level · tt_toggle:<id> · tt_refresh.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const bicanh = require('../bicanh');
const thanthong = require('../thanthong');
const ui = require('../util/ui');

const stone = config.currency.emoji;
const MIN_REALM = (config.thanthong && config.thanthong.minRealm) || 5;

function statBonusText(bonus) {
  const E = { hp: '❤️', atk: '⚔️', def: '🛡️', spd: '🌀', mp: '💠', crit: '💥', dodge: '💨', critDmg: '🔥' };
  return Object.entries(bonus).map(([k, v]) => {
    const pct = (k === 'crit' || k === 'dodge' || k === 'critDmg');
    return `${E[k] || ''}+${pct ? Math.round(v * 100) + '%' : v}`;
  }).join(' ');
}
function matLine(mats) {
  return Object.entries(mats || {}).map(([id, q]) => { const m = bicanh.materialInfo(id); return m ? `${m.emoji} ${m.name}×${q}` : `${id}×${q}`; }).join(' · ');
}

function locked(interaction, p) {
  if ((p.realm || 0) >= MIN_REALM) return false;
  const r = cult.REALMS[MIN_REALM];
  interaction.reply({ content: `🔒 **Thần Thông** mở ở **${r.emoji} ${r.name}**. Hiện **${cult.realmLabel(p.realm, p.tier)}** — tu thêm nhé!`, flags: MessageFlags.Ephemeral }).catch(() => {});
  return true;
}

function view(player) {
  const lv = db.getThanLevel(player);
  const maxLv = thanthong.maxLevel();
  const slots = thanthong.slotsForLevel(lv);
  const active = new Set(db.getThanThong(player));
  const cost = lv < maxLv ? thanthong.levelCost(lv, player) : null;

  const e = new EmbedBuilder().setColor(ui.chanColor('thanThong')).setTitle('👁️ Nguyên Thần Điện — Thần Thông');
  let desc =
    `🧠 **Cấp Nguyên Thần:** ${lv}/${maxLv} · 🎴 **Ô vận:** ${active.size}/${slots}\n` +
    (cost ? `⬆️ Lên cấp ${lv + 1}: ${stone}${ui.num(cost.stones)} + ${matLine(cost.mat)} _(mở thêm 1 Thần Thông)_\n` : '🏅 Nguyên Thần đã viên mãn!\n') +
    '_Thần Thông cộng chỉ số **dùng cả PvE lẫn Đấu Pháp (PvP)**. Vận/gỡ tùy ý trong số ô._\n\n**🌌 Thần Thông:**\n';

  desc += thanthong.POWERS.map((pw) => {
    const unlocked = lv >= pw.unlock;
    const on = active.has(pw.id);
    const icon = on ? '🟢' : unlocked ? '⚪' : '🔒';
    const tail = unlocked ? '' : ` _(mở ở cấp Nguyên Thần ${pw.unlock})_`;
    return `${icon} ${pw.emoji} **${pw.name}** — ${statBonusText(pw.bonus)}${on ? ' · *đang vận*' : ''}${tail}`;
  }).join('\n');
  e.setDescription(desc).setFooter({ text: 'Lên cấp Nguyên Thần để mở thêm + nhiều ô vận hơn (tối đa ' + (config.thanthong.slotsMax || 3) + ' ô).' });

  const rows = [];
  // Nút bật/tắt cho Thần Thông ĐÃ MỞ (tối đa ~8 -> 2 hàng).
  const unlocked = thanthong.unlockedAt(lv);
  for (let i = 0; i < unlocked.length && rows.length < 4; i += 5) {
    const r = new ActionRowBuilder();
    for (const pw of unlocked.slice(i, i + 5)) {
      r.addComponents(new ButtonBuilder().setCustomId(`tt_toggle:${pw.id}`).setLabel(pw.name.slice(0, 78))
        .setStyle(active.has(pw.id) ? ButtonStyle.Success : ButtonStyle.Secondary).setEmoji(pw.emoji));
    }
    rows.push(r);
  }
  const act = new ActionRowBuilder();
  if (lv < maxLv) act.addComponents(new ButtonBuilder().setCustomId('tt_level').setLabel('⬆️ Luyện Nguyên Thần').setStyle(ButtonStyle.Danger));
  act.addComponents(new ButtonBuilder().setCustomId('tt_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary));
  rows.push(act);
  return { embeds: [e], components: rows.slice(0, 5) };
}

async function open(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** đăng ký đã.', flags: MessageFlags.Ephemeral });
  if (locked(interaction, p)) return;
  return interaction.reply({ ...view(p), flags: MessageFlags.Ephemeral });
}

function panelView() {
  const r = cult.REALMS[MIN_REALM];
  const e = ui.panelEmbed('thanThong', {
    title: '👁️ Nguyên Thần Điện',
    desc:
      `Đạt **${r.emoji} ${r.name}** để khai mở **nhánh tu Nguyên Thần**.\n\n` +
      '🧠 **Luyện Nguyên Thần** lên cấp (tốn linh thạch + nguyên liệu) → mở dần các **Thần Thông**.\n' +
      '🌌 **Vận Thần Thông** (tối đa nhiều ô theo cấp) — cộng chỉ số **dùng cả PvE lẫn Đấu Pháp (PvP)**.',
    footer: 'Bấm để mở Nguyên Thần Điện của riêng bạn.',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_thanthong', 'Mở Nguyên Thần Điện', 'primary', { emoji: '👁️' }))] };
}

module.exports = {
  data: new SlashCommandBuilder().setName('thanthong').setDescription('Thần Thông — tu luyện Nguyên Thần, vận Thần Thông cộng chỉ số (mở ở Hóa Thần).'),
  async execute(interaction) { return open(interaction); },
  panelView,

  buttons: {
    async panel_thanthong(interaction) { return open(interaction); },
    async tt_refresh(interaction) {
      const p = db.getPlayer(interaction.user.id); if (!p) return;
      return interaction.update(view(p));
    },
    async tt_level(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId); if (!p) return;
      if (locked(interaction, p)) return;
      const res = db.levelThanThong(userId);
      if (res.err === 'maxed') return interaction.update(view(db.getPlayer(userId)));
      if (res.err === 'nostones') return interaction.reply({ content: `💰 Không đủ linh thạch! Cần ${stone}**${ui.num(res.need)}**.`, flags: MessageFlags.Ephemeral });
      if (res.err === 'nomats') return interaction.reply({ content: `🧪 Thiếu nguyên liệu nuôi Nguyên Thần: ${matLine(res.mat)}.`, flags: MessageFlags.Ephemeral });
      if (res.err) return interaction.update(view(db.getPlayer(userId)));
      await interaction.update(view(db.getPlayer(userId)));
      return interaction.followUp({ content: `🧠 Nguyên Thần lên **Cấp ${res.level}**! Mở thêm Thần Thông — vào vận thử.`, flags: MessageFlags.Ephemeral });
    },
    async tt_toggle(interaction) {
      const userId = interaction.user.id;
      const ttId = interaction.customId.split(':')[1];
      const res = db.toggleThanThong(userId, ttId);
      if (res.err === 'locked') return interaction.reply({ content: `🔒 Thần Thông này mở ở **cấp Nguyên Thần ${res.need}**.`, flags: MessageFlags.Ephemeral });
      if (res.err === 'full') return interaction.reply({ content: `🎴 Đã đầy **${res.slots} ô vận**! Gỡ bớt 1 Thần Thông rồi vận cái khác.`, flags: MessageFlags.Ephemeral });
      if (res.err) return interaction.update(view(db.getPlayer(userId)));
      return interaction.update(view(db.getPlayer(userId)));
    },
  },
};
