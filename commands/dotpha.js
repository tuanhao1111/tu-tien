const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const features = require('../features');
const alchemy = require('../alchemy');
const { announce } = require('../util/announce');
const coach = require('../util/coach');

// --- Bảng Đột Phá tương tác (ẩn): trạng thái + toggle đan + nút đột phá ---
function breakthroughView(userId, username) {
  const p = db.getPlayer(userId);
  if (!p) return { content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` (hoặc panel **Sơ Nhập**) trước đã.', embeds: [], components: [] };
  if (cult.isMaxed(p.realm, p.tier)) {
    return { content: '🪙 Đạo hữu đã viên mãn đại đạo — không còn cảnh giới nào để đột phá!', embeds: [], components: [] };
  }
  const need = cult.tuViNeeded(p.realm, p.tier);
  const next = cult.nextStage(p.realm, p.tier);
  const ready = p.tu_vi >= need;
  const bar = cult.progressBar(p.tu_vi, need);
  const autoOn = !!p.auto_trib;
  const bestPill = alchemy.bestTribulationPill(db.getPills(p));

  let majorLine = '';
  if (next.isMajor) {
    const baseRate = cult.majorSuccessRate(p.realm);
    let rateTxt = `${Math.round(baseRate * 100)}%`;
    if (autoOn && bestPill) {
      const r = Math.min(config.alchemy.tribulationCap, baseRate + bestPill.rateBonus);
      const info = alchemy.pillInfo(bestPill.id);
      rateTxt = `${Math.round(baseRate * 100)}% → **${Math.round(r * 100)}%** (${info.emoji} ${info.name})`;
    }
    majorLine = `\n🌩️ **Vượt cảnh giới = ĐỘ KIẾP** — tỉ lệ thành công: ${rateTxt}.` +
      `\n💔 Thất bại mất **${Math.round(config.breakthrough.failLossPct * 100)}% tu vi**.`;
  } else {
    majorLine = `\n✨ Lên **tầng nhỏ** — luôn thành công.`;
  }

  const e = new EmbedBuilder()
    .setColor(ready ? config.colors.gold : config.colors.primary)
    .setTitle('⚡ Đột Phá Đường')
    .setDescription(
      `**${cult.realmLabel(p.realm, p.tier)}** → ${cult.realmLabel(next.realm, next.tier)}\n` +
      `Tu vi: \`${bar}\` **${p.tu_vi}/${need}** ${ready ? '✅ đủ rồi!' : '⏳ chưa đủ'}` +
      majorLine +
      `\n\n💊 **Tự dùng đan hộ đạo khi độ kiếp:** ${autoOn ? '🟢 BẬT' : '🔴 TẮT'}` +
      (bestPill ? ` *(đang có ${alchemy.pillInfo(bestPill.id).emoji} ${alchemy.pillInfo(bestPill.id).name})*` : ' *(túi chưa có đan hộ đạo)*'),
    )
    .setFooter({ text: 'Bật/tắt đan tùy ý · đủ tu vi thì bấm Đột phá. Kỳ tích độ kiếp loan ra Vọng Âm Đài.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dotpha:do').setLabel('⚡ Đột phá').setStyle(ButtonStyle.Success).setDisabled(!ready),
    new ButtonBuilder().setCustomId('dotpha:trib')
      .setLabel(autoOn ? '💊 Tắt tự dùng đan' : '💊 Bật tự dùng đan')
      .setStyle(autoOn ? ButtonStyle.Secondary : ButtonStyle.Primary),
  );
  return { embeds: [e], components: [row] };
}

// Dòng "mở khóa" khi đột phá vượt cảnh giới (oldRealm -> newRealm).
function unlockNote(oldRealm, newRealm) {
  const opened = features.newlyUnlocked(oldRealm, newRealm);
  if (!opened.length) return '';
  const lines = opened.map((f) => `${f.emoji} **${f.name}** — \`/${f.commands[0]}\``);
  return `\n\n🗝️ **Mở khóa tính năng mới:**\n${lines.join('\n')}`;
}

