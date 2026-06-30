// =====================================================================
//  /toduoi — PHÓ BẢN TỔ ĐỘI (co-op 2-4 người, mở khóa ở Kim Đan).
//  Lập tổ đội (tin CÔNG KHAI) -> rủ người bấm "Tham gia" -> trưởng chọn vùng
//  bí cảnh & "Bắt đầu" -> cả đội "Công Phạt" 1 BOSS HP CHUNG (đánh theo lượt,
//  sát thương trừ vào HP boss như Boss Thế Giới). Hạ boss -> chia thưởng theo
//  % đóng góp (linh thạch/tu vi/nguyên liệu + rớt trang bị ưu tiên tứ tính phái).
//
//  Trạng thái tổ đội giữ TRONG RAM (parties Map). Bot restart giữa chừng -> mất
//  tổ đội đang dở (hiếm, chấp nhận cho MVP — giống phiên trận trong fight.js).
//  customId router: party:<action>[:arg]. Không cần bền hóa DB (thưởng dùng lại
//  addStones/addTuVi/addMaterials/addGearItem sẵn có).
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const sects = require('../sects');
const combat = require('../combat');
const bicanh = require('../bicanh');
const party = require('../party');
const gear = require('../gear');
const ui = require('../util/ui');
const assets = require('../assets');
const fight = require('./fight');
const { announce } = require('../util/announce');

const cur = config.currency;
const PC = () => config.party || {};

// leaderId -> party state. memberOf: userId -> leaderId (1 người chỉ ở 1 tổ đội).
//  party = { leaderId, leaderName, members:Map<id,{id,username,sect,damage,lastTs}>,
//            zoneId, status:'lobby'|'raid'|'done', realm, tier,
//            boss:{name,emoji,display,maxHp,hp}|null, message, ts }
const parties = new Map();
const memberOf = new Map();

function gc() {
  const now = Date.now();
  for (const [lid, p] of parties) {
    const ttl = p.status === 'raid' ? (PC().raidTtlMs || 1.8e6) : (PC().lobbyTtlMs || 9e5);
    if (now - (p.ts || 0) > ttl) cleanup(p);
  }
}
function findParty(userId) {
  const lid = memberOf.get(userId);
  return lid ? parties.get(lid) || null : null;
}
function partyByMessage(msgId) {
  for (const p of parties.values()) if (p.message && p.message.id === msgId) return p;
  return null;
}
function cleanup(p) {
  if (!p) return;
  for (const id of p.members.keys()) memberOf.delete(id);
  parties.delete(p.leaderId);
}

// Gate: đã nhập đạo + có môn phái + đạt cảnh giới mở. Trả player | null (đã reply lỗi).
function eligible(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) { interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" trước nhé.', flags: MessageFlags.Ephemeral }).catch(() => {}); return null; }
  if (!p.sect || !sects.getSect(p.sect)) { interaction.reply({ content: '🏯 Cần có môn phái mới lập/đi phó bản tổ đội! Gõ `/monphai` để gia nhập đã.', flags: MessageFlags.Ephemeral }).catch(() => {}); return null; }
  if ((p.realm ?? 0) < party.minRealm()) { const rn = (cult.REALMS[party.minRealm()] || {}).name || 'Kim Đan'; interaction.reply({ content: `🔒 Phó Bản Tổ Đội mở ở **${rn}**. Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}**.`, flags: MessageFlags.Ephemeral }).catch(() => {}); return null; }
  return p;
}

function memberLine(m, leaderId, withDmg) {
  const s = sects.getSect(m.sect);
  const crown = m.id === leaderId ? '👑 ' : '▫️ ';
  const tag = s ? ` ${s.emoji}` : '';
  const dmg = withDmg ? ` — 💢 ${ui.num(m.damage || 0)}` : '';
  return `${crown}**${m.username}**${tag}${dmg}`;
}

