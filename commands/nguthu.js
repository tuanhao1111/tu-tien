// =====================================================================
//  /nguthu — NGỰ THÚ: bạn chiến PvE (mở ở Nguyên Anh)
//  Thu phục yêu thú (tốn linh thạch + nguyên liệu) -> luyện cấp -> trang bị 1
//  con. Con đang theo CỘNG CHỈ SỐ PHẲNG + cơ hội tung "đòn phụ" mỗi vòng,
//  CHỈ áp PvE (bí cảnh/săn yêu/tháp/boss/phó bản/đấu tập), KHÔNG vào PvP.
//  customId: panel_nguthu · nguthu_tame:<key> · nguthu_use:<key> ·
//            nguthu_level · nguthu_unequip · nguthu_refresh.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const bicanh = require('../bicanh');
const petbeasts = require('../petbeasts');
const ui = require('../util/ui');

const stone = config.currency.emoji;
const MIN_REALM = (config.pet && config.pet.minRealm) || 4;

function matLine(mats) {
  return Object.entries(mats || {}).map(([id, q]) => { const m = bicanh.materialInfo(id); return m ? `${m.emoji} ${m.name}×${q}` : `${id}×${q}`; }).join(' · ');
}

function locked(interaction, p) {
  if ((p.realm || 0) >= MIN_REALM) return false;
  const r = cult.REALMS[MIN_REALM];
  interaction.reply({ content: `🔒 **Ngự Thú** mở ở **${r.emoji} ${r.name}**. Hiện **${cult.realmLabel(p.realm, p.tier)}** — tu thêm nhé!`, flags: MessageFlags.Ephemeral }).catch(() => {});
  return true;
}

// Dòng mô tả 1 yêu thú theo trạng thái sở hữu.
function beastBlock(b, pets, activeKey, player) {
  const owned = pets[b.key];
  const lv = owned ? (owned.lv || 1) : 1;
  const bn = petbeasts.bonusAt(b, lv);
  const sk = petbeasts.strikeAt(b, lv);
  const ti = petbeasts.tierInfo(b.tier);
  const head = `${ti.emoji} ${b.emoji} **${b.name}**` + (owned ? ` _(Cấp ${lv}${b.key === activeKey ? ' · ĐANG THEO' : ''})_` : '');
  const stats = `❤️+${bn.hp} ⚔️+${bn.atk} 🛡️+${bn.def} 🌀+${bn.spd} · 🐾 đòn phụ ${Math.round(sk.chance * 100)}% ×${sk.power.toFixed(2)}`;
  const tail = owned ? '' : `\n  🔒 *Chưa có — bắt ở 🎰 **Chiêu Hồn Đài** (Shop) hoặc mua thẳng.*`;
  return `${head}\n  ${stats}${tail}`;
}