// Lõi ĐỘT PHÁ — dùng chung cho /dotpha và nút panel Đột Phá Đường.
//  Trả { content } (lỗi, ẩn) hoặc { embeds, public:true, announce?:[Embed] } (kết quả).
//  announce: thông báo cần loan ra Vọng Âm Đài (caller tự gửi vì cần client).
function doBreakthrough(userId, username) {
  const p = db.getPlayer(userId);
  if (!p) return { content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` (hoặc panel **Sơ Nhập**) trước đã.' };

  if (cult.isMaxed(p.realm, p.tier)) {
    return { content: '🪙 Đạo hữu đã tu thành **Tiên Nhân** — đại đạo viên mãn, không còn cảnh giới nào để đột phá!' };
  }

  const need = cult.tuViNeeded(p.realm, p.tier);
  if (p.tu_vi < need) {
    return { content: `⚠️ Tu vi chưa đủ! Cần **${need}**, đạo hữu mới có **${p.tu_vi}**. Đi \`/tuluyen\` hoặc \`/bequan\` thêm.` };
  }

  const c = config.currency;
  const next = cult.nextStage(p.realm, p.tier);
  const leftover = p.tu_vi - need; // tu vi dư mang sang bậc mới

  // --- ĐỘT PHÁ TẦNG NHỎ: luôn thành công ---
  if (!next.isMajor) {
    db.applyBreakthrough(userId, next.realm, next.tier, leftover, config.breakthrough.minorStones);
    db.addStoryProgress(userId, 'dotpha', 1);
    db.addDailyProgress(userId, 'dotpha', 1);
    db.addSectQuestProgress(userId, 'dotpha', 1); // nhiệm vụ nhập môn "Lĩnh Ngộ Chân Truyền"
    const ap = config.attributes.pointsPerTier;
    db.addAttrPoints(userId, ap);
    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('✨ Đột phá thành công!')
      .setDescription(
        `**${username}** vận công đột phá thuận lợi.\n` +
          `${cult.realmLabel(p.realm, p.tier)} → **${cult.realmLabel(next.realm, next.tier)}**\n` +
          `Thưởng: **+${config.breakthrough.minorStones}${c.short}** ${c.emoji} · 🧬 **+${ap} điểm thuộc tính**` +
          (leftover > 0 ? `\nTu vi dư mang sang: **${leftover}**` : '') +
          `\n*Cộng điểm thuộc tính ở panel **Hồ Sơ**.*`,
      );
    return { embeds: [embed], public: true };
  }

  // --- ĐẠI ĐỘT PHÁ (vượt cảnh giới) = ĐỘ KIẾP: có rủi ro ---
  //  Trước khi tung số: nếu có ĐAN HỘ ĐẠO trong túi -> tự dùng đan mạnh nhất,
  //  cộng tỉ lệ thành công (có trần). Đan bị tiêu dù thành hay bại.
  const baseRate = cult.majorSuccessRate(p.realm);
  // Đan Hộ Đạo/Tạo Hóa CHỈ tự dùng khi người chơi BẬT (auto_trib). Mặc định bật.
  const tribPill = p.auto_trib ? db.consumeBestTribulationPill(userId) : null;
  let rate = baseRate;
  let pillNote = '';
  if (tribPill) {
    rate = Math.min(config.alchemy.tribulationCap, baseRate + tribPill.rateBonus);
    const info = alchemy.pillInfo(tribPill.id);
    pillNote = `\n💊 **${info.emoji} ${info.name}** hộ thể: tỉ lệ độ kiếp **${Math.round(baseRate * 100)}% → ${Math.round(rate * 100)}%**.`;
  } else if (!p.auto_trib && alchemy.bestTribulationPill(db.getPills(p))) {
    pillNote = `\n💊 *(Bạn đã TẮT tự dùng đan hộ đạo — độ kiếp tay không. Bật lại ở bảng Đột Phá nếu muốn.)*`;
  }
  const success = Math.random() < rate;
  const pct = Math.round(rate * 100);

  if (success) {
    db.applyBreakthrough(userId, next.realm, next.tier, leftover, config.breakthrough.majorStones);
    db.addStoryProgress(userId, 'dotpha', 1);
    db.addDailyProgress(userId, 'dotpha', 1);
    db.addSectQuestProgress(userId, 'dotpha', 1); // nhiệm vụ nhập môn "Lĩnh Ngộ Chân Truyền"
    const ap = config.attributes.pointsPerTier;
    const sp = config.skills.upgradePointsPerMajor;
    db.addAttrPoints(userId, ap);
    db.addSkillPoints(userId, sp);
    // 🔮 Tiên Ngọc: mốc thành tựu lớn — vượt cảnh giới thành công (rất khó cày).
    const prem = config.breakthrough.majorPremium || 0;
    if (prem > 0) db.addPremium(userId, prem);
    const premLine = prem > 0 ? ` · ${config.premiumCurrency.emoji} **+${prem}**${config.premiumCurrency.short}` : '';
    const maxedNow = cult.isMaxed(next.realm, next.tier);
    const embed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('⚡🌩️ ĐỘ KIẾP THÀNH CÔNG! ⚡')
      .setDescription(
        `Thiên kiếp giáng xuống, **${username}** nghiến răng chống đỡ… và **vượt qua**!\n\n` +
          `${cult.realmLabel(p.realm, p.tier)} → **${cult.realmLabel(next.realm, next.tier)}**\n` +
          `🎉 Chính thức bước vào cảnh giới **${cult.REALMS[next.realm].name}**!\n` +
          `Thưởng: **+${config.breakthrough.majorStones}${c.short}** ${c.emoji} · 🧬 **+${ap} điểm thuộc tính** · 🎴 **+${sp} điểm nâng chiêu**${premLine}` +
          pillNote +
          unlockNote(p.realm, next.realm) +
          (maxedNow ? '\n\n🪙 **VIÊN MÃN ĐẠI ĐẠO — tu thành Tiên Nhân!** Truyền kỳ một đời!' : ''),
      )
      .setFooter({ text: `Tỉ lệ độ kiếp lúc đó: ${pct}%` });

    // DM riêng: dẫn dắt — mừng lên cảnh giới + tính năng vừa mở + gợi ý cảnh giới kế.
    const dm = { embeds: [coach.realmUpEmbed(username, p.realm, next.realm)] };

    // Vọng Âm Đài: loan báo độ kiếp thành công (kỳ tích thiên hạ).
    const annEmbed = new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle(maxedNow ? '🪙 PHI THĂNG THÀNH TIÊN!' : '🌩️⚡ Thiên Kiếp Giáng Thế!')
      .setDescription(
        maxedNow
          ? `**${username}** đã **viên mãn đại đạo, tu thành Tiên Nhân** — truyền kỳ vạn cổ! 🎉`
          : `**${username}** vừa **độ kiếp thành công**, đột phá lên **${features.realmName(next.realm)}**! Chấn động thiên hạ.`,
      );
    return { embeds: [embed], public: true, announce: [annEmbed], dm };
  }

  // Thất bại: tâm ma quấy nhiễu, mất một phần tu vi (vẫn giữ cảnh giới).
  const loss = Math.floor(p.tu_vi * config.breakthrough.failLossPct);
  db.setTuVi(userId, p.tu_vi - loss);
  const embed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🌩️💥 Độ kiếp THẤT BẠI!')
    .setDescription(
      `Thiên kiếp quá mạnh, tâm ma trỗi dậy! **${username}** thổ huyết lùi lại.\n\n` +
        `Vẫn dừng ở **${cult.realmLabel(p.realm, p.tier)}**.\n` +
        `💔 Mất **${loss} tu vi** vì kinh mạch tổn thương.` +
        pillNote +
        `\nTĩnh dưỡng tu luyện lại rồi thử \`/dotpha\` lần nữa.`,
    )
    .setFooter({ text: `Tỉ lệ độ kiếp lúc đó: ${pct}% — số đen thôi!` });

  // Vọng Âm Đài: loan báo độ kiếp thất bại (kịch tính).
  const annEmbed = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🌩️💥 Độ Kiếp Thất Bại')
    .setDescription(`**${username}** độ kiếp **thất bại**, thổ huyết lui về **${cult.realmLabel(p.realm, p.tier)}**. Thiên kiếp vô tình…`);
  return { embeds: [embed], public: true, announce: [annEmbed] };
}

