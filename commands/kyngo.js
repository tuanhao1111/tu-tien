// =====================================================================
//  /kyngo — KỲ NGỘ: sự kiện phiêu lưu ngẫu nhiên. Bốc 1 sự kiện -> chọn
//  hướng xử lý -> tung kết quả (cơ duyên / vô sự / tai họa nhẹ). Nguồn tu vi
//  & linh thạch PHỤ, nhất là giai đoạn đầu (chưa mở bí cảnh). Có cooldown.
//
//  Hiện sự kiện = MIỄN PHÍ; chỉ khi BẤM chọn mới tính cooldown + nhận thưởng.
//  customId: panel_kyngo · kyngo:pick:<eventId>:<choiceIdx>.
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const dampen = require('../dampen');
const bicanh = require('../bicanh');
const kyngo = require('../kyngo');
const { requireUnlocked } = require('../util/feature-gate');

const cur = config.currency;

function fmtDur(ms) {
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}
function cdLeft(p, now) { return Math.max(0, (p.kyngo_ts || 0) + (config.kyngo.cooldownMs || 0) - now); }

// Màn đang hồi cooldown.
function cooldownView(left) {
  return { embeds: [new EmbedBuilder().setColor(config.colors.info).setTitle('🎲 Kỳ Ngộ — Đang Nghỉ Chân')
    .setDescription(`Đạo hữu vừa trải qua một kỳ ngộ, cần nghỉ ngơi đôi chút.\n⏳ Kỳ ngộ tiếp theo sau: **${fmtDur(left)}**.`)
    .setFooter({ text: 'Trong lúc chờ, cứ /tuluyen hoặc /bequan tích tu vi nhé.' })], components: [] };
}

// Màn 1 sự kiện + các lựa chọn.
function eventView(ev) {
  const e = new EmbedBuilder().setColor(config.colors.gold)
    .setTitle(`${ev.emoji} Kỳ Ngộ — ${ev.title}`)
    .setDescription(`${ev.text}\n\n*Đạo hữu sẽ làm gì?*`)
    .setFooter({ text: 'Chọn một hướng xử lý — mỗi lựa chọn có thể là cơ duyên hoặc rủi ro.' });
  const row = new ActionRowBuilder().addComponents(
    ev.choices.map((c, i) => new ButtonBuilder().setCustomId(`kyngo:pick:${ev.id}:${i}`).setLabel(c.label.slice(0, 80)).setStyle(ButtonStyle.Primary)),
  );
  return { embeds: [e], components: [row] };
}

// GĐ23: kỳ ngộ TỰ ẬP TỚI khi đi săn yêu / làm cốt truyện.
//  rollTrigger: trúng cơ hội kỳ ngộ chưa? (chỉ khi KHÔNG còn cooldown kỳ ngộ).
function rollTrigger(p, now = Date.now()) {
  const k = config.kyngo || {};
  if (!p || !(k.triggerChance > 0)) return false;
  if (cdLeft(p, now) > 0) return false; // đang nghỉ kỳ ngộ -> không bật thêm
  return Math.random() < k.triggerChance;
}
// Sau khi interaction ĐÃ phản hồi (update/reply rồi): nếu trúng -> gửi kỳ ngộ ẩn (followUp).
async function maybeFollowUp(interaction, userId) {
  try {
    const p = db.getPlayer(userId);
    if (!rollTrigger(p)) return false;
    await interaction.followUp({ ...eventView(kyngo.pickEvent(p.realm)), flags: MessageFlags.Ephemeral }).catch(() => {});
    return true;
  } catch (_) { return false; }
}

// /kyngo giờ KHÔNG tự mở kỳ ngộ nữa — chỉ báo cơ chế "tự ập tới ngẫu nhiên".
function infoView(p, now = Date.now()) {
  const left = cdLeft(p, now);
  const e = new EmbedBuilder().setColor(config.colors.gold)
    .setTitle('🎲 Kỳ Ngộ — Cơ Duyên Bất Ngờ')
    .setDescription(
      'Kỳ ngộ **không cầu mà tới** — không thể tự mở, mà **tự ập tới ngẫu nhiên** trong lúc:\n' +
      '🧘 **Thu hoạch tu luyện** · 🚪 **Xuất quan bế quan**\n' +
      '🐗 **Săn yêu thắng trận** · 📖 **Tiến triển cốt truyện**\n\n' +
      (left > 0
        ? `⏳ Vừa trải qua một kỳ ngộ — đang nghỉ chân, cơ duyên mới sẽ tới sau **${fmtDur(left)}**.`
        : '✨ Đang trong trạng thái có thể gặp kỳ ngộ — cứ chuyên tâm tu hành, cơ duyên ắt tới!'))
    .setFooter({ text: `Cơ hội mỗi hoạt động ~${Math.round((config.kyngo.triggerChance || 0) * 100)}% · nghỉ ${Math.round((config.kyngo.cooldownMs || 0) / 60000)} phút sau mỗi lần nhận thưởng.` });
  return { embeds: [e], components: [] };
}