function view(player) {
  const pets = db.getPets(player);
  const active = db.getActivePet(player);
  const list = petbeasts.beastsFor(player.realm);
  const e = new EmbedBuilder().setColor(ui.chanColor('nguThu')).setTitle('🐉 Ngự Thú Viên — Bạn Chiến');

  const maxLv = petbeasts.maxLevel();
  const bag = db.getMaterials(player);
  const charm = db.getPetCharm(player);
  let atMax = false, isFull = false;
  let desc = '_Yêu thú đồng hành **cộng chỉ số** + thỉnh thoảng **tung đòn phụ** — dùng được **cả PvE lẫn Đấu Pháp (PvP)**._\n\n';
  if (active) {
    const bn = petbeasts.bonusAt(active.beast, active.lv);
    const sk = petbeasts.strikeAt(active.beast, active.lv);
    atMax = active.lv >= maxLv;
    const need = petbeasts.expNeed(active.lv);
    isFull = (active.exp || 0) >= need;
    const evo = petbeasts.evoStage(active.lv);
    const f = (config.pet && config.pet.feed) || {};
    desc += `🌟 **Đang theo:** ${active.beast.emoji} **${active.beast.name}** _(Cấp ${active.lv}/${maxLv}${evo ? ` · Tiến hóa ${evo}` : ''})_\n` +
      `❤️+${bn.hp} ⚔️+${bn.atk} 🛡️+${bn.def} 🌀+${bn.spd} · 🐾 đòn phụ ${Math.round(sk.chance * 100)}% ×${sk.power.toFixed(2)}\n` +
      (atMax
        ? '🏅 Đã đạt **cấp tối đa**!\n'
        : `🧬 EXP: \`${ui.bar(active.exp || 0, need, 14)}\` **${active.exp || 0}/${need}**\n` +
          `🍖 Cho ăn: **1 Yêu Thú Lương + 👻${f.feedYhp} Yêu Hồn Phách** (+${f.foodExp} EXP)` +
          (isFull ? `\n⬆️ **EXP đầy — Đột phá** (tỉ lệ **${Math.round(petbeasts.breakRate(active.lv) * 100)}%**, 🪬 bùa +${Math.round((f.charmBonus || 0) * 100)}% & chống mất EXP)` : '') + '\n') +
      `🍖 Túi: **${bag[f.foodId] || 0}** Yêu Thú Lương · 👻 **${bag.yeu_hon_phach || 0}** · 🪬 **${charm}** bùa\n\n`;
  } else {
    desc += '_(Chưa có thú nào đi theo — bắt ở Chiêu Hồn Đài rồi trang bị 1 con.)_\n\n';
  }
  desc += '**🐾 Đồ giám Ngự Thú:**\n' + list.map((b) => beastBlock(b, pets, active && active.key, player)).join('\n') +
    '\n\n_Bắt thú mới ở 🎰 **Chiêu Hồn Đài** (kênh Shop). Trùng thú → trả 👻 Yêu Hồn Phách._';
  e.setDescription(desc).setFooter({ text: 'Bắt ở Chiêu Hồn Đài → cho ăn/đột phá → trang bị. Mỗi lúc 1 con đi theo.' });

  const rows = [];
  // Hàng trang bị (con SỞ HỮU mà chưa đang theo).
  const equipable = list.filter((b) => pets[b.key] && (!active || active.key !== b.key));
  if (equipable.length) {
    const r = new ActionRowBuilder();
    for (const b of equipable.slice(0, 5)) r.addComponents(new ButtonBuilder().setCustomId(`nguthu_use:${b.key}`).setLabel(`Cho ${b.name} theo`.slice(0, 78)).setStyle(ButtonStyle.Primary).setEmoji(b.emoji));
    rows.push(r);
  }
  // Hàng CHO ĂN / ĐỘT PHÁ con đang theo.
  if (active && !atMax) {
    const r = new ActionRowBuilder();
    r.addComponents(new ButtonBuilder().setCustomId('nguthu_feed').setLabel('🍖 Cho ăn').setStyle(ButtonStyle.Success).setDisabled(isFull));
    if (isFull) {
      r.addComponents(new ButtonBuilder().setCustomId('nguthu_break:0').setLabel('⬆️ Đột phá').setStyle(ButtonStyle.Danger));
      if (charm > 0) r.addComponents(new ButtonBuilder().setCustomId('nguthu_break:1').setLabel('🪬 Đột phá (dùng bùa)').setStyle(ButtonStyle.Primary));
    }
    rows.push(r);
  }
  // Hàng phụ: tháo thú + làm mới.
  const act = new ActionRowBuilder();
  if (active) act.addComponents(new ButtonBuilder().setCustomId('nguthu_unequip').setLabel('🚫 Tháo thú').setStyle(ButtonStyle.Secondary));
  act.addComponents(new ButtonBuilder().setCustomId('nguthu_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary));
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
  const e = ui.panelEmbed('nguThu', {
    title: '🐉 Ngự Thú Viên',
    desc:
      `Đạt **${r.emoji} ${r.name}** để nuôi **Ngự Thú** làm bạn chiến.\n\n` +
      '🎰 Bắt thú ở **Chiêu Hồn Đài** (Shop) → **trang bị 1 con** → **cho ăn** để lên cấp & **tiến hóa**.\n' +
      '⚔️ Con đang theo **cộng chỉ số** + thỉnh thoảng **tung đòn phụ** — dùng được **cả PvE lẫn Đấu Pháp (PvP)** (cả hai đấu thủ đều mang thú của mình).',
    footer: 'Bấm để mở Ngự Thú Viên của riêng bạn.',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_nguthu', 'Mở Ngự Thú Viên', 'primary', { emoji: '🐉' }))] };
}

module.exports = {
  data: new SlashCommandBuilder().setName('nguthu').setDescription('Ngự Thú — thu phục yêu thú làm bạn chiến PvE (mở ở Nguyên Anh).'),
  async execute(interaction) { return open(interaction); },
  panelView,

  buttons: {
    async panel_nguthu(interaction) { return open(interaction); },
    async nguthu_refresh(interaction) {
      const p = db.getPlayer(interaction.user.id); if (!p) return;
      return interaction.update(view(p));
    },

    async nguthu_tame(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId); if (!p) return;
      if (locked(interaction, p)) return;
      const key = interaction.customId.split(':')[1];
      const res = db.tamePet(userId, key);
      if (res.err === 'nostones') return interaction.reply({ content: `💰 Không đủ linh thạch! Cần ${stone}**${ui.num(res.need)}**.`, flags: MessageFlags.Ephemeral });
      if (res.err === 'nomats') return interaction.reply({ content: `🧪 Thiếu nguyên liệu thu phục: ${matLine(res.mats)}.`, flags: MessageFlags.Ephemeral });
      if (res.err === 'owned') return interaction.update(view(db.getPlayer(userId)));
      if (res.err === 'realm') return interaction.reply({ content: `🔒 Cần **${cult.REALMS[res.need].name}** mới thu phục được con này.`, flags: MessageFlags.Ephemeral });
      if (res.err) return interaction.update(view(db.getPlayer(userId)));
      await interaction.update(view(db.getPlayer(userId)));
      return interaction.followUp({ content: `🎉 Thu phục **${res.beast.emoji} ${res.beast.name}** thành công! Nó đã sẵn sàng theo bạn vào PvE.`, flags: MessageFlags.Ephemeral });
    },

    async nguthu_use(interaction) {
      const userId = interaction.user.id;
      const key = interaction.customId.split(':')[1];
      db.setActivePet(userId, key);
      return interaction.update(view(db.getPlayer(userId)));
    },
    async nguthu_unequip(interaction) {
      db.setActivePet(interaction.user.id, null);
      return interaction.update(view(db.getPlayer(interaction.user.id)));
    },
    async nguthu_feed(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId); if (!p) return;
      const active = db.getActivePet(p);
      if (!active) return interaction.update(view(p));
      const res = db.feedPet(userId, active.key);
      if (res.err === 'nofood') return interaction.reply({ content: '🍖 Hết **Yêu Thú Lương**! Mua ở **Shop** hoặc farm **Truy Tung Nhiếp Hồn** (rớt).', flags: MessageFlags.Ephemeral });
      if (res.err === 'noyhp') return interaction.reply({ content: `👻 Thiếu **Yêu Hồn Phách** (cần ${res.need}). Farm ở **Luyện Trường → Truy Tung**.`, flags: MessageFlags.Ephemeral });
      if (res.err === 'full') return interaction.update(view(db.getPlayer(userId)));
      if (res.err) return interaction.update(view(db.getPlayer(userId)));
      await interaction.update(view(db.getPlayer(userId)));
      if (res.full) return interaction.followUp({ content: `🍖 **${active.beast.name}** đã no! EXP đầy **${res.exp}/${res.need}** — bấm **⬆️ Đột phá** để lên cấp.`, flags: MessageFlags.Ephemeral });
    },
    async nguthu_break(interaction) {
      const userId = interaction.user.id;
      const useCharm = interaction.customId.split(':')[1] === '1';
      const p = db.getPlayer(userId); if (!p) return;
      const active = db.getActivePet(p);
      if (!active) return interaction.update(view(p));
      const res = db.breakPet(userId, active.key, useCharm);
      if (res.err === 'notready') return interaction.update(view(db.getPlayer(userId)));
      if (res.err === 'nocharm') return interaction.reply({ content: '🪬 Bạn hết **Ngự Thú Phù** — mua ở **Phường Thị Cao Cấp** (🔮 Tiên Ngọc).', flags: MessageFlags.Ephemeral });
      if (res.err === 'maxed') return interaction.update(view(db.getPlayer(userId)));
      if (res.err) return interaction.update(view(db.getPlayer(userId)));
      await interaction.update(view(db.getPlayer(userId)));
      const evoNote = res.evolvedTo ? ` ✨ **TIẾN HÓA hình dạng ${res.evolvedTo}!**` : '';
      const msg = res.success
        ? `⬆️ **Đột phá THÀNH CÔNG!** ${active.beast.name} lên **Cấp ${res.lv}**.${evoNote}`
        : `💥 **Đột phá TRƯỢT!** ${res.usedCharm ? '🪬 Bùa giữ nguyên EXP — thử lại.' : 'Mất một phần EXP — cho ăn thêm rồi thử lại (dùng 🪬 bùa cho chắc).'}`;
      return interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
    },
  },
};
