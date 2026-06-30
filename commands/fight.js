// =====================================================================
//  ĐIỀU KHIỂN TRẬN ĐÁNH THEO LƯỢT (dùng chung cho bí cảnh / đấu tập / PvP / farm).
//  Lưu phiên trận trong RAM (Map, TTL) — combat là transient nên không bền hóa.
//  Mỗi tính năng:
//    1) gọi fight.start(interaction, me, foe, ctx, {useUpdate}) để mở trận;
//    2) đăng ký fight.registerOutcome(ctx.type, fn) — fn(interaction, fight, ctx)
//       chạy khi trận KẾT THÚC, trả về view {embeds, components} (KHÔNG tự update).
//  Nút trong trận: fight:skill:<id> · fight:basic · fight:auto (Đánh nhanh).
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const cult = require('../cultivation');
const combat = require('../combat');

const sessions = new Map(); // messageId -> { fight, ctx, ts }
const outcomes = new Map(); // ctx.type -> async (interaction, fight, ctx) => view
const TTL_MS = 10 * 60 * 1000;
const MAX_LOG_LINES = 12;

function gc() {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.ts > TTL_MS) sessions.delete(id);
}

function registerOutcome(type, fn) { outcomes.set(type, fn); }

function renderLog(lines) {
  if (lines.length <= MAX_LOG_LINES) return lines.join('\n');
  const tail = lines.slice(-MAX_LOG_LINES);
  return `… *(lược ${lines.length - MAX_LOG_LINES} dòng đầu)* …\n${tail.join('\n')}`;
}

function hpBar(c) {
  return `${cult.progressBar(Math.max(0, c.hp), c.maxHp)} **${Math.max(0, Math.round(c.hp))}/${c.maxHp}**`;
}

// Dòng trạng thái chiêu (🟢 sẵn sàng / ⚪ chưa hồi/thiếu linh lực).
function skillStatus(A) {
  if (!A.actives.length) return '';
  return '\n' + A.actives.map((sk) => {
    const cd = A.cd[sk.id] || 0;
    const ok = combat.skillReady(A, sk);
    return `${ok ? '🟢' : '⚪'} ${sk.emoji} **${sk.name}** _(💠${sk.mp}${cd > 0 ? ` · hồi ${cd}` : ''})_`;
  }).join('\n');
}

function fightEmbed(fight, ctx) {
  const { A, B } = fight;
  const e = new EmbedBuilder()
    .setColor(fight.over ? (fight.winner === 'A' ? config.colors.success : fight.winner === 'draw' ? config.colors.info : config.colors.danger) : (ctx.color || config.colors.primary))
    .setTitle(ctx.title || '⚔️ Giao Chiến')
    .setDescription(
      `**${A.name}** ${A.sectName}\n🆚 **${B.name}** ${B.sectName}\n\n` +
      `❤️ Bạn: ${hpBar(A)}\n💢 Địch: ${hpBar(B)}\n💠 Linh lực: ${Math.max(0, Math.round(A.mp))}/${A.maxMp}\n` +
      skillStatus(A) +
      `\n\n**Diễn biến — hiệp ${fight.round}:**\n${renderLog(fight.log) || '*(trận vừa bắt đầu — chọn chiêu để ra đòn!)*'}`,
    )
    .setFooter({ text: ctx.footer || 'Chọn chiêu/đánh thường để đi 1 lượt · ⚡ Đánh nhanh để tự kết thúc.' });
  // Ảnh đối thủ/vùng (thumbnail). Upload 1 lần lúc mở trận; các lượt sau chỉ
  //  THAM CHIẾU attachment đã có (không re-upload) -> nhẹ. ctx.thumbSrc do feature set.
  if (ctx.thumbSrc) {
    if (ctx.thumbSrc.url) e.setImage(ctx.thumbSrc.url);
    else if (ctx.thumbSrc.name) e.setImage(`attachment://${ctx.thumbSrc.name}`);
  }
  return e;
}
// File đính kèm ban đầu (chỉ khi ảnh là FILE local) — upload duy nhất lúc mở trận.
function initialFiles(ctx) {
  if (ctx.thumbSrc && ctx.thumbSrc.file && ctx.thumbSrc.name) {
    return [new AttachmentBuilder(ctx.thumbSrc.file, { name: ctx.thumbSrc.name })];
  }
  return [];
}

