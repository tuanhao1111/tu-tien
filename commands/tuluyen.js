// =====================================================================
//  /tuluyen — TU LUYỆN VẬN CÔNG (có thời gian) + chế độ VOICE.
//  Người chơi CHỌN một mốc thời gian rồi "vận công"; đủ giờ (kể cả offline)
//  thì nhận tu vi = số phút × ratePerMin. Thu hoạch sớm vẫn nhận theo phần
//  thời gian đã trôi. Hoặc bật chế độ VOICE: ngồi kênh thoại để tích tu vi.
//  Giao diện là 1 "bảng tu luyện" ẩn (ephemeral) — bấm nút để thao tác.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const dampen = require('../dampen');
const autorefresh = require('../util/autorefresh');
const coach = require('../util/coach');
const kyngoCmd = require('./kyngo'); // kỳ ngộ TỰ ập tới ngẫu nhiên sau khi thu hoạch tu luyện

function fmtDur(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  if (totalMin > 0) return `${m} phút`;
  return `${Math.max(0, Math.ceil(ms / 1000))} giây`;
}

// Trạng thái tu luyện hiện tại của người chơi.
function stateOf(p) {
  if (p.seclusion_ts) return 'seclusion';
  if (p.cultivate_mode === 'voice') return 'voice';
  if (p.cultivate_mode === 'normal' && p.cultivate_start) return 'channel';
  return 'idle';
}

// Thông tin phiên vận công thường (đang chạy).
function channelInfo(p, now) {
  const rate = config.cultivate.ratePerMin || 0;
  const target = p.cultivate_minutes || 0;
  const elapsedMin = Math.max(0, Math.floor((now - p.cultivate_start) / 60000));
  const effMin = Math.min(elapsedMin, target);
  const gain = effMin * rate;
  const done = elapsedMin >= target;
  const leftMs = Math.max(0, p.cultivate_start + target * 60000 - now);
  return { rate, target, elapsedMin, effMin, gain, done, leftMs };
}

