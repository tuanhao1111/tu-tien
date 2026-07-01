// =====================================================================
//  /luyentruong — LUYỆN TRƯỜNG: hub 3 khu farm (mở ở Kim Đan).
//   🌱 Linh Điền      — vườn idle, tích nguyên liệu theo thời gian.
//   🐗 Săn Yêu        — đánh 1 yêu hoang/lượt, cooldown ngắn, thưởng nhanh.
//   🗼 Thí Luyện Tháp — leo tháp vô tận, thắng thì lên tầng + thưởng tăng dần.
//  Bí Cảnh nằm ở lệnh /bicanh riêng (cùng kênh Luyện Trường).
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
const bicanh = require('../bicanh');
const farm = require('../farm');
const dampen = require('../dampen');
const ui = require('../util/ui');
const assets = require('../assets'); // ảnh yêu thú trong trận (foe_wild/foe_tower)
const autorefresh = require('../util/autorefresh');
const fight = require('./fight');
const { requireUnlocked } = require('../util/feature-gate');
const kyngoCmd = require('./kyngo'); // kỳ ngộ ập tới sau khi săn yêu (GĐ23)

const stone = config.currency.emoji;
const MAX_LOG = 14;

function renderLog(lines) {
  if (lines.length <= MAX_LOG) return lines.join('\n');
  return `${lines.slice(0, MAX_LOG - 2).join('\n')}\n… *(lược ${lines.length - MAX_LOG} dòng)* …\n${lines.slice(-2).join('\n')}`;
}

// Build combatant người chơi (đầy đủ thuộc tính + cấp chiêu + buff bậc + trang bị).
function buildMe(player, username) {
  return combat.build(username, player.realm, player.tier, player.sect, db.getEquipped(player), {
    attrs: db.getAttributes(player),
    skillLevels: db.getSkillLevels(player),
    stagesSinceJoin: Math.max(0, cult.globalStage(player.realm, player.tier) - (player.sect_join_stage || 0)),
    gearBonus: db.combatGearBonus(player, true), // PvE -> gộp Ngự Thú
    pet: db.petStrike(player),                   // đòn phụ ngự thú (PvE)
  });
}

function matLine(mats) {
  const parts = Object.entries(mats).filter(([, q]) => q > 0)
    .map(([id, q]) => { const m = bicanh.materialInfo(id); return m ? `${m.emoji} ${m.name} ×${q}` : null; })
    .filter(Boolean);
  return parts.join(' · ');
}

function needSect(interaction) {
  return interaction.reply({ content: '🏯 Cần có môn phái mới đủ sức chiến đấu ở đây! Gõ `/monphai` gia nhập đã.', flags: MessageFlags.Ephemeral });
}

// ---------- HUB ----------
function hubView(player) {
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('⛰️ Luyện Trường')
    .setDescription(
      'Chọn nơi rèn luyện & farm tài nguyên:\n\n' +
      '🗼 **Thí Luyện Tháp** — leo tháp vô tận, thắng thì lên tầng, thưởng càng cao.\n' +
      '🗺️ **Bí Cảnh** — thám hiểm theo lượt (gõ `/bicanh`).\n' +
      `👻 **Truy Tung Nhiếp Hồn** — farm 👻 Yêu Hồn Phách + 🍖 thức ăn nuôi **Ngự Thú** (mở ở **${(cult.REALMS[config.farm.sanHon.minRealm || 4] || {}).name || 'Nguyên Anh'}**).`,
    )
    .setFooter({ text: `🏅 Tháp: tầng cao nhất ${player.thap_best || 0}` });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm_thap').setLabel('🗼 Thí Luyện Tháp').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('panel_bicanh').setLabel('🗺️ Bí Cảnh').setStyle(ButtonStyle.Success),
    // Truy Tung Nhiếp Hồn (farm Yêu Hồn Phách) — LUÔN hiện; bấm khi chưa tới Nguyên Anh thì báo 🔒.
    new ButtonBuilder().setCustomId('farm_sanhon').setLabel('👻 Truy Tung Nhiếp Hồn').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [e], components: [row] };
}