// Mở 1 kỳ ngộ (hoặc báo cooldown) — CHỈ dùng cho nút "Xem kỳ ngộ" sau khi trúng trigger ngẫu nhiên.
async function open(interaction, useUpdate) {
  const p = await requireUnlocked(interaction);
  if (!p) return;
  const now = Date.now();
  const left = cdLeft(p, now);
  const view = left > 0 ? cooldownView(left) : eventView(kyngo.pickEvent(p.realm));
  return useUpdate ? interaction.update(view).catch(() => {})
    : interaction.reply({ ...view, flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder().setName('kyngo').setDescription('Kỳ Ngộ — cơ duyên tự ập tới ngẫu nhiên khi tu luyện, xem cơ chế.'),
  async execute(interaction) {
    const p = await requireUnlocked(interaction);
    if (!p) return;
    return interaction.reply({ ...infoView(p, Date.now()), flags: MessageFlags.Ephemeral });
  },
  // dùng cho săn yêu / cốt truyện gọi kỳ ngộ ập tới.
  rollTrigger, maybeFollowUp, eventView,

  buttons: {
    async panel_kyngo(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.', flags: MessageFlags.Ephemeral });
      return open(interaction, false);
    },

    async kyngo(interaction) {
      const parts = interaction.customId.split(':');
      if (parts[1] !== 'pick') return;
      const userId = interaction.user.id;
      const ev = kyngo.getEvent(parts[2]);
      const choice = ev && ev.choices[parseInt(parts[3], 10)];
      if (!ev || !choice) return interaction.update(eventView(kyngo.pickEvent(0))).catch(() => {});

      const p = db.getPlayer(userId);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral }).catch(() => {});
      const now = Date.now();
      // Cooldown CHỐT khi resolve (cũng chặn double-click: lần 2 thấy cooldown).
      if (cdLeft(p, now) > 0) return interaction.update(cooldownView(cdLeft(p, now))).catch(() => {});

      const result = kyngo.rollResult(choice);
      const g = kyngo.computeGains(p, result);
      db.setKyngoTs(userId, now); // lock cooldown TRƯỚC khi cộng thưởng (idempotent với double-click)
      db.addStoryProgress(userId, 'kyngo', 1); // tiến độ cốt truyện (chương Luyện Khí)
      const lines = [];
      if (g.tuvi > 0) { const r = db.addTuVi(userId, g.tuvi); lines.push(`🌀 **+${r.gained} tu vi**`); const note = dampen.tuViNote(r); if (note) lines.push(note); }
      if (g.stones > 0) { const r = db.addStones(userId, g.stones); lines.push(`${cur.emoji} **+${r.gained}${cur.short}**`); }
      if (g.mat) { db.addMaterials(userId, g.mat); for (const [m, q] of Object.entries(g.mat)) { const mi = bicanh.materialInfo(m); lines.push(`${mi ? mi.emoji : '🧪'} **+${q} ${mi ? mi.name : m}**`); } }
      if (g.lose > 0) { const cur_ = db.getPlayer(userId); db.setTuVi(userId, Math.max(0, (cur_.tu_vi || 0) - g.lose)); lines.push(`💔 **−${g.lose} tu vi**`); }
      if (!lines.length) lines.push('_(không được gì lần này)_');

      const e = new EmbedBuilder().setColor(config.colors.gold)
        .setTitle(`${ev.emoji} ${ev.title}`)
        .setDescription(`_${choice.reply}_\n\n${result.text}\n\n**Kết quả:** ${lines.join(' · ')}`)
        .setFooter({ text: `Kỳ ngộ tiếp theo sau ${fmtDur(config.kyngo.cooldownMs)}. Cứ tu luyện · bế quan · săn yêu — cơ duyên sẽ tự ập tới.` });
      return interaction.update({ embeds: [e], components: [] }).catch(() => {});
    },
  },
};