// Gửi kết quả + loan báo Vọng Âm Đài. panel -> luôn ẩn; slash -> ẩn khi lỗi, công khai khi thành công.
async function send(interaction, r, forceEphemeral) {
  const opts = {};
  if (r.content) opts.content = r.content;
  if (r.embeds) opts.embeds = r.embeds;
  if (forceEphemeral || !r.public) opts.flags = MessageFlags.Ephemeral;
  await interaction.reply(opts);
  if (r.announce) for (const e of r.announce) announce(interaction.client, e);
  if (r.dm) coach.dm(interaction.user, r.dm); // DM dẫn dắt (nuốt lỗi nếu chặn DM)
}

module.exports = {
  doBreakthrough,
  data: new SlashCommandBuilder()
    .setName('dotpha')
    .setDescription('Đột phá lên tầng/cảnh giới kế tiếp khi đã đủ tu vi.'),

  async execute(interaction) {
    return send(interaction, doBreakthrough(interaction.user.id, interaction.user.username), false);
  },

  buttons: {
    // Panel Đột Phá Đường: mở BẢNG đột phá tương tác (ẩn từng người) — có toggle đan + nút đột phá.
    async panel_dotpha(interaction) {
      const v = breakthroughView(interaction.user.id, interaction.user.username);
      if (v.content) return interaction.reply({ content: v.content, flags: MessageFlags.Ephemeral });
      return interaction.reply({ ...v, flags: MessageFlags.Ephemeral });
    },

    // Router nút trong bảng: dotpha:do (đột phá) / dotpha:trib (bật-tắt tự dùng đan).
    async dotpha(interaction) {
      const action = interaction.customId.split(':')[1];
      const userId = interaction.user.id;

      if (action === 'trib') {
        const p = db.getPlayer(userId);
        if (!p) return interaction.update({ content: 'Đạo hữu chưa nhập đạo!', embeds: [], components: [] });
        db.setAutoTrib(userId, p.auto_trib ? 0 : 1);
        const v = breakthroughView(userId, interaction.user.username);
        if (v.content) return interaction.update({ content: v.content, embeds: [], components: [] });
        return interaction.update(v);
      }

      if (action === 'do') {
        const r = doBreakthrough(userId, interaction.user.username);
        // Loan Vọng Âm Đài nếu có; kết quả cập nhật ngay trong bảng (ẩn) + đính lại bảng để đột phá tiếp.
        if (r.announce) for (const e of r.announce) announce(interaction.client, e);
        if (r.dm) coach.dm(interaction.user, r.dm); // DM dẫn dắt (nuốt lỗi nếu chặn DM)
        const after = breakthroughView(userId, interaction.user.username);
        const components = after.content ? [] : after.components;
        const embeds = r.embeds || [];
        if (r.content && !embeds.length) {
          return interaction.update({ content: r.content, embeds: after.embeds || [], components });
        }
        return interaction.update({ content: '', embeds, components });
      }
    },
  },
};