// ---------- LINH ĐIỀN (GĐ17: TRỒNG TRỌT — mua hạt giống về tự gieo) ----------
function linhDienView(player, now) {
  const cfg = config.farm.linhDien;
  const seedId = cfg.seedId || 'linh_chung';
  const haveSeeds = db.getMaterials(player)[seedId] || 0;
  const st = farm.linhDienState(player.linhdien_ts, player.linhdien_seeds, now);
  const e = new EmbedBuilder().setColor(config.colors.success).setTitle('🌱 Linh Điền — Trồng Trọt');

  const row = new ActionRowBuilder();
  if (!st.planted) {
    e.setDescription(
      `Mua 🌰 **Linh Chủng** ở **Phường Thị** (\`/shop\`) rồi **gieo** xuống ruộng. Sau **${ui.dur(cfg.growMs)}** thì chín — thu được **${cfg.yieldPerSeed}× Linh Thảo/hạt** (+cơ hội Yêu Đan). Offline vẫn chín.\n\n` +
      `🌰 Linh Chủng trong túi: **${haveSeeds}** · gieo tối đa **${cfg.maxPlots}** hạt/lượt.`,
    ).setFooter({ text: haveSeeds > 0 ? 'Bấm Gieo trồng để bắt đầu.' : 'Hết hạt — ghé Phường Thị mua thêm.' });
    row.addComponents(
      new ButtonBuilder().setCustomId('farm_linhdien_plant').setLabel(`🌱 Gieo (${Math.min(haveSeeds, cfg.maxPlots)} hạt)`).setStyle(ButtonStyle.Success).setDisabled(haveSeeds <= 0),
      new ButtonBuilder().setCustomId('farm_linhdien_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary),
    );
  } else if (!st.ready) {
    const grown = cfg.growMs - st.leftMs;
    e.setDescription(
      `🌱 Đang trồng **${st.seeds} hạt**.\n` +
      `\`${ui.bar(grown, cfg.growMs, 14)}\` chín sau **${ui.dur(st.leftMs)}** _(tự cập nhật)_\n\n` +
      `🧺 Khi chín sẽ thu: ${matLine(farm.linhDienYield(st.seeds)) || 'Linh Thảo'}`,
    ).setFooter({ text: 'Cây đang lớn — đợi chín rồi thu hoạch (offline vẫn chín).' });
    row.addComponents(new ButtonBuilder().setCustomId('farm_linhdien_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary));
  } else {
    e.setDescription(
      `✅ **${st.seeds} hạt đã chín!** Thu hoạch ngay:\n\n🧺 ${matLine(farm.linhDienYield(st.seeds)) || 'Linh Thảo'}`,
    ).setFooter({ text: 'Thu hoạch xong gieo lứa mới. Nguyên liệu mang đi /luyendan.' });
    row.addComponents(
      new ButtonBuilder().setCustomId('farm_linhdien_harvest').setLabel('🧺 Thu hoạch').setStyle(ButtonStyle.Success),
    );
  }
  return { embeds: [e], components: [row] };
}

// Auto-refresh view Linh Điền KHI đang lớn (đếm ngược tự chạy tới lúc chín thì dừng).
function startLinhDienRefresh(interaction, userId) {
  const st0 = farm.linhDienState((db.getPlayer(userId) || {}).linhdien_ts, (db.getPlayer(userId) || {}).linhdien_seeds, Date.now());
  if (!st0.planted || st0.ready) { autorefresh.stop(userId); return; }
  autorefresh.start(interaction, () => {
    const np = db.getPlayer(userId); if (!np) return null;
    const st = farm.linhDienState(np.linhdien_ts, np.linhdien_seeds, Date.now());
    return { view: linhDienView(np, Date.now()), done: !st.planted || st.ready };
  });
}

// ---------- SĂN YÊU ----------
function sanYeuView(player, now) {
  const left = config.farm.sanYeu.cooldownMs - (now - (player.sanyeu_ts || 0));
  const e = new EmbedBuilder()
    .setColor(ui.chanColor('sanYeu'))
    .setTitle('🐗 Bãi Săn Yêu Thú')
    .setDescription('Đánh nhanh 1 yêu hoang để kiếm linh thạch + tu vi. Thua cũng không mất gì.\n🎲 Đôi khi giữa bãi săn còn gặp **Kỳ Ngộ** bất ngờ!');
  const row = new ActionRowBuilder();
  if (left > 0) {
    e.addFields({ name: '⏳ Hồi sức', value: `Nghỉ thêm **${ui.dur(left)}** rồi săn tiếp. _(tự cập nhật)_` });
  } else {
    row.addComponents(new ButtonBuilder().setCustomId('farm_sanyeu_fight').setLabel('⚔️ Săn ngay').setStyle(ButtonStyle.Primary));
  }
  return { embeds: [e], components: row.components.length ? [row] : [] };
}

// PANEL CÔNG KHAI (sticky) ở kênh Săn Yêu — banner + nút mở bãi săn riêng.
function sanYeuPanelView() {
  const r = cult.REALMS[config.farm.sanYeu.minRealm || 1];
  const e = ui.panelEmbed('sanYeu', {
    title: '🐗 Bãi Săn Yêu',
    desc:
      `Đạt **${r.emoji} ${r.name}** là có thể vào săn — **chưa cần môn phái**.\n\n` +
      `🐗 Đánh nhanh 1 yêu hoang mỗi lượt, kiếm **linh thạch + tu vi** (+ cơ hội nguyên liệu). Thua không mất gì.\n` +
      `⏱️ Cooldown **${ui.dur(config.farm.sanYeu.cooldownMs)}**/lượt _(đếm ngược tự cập nhật trong bãi săn của bạn)_.\n` +
      `🎲 Săn yêu còn có cơ duyên **Kỳ Ngộ** bất ngờ ập tới!`,
    footer: 'Bấm để vào bãi săn của riêng bạn.',
  });
  return { embeds: [e], components: [ui.row(ui.btn('panel_sanyeu', 'Vào Bãi Săn Yêu', 'success', { emoji: '🐗' }))] };
}

// Gate săn yêu: chỉ cần đạt cảnh giới (không cần môn phái). Trả true nếu BỊ KHÓA (đã reply).
function sanYeuLocked(interaction, p) {
  const minR = config.farm.sanYeu.minRealm || 0;
  if ((p.realm || 0) >= minR) return false;
  const r = cult.REALMS[minR];
  interaction.reply({
    content: `🔒 **Săn Yêu** mở ở **${r.emoji} ${r.name}**. Hiện **${cult.realmLabel(p.realm, p.tier)}** — tu thêm chút nữa nhé!`,
    flags: MessageFlags.Ephemeral,
  }).catch(() => {});
  return true;
}

// Mở bãi săn yêu (ẩn) cho người bấm — dùng cho cả nút panel & lệnh /sanyeu.
async function openSanYeu(interaction) {
  const userId = interaction.user.id;
  const p = db.getPlayer(userId);
  if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** đăng ký đã.', flags: MessageFlags.Ephemeral });
  if (sanYeuLocked(interaction, p)) return;
  await interaction.reply({ ...sanYeuView(p, Date.now()), flags: MessageFlags.Ephemeral });
  startSanYeuRefresh(interaction, userId, p);
}

// Bật đếm ngược cooldown săn yêu (tự cập nhật tới lúc hồi xong thì dừng).
function startSanYeuRefresh(interaction, userId, p) {
  const cd = config.farm.sanYeu.cooldownMs;
  if (cd - (Date.now() - (p.sanyeu_ts || 0)) <= 0) return;
  autorefresh.start(interaction, () => {
    const np = db.getPlayer(userId); if (!np) return null;
    const left = cd - (Date.now() - (np.sanyeu_ts || 0));
    return { view: sanYeuView(np, Date.now()), done: left <= 0 };
  });
}

// ---------- TRUY TUNG NHIẾP HỒN (farm 👻 Yêu Hồn Phách — bắt/nâng Ngự Thú) ----------
function sanHonView(player, now) {
  const cfg = config.farm.sanHon;
  const left = cfg.cooldownMs - (now - (player.sanhon_ts || 0));
  const e = new EmbedBuilder().setColor(ui.chanColor('nguThu')).setTitle('👻 Truy Tung Nhiếp Hồn')
    .setDescription('Truy lùng yêu thú lang thang, nhiếp lấy **👻 Yêu Hồn Phách** — tài nguyên **bắt & nâng Ngự Thú**. Thua không mất gì.');
  const row = new ActionRowBuilder();
  if (left > 0) e.addFields({ name: '⏳ Hồi sức', value: `Nghỉ thêm **${ui.dur(left)}** rồi truy tung tiếp. _(tự cập nhật)_` });
  else row.addComponents(new ButtonBuilder().setCustomId('farm_sanhon_fight').setLabel('⚔️ Truy tung ngay').setStyle(ButtonStyle.Primary));
  return { embeds: [e], components: row.components.length ? [row] : [] };
}
function sanHonLocked(interaction, p) {
  const minR = config.farm.sanHon.minRealm || 0;
  if ((p.realm || 0) >= minR) return false;
  const r = cult.REALMS[minR];
  interaction.reply({ content: `🔒 **Truy Tung Nhiếp Hồn** mở ở **${r.emoji} ${r.name}** (cùng Ngự Thú).`, flags: MessageFlags.Ephemeral }).catch(() => {});
  return true;
}
function startSanHonRefresh(interaction, userId, p) {
  const cd = config.farm.sanHon.cooldownMs;
  if (cd - (Date.now() - (p.sanhon_ts || 0)) <= 0) return;
  autorefresh.start(interaction, () => {
    const np = db.getPlayer(userId); if (!np) return null;
    const left = cd - (Date.now() - (np.sanhon_ts || 0));
    return { view: sanHonView(np, Date.now()), done: left <= 0 };
  });
}

// ---------- THÍ LUYỆN THÁP ----------
function thapView(player, now) {
  const left = config.farm.thap.cooldownMs - (now - (player.thap_ts || 0));
  const best = player.thap_best || 0;
  const next = Math.min(config.farm.thap.maxFloor, best + 1);
  const atTop = best >= config.farm.thap.maxFloor;
  const e = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle('🗼 Thí Luyện Tháp')
    .setDescription(
      `Tầng cao nhất đã vượt: **${best}/${config.farm.thap.maxFloor}**.\n` +
      (atTop ? '🏅 Đã lên tới đỉnh tháp — vô địch!' : `Khiêu chiến **tầng ${next}** — thắng thì lên tầng, thưởng tăng dần. Thua thì giữ nguyên, nghỉ rồi thử lại.`) +
      (best > 0 ? `\n\n⚡ **Quét** — gom nhanh thưởng tầng 1→${best} không phải đánh (tốn cooldown như leo).` : ''),
    );
  const row = new ActionRowBuilder();
  if (left > 0) {
    e.addFields({ name: '⏳ Hồi sức', value: `Nghỉ thêm **${ui.dur(left)}** rồi leo/quét tiếp. _(tự cập nhật)_` });
  } else {
    if (!atTop) row.addComponents(new ButtonBuilder().setCustomId('farm_thap_climb').setLabel(`⚔️ Khiêu chiến tầng ${next}`).setStyle(ButtonStyle.Danger));
    if (best > 0) row.addComponents(new ButtonBuilder().setCustomId('farm_thap_sweep').setLabel(`⚡ Quét (1→${best})`).setStyle(ButtonStyle.Primary));
  }
  return { embeds: [e], components: row.components.length ? [row] : [] };
}

// --- Outcome khi trận SĂN YÊU kết thúc (đánh theo lượt) -> thưởng + nút Săn tiếp ---
fight.registerOutcome('sanyeu', async (interaction, f) => {
  const userId = interaction.user.id;
  const win = f.winner === 'A';
  const e = new EmbedBuilder()
    .setColor(win ? config.colors.success : config.colors.danger)
    .setTitle('🐗 Săn Yêu — Kết Thúc')
    .setDescription(`🆚 **${f.B.name}** — ${win ? `🏆 **Hạ gục sau ${f.round} hiệp!**` : `☠️ **Thất bại** sau ${f.round} hiệp (không mất gì)`}`);
  let kyngoTriggered = false;
  if (win) {
    const p = db.getPlayer(userId);
    const loot = farm.sanYeuLoot(p.realm);
    let tr = { damp: 1, bottleneck: 1 };
    if (loot.stones) loot.stones = db.addStones(userId, loot.stones).gained;
    if (loot.tuVi) { tr = db.addTuVi(userId, loot.tuVi); loot.tuVi = tr.gained; }
    if (Object.keys(loot.mats).length) db.addMaterials(userId, loot.mats);
    db.addDailyProgress(userId, 'sanyeu', 1);
    db.addStoryProgress(userId, 'sanyeu', 1); // tiến độ cốt truyện (chương Luyện Khí)
    const lootStr = [loot.stones ? `${stone} ${loot.stones}${config.currency.short}` : null, loot.tuVi ? `🌀 ${loot.tuVi} tu vi` : null, matLine(loot.mats) || null].filter(Boolean).join(' · ');
    const note = dampen.tuViNote(tr);
    e.addFields({ name: '🎁 Thu hoạch', value: `${lootStr}${note ? `\n${note}` : ''}` });
    // Kỳ ngộ ập tới? (off-cooldown + trúng tỉ lệ) -> thêm nút mở kỳ ngộ ngay.
    kyngoTriggered = kyngoCmd.rollTrigger(db.getPlayer(userId));
    if (kyngoTriggered) e.addFields({ name: '🎲 Kỳ Ngộ!', value: 'Giữa bãi săn, một **cơ duyên bất ngờ** hiện ra — bấm **🎲 Xem kỳ ngộ** bên dưới!' });
  }
  e.setFooter({ text: `Cooldown săn: ${ui.dur(config.farm.sanYeu.cooldownMs)}` });
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('farm_sanyeu').setLabel('🐗 Săn tiếp').setStyle(ButtonStyle.Secondary));
  if (kyngoTriggered) row.addComponents(new ButtonBuilder().setCustomId('panel_kyngo').setLabel('🎲 Xem kỳ ngộ').setStyle(ButtonStyle.Success));
  return { content: '', embeds: [e], components: [row] };
});

// --- Outcome khi trận TRUY TUNG NHIẾP HỒN kết thúc -> thưởng 👻 Yêu Hồn Phách ---
fight.registerOutcome('sanhon', async (interaction, f) => {
  const userId = interaction.user.id;
  const win = f.winner === 'A';
  const e = new EmbedBuilder()
    .setColor(win ? config.colors.success : config.colors.danger)
    .setTitle('👻 Truy Tung Nhiếp Hồn — Kết Thúc')
    .setDescription(`🆚 **${f.B.name}** — ${win ? `🏆 **Nhiếp hồn thành công sau ${f.round} hiệp!**` : `☠️ **Thất bại** sau ${f.round} hiệp (không mất gì)`}`);
  if (win) {
    const cfg = config.farm.sanHon;
    const yhp = (cfg.baseYhp || 1) + (Math.random() < (cfg.bonusChance || 0) ? 1 : 0);
    const food = Math.random() < (cfg.foodChance || 0) ? (1 + (Math.random() < 0.3 ? 1 : 0)) : 0;
    const gain = { yeu_hon_phach: yhp };
    if (food) gain.yeu_thu_luong = food;
    db.addMaterials(userId, gain);
    e.addFields({ name: '🎁 Thu hoạch', value: `👻 **+${yhp} Yêu Hồn Phách**${food ? ` · 🍖 **+${food} Yêu Thú Lương**` : ''} _(bắt & nâng Ngự Thú)_` });
  }
  e.setFooter({ text: `Cooldown: ${ui.dur(config.farm.sanHon.cooldownMs)}` });
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('farm_sanhon').setLabel('👻 Truy tung tiếp').setStyle(ButtonStyle.Secondary));
  return { content: '', embeds: [e], components: [row] };
});

// --- Outcome khi trận THÍ LUYỆN THÁP kết thúc -> thưởng (chỉ khi vượt) + nút Tháp ---
fight.registerOutcome('thap', async (interaction, f, ctx) => {
  const userId = interaction.user.id;
  const win = f.winner === 'A';
  const e = new EmbedBuilder()
    .setColor(win ? config.colors.success : config.colors.danger)
    .setTitle(`🗼 Thí Luyện Tháp — Tầng ${ctx.floor}`)
    .setDescription(`🆚 **${f.B.name}** — ${win ? `🏆 **Vượt tầng ${ctx.floor} sau ${f.round} hiệp!**` : `☠️ **Chưa qua** (${f.round} hiệp) — giữ kỷ lục **${ctx.best}**`}`);
  if (win) {
    db.setTowerBest(userId, ctx.floor);
    const p = db.getPlayer(userId);
    const r = farm.towerReward(p.realm, ctx.floor);
    let tr = { damp: 1, bottleneck: 1 };
    if (r.stones) r.stones = db.addStones(userId, r.stones).gained;
    if (r.tuVi) { tr = db.addTuVi(userId, r.tuVi); r.tuVi = tr.gained; }
    db.addDailyProgress(userId, 'thap_floor', 1);
    const note = dampen.tuViNote(tr);
    e.addFields({ name: '🎁 Thưởng', value: `${stone} ${r.stones}${config.currency.short} · 🌀 ${r.tuVi} tu vi${note ? `\n${note}` : ''}` });
    e.setFooter({ text: `Tầng cao nhất giờ: ${ctx.floor}. Nghỉ rồi leo tiếp.` });
  } else {
    e.setFooter({ text: `Cooldown: ${ui.dur(config.farm.thap.cooldownMs)}` });
  }
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('farm_thap').setLabel('🗼 Vào Tháp').setStyle(ButtonStyle.Secondary));
  return { content: '', embeds: [e], components: [row] };
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName('luyentruong')
    .setDescription('Luyện Trường — Linh Điền, Săn Yêu, Thí Luyện Tháp (mở ở Kim Đan).'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;
    return interaction.reply({ ...hubView(player), flags: MessageFlags.Ephemeral });
  },

  sanYeuPanelView, // panel sticky kênh Săn Yêu (dùng ở panels.js)
  openSanYeu,      // mở bãi săn yêu (dùng ở /sanyeu)

  buttons: {
    // Panel Luyện Trường: mở hub.
    async panel_luyentruong(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** đăng ký đã.', flags: MessageFlags.Ephemeral });
      if (player.realm < 3) {
        const r = cult.REALMS[3];
        return interaction.reply({ content: `🔒 **Luyện Trường** mở ở **${r.emoji} ${r.name}**. Hiện **${cult.realmLabel(player.realm, player.tier)}** — tu thêm nhé!`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...hubView(player), flags: MessageFlags.Ephemeral });
    },

    // --- Linh Điền (mở từ panel Tu Luyện) — TRỒNG TRỌT ---
    async farm_linhdien(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
      await interaction.reply({ ...linhDienView(p, Date.now()), flags: MessageFlags.Ephemeral });
      startLinhDienRefresh(interaction, userId);
    },
    async farm_linhdien_refresh(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return;
      await interaction.update(linhDienView(p, Date.now()));
      startLinhDienRefresh(interaction, interaction.user.id);
    },
    // 🌱 Gieo trồng: tiêu hạt trong túi, gieo tối đa.
    async farm_linhdien_plant(interaction) {
      const userId = interaction.user.id;
      const res = db.plantLinhDien(userId, config.farm.linhDien.maxPlots, Date.now());
      if (res.err === 'occupied') return interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      if (res.err === 'noseeds') return interaction.reply({ content: '🌰 Hết Linh Chủng! Ghé **Phường Thị** (`/shop`) mua hạt giống về gieo.', flags: MessageFlags.Ephemeral });
      if (res.err) return interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      await interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      startLinhDienRefresh(interaction, userId);
      return interaction.followUp({ content: `🌱 Đã gieo **${res.seeds} hạt** Linh Chủng. Đợi chín rồi thu hoạch nhé!`, flags: MessageFlags.Ephemeral });
    },
    // 🧺 Thu hoạch.
    async farm_linhdien_harvest(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const res = db.harvestLinhDien(userId, Date.now());
      if (res.err === 'growing') return interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      if (res.err) return interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      await interaction.update(linhDienView(db.getPlayer(userId), Date.now()));
      return interaction.followUp({ content: `🧺 Thu hoạch **${res.seeds} hạt** → ${matLine(res.mats)}.`, flags: MessageFlags.Ephemeral });
    },

    // --- Săn Yêu (mở ở Luyện Khí · KHÔNG cần môn phái · đếm ngược cooldown TỰ CHẠY) ---
    // Panel CÔNG KHAI ở kênh Săn Yêu -> mở bãi săn riêng (ẩn).
    async panel_sanyeu(interaction) { return openSanYeu(interaction); },
    async farm_sanyeu(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p) return;
      if (sanYeuLocked(interaction, p)) return;
      await interaction.reply({ ...sanYeuView(p, Date.now()), flags: MessageFlags.Ephemeral });
      startSanYeuRefresh(interaction, userId, p);
    },
    async farm_sanyeu_fight(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId); // dừng đếm ngược trước khi vào trận
      const p = db.getPlayer(userId);
      if (!p) return;
      if (sanYeuLocked(interaction, p)) return;
      const now = Date.now();
      const left = config.farm.sanYeu.cooldownMs - (now - (p.sanyeu_ts || 0));
      if (left > 0) return interaction.update(sanYeuView(p, now));

      db.setSanYeuTs(userId, now); // đặt cooldown ngay khi vào trận
      const me = buildMe(p, interaction.user.username);
      const foe = farm.buildWildFoe(p.realm, p.tier);
      const ctx = {
        type: 'sanyeu', title: '🐗 Săn Yêu Thú',
        footer: `Đánh theo lượt · ⚡ Đánh nhanh để kết trận · cooldown ${ui.dur(config.farm.sanYeu.cooldownMs)}`,
        thumbSrc: assets.src('foe_wild'),
      };
      return fight.start(interaction, me, foe.c, ctx, { useUpdate: true });
    },

    // --- Truy Tung Nhiếp Hồn (farm Yêu Hồn Phách) ---
    async farm_sanhon(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p) return;
      if (sanHonLocked(interaction, p)) return;
      await interaction.reply({ ...sanHonView(p, Date.now()), flags: MessageFlags.Ephemeral });
      startSanHonRefresh(interaction, userId, p);
    },
    async farm_sanhon_fight(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      if (sanHonLocked(interaction, p)) return;
      const now = Date.now();
      const left = config.farm.sanHon.cooldownMs - (now - (p.sanhon_ts || 0));
      if (left > 0) return interaction.update(sanHonView(p, now));
      db.setSanHonTs(userId, now);
      const me = buildMe(p, interaction.user.username);
      const foe = farm.buildWildFoe(p.realm, p.tier);
      const ctx = {
        type: 'sanhon', title: '👻 Truy Tung Nhiếp Hồn',
        footer: `Đánh theo lượt · ⚡ Đánh nhanh · cooldown ${ui.dur(config.farm.sanHon.cooldownMs)}`,
        thumbSrc: assets.src('foe_wild'),
      };
      return fight.start(interaction, me, foe.c, ctx, { useUpdate: true });
    },

    // --- Thí Luyện Tháp (đếm ngược cooldown TỰ CHẠY) ---
    async farm_thap(interaction) {
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p) return;
      if (!p.sect || !sects.getSect(p.sect)) return needSect(interaction);
      await interaction.reply({ ...thapView(p, Date.now()), flags: MessageFlags.Ephemeral });
      const cd = config.farm.thap.cooldownMs;
      if (cd - (Date.now() - (p.thap_ts || 0)) > 0) {
        autorefresh.start(interaction, () => {
          const np = db.getPlayer(userId); if (!np) return null;
          const left = cd - (Date.now() - (np.thap_ts || 0));
          return { view: thapView(np, Date.now()), done: left <= 0 };
        });
      }
    },
    async farm_thap_climb(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      if (!p.sect || !sects.getSect(p.sect)) return needSect(interaction);
      const now = Date.now();
      const best = p.thap_best || 0;
      if (best >= config.farm.thap.maxFloor) return interaction.update(thapView(p, now));
      const left = config.farm.thap.cooldownMs - (now - (p.thap_ts || 0));
      if (left > 0) return interaction.update(thapView(p, now));

      const floor = best + 1;
      db.setTowerTs(userId, now); // đặt cooldown ngay khi vào trận
      const me = buildMe(p, interaction.user.username);
      const foe = farm.buildTowerFoe(p.realm, p.tier, floor);
      const ctx = {
        type: 'thap', floor, best, title: `🗼 Thí Luyện Tháp — Tầng ${floor}`,
        footer: `Đánh theo lượt · ⚡ Đánh nhanh để kết trận · cooldown ${ui.dur(config.farm.thap.cooldownMs)}`,
        thumbSrc: assets.src('foe_tower'),
      };
      return fight.start(interaction, me, foe.c, ctx, { useUpdate: true });
    },

    // Quét tháp: gom nhanh thưởng tầng 1..best (không phải đánh, tốn cooldown).
    async farm_thap_sweep(interaction) {
      const userId = interaction.user.id;
      autorefresh.stop(userId);
      const p = db.getPlayer(userId);
      if (!p) return;
      if (!p.sect || !sects.getSect(p.sect)) return needSect(interaction);
      const now = Date.now();
      const best = p.thap_best || 0;
      if (best <= 0) return interaction.update(thapView(p, now));
      const left = config.farm.thap.cooldownMs - (now - (p.thap_ts || 0));
      if (left > 0) return interaction.update(thapView(p, now));

      db.setTowerTs(userId, now);
      const r = farm.towerSweepReward(p.realm, best);
      let tuViRes = { damp: 1, bottleneck: 1 };
      if (r.stones) r.stones = db.addStones(userId, r.stones).gained;
      if (r.tuVi) { tuViRes = db.addTuVi(userId, r.tuVi); r.tuVi = tuViRes.gained; }
      db.addDailyProgress(userId, 'thap_floor', r.floors);

      const note = dampen.tuViNote(tuViRes);
      const e = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('⚡ Quét Thí Luyện Tháp')
        .setDescription(`Đạo hữu càn quét **${r.floors} tầng** trong nháy mắt, gom sạch thưởng.${note ? `\n\n${note}` : ''}`)
        .addFields({ name: '🎁 Thu hoạch', value: `${stone} ${r.stones}${config.currency.short} · 🌀 ${r.tuVi} tu vi` })
        .setFooter({ text: `Quét tốn cooldown ${Math.round(config.farm.thap.cooldownMs / 60000)}' như leo. Leo cao hơn (đánh tay) để mở khóa quét xa hơn.` });
      return interaction.update({ embeds: [e], components: [] });
    },
  },
};
