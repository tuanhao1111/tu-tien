// =====================================================================
//  /bequan — BẾ QUAN: nhập định tích tu vi theo thời gian (cả khi offline).
//  Giao diện là 1 BẢNG ẩn (ephemeral) hiển thị **thời gian đã bế quan** +
//  ước tính thu hoạch, có nút Xuất quan / Cập nhật. Bấm "Bắt đầu" để vào
//  bế quan; quay lại bấm "Cập nhật" để xem đã ngồi bao lâu.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const dampen = require('../dampen');
const autorefresh = require('../util/autorefresh');
const coach = require('../util/coach');
const kyngoCmd = require('./kyngo'); // kỳ ngộ TỰ ập tới ngẫu nhiên sau khi xuất quan

function fmtDur(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  if (totalMin > 0) return `${m} phút`;
  return `${Math.max(0, Math.ceil(ms / 1000))} giây`;
}
// Nhãn gọn cho 1 mốc phút (vd 60 -> "1 giờ", 90 -> "1 giờ 30 phút").
function durLabel(min) { return fmtDur(min * 60000); }

// Ước tính thu hoạch nếu xuất quan NGAY. TRẦN = mốc đã chọn (seclusion_minutes),
//  fallback maxHours cho phiên cũ không có mốc.
function harvestInfo(p, now) {
  const sec = config.seclusion;
  const chosenMin = p.seclusion_minutes > 0 ? Math.min(p.seclusion_minutes, sec.maxHours * 60) : sec.maxHours * 60;
  const capMs = chosenMin * 60000;
  const elapsedMs = now - p.seclusion_ts;
  const cappedMs = Math.min(elapsedMs, capMs);
  const minutes = Math.floor(cappedMs / 60000);
  const gain = minutes * sec.ratePerMin;
  const ready = elapsedMs >= sec.minMinutes * 60000;
  return { elapsedMs, minutes, gain, ready, chosenMin, full: elapsedMs >= capMs };
}

// --- Dựng bảng bế quan. Trả { embeds, components } hoặc { content }. ---
function seclusionView(p, username, now) {
  if (cult.isMaxed(p.realm, p.tier)) {
    return { content: '🪙 Đạo hữu đã viên mãn đại đạo, bế quan cũng chẳng tăng thêm được nữa!' };
  }
  const sec = config.seclusion;
  const need = cult.tuViNeeded(p.realm, p.tier);
  const bar = cult.progressBar(p.tu_vi, need);
  const tuViLine = `**${cult.realmLabel(p.realm, p.tier)}**\nTu vi: \`${bar}\` **${p.tu_vi}/${need}**`;

  // --- ĐANG bế quan ---
  if (p.seclusion_ts) {
    const h = harvestInfo(p, now);
    const bar = cult.progressBar(Math.min(h.elapsedMs, h.chosenMin * 60000), h.chosenMin * 60000);
    const e = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🚪 Đang Bế Quan')
      .setDescription(
        `**${username}** đóng cửa động phủ, nhập định tu luyện.\n\n` +
        `⏳ Đã bế quan: **${fmtDur(h.elapsedMs)}** / mốc **${durLabel(h.chosenMin)}**\n` +
        `\`${bar}\` ${h.full ? '✅ **đã đủ mốc — xuất quan thu trọn!**' : ''}\n` +
        `🌀 Thu hoạch nếu xuất quan: **+${h.gain} tu vi** (${sec.ratePerMin}/phút)\n` +
        (h.ready ? '✅ Có thể **xuất quan** nhận thu hoạch.' : `⏳ Bế quan thêm **${fmtDur(sec.minMinutes * 60000 - h.elapsedMs)}** nữa mới xuất quan được.`) +
        `\n\n${tuViLine}`,
      )
      .setFooter({ text: `Tích ${sec.ratePerMin} tu vi/phút · cả khi offline · xuất sớm nhận một phần.` });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('seclude_exit').setLabel(`🌅 Xuất quan (+${h.gain})`).setStyle(ButtonStyle.Success).setDisabled(!h.ready),
      new ButtonBuilder().setCustomId('seclude_refresh').setLabel('🔄 Cập nhật').setStyle(ButtonStyle.Secondary),
    );
    return { embeds: [e], components: [row] };
  }

  // --- CHƯA bế quan: chọn MỐC thời gian ---
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🚪 Bế Quan — Nhập Định')
    .setDescription(
      `Chọn **mốc thời gian** bế quan rồi đóng cửa động phủ tu luyện: mỗi phút tích **${sec.ratePerMin} tu vi**, ` +
      `**cả khi offline**. Đủ mốc thì thu trọn; **xuất sớm** vẫn nhận theo phần đã ngồi (cần ≥ ${sec.minMinutes} phút).\n\n` +
      `Tối đa **+${(config.seclusion.durations[config.seclusion.durations.length - 1]) * sec.ratePerMin} tu vi** mỗi phiên (mốc dài nhất).\n\n` + tuViLine,
    )
    .setFooter({ text: 'Chọn một mốc ở menu dưới để bắt đầu bế quan.' });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('seclude_pick')
    .setPlaceholder('Chọn mốc bế quan…')
    .addOptions(config.seclusion.durations.map((m) => ({
      label: `Bế quan ${durLabel(m)}`,
      emoji: '🚪',
      description: `Tối đa +${m * sec.ratePerMin} tu vi (đủ mốc)`,
      value: String(m),
    })));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

