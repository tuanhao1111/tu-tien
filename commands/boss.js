// =====================================================================
//  /boss — BOSS THẾ GIỚI (boss CHUNG toàn server, chia sát thương).
//  HP khổng lồ bền trong DB. Mọi người "Công Phạt" -> đo tổng sát thương 1
//  đợt (mô phỏng combat N hiệp) -> trừ vào HP chung (atomic). Hạ gục -> chia
//  thưởng theo % đóng góp + rớt trang bị; loan Vọng Âm Đài.
//
//  Đòn công phạt TỐN Sinh Mệnh (gắn hệ HP): kiệt sức thì phải hồi/đợi.
//  customId: panel_boss · boss:attack · boss:board · boss:refresh.
// =====================================================================
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const combat = require('../combat');
const worldboss = require('../worldboss');
const gear = require('../gear');
const features = require('../features');
const ui = require('../util/ui');
const livepanels = require('../util/livepanels');
const assets = require('../assets'); // chân dung boss (boss_<key>.png) — tự bỏ qua nếu chưa có
const fight = require('./fight');    // ĐÁNH THEO LƯỢT (controller chung)
const { announce } = require('../util/announce');

const CK = 'bossTheGioi';
const cur = config.currency;
const WB = config.worldboss;

// --- OUTCOME khi 1 đợt công phạt boss (đánh theo lượt) KẾT THÚC ---
//  Sát thương gây cho "đợt" boss (poolMax - hp còn lại) trừ vào HP CHUNG của boss.
fight.registerOutcome('worldboss', async (interaction, f, ctx) => {
  const id = interaction.user.id;
  const dmg = Math.max(0, Math.round((ctx.poolMax || 0) - Math.max(0, f.B.hp)));
  const boss = worldboss.bossInfo(ctx.bossKey) || { emoji: '🐲', name: 'Boss' };
  const res = db.dealBossDamage(id, interaction.user.username, dmg, Date.now());

  if (res.err) { // boss đã bị hạ bởi người khác trong lúc đánh
    return { content: '', embeds: [ui.panelEmbed(CK, {
      title: `${boss.emoji} ${boss.name} đã bị hạ`,
      desc: `Bạn gây **${ui.num(dmg)}** sát thương, nhưng boss đã bị tiêu diệt trước đó. Hẹn trận sau!`,
      footer: '',
    })], components: [ui.row(ui.btn('boss:refresh', 'Đóng', 'secondary', { emoji: '✅' }))] };
  }
  if (res.killed) { // chính đòn này hạ gục -> chia thưởng + loan báo
    const summary = db.distributeBossRewards(boss, ctx.spawnN);
    announceKill(interaction.client, boss, summary);
    return victoryView(db.getPlayer(id), boss, summary, id, dmg);
  }
  // Boss còn sống -> báo sát thương + HP chung còn lại + tổng đóng góp.
  const row = db.getWorldBoss();
  const mine = db.bossDamageOf(ctx.spawnN, id);
  return { content: '', embeds: [ui.panelEmbed(CK, {
    title: `⚔️ Công phạt xong — ${boss.emoji} ${boss.name}`,
    desc:
      `💥 Bạn gây **${ui.num(dmg)}** sát thương!\n` +
      `${ui.barLine('❤️', 'HP Boss', row ? row.hp : 0, row ? row.max_hp : 1, 18)}\n\n` +
      `💢 Tổng sát thương của bạn: **${ui.num(mine ? mine.damage : dmg)}**`,
    footer: `Cooldown ${ui.dur(WB.attackCooldownMs)} · hồi xong vào công phạt tiếp.`,
  })], components: [ui.row(ui.btn('boss:refresh', '🔄 Quay lại boss', 'secondary'))] };
});