// --- Màn LOBBY (công khai) ---
function lobbyView(p) {
  const zone = p.zoneId ? bicanh.getZone(p.zoneId) : null;
  const list = [...p.members.values()].map((m) => memberLine(m, p.leaderId, false)).join('\n');
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🛡️ Tổ Đội Phó Bản — Chiêu Mộ')
    .setDescription(
      `Trưởng đội **${p.leaderName}** đang chiêu mộ đạo hữu cùng xông phó bản!\n\n` +
      `**👥 Thành viên (${p.members.size}/${party.maxMembers()}):**\n${list}\n\n` +
      `**🗺️ Bí cảnh:** ${zone ? `${zone.emoji} ${zone.name}` : '*(trưởng đội chưa chọn)*'}` +
      (zone ? `\n*${zone.desc}*` : ''),
    )
    .setFooter({ text: `Tham Gia để vào đội · Trưởng đội chọn bí cảnh rồi Bắt Đầu · boss HP chung, chia thưởng theo đóng góp · tối đa ${party.dailyAttempts()} lượt/người/ngày.` });

  const comps = [];
  // Trưởng đội chọn vùng (theo cảnh giới trưởng đội).
  const leader = db.getPlayer(p.leaderId);
  const zones = leader ? bicanh.zonesFor(leader.realm) : [];
  if (zones.length) {
    comps.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('party:zone').setPlaceholder('🗺️ (Trưởng đội) chọn bí cảnh…')
        .addOptions(zones.map((z) => ({ label: z.name, emoji: z.emoji, description: z.desc.slice(0, 95), value: z.id, default: z.id === p.zoneId }))),
    ));
  }
  comps.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('party:join').setLabel('Tham Gia').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId('party:invitebtn').setLabel('Mời bạn').setStyle(ButtonStyle.Primary).setEmoji('📨')
      .setDisabled(p.members.size >= party.maxMembers()),
    new ButtonBuilder().setCustomId('party:leave').setLabel('Rời Đội').setStyle(ButtonStyle.Secondary).setEmoji('🚪'),
    new ButtonBuilder().setCustomId('party:start').setLabel('Bắt Đầu (trưởng đội)').setStyle(ButtonStyle.Danger).setEmoji('⚔️').setDisabled(!p.zoneId),
    new ButtonBuilder().setCustomId('party:disband').setLabel('Giải Tán').setStyle(ButtonStyle.Secondary).setEmoji('🏳️'),
  ));
  return { embeds: [e], components: comps };
}

// --- Màn RAID (công khai): boss HP chung + bảng đóng góp ---
function raidView(p) {
  const zone = bicanh.getZone(p.zoneId);
  const b = p.boss;
  const list = [...p.members.values()].sort((a, m) => (m.damage || 0) - (a.damage || 0))
    .map((m) => memberLine(m, p.leaderId, true)).join('\n');
  const e = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(`${b.display} — Phó Bản ${zone ? zone.emoji + ' ' + zone.name : ''}`)
    .setDescription(
      `${ui.barLine('❤️', 'HP Boss', Math.max(0, b.hp), b.maxHp, 20)}\n\n` +
      `**🏆 Đóng góp:**\n${list}\n\n` +
      `_Mỗi người bấm **⚔️ Công Phạt** để đánh 1 đợt (theo lượt) — sát thương trừ vào HP chung. Hạ boss chia thưởng theo % đóng góp._`,
    )
    .setFooter({ text: `Công phạt cách nhau ${ui.dur(party.attackCooldownMs())}/người. Boss càng đông càng trâu — phối hợp nào!` });
  const comps = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('party:attack').setLabel('Công Phạt').setStyle(ButtonStyle.Danger).setEmoji('⚔️'),
    new ButtonBuilder().setCustomId('party:refresh').setLabel('Làm mới').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
    new ButtonBuilder().setCustomId('party:disband').setLabel('Giải Tán (trưởng đội)').setStyle(ButtonStyle.Secondary).setEmoji('🏳️'),
  )];
  return { embeds: [e], components: comps };
}

