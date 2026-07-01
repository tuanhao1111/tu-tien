// =====================================================================
//  /dauphap — ĐẤU PHÁP (PvP). Mở khóa ở Nguyên Anh (realm 4).
//  LUẬN VÕ ĐÀI xếp hạng: bấm "Khiêu chiến" -> hệ thống ghép 1 cao thủ NGANG
//  ĐIỂM rồi đánh "bản sao" chỉ số của họ (không cần đối thủ online). Thắng
//  được cộng điểm ELO + thưởng; thua bị trừ điểm. Chưa có ai ngang sức thì
//  ghép "đài chủ" NPC cùng bậc để đài không bao giờ vắng đối thủ.
//
//  Dùng chung engine combat.js (đã nhận opts cho CẢ HAI bên nên công bằng).
//  Hệ điểm/ghép cặp/ghi kết quả ở pvp.js (thuần) + database.js (atomic).
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const sects = require('../sects');
const combat = require('../combat');
const equipment = require('../equipment');
const pvp = require('../pvp');
const features = require('../features');
const leaderboard = require('../leaderboard');
const assets = require('../assets'); // ảnh đối thủ (npc_dau / sect_<id>)
const fight = require('./fight');
const { requireUnlocked } = require('../util/feature-gate');
const { announce } = require('../util/announce');

const cur = config.currency;
const MIN_REALM = config.pvp.minRealm;
const MAX_LOG_LINES = 14;

function renderLog(lines) {
  if (lines.length <= MAX_LOG_LINES) return lines.join('\n');
  const head = lines.slice(0, MAX_LOG_LINES - 2);
  const tail = lines.slice(-2);
  return `${head.join('\n')}\n… *(lược ${lines.length - MAX_LOG_LINES} dòng)* …\n${tail.join('\n')}`;
}

// Định dạng thời gian hồi: dưới 1 phút hiện theo GIÂY, từ 1 phút trở lên theo PHÚT.
function fmtCd(ms) {
  const s = Math.ceil(ms / 1000);
  return s < 60 ? `${s} giây` : `${Math.ceil(s / 60)} phút`;
}

// Build combatant đầy đủ (thuộc tính + cấp chiêu + buff bậc + trang bị + NGỰ THÚ) từ 1 player row.
//  GĐ24: Ngự Thú dùng được cả PvP -> cả hai đấu thủ đều mang thú của mình (đối xứng).
function buildCombatant(name, p) {
  return combat.build(name, p.realm, p.tier, p.sect, db.getEquipped(p), {
    attrs: db.getAttributes(p),
    skillLevels: db.getSkillLevels(p),
    stagesSinceJoin: Math.max(0, cult.globalStage(p.realm, p.tier) - (p.sect_join_stage || 0)),
    gearBonus: db.combatGearBonus(p, true), // gộp chỉ số Ngự Thú
    pet: db.petStrike(p),                   // đòn phụ Ngự Thú
  });
}

// Đài chủ NPC: cùng cảnh giới người chơi, phái ngẫu nhiên, có thuộc tính + trang bị
//  để ngang ngửa một tu sĩ thật cùng bậc (đài không bao giờ vắng đối thủ).
function buildNpc(realm, tier) {
  const sectId = pvp.randomSectId();
  const gearIds = equipment.setFor(sectId).map((it) => it.id);
  return combat.build(pvp.npcName(), realm, tier, sectId, null, {
    attrs: pvp.npcAttrs(realm, tier, sectId),
    gearBonus: equipment.gearBonus(gearIds),
  });
}