// --- Bảng công (top sát thương) ---
function boardText(spawnN, meId) {
  const list = db.bossContributions(spawnN);
  if (!list.length) return '*(chưa ai ra tay — hãy là người đầu tiên!)*';
  const medal = ['🥇', '🥈', '🥉'];
  return list.slice(0, 10).map((r, i) => {
    const tag = r.discord_id === meId ? ' ⬅️ **bạn**' : '';
    return `${medal[i] || `\`#${i + 1}\``} **${r.username}** — 💢 ${ui.num(r.damage)}${tag}`;
  }).join('\n');
}

// --- Màn chính ---
function mainView(player) {
  const now = Date.now();
  const row = db.getWorldBoss();
  const active = worldboss.isActive(row, now);

  if (!active) {
    const next = row ? Math.max(0, (row.died_ts || row.expire_ts || 0) + (WB.respawnMs || 0) - now) : 0;
    const e = ui.panelEmbed(CK, {
      title: '🐲 Boss Thế Giới',
      desc:
        '🌫️ **Hiện chưa có boss nào giáng thế.**\n\n' +
        (next > 0 ? `Boss kế tiếp ước chừng sau **${ui.dur(next)}** nữa.\n\n` : 'Boss có thể giáng thế bất cứ lúc nào…\n\n') +
        '_Khi boss xuất hiện sẽ loan báo ở **Vọng Âm Đài**. Cả server cùng công phạt — chia thưởng theo sát thương đóng góp._',
      footer: 'Đánh boss tốn Sinh Mệnh · hạ gục chia thưởng + rớt trang bị theo đóng góp.',
    });
    return { embeds: [e], components: [ui.row(ui.btn('boss:refresh', 'Làm mới', 'secondary', { emoji: '🔄' }))] };
  }

  const boss = worldboss.bossInfo(row.boss_key) || { name: row.boss_key, emoji: '🐲', lore: '' };
  const mine = db.bossDamageOf(row.spawn_n, player.discord_id);
  const myDmg = mine ? mine.damage : 0;
  const list = db.bossContributions(row.spawn_n);
  const myRank = mine ? (list.findIndex((r) => r.discord_id === player.discord_id) + 1) : 0;
  const cd = mine ? ui.cdLeft(mine.last_ts, WB.attackCooldownMs, now) : 0;
  const canHit = cd <= 0;

  const e = ui.panelEmbed(CK, {
    title: `${boss.emoji} ${boss.name} — Boss Thế Giới`,
    desc:
      `_${boss.lore || ''}_\n\n` +
      `${ui.barLine('❤️', 'HP Boss', row.hp, row.max_hp, 18)}\n\n` +
      `💢 Sát thương của bạn: **${ui.num(myDmg)}**${myRank ? ` _(hạng #${myRank})_` : ''}\n` +
      `⏱️ Cooldown công phạt: **${ui.dur(WB.attackCooldownMs)}**/đòn\n\n` +
      `**🏆 Bảng Công:**\n${boardText(row.spawn_n, player.discord_id)}`,
    footer: cd > 0 ? `Hồi sức công phạt: còn ${ui.dur(cd)}` : 'Công phạt để góp sát thương · hạ gục chia thưởng theo đóng góp.',
  });

  const atkLabel = cd > 0 ? `⏳ Hồi sức (${ui.dur(cd)})` : '⚔️ Công Phạt';
  const files = assets.misc(e, `boss_${row.boss_key}`, 'image'); // chân dung boss (dưới cùng)
  return {
    embeds: [e],
    files,
    components: [ui.row(
      ui.btn('boss:attack', atkLabel, 'danger', { disabled: !canHit }),
      ui.btn('boss:refresh', 'Làm mới', 'secondary', { emoji: '🔄' }),
    )],
  };
}

// --- PANEL CÔNG KHAI (sticky + auto-refresh 10s): trạng thái boss chung thời gian thực ---
function livePanelView() {
  const now = Date.now();
  const row = db.getWorldBoss();
  if (!worldboss.isActive(row, now)) {
    const next = row ? Math.max(0, (row.died_ts || row.expire_ts || 0) + (WB.respawnMs || 0) - now) : 0;
    const e = ui.panelEmbed(CK, {
      title: '🐲 Boss Thế Giới',
      desc:
        '🌫️ **Hiện chưa có boss nào giáng thế.**\n\n' +
        (next > 0 ? `Boss kế tiếp ước chừng sau **${ui.dur(next)}**.` : 'Boss có thể giáng thế bất cứ lúc nào…') +
        '\n\n_Đạt **🟡 Kim Đan** để cùng cả server công phạt — chia thưởng theo sát thương._',
      footer: 'Panel tự cập nhật. Khi boss xuất hiện sẽ loan ở Vọng Âm Đài.',
    });
    const files = assets.panel(e, 'bossTheGioi', 'image');
    return { embeds: [e], files, components: [ui.row(ui.btn('panel_boss', 'Vào trận công phạt', 'danger', { emoji: '🐲' }))] };
  }
  const boss = worldboss.bossInfo(row.boss_key) || { name: row.boss_key, emoji: '🐲', lore: '' };
  const list = db.bossContributions(row.spawn_n);
  const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const top = list.length
    ? list.slice(0, 5).map((r, i) => `${medal[i]} **${r.username}** — 💢 ${ui.num(r.damage)}`).join('\n')
    : '*(chưa ai ra tay)*';
  const e = ui.panelEmbed(CK, {
    title: `${boss.emoji} ${boss.name} — Boss Thế Giới`,
    desc:
      `_${boss.lore || ''}_\n\n` +
      `${ui.barLine('❤️', 'HP', row.hp, row.max_hp, 20)}\n` +
      `👥 **${list.length}** người tham chiến · chỉ biến mất khi bị tiêu diệt\n\n` +
      `**🏆 Top sát thương:**\n${top}`,
    footer: 'Panel tự cập nhật ~5s. Bấm để vào trận công phạt (chia thưởng theo đóng góp).',
  });
  // Banner panel: trả files để repost/setup upload; tick tự BỎ files (không re-upload).
  const files = assets.panel(e, 'bossTheGioi', 'image');
  return { embeds: [e], files, components: [ui.row(ui.btn('panel_boss', 'Vào trận công phạt', 'danger', { emoji: '⚔️' }))] };
}
livepanels.register('bossTheGioi', livePanelView, { sticky: true, intervalMs: 5 * 1000 }); // boss 5s/lần

// Gate chung (slash + nút).
function gateOpen(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) { interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** trước nhé.', flags: MessageFlags.Ephemeral }); return null; }
  const f = features.featureForCommand('boss');
  if (f && !features.isUnlocked(p, f)) {
    interaction.reply({ content: `🔒 **${f.emoji} ${f.name}** mở khóa ở **${features.realmName(f.realm)}**. Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}**.`, flags: MessageFlags.Ephemeral });
    return null;
  }
  return p;
}

// =====================================================================
//  SPAWN (gọi từ index.js tick + admin). Trả boss vừa spawn hoặc null.
// =====================================================================
function maybeSpawn(client, now = Date.now()) {
  if (!WB || !WB.enabled) return null;
  const row = db.getWorldBoss();
  // CHỈ đánh dấu hết hạn khi BẬT lifetime (>0). GĐ17: mặc định lifetime=0 -> boss
  //  không bao giờ hết hạn, chỉ biến mất khi bị tiêu diệt.
  if ((WB.lifetimeMs || 0) > 0 && row && !row.dead && row.expire_ts && row.expire_ts <= now) { db.expireWorldBoss(now); }
  if (!worldboss.shouldSpawn(db.getWorldBoss(), now)) return null;
  const { boss, row: r } = db.spawnWorldBoss(now);
  announceSpawn(client, boss, r);
  return boss;
}
function announceSpawn(client, boss, row) {
  const e = ui.panelEmbed(CK, {
    title: `🐲 BOSS THẾ GIỚI GIÁNG THẾ — ${boss.emoji} ${boss.name}!`,
    desc:
      `_${boss.lore}_\n\n` +
      `❤️ HP: **${ui.num(row.max_hp)}** — chỉ biến mất khi **bị tiêu diệt**!\n\n` +
      `Toàn thể tu sĩ Kim Đan trở lên hãy tới kênh **Boss Thế Giới** cùng công phạt! Chia thưởng theo sát thương đóng góp — top đầu nhận hậu hĩnh + trang bị quý.`,
  });
  const files = assets.misc(e, `boss_${boss.key}`, 'image'); // chân dung boss (banner) nếu có
  announce(client, files.length ? { embeds: [e], files } : e);
}

async function open(interaction) {
  const p = gateOpen(interaction);
  if (!p) return;
  return interaction.reply({ ...mainView(p), flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder().setName('boss').setDescription('Boss Thế Giới — công phạt chung toàn server.'),
  async execute(interaction) { return open(interaction); },
  maybeSpawn, announceSpawn, livePanelView,
  buttons: {
    async panel_boss(interaction) { return open(interaction); },

    async boss(interaction) {
      const action = interaction.customId.split(':')[1];
      const id = interaction.user.id;
      const p = db.getPlayer(id);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
      const upd = (v) => interaction.update({ ...v, attachments: [] }); // chân dung boss không đọng khi đổi view

      if (action === 'refresh') return upd(mainView(p));

      if (action === 'attack') {
        const now = Date.now();
        const row = db.getWorldBoss();
        if (!worldboss.isActive(row, now)) return upd(mainView(p));
        const f = features.featureForCommand('boss');
        if (f && !features.isUnlocked(p, f)) return upd(mainView(p));

        // Gate COOLDOWN THUẦN: mỗi đòn cách nhau attackCooldownMs.
        const mine = db.bossDamageOf(row.spawn_n, id);
        if (mine && ui.cdLeft(mine.last_ts, WB.attackCooldownMs, now) > 0) return upd(mainView(p));

        // ĐÁNH THEO LƯỢT: dựng "đợt" boss = bia có HP = Công người chơi × hệ số.
        //  Đặt cooldown NGAY (ghi 0 dmg -> last_ts) để bỏ trận giữa chừng vẫn tốn CD.
        db.dealBossDamage(id, interaction.user.username, 0, now);
        const boss = worldboss.bossInfo(row.boss_key);
        const me = db.buildCombatant(p, interaction.user.username);
        const foe = combat.build(`${boss.emoji} ${boss.name}`, boss.realm, boss.tier, null, []);
        const pool = Math.max(1, Math.round(me.base.atk * (WB.assaultPoolMult || 10)));
        foe.hp = foe.maxHp = pool;
        const ctx = {
          type: 'worldboss', spawnN: row.spawn_n, bossKey: boss.key, poolMax: pool,
          title: `⚔️ Công Phạt — ${boss.emoji} ${boss.name}`,
          footer: 'Đánh theo lượt · sát thương gây ra sẽ trừ vào HP CHUNG của boss · ⚡ Đánh nhanh để kết đợt',
          thumbSrc: assets.src(`boss_${boss.key}`),
        };
        return fight.start(interaction, me, foe, ctx, { useUpdate: true, maxRounds: WB.assaultRounds || 12 });
      }
    },
  },
};

// --- Màn thắng (boss gục) cho người ra đòn kết liễu ---
function victoryView(player, boss, summary, meId, finalDmg) {
  let myReward = null;
  if (summary) myReward = summary.contributors.find((c) => c.id === meId);
  const top = summary ? summary.contributors.slice(0, 5) : [];
  const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const e = ui.panelEmbed(CK, {
    title: `💀 ${boss.emoji} ${boss.name} ĐÃ BỊ HẠ GỤC!`,
    desc:
      `⚔️ Đòn kết liễu của **bạn** (${ui.num(finalDmg)} sát thương) đã tiễn boss về trời!\n\n` +
      (myReward ? `**Phần thưởng của bạn** _(đóng góp ${Math.round(myReward.share * 100)}%):_\n` +
        `${cur.emoji} ${ui.num(myReward.stones)}${cur.short} · 📿 ${ui.num(myReward.tuVi)} tu vi` +
        (myReward.premium > 0 ? ` · ${config.premiumCurrency.emoji} ${myReward.premium}${config.premiumCurrency.short}` : '') +
        (myReward.drop && myReward.drop.salvaged ? `\n🎁 Rớt đồ nhưng kho đầy → +${myReward.drop.refine}🔩` : (myReward.drop && myReward.drop.item ? `\n🎁 Rớt: ${gear.nameOf(myReward.drop.item)}` : '')) + '\n\n' : '') +
      `**🏆 Công thần:**\n` + (top.length ? top.map((c, i) => `${medal[i]} **${c.username}** — 💢 ${ui.num(c.damage)} · ${cur.emoji}${ui.num(c.stones)}`).join('\n') : '—'),
    footer: 'Boss mới sẽ giáng thế sau một thời gian. Tích cực rèn luyện chờ trận sau!',
  });
  return { embeds: [e], components: [ui.row(ui.btn('boss:refresh', 'Đóng', 'secondary', { emoji: '✅' }))] };
}
function announceKill(client, boss, summary) {
  const top = summary ? summary.contributors.slice(0, 3) : [];
  const medal = ['🥇', '🥈', '🥉'];
  const e = ui.panelEmbed(CK, {
    title: `💀 ${boss.emoji} ${boss.name} đã bị toàn server hạ gục!`,
    desc:
      `Một thế lực hùng mạnh vừa ngã xuống dưới muôn vàn đạo pháp!\n\n` +
      `**Công thần:**\n` + (top.length ? top.map((c, i) => `${medal[i]} **${c.username}** — 💢 ${ui.num(c.damage)}`).join('\n') : '—') +
      `\n\n_Thưởng đã được phân chia theo đóng góp. Hẹn trận sau!_`,
  });
  announce(client, e);
}