// --- Dựng bảng tu luyện theo trạng thái. Trả { embeds, components } hoặc { content }. ---
function tuLuyenView(p, username, now) {
  if (cult.isMaxed(p.realm, p.tier)) {
    return { content: '🪙 Đạo hữu đã tu thành **Tiên Nhân**, viên mãn đại đạo — không cần tích tu vi nữa!' };
  }
  const need = cult.tuViNeeded(p.realm, p.tier);
  const bar = cult.progressBar(p.tu_vi, need);
  const tuViLine = `**${cult.realmLabel(p.realm, p.tier)}**\nTu vi: \`${bar}\` **${p.tu_vi}/${need}**`;
  const st = stateOf(p);

  // --- ĐANG vận công thường ---
  if (st === 'channel') {
    const ci = channelInfo(p, now);
    const e = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🧘 Đang Vận Công…')
      .setDescription(
        `Đạo hữu nhập định dẫn linh khí theo chu thiên.\n\n` +
        `⏱️ Đã vận công: **${fmtDur(now - p.cultivate_start)}** / mục tiêu **${ci.target} phút**\n` +
        `🌀 Tu vi tích được: **+${ci.gain}** (≈ ${ci.rate}/phút)\n` +
        (ci.done
          ? '✅ **Đã đủ giờ!** Bấm **Thu hoạch** để nhận trọn vẹn.'
          : `⏳ Còn **${fmtDur(ci.leftMs)}** nữa là đủ. Có thể **thu sớm** để nhận phần đã tích.`) +
        `\n\n${tuViLine}`,
      )
      .setFooter({ text: 'Thu hoạch sớm vẫn nhận tu vi theo thời gian đã vận công.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cultivate_collect').setLabel(`🧺 Thu hoạch (+${ci.gain})`).setStyle(ButtonStyle.Success).setDisabled(ci.gain <= 0),
      new ButtonBuilder().setCustomId('cultivate_refresh').setLabel('🔄 Cập nhật').setStyle(ButtonStyle.Secondary),
    );
    return { embeds: [e], components: [row] };
  }

  // --- ĐANG bật chế độ Voice ---
  if (st === 'voice') {
    const v = config.voice || {};
    const e = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🎙️ Tu Luyện Qua Voice — Đang Bật')
      .setDescription(
        `Đạo hữu đang ở **chế độ tu luyện Voice** (bật từ ${fmtDur(now - (p.cultivate_start || now))} trước).\n\n` +
        `🎙️ Ngồi kênh thoại sẽ tự tích **${v.ratePerMin || 3} tu vi/phút**.\n` +
        `Điều kiện: cần **≥${v.minCompany || 2} người thật** cùng kênh (khuyến khích tu chung), bỏ qua kênh AFK, ` +
        `tối đa **${Math.round((v.dailyCapMinutes || 240) / 60)} giờ/ngày**.\n\n${tuViLine}`,
      )
      .setFooter({ text: 'Tắt chế độ Voice để chuyển sang vận công thường.' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cultivate_voice_off').setLabel('⏹️ Tắt chế độ Voice').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cultivate_refresh').setLabel('🔄 Cập nhật').setStyle(ButtonStyle.Secondary),
    );
    return { embeds: [e], components: [row] };
  }

  // --- ĐANG bế quan (state riêng) -> chỉ đường qua bảng Bế Quan ---
  if (st === 'seclusion') {
    const e = new EmbedBuilder()
      .setColor(config.colors.info)
      .setTitle('🚪 Đang Bế Quan')
      .setDescription(
        'Đạo hữu đang **bế quan** trong động phủ — không thể vận công cùng lúc.\n' +
        'Bấm bên dưới để mở bảng **Bế Quan** xem thời gian & xuất quan.\n\n' + tuViLine,
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('panel_seclude').setLabel('🚪 Bảng Bế Quan').setStyle(ButtonStyle.Primary),
    );
    return { embeds: [e], components: [row] };
  }

  // --- NHÀN RỖI: chọn cách tu hành ---
  const v = config.voice || {};
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🧘 Tu Luyện Trường')
    .setDescription(
      `${tuViLine}\n\n` +
      `🧘 **Vận Công** — chọn **mốc thời gian** bên dưới để nhập định, nhận **~${config.cultivate.ratePerMin} tu vi/phút** (tính cả khi offline; thu sớm vẫn nhận một phần).\n\n` +
      `🎙️ **Voice** — ngồi kênh thoại ≥${v.minCompany || 2} người tích **${v.ratePerMin || 3}/phút** (nút bên dưới).\n` +
      '_🚪 Bế quan · 💊 Luyện đan có nút riêng ngay ở **panel Tu Luyện** phía ngoài._\n\n' +
      '🎲 _Trong lúc tu luyện, đôi khi **Kỳ Ngộ** bất ngờ tự ập tới — cơ duyên không cầu mà tới._',
    )
    .setFooter({ text: 'Bấm số phút để vận công · nút Voice cho chế độ tu theo thoại.' });

  // Hàng 1: MỐC THỜI GIAN vận công (hành động chính).
  const durRow = new ActionRowBuilder();
  for (const min of (config.cultivate.durations || []).slice(0, 5)) {
    durRow.addComponents(
      new ButtonBuilder().setCustomId(`cultivate_start:${min}`).setLabel(`${min} phút`).setStyle(ButtonStyle.Primary),
    );
  }
  // Hàng 2: chỉ còn Voice — Bế quan & Luyện đan đã có nút ở panel Tu Luyện ngoài.
  const actRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cultivate_voice_on').setLabel('Voice').setStyle(ButtonStyle.Secondary).setEmoji('🎙️'),
  );
  return { embeds: [e], components: [durRow, actRow] };
}

