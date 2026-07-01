// =====================================================================
//  /dutien — NGUYÊN THẦN XUẤT KHIẾU · DU TIÊN (idle/offline, mở ở Luyện Hư)
//  Nguyên Thần rời thân đi "lịch luyện" tới vùng xa trong vài giờ (offline
//  vẫn chạy). Đủ giờ -> Nguyên Thần về, thu nguyên liệu hiếm + linh thạch +
//  tu vi + cơ hội rớt trang bị & Tiên Ngọc. Mỗi lúc CHỈ 1 chuyến.
//  customId: panel_dutien · dutien_go:<key> · dutien_collect · dutien_refresh.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const dampen = require('../dampen');
const bicanh = require('../bicanh');
const gear = require('../gear');
const dutien = require('../dutien');
const ui = require('../util/ui');
const assets = require('../assets');
const autorefresh = require('../util/autorefresh');

const stone = config.currency.emoji;
const prem = config.premiumCurrency;
const MIN_REALM = (config.dutien && config.dutien.minRealm) || 6;

function matLine(mats) {
  return Object.entries(mats || {}).filter(([, q]) => q > 0)
    .map(([id, q]) => { const m = bicanh.materialInfo(id); return m ? `${m.emoji} ${m.name} ×${q}` : null; })
    .filter(Boolean).join(' · ');
}