function fightComponents(fight) {
  const A = fight.A;
  const row = new ActionRowBuilder();
  for (const sk of A.actives.slice(0, 3)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`fight:skill:${sk.id}`)
        .setLabel(`${sk.emoji} ${sk.name}`.slice(0, 78))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!combat.skillReady(A, sk)),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId('fight:basic').setLabel('👊 Đánh thường').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('fight:auto').setLabel('⚡ Đánh nhanh').setStyle(ButtonStyle.Success),
  );
  return [row];
}

function renderFight(fight, ctx) {
  return { content: '', embeds: [fightEmbed(fight, ctx)], components: fightComponents(fight) };
}

// Mở 1 trận đánh theo lượt. me/foe = combatant (combat.build). ctx.type phải có outcome đăng ký.
//  Phiên trận keyed theo MESSAGE.ID (mỗi message 1 trận) -> mở trận mới ở tính năng
//  khác KHÔNG đè trận đang dở, và nút trên message cũ chỉ điều khiển trận của message đó.
async function start(interaction, me, foe, ctx, opts = {}) {
  gc();
  const fight = combat.startFight(me, foe, { maxRounds: opts.maxRounds });
  const view = renderFight(fight, ctx);
  const files = initialFiles(ctx); // upload ảnh 1 lần (rỗng nếu dùng URL/không có ảnh)
  let messageId;
  if (opts.useUpdate) {
    await interaction.update({ ...view, files, attachments: [] }); // xóa attachment cũ của message, gắn ảnh trận
    messageId = interaction.message.id;
  } else if (opts.public) {
    // Trận CÔNG KHAI (vd Đấu Pháp): hiện cho cả kênh thấy. Chỉ CHỦ TRẬN điều khiển được.
    await interaction.reply({ ...view, files });
    const msg = await interaction.fetchReply();
    messageId = msg.id;
  } else {
    await interaction.reply({ ...view, files, flags: MessageFlags.Ephemeral });
    const msg = await interaction.fetchReply();
    messageId = msg.id;
  }
  // ownerId: trận công khai chỉ chủ trận bấm được nút (trận ẩn vốn đã cô lập).
  sessions.set(messageId, { fight, ctx, ts: Date.now(), ownerId: interaction.user.id });
}

module.exports = {
  start,
  registerOutcome,
  buttons: {
    async fight(interaction) {
      gc();
      const sess = sessions.get(interaction.message.id);
      // Hết hạn TTL nhưng gc chưa kịp dọn -> coi như đã kết thúc.
      if (sess && Date.now() - sess.ts > TTL_MS) { sessions.delete(interaction.message.id); }
      if (!sess || Date.now() - sess.ts > TTL_MS) {
        return interaction.update({ content: '🌫️ Trận đấu đã kết thúc hoặc hết hạn. Mở lại để đánh tiếp.', embeds: [], components: [] }).catch(() => {});
      }
      // Trận công khai: chỉ CHỦ TRẬN được điều khiển (người khác bấm -> báo ẩn).
      if (sess.ownerId && interaction.user.id !== sess.ownerId) {
        return interaction.reply({ content: '⚔️ Đây không phải trận của bạn — lên đài tự khiêu chiến nhé!', flags: MessageFlags.Ephemeral }).catch(() => {});
      }
      const { fight: f, ctx } = sess;
      const parts = interaction.customId.split(':');
      const action = parts[1];

      if (!f.over) {
        if (action === 'auto') combat.autoResolve(f);
        else if (action === 'skill') combat.stepRound(f, parts[2]);
        else combat.stepRound(f, null); // 'basic'
      }
      sess.ts = Date.now();

      if (f.over) {
        sessions.delete(interaction.message.id);
        const handler = outcomes.get(ctx.type);
        const view = handler ? await handler(interaction, f, ctx) : renderFight(f, ctx);
        // attachments:[] xóa ảnh trận (màn kết quả không dùng) khỏi message.
        return interaction.update({ ...view, attachments: [] }).catch(() => {});
      }
      return interaction.update(renderFight(f, ctx)).catch(() => {}); // giữ ảnh (không truyền files/attachments)
    },
  },
};