// Khi ĐANG bế quan -> bật auto-refresh đếm thời gian/thu hoạch theo thời gian thực.
async function openView(interaction, useUpdate) {
  const userId = interaction.user.id;
  autorefresh.stop(userId);
  const p = db.getPlayer(userId);
  if (!p) {
    const payload = { content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` (hoặc panel **Sơ Nhập**) trước đã.', embeds: [], components: [] };
    return useUpdate ? interaction.update(payload) : interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
  const r = seclusionView(p, interaction.user.username, Date.now());
  if (r.content) {
    return useUpdate ? interaction.update({ content: r.content, embeds: [], components: [] })
      : interaction.reply({ content: r.content, flags: MessageFlags.Ephemeral });
  }
  if (useUpdate) await interaction.update(r); else await interaction.reply({ ...r, flags: MessageFlags.Ephemeral });
  // Auto-refresh khi đang bế quan & chưa đủ mốc (đếm tới khi đầy thì dừng).
  if (p.seclusion_ts && !harvestInfo(p, Date.now()).full) {
    autorefresh.start(interaction, () => {
      const np = db.getPlayer(userId); if (!np) return null;
      const done = !np.seclusion_ts || harvestInfo(np, Date.now()).full;
      return { view: seclusionView(np, interaction.user.username, Date.now()), done };
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bequan')
    .setDescription('Bế quan tu luyện — tích tu vi theo thời gian, kể cả khi offline.'),

  async execute(interaction) {
    return openView(interaction, false);
  },

  buttons: {
    // Nút trên panel CÔNG KHAI (Tu Luyện) hoặc trong bảng tu luyện -> luôn REPLY bảng ẩn riêng.
    async panel_seclude(interaction) { return openView(interaction, false); },
    // Nút trong bảng bế quan ẩn -> update tại chỗ.
    async seclude_refresh(interaction) { return openView(interaction, true); },

    // Chọn mốc -> bắt đầu bế quan.
    async seclude_pick(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return openView(interaction, true);
      if (p.cultivate_mode) {
        return interaction.reply({ content: '⚠️ Đạo hữu đang **vận công / bật Voice** ở `/tuluyen` — kết thúc trước rồi hẵng bế quan.', flags: MessageFlags.Ephemeral });
      }
      if (p.seclusion_ts) return openView(interaction, true);
      const valid = config.seclusion.durations;
      const minutes = parseInt(interaction.values[0], 10);
      if (!valid.includes(minutes)) return openView(interaction, true);
      db.setSeclusionSession(interaction.user.id, Date.now(), minutes);
      return openView(interaction, true);
    },

    // Xuất quan: nhận thu hoạch.
    async seclude_exit(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p || !p.seclusion_ts) return openView(interaction, true);
      const now = Date.now();
      const h = harvestInfo(p, now);
      if (!h.ready) return openView(interaction, true);

      db.setSeclusion(userId, 0);
      const res = h.gain > 0 ? db.addTuVi(userId, h.gain) : { gained: 0, damp: 1, bottleneck: 1 };
      db.addStoryProgress(userId, 'bequan', 1);
      db.addDailyProgress(userId, 'bequan', 1);

      await openView(interaction, true);
      const after = db.getPlayer(userId);
      const need = cult.tuViNeeded(after.realm, after.tier);
      coach.maybeNotifyReady(db, interaction.user, after); // DM nhắc nếu vừa đủ tu vi đột phá
      const note = dampen.tuViNote(res);
      await interaction.followUp({
        content: `🌅 Xuất quan sau **${fmtDur(h.elapsedMs)}** bế quan: **+${res.gained} tu vi**! ` +
          (after.tu_vi >= need ? '⚡ **Đủ tu vi rồi — qua Đột Phá Đường để đột phá!**' : '') +
          (note ? `\n${note}` : ''),
        flags: MessageFlags.Ephemeral,
      });
      return kyngoCmd.maybeFollowUp(interaction, userId); // 🎲 cơ hội Kỳ Ngộ tự ập tới
    },
  },
};