// Mở bảng tu luyện cho người bấm (an toàn nếu chưa nhập đạo).
//  Khi ĐANG vận công thường -> bật auto-refresh đếm ngược tới lúc đủ giờ (thời gian thực).
async function openView(interaction, useUpdate) {
  const userId = interaction.user.id;
  autorefresh.stop(userId); // dừng vòng cũ trước mọi lần mở/đổi view
  const p = db.getPlayer(userId);
  if (!p) {
    const payload = { content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` (hoặc panel **Sơ Nhập**) trước đã.', embeds: [], components: [] };
    return useUpdate ? interaction.update(payload) : interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  }
  const r = tuLuyenView(p, interaction.user.username, Date.now());
  if (r.content) {
    return useUpdate ? interaction.update({ content: r.content, embeds: [], components: [] })
      : interaction.reply({ content: r.content, flags: MessageFlags.Ephemeral });
  }
  if (useUpdate) await interaction.update(r); else await interaction.reply({ ...r, flags: MessageFlags.Ephemeral });
  // Auto-refresh khi đang vận công thường & chưa đủ giờ.
  if (stateOf(p) === 'channel' && !channelInfo(p, Date.now()).done) {
    autorefresh.start(interaction, () => {
      const np = db.getPlayer(userId); if (!np) return null;
      const done = stateOf(np) !== 'channel' || channelInfo(np, Date.now()).done;
      return { view: tuLuyenView(np, interaction.user.username, Date.now()), done };
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tuluyen')
    .setDescription('Tu luyện vận công — chọn thời gian, nhận tu vi sau khi vận công.'),

  async execute(interaction) {
    return openView(interaction, false);
  },

  buttons: {
    // Panel Tu Luyện: nút trên panel CÔNG KHAI -> luôn REPLY bảng ẩn riêng (không update panel chung).
    async panel_cultivate(interaction) { return openView(interaction, false); },
    // Nút trong bảng ẩn -> update tại chỗ.
    async cultivate_refresh(interaction) { return openView(interaction, true); },

    // Bắt đầu vận công thường với số phút đã chọn.
    async cultivate_start(interaction) {
      const minutes = parseInt(interaction.customId.split(':')[1], 10);
      const p = db.getPlayer(interaction.user.id);
      if (!p) return openView(interaction, true);
      if (!(config.cultivate.durations || []).includes(minutes)) {
        return interaction.reply({ content: 'Mốc thời gian không hợp lệ.', flags: MessageFlags.Ephemeral });
      }
      if (stateOf(p) !== 'idle') {
        return interaction.reply({ content: '⚠️ Đạo hữu đang tu luyện/bế quan dở — hoàn tất việc đang làm trước đã.', flags: MessageFlags.Ephemeral });
      }
      db.setCultivateSession(interaction.user.id, Date.now(), minutes, 'normal');
      return openView(interaction, true);
    },

    // Thu hoạch phiên vận công thường (đủ hoặc sớm 1 phần).
    async cultivate_collect(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p || stateOf(p) !== 'channel') return openView(interaction, true);
      const ci = channelInfo(p, Date.now());
      if (ci.gain <= 0) {
        return interaction.reply({ content: `🧘 Mới vận công chưa lâu, chưa tích được tu vi. Vận công thêm chút nữa nhé.`, flags: MessageFlags.Ephemeral });
      }
      db.clearCultivateSession(userId);
      const res = db.addTuVi(userId, ci.gain);
      db.addStoryProgress(userId, 'tuluyen', 1);
      db.addDailyProgress(userId, 'tuluyen', 1);
      db.addSectQuestProgress(userId, 'tuluyen', 1); // nhiệm vụ nhập môn "Tạp Dịch Đường"

      await openView(interaction, true);
      const after = db.getPlayer(userId);
      const need = cult.tuViNeeded(after.realm, after.tier);
      coach.maybeNotifyReady(db, interaction.user, after); // DM nhắc nếu vừa đủ tu vi đột phá
      const note = dampen.tuViNote(res);
      await interaction.followUp({
        content: `🧺 Xuất công sau **${ci.effMin} phút** vận công: **+${res.gained} tu vi**! ` +
          (after.tu_vi >= need ? '⚡ **Đủ tu vi rồi — qua Đột Phá Đường để đột phá!**' : '') +
          (note ? `\n${note}` : ''),
        flags: MessageFlags.Ephemeral,
      });
      return kyngoCmd.maybeFollowUp(interaction, userId); // 🎲 cơ hội Kỳ Ngộ tự ập tới
    },

    // Bật chế độ Voice.
    async cultivate_voice_on(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return openView(interaction, true);
      if (stateOf(p) !== 'idle') {
        return interaction.reply({ content: '⚠️ Đạo hữu đang tu luyện/bế quan dở — hoàn tất việc đang làm trước đã.', flags: MessageFlags.Ephemeral });
      }
      db.setCultivateSession(interaction.user.id, Date.now(), 0, 'voice');
      return openView(interaction, true);
    },

    // Tắt chế độ Voice.
    async cultivate_voice_off(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (p && p.cultivate_mode === 'voice') db.clearCultivateSession(interaction.user.id);
      return openView(interaction, true);
    },
  },
};