// Điều kiện lên đài: đã nhập đạo + đủ cảnh giới + có môn phái. Trả { p } hoặc { msg }.
function gate(userId) {
  const p = db.getPlayer(userId);
  if (!p) return { msg: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" trước nhé.' };
  if (p.realm < MIN_REALM) {
    return { msg: `🔒 **Đấu Pháp** mở khóa ở **${features.realmName(MIN_REALM)}**. Hiện đạo hữu mới **${cult.realmLabel(p.realm, p.tier)}** — tu luyện thêm nhé!` };
  }
  if (!p.sect || !sects.getSect(p.sect)) {
    return { msg: '🏯 Cần có môn phái mới đủ tư cách lên đài! Gõ `/monphai` để gia nhập đã.' };
  }
  return { p };
}

// Màn hình sảnh đài: điểm/hạng/thành tích + nút khiêu chiến (khóa khi đang hồi).
function arenaView(p) {
  const s = db.getPvp(p);
  const rank = pvp.rankOf(s.rating);
  const total = s.wins + s.losses;
  const wr = total ? Math.round((s.wins / total) * 100) : 0;
  const left = config.pvp.cooldownMs - (Date.now() - (s.ts || 0));

  const e = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('⚔️ Luận Võ Đài — Đấu Pháp')
    .setDescription(
      `**Hạng:** ${rank.emoji} ${rank.name}\n` +
      `**Điểm đấu:** 🏆 ${s.rating}\n` +
      `**Thành tích:** ${s.wins} thắng · ${s.losses} thua` + (total ? ` · **${wr}%** thắng` : '') + '\n\n' +
      'Bấm **⚔️ Khiêu chiến** để hệ thống ghép một cao thủ **ngang điểm**. Trận đấu dùng ' +
      '**bản sao chỉ số** của đối thủ nên **không cần họ online**.\n' +
      'Thắng được **+điểm đấu (ELO)** và thưởng; thua bị **−điểm**. Lên hạng càng cao càng vinh diệu!',
    )
    .setFooter({ text: `Ghép theo điểm · cooldown ${fmtCd(config.pvp.cooldownMs)}/trận · Tiên Đồ Lộ` });

  const row = new ActionRowBuilder();
  if (left > 0) {
    row.addComponents(
      new ButtonBuilder().setCustomId('dauphap:fight').setLabel(`⏳ Hồi sức (${fmtCd(left)})`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId('dauphap:fight').setLabel('⚔️ Khiêu chiến').setStyle(ButtonStyle.Danger),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId('dauphap:board').setLabel('🏆 Luận Võ Bảng').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [e], components: [row] };
}

// Bắt đầu 1 trận PvP ĐÁNH THEO LƯỢT — CÔNG KHAI (cả kênh thấy). Ghép đối thủ,
//  đặt cooldown NGAY (bỏ trận giữa chừng vẫn tốn), rồi mở trận. { error } nếu chưa đủ ĐK.
function beginFight(interaction) {
  const user = interaction.user;
  const g = gate(user.id);
  if (g.msg) return { error: g.msg };
  const p = g.p;
  const s = db.getPvp(p);
  const now = Date.now();
  const left = config.pvp.cooldownMs - (now - (s.ts || 0));
  if (left > 0) return { error: `⏳ Còn phải hồi sức **${fmtCd(left)}** mới lên đài tiếp được.` };

  // --- Ghép đối thủ: ưu tiên người thật gần điểm & gần cảnh giới; không có thì NPC ---
  const pool = db.findPvpOpponents(p.discord_id, s.rating, MIN_REALM, config.pvp.matchPool);
  let oppRow = null;
  if (pool.length) {
    const near = pool.filter((o) => Math.abs(o.realm - p.realm) <= config.pvp.realmWindow);
    const cand = near.length ? near : pool;
    oppRow = cand[Math.floor(Math.random() * cand.length)];
  }

  const me = buildCombatant(user.username, p);
  let opp, oppName, oppId, oppIsNpc;
  if (oppRow) {
    opp = buildCombatant(oppRow.username, oppRow);
    oppName = oppRow.username; oppId = oppRow.discord_id; oppIsNpc = false;
  } else {
    opp = buildNpc(p.realm, p.tier);
    oppName = opp.name; oppId = null; oppIsNpc = true;
  }

  db.setPvpTs(user.id, now); // đặt cooldown ngay khi vào trận (chống bỏ trận rồi đánh lại)
  const ctx = {
    type: 'dauphap', oppId, oppName, oppIsNpc,
    title: `⚔️ Luận Võ Đài — ${user.username} khiêu chiến`,
    footer: `Công khai · đối thủ ${oppIsNpc ? 'đài chủ (NPC)' : 'ghép theo điểm'} · chỉ chủ trận điều khiển · ⚡ Đánh nhanh`,
    thumbSrc: oppIsNpc ? assets.src('npc_dau') : assets.src(`sect_${oppRow ? oppRow.sect : ''}`),
  };
  return { promise: fight.start(interaction, me, opp, ctx, { public: true }) };
}

// Khi trận PvP kết thúc -> ghi ELO + thưởng + loan thăng hạng; trả màn kết quả + sảnh đài.
fight.registerOutcome('dauphap', async (interaction, f, ctx) => {
  const userId = interaction.user.id;
  const meScore = f.winner === 'A' ? 1 : f.winner === 'draw' ? 0.5 : 0;
  const win = meScore === 1, draw = meScore === 0.5;
  const result = db.recordPvpMatch(userId, ctx.oppId, meScore);

  let rewardLine = '';
  if (win) {
    const gotStones = config.pvp.winStones ? db.addStones(userId, config.pvp.winStones).gained : 0;
    const gotTuVi = config.pvp.winTuVi ? db.addTuVi(userId, config.pvp.winTuVi).gained : 0;
    db.addDailyProgress(userId, 'pvp_win', 1);
    const parts = [];
    if (gotStones) parts.push(`+${gotStones}${cur.short} ${cur.emoji}`);
    if (gotTuVi) parts.push(`+${gotTuVi} tu vi`);
    rewardLine = parts.join(' · ');
  }

  const oldRank = pvp.rankOf(result.me.old);
  const newRank = pvp.rankOf(result.me.new);
  const rankedUp = result.me.new > result.me.old && newRank.name !== oldRank.name;
  const deltaStr = result.me.delta >= 0 ? `+${result.me.delta}` : `${result.me.delta}`;

  const e = new EmbedBuilder()
    .setColor(draw ? config.colors.info : win ? config.colors.success : config.colors.danger)
    .setTitle('⚔️ Đấu Pháp — Kết Quả')
    .setDescription(
      `🆚 **${ctx.oppName}**${ctx.oppIsNpc ? ' 🤖 *(đài chủ)*' : ''} ${f.B.sectName}\n\n` +
      `Kết quả sau **${f.round} hiệp**: ${draw ? '🤝 **Hòa!**' : win ? '🏆 **Bạn THẮNG!**' : '☠️ **Bạn THUA!**'}\n` +
      `🏆 Điểm đấu: ${result.me.old} → **${result.me.new}** (${deltaStr})\n` +
      `${newRank.emoji} Hạng: **${newRank.name}**\n` +
      `❤️ Máu còn lại: Bạn ${Math.max(0, Math.round(f.A.hp))}/${f.A.maxHp} · Địch ${Math.max(0, Math.round(f.B.hp))}/${f.B.maxHp}`,
    )
    .setFooter({ text: `Cooldown ${fmtCd(config.pvp.cooldownMs)} · đổi chiêu ở 🎴 Kỹ năng` });
  if (rewardLine) e.addFields({ name: '🎁 Thưởng', value: rewardLine });

  if (rankedUp) {
    announce(interaction.client, new EmbedBuilder()
      .setColor(config.colors.gold)
      .setTitle('⚔️ Luận Võ Đài — Thăng Hạng!')
      .setDescription(`**${interaction.user.username}** vừa thăng lên hạng **${newRank.emoji} ${newRank.name}** trên Luận Võ Đài! Danh chấn thiên hạ.`));
  }
  return { content: '', embeds: [e], components: arenaView(db.getPlayer(userId)).components };
});

// --- PANEL ĐẤU PHÁP ĐÀI (sticky + auto-refresh 10s): bảng xếp hạng live + khiêu chiến CÔNG KHAI ---
function boardPanelView() {
  const e = leaderboard.boardEmbed('pvp');
  e.setFooter({ text: 'Panel tự cập nhật ~5s · trận đấu công khai cho cả kênh xem · cooldown ' + fmtCd(config.pvp.cooldownMs) + '/trận' });
  const files = assets.panel(e, 'dauDai', 'image'); // banner (repost/setup upload; tick bỏ files)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dauphap:fight').setLabel('⚔️ Khiêu chiến').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('dauphap:hall').setLabel('📊 Sảnh đài của tôi').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dauphap:board').setLabel('🏆 Luận Võ Bảng').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [e], files, components: [row] };
}
require('../util/livepanels').register('dauDai', boardPanelView, { sticky: true, intervalMs: 5 * 1000 }); // đấu pháp 5s/lần

module.exports = {
  boardPanelView,
  data: new SlashCommandBuilder()
    .setName('dauphap')
    .setDescription('Đấu pháp — tỉ thí xếp hạng với tu sĩ khác (mở khóa ở Nguyên Anh).'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;
    if (!player.sect || !sects.getSect(player.sect)) {
      return interaction.reply({
        content: '🏯 Cần có môn phái mới đủ tư cách lên đài! Gõ `/monphai` để gia nhập đã.',
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply({ ...arenaView(player), flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Panel Đấu Pháp Đài (cũ): mở sảnh đài ẩn của chính người bấm.
    async panel_dauphap(interaction) {
      const g = gate(interaction.user.id);
      if (g.msg) return interaction.reply({ content: g.msg, flags: MessageFlags.Ephemeral });
      return interaction.reply({ ...arenaView(g.p), flags: MessageFlags.Ephemeral });
    },

    async dauphap(interaction) {
      const action = interaction.customId.split(':')[1];

      if (action === 'board') {
        return interaction.reply({ embeds: [leaderboard.boardEmbed('pvp')], flags: MessageFlags.Ephemeral });
      }

      // Sảnh đài CÁ NHÂN (ẩn): xem điểm/hạng/thành tích của riêng mình.
      if (action === 'hall') {
        const g = gate(interaction.user.id);
        if (g.msg) return interaction.reply({ content: g.msg, flags: MessageFlags.Ephemeral });
        return interaction.reply({ ...arenaView(g.p), flags: MessageFlags.Ephemeral });
      }

      if (action === 'fight') {
        const res = beginFight(interaction); // trận CÔNG KHAI (cả kênh thấy)
        if (res.error) {
          return interaction.reply({ content: res.error, flags: MessageFlags.Ephemeral });
        }
        return res.promise; // fight.start đã interaction.reply(view trận công khai)
      }
    },
  },
};