// Đẩy trạng thái mới xuống tin CÔNG KHAI của tổ đội.
async function pushPublic(p) {
  if (!p.message) return;
  const view = p.status === 'raid' ? raidView(p) : lobbyView(p);
  await p.message.edit(view).catch(() => {});
}

// =====================================================================
//  OUTCOME 1 đợt công phạt (đánh theo lượt) KẾT THÚC -> trừ HP boss chung.
// =====================================================================
fight.registerOutcome('party', async (interaction, f, ctx) => {
  const dmg = Math.max(0, Math.round((ctx.poolMax || 0) - Math.max(0, f.B.hp)));
  const p = parties.get(ctx.leaderId);
  if (!p || p.status !== 'raid' || !p.boss) {
    return { content: '', embeds: [new EmbedBuilder().setColor(config.colors.info)
      .setTitle('🌫️ Phó bản đã kết thúc').setDescription(`Bạn gây **${ui.num(dmg)}** sát thương, nhưng trận đã khép lại.`)],
      components: [] };
  }
  const me = p.members.get(interaction.user.id);
  if (me) me.damage = (me.damage || 0) + dmg;
  p.boss.hp -= dmg;
  p.ts = Date.now();

  if (p.boss.hp <= 0) {
    p.status = 'done';
    const summary = distributeRewards(p);
    await p.message?.edit(victoryView(p, summary)).catch(() => {});
    announceRaidKill(interaction.client, p, summary);
    cleanup(p);
    return myVictoryView(p, summary, interaction.user.id, dmg);
  }
  await pushPublic(p);
  return { content: '', embeds: [new EmbedBuilder().setColor(config.colors.success)
    .setTitle(`⚔️ Công phạt xong — ${p.boss.display}`)
    .setDescription(`💥 Bạn gây **${ui.num(dmg)}** sát thương!\n${ui.barLine('❤️', 'HP Boss', Math.max(0, p.boss.hp), p.boss.maxHp, 18)}\n\n💢 Tổng đóng góp của bạn: **${ui.num(me ? me.damage : dmg)}**`)
    .setFooter({ text: `Hồi sức ${ui.dur(party.attackCooldownMs())} rồi công phạt tiếp trên tin tổ đội.` })],
    components: [] };
});

// Chia thưởng cho mọi người có đóng góp. Trả { pool, total, contributors:[{...}] }.
function distributeRewards(p) {
  const zone = bicanh.getZone(p.zoneId);
  const membersArr = [...p.members.values()].filter((m) => (m.damage || 0) > 0);
  const total = membersArr.reduce((s, m) => s + (m.damage || 0), 0);
  const pool = party.rewardPool(zone, p.realm, p.tier, p.members.size);
  const contributors = [];
  for (const m of membersArr) {
    const sh = party.shareFor(m.damage, total, pool);
    const stones = sh.stones > 0 ? db.addStones(m.id, sh.stones).gained : 0;
    const tuViRes = sh.tuVi > 0 ? db.addTuVi(m.id, sh.tuVi) : { gained: 0 };
    // Nguyên liệu vùng (mức boss-floor: hậu hơn).
    const mats = zone ? bicanh.rollLoot(zone, 5, p.realm).mats : {};
    if (Object.keys(mats).length) db.addMaterials(m.id, mats);
    // Rớt trang bị: từ LIST CỐ ĐỊNH của vùng (mỗi phó bản 1 bảng drop riêng).
    //  Fallback gear.rollDrop ngẫu nhiên nếu vùng chưa có bảng (an toàn).
    let drop = null;
    if (Math.random() < (PC().dropChance || 0)) {
      let item = party.rollZoneDrop(p.zoneId, p.realm, p.tier, m.sect);
      if (!item) {
        const aff = Math.random() < (PC().affToOwnSect || 0) ? m.sect : undefined;
        item = gear.rollDrop(p.realm, p.tier, { rarityBoost: PC().dropRarityBoost || 0, aff });
      }
      drop = db.addGearItem(m.id, item);
    }
    contributors.push({ id: m.id, username: m.username, damage: m.damage, share: sh.share, stones, tuVi: tuViRes.gained, mats, drop, premium: 0 });
  }
  contributors.sort((a, b) => b.damage - a.damage);
  // 🔮 TIÊN NGỌC: chia cho TOP đóng góp (top-1 gấp đôi). Tiền cao cấp -> rất nhỏ giọt.
  const shares = party.premiumShares(contributors.length);
  contributors.forEach((c, i) => {
    const tn = shares[i] || 0;
    if (tn > 0) { db.addPremium(c.id, tn); c.premium = tn; }
  });
  return { pool, total, contributors };
}