// Gate: chỉ cần đạt cảnh giới. Trả true nếu BỊ KHÓA (đã reply).
function locked(interaction, p) {
  if ((p.realm || 0) >= MIN_REALM) return false;
  const r = cult.REALMS[MIN_REALM];
  interaction.reply({
    content: `🔒 **Du Tiên (Nguyên Thần Xuất Khiếu)** mở ở **${r.emoji} ${r.name}**. Hiện **${cult.realmLabel(p.realm, p.tier)}** — tu thêm nhé!`,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
  return true;
}

// --- View ẩn theo trạng thái chuyến ---
function view(player, now) {
  const st = dutien.tripState(player, now);
  const e = new EmbedBuilder().setColor(ui.chanColor('duTien'));

  if (st.state === 'traveling') {
    const gone = st.durMs - st.leftMs;
    e.setTitle(`🧭 Nguyên Thần đang viễn du — ${st.dest.emoji} ${st.dest.name}`)
      .setDescription(
        `_${st.dest.lore}_\n\n` +
        `\`${ui.bar(gone, st.durMs, 16)}\` về sau **${ui.dur(st.leftMs)}** _(tự cập nhật · offline vẫn chạy)_\n\n` +
        '🪷 Nguyên Thần đang rời thân — không thể đi chuyến khác tới khi về.',
      ).setFooter({ text: 'Nguyên Thần tự về dù bạn offline. Quay lại thu cơ duyên.' });
    return { embeds: [e], components: [ui.row(ui.btn('dutien_refresh', 'Làm mới', 'secondary', { emoji: '🔄' }))] };
  }

  if (st.state === 'done') {
    e.setTitle(`✨ Nguyên Thần đã hồi quy — ${st.dest.emoji} ${st.dest.name}`)
      .setDescription(`Nguyên Thần mang đầy cơ duyên trở về thân! Bấm **Thu cơ duyên** để nhận.`)
      .setFooter({ text: 'Thu xong có thể lên đường chuyến mới.' });
    return { embeds: [e], components: [ui.row(ui.btn('dutien_collect', '🎁 Thu cơ duyên', 'success'))] };
  }

  // idle -> chọn điểm đến (đã mở theo cảnh giới)
  const dests = dutien.destsFor(player.realm);
  const lines = dests.map((d) => {
    const rw = dutien.rewardsFor(d, player);
    return `${d.emoji} **${d.name}** _(${d.hours}h)_ — ${stone}~${ui.num(rw.stones)} · 🌀~${ui.num(rw.tuVi)} tu vi · ${matLine(rw.mats)}`;
  });
  e.setTitle('🧭 Nguyên Thần Xuất Khiếu — Du Tiên')
    .setDescription(
      'Nguyên Thần rời thân đi **lịch luyện** vùng xa (idle · offline vẫn chạy). Xa hơn = lâu hơn nhưng cơ duyên hậu hơn:\n\n' +
      lines.join('\n') +
      '\n\n🎁 Mỗi chuyến: nguyên liệu hiếm + linh thạch + tu vi + cơ hội **rớt trang bị** & 🔮 **Tiên Ngọc**.',
    )
    .setFooter({ text: 'Chọn một điểm đến để xuất khiếu. Mỗi lúc chỉ 1 chuyến.' });
  const row = new ActionRowBuilder();
  for (const d of dests.slice(0, 5)) {
    row.addComponents(new ButtonBuilder().setCustomId(`dutien_go:${d.key}`).setLabel(`${d.name} (${d.hours}h)`.slice(0, 78)).setStyle(ButtonStyle.Primary).setEmoji(d.emoji));
  }
  return { embeds: [e], components: [row] };
}

// Auto-refresh đếm ngược tới lúc Nguyên Thần về thì dừng.
function startRefresh(interaction, userId) {
  const p0 = db.getPlayer(userId);
  if (dutien.tripState(p0, Date.now()).state !== 'traveling') return;
  autorefresh.start(interaction, () => {
    const np = db.getPlayer(userId); if (!np) return null;
    const st = dutien.tripState(np, Date.now());
    return { view: view(np, Date.now()), done: st.state !== 'traveling' };
  });
}

async function open(interaction) {
  const userId = interaction.user.id;
  autorefresh.stop(userId);
  const p = db.getPlayer(userId);
  if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** đăng ký đã.', flags: MessageFlags.Ephemeral });
  if (locked(interaction, p)) return;
  await interaction.reply({ ...view(p, Date.now()), flags: MessageFlags.Ephemeral });
  startRefresh(interaction, userId);
}

// PANEL CÔNG KHAI (sticky) ở kênh Du Tiên.
function panelView() {
  const r = cult.REALMS[MIN_REALM];
  const e = ui.panelEmbed('duTien', {
    title: '🧭 Du Tiên Đường — Nguyên Thần Xuất Khiếu',
    desc:
      `Đạt **${r.emoji} ${r.name}** để Nguyên Thần **xuất khiếu**, rời thân đi lịch luyện vùng xa.\n\n` +
      '🪷 Chọn điểm đến (2h/4h/8h) → Nguyên Thần lên đường (**idle · offline vẫn chạy**) → về nhận **nguyên liệu hiếm + linh thạch + tu vi + cơ hội trang bị & 🔮 Tiên Ngọc**.\n' +
      '🧭 Vòng chơi NHÀN — cứ sai Nguyên Thần đi rồi quay lại thu hoạch.',
    footer: 'Bấm để mở Du Tiên Đường của riêng bạn (đếm ngược tự cập nhật).',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_dutien', 'Vào Du Tiên Đường', 'primary', { emoji: '🧭' }))] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dutien')
    .setDescription('Du Tiên — Nguyên Thần xuất khiếu đi lịch luyện (idle, mở ở Luyện Hư).'),
  async execute(interaction) { return open(interaction); },
  panelView,

  buttons: {
    async panel_dutien(interaction) { return open(interaction); },
    async dutien_refresh(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      await interaction.update(view(p, Date.now()));
      startRefresh(interaction, userId);
    },

    // Bắt đầu chuyến tới điểm đến đã chọn.
    async dutien_go(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      if (locked(interaction, p)) return;
      const now = Date.now();
      const st = dutien.tripState(p, now);
      if (st.state !== 'idle') return interaction.update(view(p, now)); // đang đi/đang chờ thu -> không chồng chuyến
      const d = dutien.dest(interaction.customId.split(':')[1]);
      if (!d || (p.realm || 0) < d.minRealm) return interaction.update(view(p, now));
      db.startDuTien(userId, d.key, now);
      const np = db.getPlayer(userId);
      await interaction.update(view(np, now));
      startRefresh(interaction, userId);
    },

    // Thu cơ duyên khi Nguyên Thần đã về.
    async dutien_collect(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      const now = Date.now();
      const st = dutien.tripState(p, now);
      if (st.state !== 'done') return interaction.update(view(p, now));

      const rw = dutien.rewardsFor(st.dest, p);
      db.clearDuTien(userId); // dọn chuyến NGAY (chống double-thu)

      const lines = [];
      if (rw.stones > 0) { const r = db.addStones(userId, rw.stones); lines.push(`${stone} **+${ui.num(r.gained)}**${config.currency.short}`); }
      if (rw.tuVi > 0) { const r = db.addTuVi(userId, rw.tuVi); lines.push(`🌀 **+${ui.num(r.gained)}** tu vi`); const note = dampen.tuViNote(r); if (note) lines.push(note); }
      if (rw.mats && Object.keys(rw.mats).length) { db.addMaterials(userId, rw.mats); lines.push(matLine(rw.mats)); }
      // Rớt trang bị (theo gearChance + rarityBoost điểm đến).
      if (Math.random() < rw.gearChance) {
        const item = gear.rollDrop(p.realm, p.tier, { rarityBoost: rw.rarityBoost, aff: p.sect || undefined });
        const res = db.addGearItem(userId, item);
        if (res && res.salvaged) lines.push(`🎁 Rớt đồ nhưng kho đầy → +${res.refine}🔩`);
        else if (res && res.item) lines.push(`🎁 Rớt: ${gear.nameOf(res.item)}`);
      }
      // Cơ hội Tiên Ngọc (theo độ dài chuyến).
      if (Math.random() < rw.premiumChance) { db.addPremium(userId, 1); lines.push(`${prem.emoji} **+1**${prem.short}`); }

      const e = new EmbedBuilder().setColor(ui.chanColor('duTien'))
        .setTitle(`✨ Nguyên Thần hồi quy — ${st.dest.emoji} ${st.dest.name}`)
        .setDescription(`Nguyên Thần nhập thể, mang về đầy cơ duyên sau chuyến **${st.dest.hours}h** lịch luyện!\n\n**Thu hoạch:**\n${lines.join('\n') || '_(chuyến này về tay không — hiếm gặp!)_'}`)
        .setFooter({ text: 'Có thể lên đường chuyến mới ngay.' });
      await interaction.update({ embeds: [e], components: [ui.row(ui.btn('dutien_refresh', '🧭 Đi chuyến mới', 'primary'))] });
    },
  },
};