function rewardLine(c) {
  const parts = [`${cur.emoji} ${ui.num(c.stones)}${cur.short}`, `📿 ${ui.num(c.tuVi)} tu vi`];
  if (c.premium > 0) { const pc = config.premiumCurrency; parts.push(`${pc.emoji} ${c.premium}${pc.short}`); }
  for (const [id, q] of Object.entries(c.mats || {})) { const mt = bicanh.materialInfo(id); if (mt && q > 0) parts.push(`${mt.emoji}×${q}`); }
  if (c.drop && c.drop.item) parts.push(`🎁 ${gear.nameOf(c.drop.item)}`);
  else if (c.drop && c.drop.salvaged) parts.push(`🎁 kho đầy → +${c.drop.refine}🔩`);
  return parts.join(' · ');
}

// Màn THẮNG trên tin công khai (cả đội xem).
function victoryView(p, summary) {
  const medal = ['🥇', '🥈', '🥉', '4️⃣'];
  const lines = summary.contributors.map((c, i) =>
    `${medal[i] || `\`#${i + 1}\``} **${c.username}** _(${Math.round(c.share * 100)}%)_\n   ${rewardLine(c)}`).join('\n');
  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`💀 ${p.boss.display} ĐÃ BỊ HẠ GỤC!`)
    .setDescription(`Tổ đội của **${p.leaderName}** đã hợp lực hạ gục boss phó bản!\n\n**🎁 Phần thưởng (theo đóng góp):**\n${lines}`)
    .setFooter({ text: 'Lập tổ đội mới với /toduoi để chinh phục bí cảnh sâu hơn!' });
  return { embeds: [e], components: [] };
}
// Màn THẮNG riêng (ephemeral) cho người ra đòn kết liễu.
function myVictoryView(p, summary, meId, finalDmg) {
  const mine = summary.contributors.find((c) => c.id === meId);
  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`💀 ${p.boss.display} đã bị hạ — đòn kết liễu là của bạn!`)
    .setDescription(
      `⚔️ Đòn cuối **${ui.num(finalDmg)}** sát thương đã tiễn boss về trời!\n\n` +
      (mine ? `**Phần thưởng của bạn** _(đóng góp ${Math.round(mine.share * 100)}%):_\n${rewardLine(mine)}` : '_(bạn không có đóng góp được ghi nhận)_'),
    );
  return { content: '', embeds: [e], components: [] };
}

function announceRaidKill(client, p, summary) {
  const zone = bicanh.getZone(p.zoneId);
  const top = summary.contributors.slice(0, 3).map((c, i) => `${['🥇', '🥈', '🥉'][i]} **${c.username}**`).join(' · ');
  announce(client, new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🏆 Kỳ Tích Phó Bản Tổ Đội!')
    .setDescription(`Tổ đội **${p.leaderName}** vừa hạ gục **${p.boss.display}** tại **${zone ? zone.emoji + ' ' + zone.name : 'phó bản'}**!\nCông thần: ${top}`));
}

// =====================================================================
//  COMMAND + ROUTER NÚT
// =====================================================================
async function open(interaction) {
  gc();
  const player = eligible(interaction);
  if (!player) return;

  // Đã ở trong 1 tổ đội -> chỉ điểm về tin tổ đội + cho Rời (chỉ khi đang lobby).
  const existing = findParty(player.discord_id);
  if (existing) {
    const isLeader = existing.leaderId === player.discord_id;
    const e = new EmbedBuilder().setColor(config.colors.info)
      .setTitle('👥 Bạn đang ở trong một tổ đội')
      .setDescription(`Trưởng đội: **${existing.leaderName}** · trạng thái: **${existing.status === 'raid' ? 'đang đánh phó bản' : 'đang chiêu mộ'}**.\nLên tin tổ đội phía trên để thao tác.${existing.status === 'raid' ? '' : '\nMuốn lập đội khác? Rời đội hiện tại trước.'}`);
    const comps = existing.status === 'lobby'
      ? [ui.row(ui.btn('party:leave', isLeader ? 'Giải tán đội của tôi' : 'Rời đội', 'danger', { emoji: '🚪' }))]
      : [];
    return interaction.reply({ embeds: [e], components: comps, flags: MessageFlags.Ephemeral });
  }

  // Lập tổ đội mới: người gọi = trưởng đội. Tin CÔNG KHAI để mọi người Tham Gia.
  const p = {
    leaderId: player.discord_id, leaderName: player.username,
    members: new Map([[player.discord_id, { id: player.discord_id, username: player.username, sect: player.sect, damage: 0, lastTs: 0 }]]),
    zoneId: null, status: 'lobby', realm: player.realm, tier: player.tier, boss: null, message: null, ts: Date.now(),
  };
  parties.set(p.leaderId, p);
  memberOf.set(p.leaderId, p.leaderId);
  await interaction.reply(lobbyView(p));
  p.message = await interaction.fetchReply().catch(() => null);
  if (!p.message) { cleanup(p); } // không lấy được message -> hủy (tránh tổ đội ma)
}

// =====================================================================
//  STICKY tin tổ đội ĐANG HOẠT ĐỘNG: kênh có tin mới -> đăng lại tin lobby/raid
//  xuống ĐÁY (xóa cái cũ) để KHÔNG bị trôi. Debounce + giãn cách tối thiểu.
//  index.js gọi onChannelMessage(message) trong sự kiện MessageCreate.
// =====================================================================
const stickyPending = new Map(); // channelId -> timeout
function onChannelMessage(message) {
  if (config.ui && config.ui.stickyEnabled === false) return;
  if (!message || !message.channelId || (message.author && message.author.bot)) return;
  const p = [...parties.values()].find((pp) => pp.message && pp.message.channelId === message.channelId && pp.status !== 'done');
  if (!p) return;
  if (stickyPending.has(message.channelId)) return; // đã hẹn -> gộp
  const t = setTimeout(() => { stickyPending.delete(message.channelId); repostParty(p).catch(() => {}); }, (config.ui && config.ui.stickyDebounceMs) || 4000);
  if (typeof t.unref === 'function') t.unref();
  stickyPending.set(message.channelId, t);
}
async function repostParty(p) {
  if (!p || !p.message || p.status === 'done') return;
  const channel = p.message.channel;
  if (!channel || typeof channel.send !== 'function') return;
  if (channel.lastMessageId && channel.lastMessageId === p.message.id) return; // chưa bị trôi
  const now = Date.now();
  if (p.lastRepost && now - p.lastRepost < 12000) return; // chống đăng lại quá dày
  p.lastRepost = now;
  const view = p.status === 'raid' ? raidView(p) : lobbyView(p);
  const sent = await channel.send(view).catch(() => null);
  if (!sent) return;
  const old = p.message;
  p.message = sent; // tham chiếu mới TRƯỚC khi xóa cũ (partyByMessage dùng id mới)
  if (old && old.id !== sent.id) old.delete().catch(() => {});
}

module.exports = {
  data: new SlashCommandBuilder().setName('toduoi').setDescription('Lập tổ đội (2-4 người) đi phó bản co-op (mở ở Kim Đan).'),
  async execute(interaction) { return open(interaction); },
  onChannelMessage,

  buttons: {
    // Panel Phó Bản Tổ Đội: nút "Lập tổ đội" -> mở phòng chờ công khai.
    async panel_toduoi(interaction) { return open(interaction); },

    async party(interaction) {
      gc();
      const action = interaction.customId.split(':')[1];
      const userId = interaction.user.id;
      const now = Date.now();

      // --- Trưởng đội chọn bí cảnh (trên tin lobby) ---
      if (action === 'zone' && interaction.isStringSelectMenu()) {
        const p = partyByMessage(interaction.message.id);
        if (!p) return interaction.update({ content: '🌫️ Tổ đội đã giải tán.', embeds: [], components: [] }).catch(() => {});
        if (userId !== p.leaderId) return interaction.reply({ content: '🗺️ Chỉ trưởng đội chọn bí cảnh được.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (p.status !== 'lobby') return interaction.deferUpdate().catch(() => {});
        p.zoneId = interaction.values[0]; p.ts = now;
        return interaction.update(lobbyView(p)).catch(() => {});
      }

      // --- Tham gia ---
      if (action === 'join') {
        const p = partyByMessage(interaction.message.id);
        if (!p) return interaction.update({ content: '🌫️ Tổ đội đã giải tán.', embeds: [], components: [] }).catch(() => {});
        if (p.status !== 'lobby') return interaction.reply({ content: '⚔️ Tổ đội đã vào trận, không thể tham gia.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const player = eligible(interaction);
        if (!player) return;
        if (p.members.has(userId)) return interaction.reply({ content: '👥 Bạn đã ở trong tổ đội này rồi.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (findParty(userId)) return interaction.reply({ content: '🚪 Bạn đang ở một tổ đội khác — rời đội đó trước đã.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (p.members.size >= party.maxMembers()) return interaction.reply({ content: '🈵 Tổ đội đã đủ người rồi.', flags: MessageFlags.Ephemeral }).catch(() => {});
        p.members.set(userId, { id: userId, username: player.username, sect: player.sect, damage: 0, lastTs: 0 });
        memberOf.set(userId, p.leaderId); p.ts = now;
        return interaction.update(lobbyView(p)).catch(() => {});
      }

      // --- Mời bạn: mở menu chọn người (ẩn) ---
      if (action === 'invitebtn') {
        const p = partyByMessage(interaction.message.id);
        if (!p) return interaction.reply({ content: '🌫️ Tổ đội đã giải tán.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (p.status !== 'lobby') return interaction.reply({ content: '⚔️ Tổ đội đã vào trận, không mời thêm được.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (!p.members.has(userId)) return interaction.reply({ content: '👥 Chỉ thành viên trong đội mới mời được — bấm Tham Gia trước nhé.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const slotsLeft = party.maxMembers() - p.members.size;
        if (slotsLeft <= 0) return interaction.reply({ content: '🈵 Tổ đội đã đủ người.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const menu = new UserSelectMenuBuilder().setCustomId(`party:invite:${p.leaderId}`)
          .setPlaceholder('Chọn đạo hữu để mời…').setMinValues(1).setMaxValues(slotsLeft);
        return interaction.reply({ content: '📨 Chọn người bạn muốn rủ vào tổ đội:', components: [new ActionRowBuilder().addComponents(menu)], flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      // --- Mời bạn: đã chọn người -> ping kèm link tổ đội (tránh trôi tin) ---
      if (action === 'invite' && interaction.isUserSelectMenu()) {
        const leaderId = interaction.customId.split(':')[2];
        const p = parties.get(leaderId);
        if (!p || p.status !== 'lobby') return interaction.update({ content: '🌫️ Tổ đội không còn nhận người.', components: [] }).catch(() => {});
        const picked = interaction.values.filter((uid) => uid !== userId && !p.members.has(uid));
        if (!picked.length) return interaction.update({ content: 'Không có ai mới để mời (đã trong đội hoặc là chính bạn).', components: [] }).catch(() => {});
        const url = p.message ? p.message.url : null;
        const mentions = picked.map((uid) => `<@${uid}>`).join(' ');
        const text = `📨 ${mentions} — **${interaction.user.username}** rủ bạn vào **tổ đội phó bản** của **${p.leaderName}**!` +
          (url ? `\n👉 Bấm **Tham Gia** tại tổ đội: ${url}` : '');
        await interaction.channel?.send({ content: text, allowedMentions: { users: picked } }).catch(() => {});
        return interaction.update({ content: `✅ Đã mời ${picked.length} đạo hữu vào đội.`, components: [] }).catch(() => {});
      }

      // --- Rời đội (lobby). Trưởng rời = giải tán. ---
      if (action === 'leave') {
        const p = findParty(userId);
        if (!p) return interaction.update({ content: 'Bạn không ở trong tổ đội nào.', embeds: [], components: [] }).catch(() => {});
        if (p.status === 'raid') return interaction.reply({ content: '⚔️ Không thể rời khi đang trong phó bản.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const onPublic = p.message && interaction.message && interaction.message.id === p.message.id;
        if (userId === p.leaderId) {
          await p.message?.edit({ embeds: [new EmbedBuilder().setColor(config.colors.muted || config.colors.info).setTitle('🏳️ Tổ đội đã giải tán').setDescription(`Trưởng đội **${p.leaderName}** đã giải tán tổ đội.`)], components: [] }).catch(() => {});
          cleanup(p);
          if (onPublic) return; // tin công khai đã được edit ở trên
          return interaction.update({ content: '🏳️ Đã giải tán tổ đội của bạn.', embeds: [], components: [] }).catch(() => {});
        }
        p.members.delete(userId); memberOf.delete(userId); p.ts = now;
        await pushPublic(p);
        if (onPublic) return interaction.update(lobbyView(p)).catch(() => {});
        return interaction.update({ content: '🚪 Đã rời tổ đội.', embeds: [], components: [] }).catch(() => {});
      }

      // --- Giải tán (trưởng đội) ---
      if (action === 'disband') {
        const p = partyByMessage(interaction.message.id) || findParty(userId);
        if (!p) return interaction.update({ content: '🌫️ Tổ đội đã giải tán.', embeds: [], components: [] }).catch(() => {});
        if (userId !== p.leaderId) return interaction.reply({ content: '🏳️ Chỉ trưởng đội giải tán được.', flags: MessageFlags.Ephemeral }).catch(() => {});
        cleanup(p);
        return interaction.update({ embeds: [new EmbedBuilder().setColor(config.colors.info).setTitle('🏳️ Tổ đội đã giải tán').setDescription(`Trưởng đội **${p.leaderName}** đã giải tán tổ đội.`)], components: [] }).catch(() => {});
      }

      // --- Bắt đầu phó bản (trưởng đội) ---
      if (action === 'start') {
        const p = partyByMessage(interaction.message.id);
        if (!p) return interaction.update({ content: '🌫️ Tổ đội đã giải tán.', embeds: [], components: [] }).catch(() => {});
        if (userId !== p.leaderId) return interaction.reply({ content: '⚔️ Chỉ trưởng đội bắt đầu được.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if (p.status !== 'lobby') return interaction.deferUpdate().catch(() => {});
        const leader = db.getPlayer(p.leaderId);
        const zone = p.zoneId ? bicanh.getZone(p.zoneId) : null;
        if (!zone) return interaction.reply({ content: '🗺️ Hãy chọn bí cảnh trước khi bắt đầu.', flags: MessageFlags.Ephemeral }).catch(() => {});
        if ((leader.realm ?? 0) < zone.minRealm) return interaction.reply({ content: `🔒 Trưởng đội cần đạt **${zone.emoji} ${zone.name}** (cảnh giới đủ) mới mở được bí cảnh này.`, flags: MessageFlags.Ephemeral }).catch(() => {});
        // CHỐNG SPAM: mỗi thành viên có giới hạn lượt phó bản/ngày. Chặn nếu có ai hết lượt.
        const exhausted = [...p.members.values()].filter((m) => db.partyAttemptsLeft(m.id, now) <= 0);
        if (exhausted.length) {
          return interaction.reply({
            content: `🈵 Hết lượt phó bản hôm nay: ${exhausted.map((m) => `**${m.username}**`).join(', ')}.\nMỗi người tối đa **${party.dailyAttempts()}** lượt/ngày (reset theo giờ VN) — rời các thành viên này hoặc chờ sang ngày mới.`,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        // Tiêu 1 lượt mỗi thành viên (tính khi BẮT ĐẦU raid).
        for (const m of p.members.values()) db.consumePartyAttempt(m.id, now);
        // Chốt cơ sở scale theo trưởng đội + sinh boss HP chung.
        p.realm = leader.realm; p.tier = leader.tier;
        const meta = party.bossNameFor(zone, p.members.size + cult.globalStage(p.realm, p.tier));
        const maxHp = party.raidBossHp(zone, p.realm, p.tier, p.members.size);
        p.boss = { ...meta, maxHp, hp: maxHp };
        for (const m of p.members.values()) { m.damage = 0; m.lastTs = 0; }
        p.status = 'raid'; p.ts = now;
        return interaction.update(raidView(p)).catch(() => {});
      }

      // --- Làm mới tin raid ---
      if (action === 'refresh') {
        const p = partyByMessage(interaction.message.id);
        if (!p) return interaction.update({ content: '🌫️ Tổ đội đã giải tán.', embeds: [], components: [] }).catch(() => {});
        return interaction.update(p.status === 'raid' ? raidView(p) : lobbyView(p)).catch(() => {});
      }

      // --- Công phạt: mở 1 đợt đánh theo lượt (ephemeral) cho người bấm ---
      if (action === 'attack') {
        const p = partyByMessage(interaction.message.id);
        if (!p || p.status !== 'raid' || !p.boss) return interaction.reply({ content: '🌫️ Phó bản đã kết thúc.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const m = p.members.get(userId);
        if (!m) return interaction.reply({ content: '👥 Bạn không ở trong tổ đội này — gõ `/toduoi` để lập đội riêng.', flags: MessageFlags.Ephemeral }).catch(() => {});
        const cd = ui.cdLeft(m.lastTs, party.attackCooldownMs(), now);
        if (cd > 0) return interaction.reply({ content: `⏳ Hồi sức công phạt — còn **${ui.dur(cd)}**.`, flags: MessageFlags.Ephemeral }).catch(() => {});
        const player = db.getPlayer(userId);
        if (!player) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral }).catch(() => {});
        m.lastTs = now; // đặt cooldown ngay (bỏ trận giữa chừng vẫn tốn CD)
        const me = db.buildCombatant(player, player.username);
        const foe = combat.build(p.boss.display, p.realm, p.tier, null, []);
        const pool = Math.max(1, Math.round(me.base.atk * party.assaultPoolMult()));
        foe.hp = foe.maxHp = pool;
        const ctx = {
          type: 'party', leaderId: p.leaderId, poolMax: pool,
          title: `⚔️ Công Phạt — ${p.boss.display}`,
          footer: 'Đánh theo lượt · sát thương gây ra trừ vào HP CHUNG của boss · ⚡ Đánh nhanh để kết đợt.',
          thumbSrc: assets.src(`zone_${p.zoneId}`),
        };
        return fight.start(interaction, me, foe, ctx, { useUpdate: false, maxRounds: party.assaultRounds() });
      }
    },
  },
};
