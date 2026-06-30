// =====================================================================
//  /bicanh — BÍ CẢNH (PvE). Mở khóa ở Kim Đan.
//  Vào 1 bí cảnh = 1 lượt thám hiểm. Đánh yêu thú từng TẦNG bằng combat.js.
//  Thắng -> gom chiến lợi phẩm (CHƯA nhận). Chọn "Đi sâu" (mạnh & nhiều đồ
//  hơn) hay "Rời bí cảnh" (nhận thưởng vào túi). THUA = mất hết đồ chưa nhận.
//  Máu mang theo giữa các tầng (chỉ hồi nhẹ) -> đi càng sâu càng rủi ro.
//
//  Trạng thái lượt thám hiểm giữ TRONG BỘ NHỚ (runs Map). Bot restart giữa
//  chừng thì lượt đó mất (hiếm) — chấp nhận được cho MVP.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const sects = require('../sects');
const combat = require('../combat');
const bicanh = require('../bicanh');
const dampen = require('../dampen');
const equipment = require('../equipment');
const assets = require('../assets'); // ảnh vùng bí cảnh (zone_<id>.png) — tự bỏ qua nếu chưa có
const fight = require('./fight');
const { requireUnlocked } = require('../util/feature-gate');
const { announce } = require('../util/announce');

const stone = config.currency.emoji;
const MAX_LOG_LINES = 12;
const RUN_TTL_MS = 30 * 60 * 1000; // dọn lượt cũ bỏ quên sau 30'

// userId -> { zoneId, realm, tier, sect, equipped, maxHp, hp, floor, loot, ts }
//  Map = cache nhanh; được BỀN HÓA xuống DB (cột bicanh_run) nên sống sót qua restart.
const runs = new Map();

function gc() {
  const now = Date.now();
  for (const [id, r] of runs) if (now - r.ts > RUN_TTL_MS) runs.delete(id);
}

// Lấy lượt đang dở: ưu tiên cache RAM, miss thì nạp từ DB (nếu chưa quá TTL).
function loadRun(userId, player) {
  const cached = runs.get(userId);
  if (cached) return cached;
  const saved = db.getBicanhRun(player);
  if (!saved) return null;
  if (Date.now() - (saved.ts || 0) > RUN_TTL_MS) { db.clearBicanhRun(userId); return null; } // hết hạn
  runs.set(userId, saved);
  return saved;
}
// Ghi lượt: cập nhật cả cache lẫn DB (gọi sau mỗi lần lượt đổi trạng thái).
function saveRun(userId, run) {
  runs.set(userId, run);
  db.setBicanhRun(userId, run);
}
// Kết thúc lượt: xóa cả cache lẫn DB.
function dropRun(userId) {
  runs.delete(userId);
  db.clearBicanhRun(userId);
}

function renderLog(lines) {
  if (lines.length <= MAX_LOG_LINES) return lines.join('\n');
  const head = lines.slice(0, MAX_LOG_LINES - 2);
  const tail = lines.slice(-2);
  return `${head.join('\n')}\n… *(lược ${lines.length - MAX_LOG_LINES} dòng)* …\n${tail.join('\n')}`;
}

// Mô tả túi chiến lợi phẩm hiện có của 1 lượt.
function lootLine(loot) {
  const parts = [];
  if (loot.stones) parts.push(`${stone} **${loot.stones}**${config.currency.short}`);
  if (loot.tuVi) parts.push(`🌀 **${loot.tuVi}** tu vi`);
  for (const [id, q] of Object.entries(loot.mats)) {
    const m = bicanh.materialInfo(id);
    if (m && q > 0) parts.push(`${m.emoji} ${m.name} ×${q}`);
  }
  return parts.length ? parts.join(' · ') : '*(trống)*';
}

// Vọng Âm Đài: loan báo hạ gục BOSS bí cảnh (kỳ tích).
function announceBossKill(client, username, zone, foeName, floor) {
  announce(client, new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('⚔️ Kỳ Tích Bí Cảnh!')
    .setDescription(`**${username}** vừa hạ gục BOSS **${foeName}** tại **${zone.emoji} ${zone.name}** tầng ${floor}! Dũng mãnh phi thường.`));
}

function emptyLoot() { return { stones: 0, tuVi: 0, mats: {} }; }
function mergeLoot(into, add) {
  into.stones += add.stones; into.tuVi += add.tuVi;
  for (const [k, v] of Object.entries(add.mats)) into.mats[k] = (into.mats[k] || 0) + v;
}

// Nút điều khiển khi đang trong lượt (sau khi THẮNG 1 tầng).
function runButtons(canDeeper) {
  const row = new ActionRowBuilder();
  if (canDeeper) {
    row.addComponents(
      new ButtonBuilder().setCustomId('bicanh:deeper').setLabel('⚔️ Đi sâu hơn').setStyle(ButtonStyle.Danger),
    );
  }
  row.addComponents(
    new ButtonBuilder().setCustomId('bicanh:leave').setLabel('🚪 Rời bí cảnh (nhận thưởng)').setStyle(ButtonStyle.Success),
  );
  return row;
}

// Tùy chọn build combat của người chơi cho lượt này (thuộc tính + cấp chiêu + buff bậc).
function runOpts(run) {
  return {
    attrs: run.attrs || {},
    skillLevels: run.skillLevels || {},
    stagesSinceJoin: Math.max(0, cult.globalStage(run.realm, run.tier) - (run.joinStage || 0)),
    gearBonus: run.gearBonus || {},
  };
}

// Bắt đầu trận tầng kế tiếp (ĐÁNH THEO LƯỢT). Mang máu từ tầng trước.
function startFloorFight(interaction, run, useUpdate) {
  const zone = bicanh.getZone(run.zoneId);
  const floor = run.floor + 1;
  const me = combat.build(interaction.user.username, run.realm, run.tier, run.sect, run.equipped, runOpts(run));
  me.hp = Math.max(1, Math.min(me.maxHp, Math.round(run.hp))); // mang máu từ tầng trước
  const mob = bicanh.buildMonster(zone, floor, run.realm, run.tier);
  const ctx = {
    type: 'bicanh', userId: interaction.user.id, zoneId: run.zoneId, floor, isBoss: mob.isBoss,
    title: `${zone.emoji} ${zone.name} — Tầng ${floor}${mob.isBoss ? ' 👑 BOSS' : ''}`,
    footer: `Đánh theo lượt · thắng để chọn đi sâu/rời · THUA = MẤT hết đồ chưa nhận! (sâu nhất tầng ${config.bicanh.maxFloors})`,
    thumbSrc: assets.src(`zone_${run.zoneId}`), // ảnh vùng làm thumbnail trận
  };
  return fight.start(interaction, me, mob.c, ctx, { useUpdate });
}

// Khi trận 1 tầng kết thúc -> cập nhật lượt (loot/máu mang theo) + nút Đi sâu/Rời, hoặc xử thua.
fight.registerOutcome('bicanh', async (interaction, f, ctx) => {
  const userId = ctx.userId;
  const run = loadRun(userId, db.getPlayer(userId));
  const zone = bicanh.getZone(ctx.zoneId);
  if (!run) return { content: '🌫️ Lượt thám hiểm đã kết thúc.', embeds: [], components: [] };

  if (f.winner === 'A') {
    run.floor = ctx.floor;
    const loot = bicanh.rollLoot(zone, ctx.floor, run.realm);
    mergeLoot(run.loot, loot);
    run.hp = Math.min(run.maxHp, Math.max(0, f.A.hp) + run.maxHp * config.bicanh.hpCarryRegen); // hồi nhẹ trước tầng kế
    run.ts = Date.now();
    saveRun(userId, run);
    db.addDailyProgress(userId, 'bicanh_floor', 1);
    db.updateBicanhBest(userId, run.zoneId, ctx.floor);
    if (ctx.isBoss) announceBossKill(interaction.client, interaction.user.username, zone, f.B.name, ctx.floor);

    const atCap = ctx.floor >= config.bicanh.maxFloors;
    const e = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle(`${zone.emoji} ${zone.name} — Vượt Tầng ${ctx.floor} ✅`)
      .setDescription(`🏆 Hạ gục **${f.B.name}** sau **${f.round} hiệp**!\n❤️ Máu còn lại: \`${cult.progressBar(run.hp, run.maxHp)}\` ${Math.round(run.hp)}/${run.maxHp}`)
      .addFields(
        { name: '✨ Nhặt được tầng này', value: lootLine(loot) },
        { name: '🎒 Đã gom (chưa nhận)', value: lootLine(run.loot) },
      )
      .setFooter({ text: atCap ? 'Đã tới tầng sâu nhất! Rời bí cảnh để nhận thưởng.' : 'Đi sâu: yêu thú mạnh hơn, thưởng hậu hơn. Thua = MẤT hết đồ chưa nhận.' });
    return { content: '', embeds: [e], components: [runButtons(ctx.floor < config.bicanh.maxFloors)] };
  }

  // Thua: trọng thương, mất hết đồ chưa nhận.
  dropRun(userId);
  const e = new EmbedBuilder()
    .setColor(config.colors.danger)
    .setTitle(`☠️ Trọng Thương — Tầng ${ctx.floor}`)
    .setDescription(`Bạn gục ngã trước **${f.B.name}** sau ${f.round} hiệp!\n💀 Toàn bộ chiến lợi phẩm chưa nhận **(${lootLine(run.loot)})** tan theo mây khói.`)
    .setFooter({ text: 'Tu luyện thêm, đổi chiêu (🎴 Kỹ năng) rồi /bicanh lượt mới.' });
  return { content: '', embeds: [e], components: [] };
});

// Mở màn Bí Cảnh (dùng chung cho lệnh /bicanh và nút 🗺️ Bí Cảnh ở panel Luyện Trường).
async function openBicanh(interaction) {
    gc();
    const player = await requireUnlocked(interaction);
    if (!player) return;
    if (!player.sect || !sects.getSect(player.sect)) {
      return interaction.reply({
        content: '🏯 Cần có môn phái mới đủ sức xông bí cảnh! Gõ `/monphai` để gia nhập đã.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Có lượt thám hiểm ĐANG DỞ (vd bot restart giữa trận, hoặc lỡ tắt message
    //  ephemeral cũ) -> cho tiếp tục Đi sâu / Rời nhận thưởng thay vì bắt vào lượt mới
    //  (tránh ghi đè bicanh_run làm MẤT loot đã gom).
    const pending = loadRun(player.discord_id, player);
    if (pending && pending.floor >= 1) {
      const zone = bicanh.getZone(pending.zoneId);
      const e = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle('🗺️ Bí Cảnh — Lượt Đang Dở')
        .setDescription(
          `Đạo hữu còn một lượt thám hiểm dang dở ở **${zone?.emoji || ''} ${zone?.name || 'bí cảnh'}**, đã vượt **${pending.floor} tầng**.\n` +
          '**Đi sâu** để đánh tiếp, hoặc **Rời** để nhận thưởng đã gom vào túi.',
        )
        .addFields({ name: '🎒 Đã gom (chưa nhận)', value: lootLine(pending.loot) })
        .setFooter({ text: 'Đi sâu: rủi ro hơn, thưởng hậu hơn · Rời: an toàn nhận thưởng.' });
      return interaction.reply({ embeds: [e], components: [runButtons(pending.floor < config.bicanh.maxFloors)], flags: MessageFlags.Ephemeral });
    }

    const zonesOpen = bicanh.zonesFor(player.realm);
    const e = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🗺️ Bí Cảnh — Thám Hiểm')
      .setDescription(
        'Chọn một bí cảnh để xông vào. Đánh yêu thú theo **tầng**; thắng thì gom đồ, ' +
        'rồi tự quyết **đi sâu** (nguy hiểm hơn, thưởng hậu hơn) hay **rời** để nhận thưởng.\n' +
        '⚠️ Gục giữa bí cảnh = **mất hết** đồ chưa nhận!',
      );
    for (const z of zonesOpen) {
      e.addFields({ name: `${z.emoji} ${z.name}`, value: `${z.desc}\n*Rớt:* ${z.drops.map((d) => bicanh.materialInfo(d)?.emoji + ' ' + bicanh.materialInfo(d)?.name).join(', ')}` });
    }
    // Túi nguyên liệu hiện có.
    const bag = db.getMaterials(player);
    const bagStr = Object.entries(bag).filter(([, q]) => q > 0)
      .map(([id, q]) => { const m = bicanh.materialInfo(id); return m ? `${m.emoji} ${m.name} ×${q}` : null; })
      .filter(Boolean).join(' · ');
    e.addFields({ name: '🎒 Túi nguyên liệu', value: bagStr || '*(chưa có gì — đi bí cảnh để gom)*' });

    // Kỷ lục tầng sâu nhất mỗi vùng (cho chức năng Quét).
    const best = db.getBicanhBest(player);
    const sweepable = zonesOpen.filter((z) => (best[z.id] || 0) > 0);
    if (sweepable.length) {
      e.addFields({
        name: '🏅 Tầng sâu nhất đã đạt',
        value: sweepable.map((z) => `${z.emoji} ${z.name}: **tầng ${best[z.id]}**`).join('\n') +
          '\n*Dùng **⚡ Quét** để gom nhanh thưởng tới tầng đó, khỏi phải đánh lại.*',
      });
    }

    // Cooldown vào bí cảnh.
    const now = Date.now();
    const left = config.bicanh.cooldownMs - (now - (player.last_bicanh || 0));
    const components = [];
    if (left > 0) {
      e.addFields({ name: '⏳ Hồi sức', value: `Cần nghỉ thêm **${Math.ceil(left / 60000)} phút** trước khi vào/quét bí cảnh.` });
    } else {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('bicanh:zone')
        .setPlaceholder('Chọn bí cảnh để xông vào…')
        .addOptions(zonesOpen.map((z) => ({ label: z.name, emoji: z.emoji, description: z.desc.slice(0, 95), value: z.id })));
      components.push(new ActionRowBuilder().addComponents(menu));
      if (sweepable.length) {
        const sweepMenu = new StringSelectMenuBuilder()
          .setCustomId('bicanh:sweep')
          .setPlaceholder('⚡ Quét nhanh tới tầng cao nhất…')
          .addOptions(sweepable.map((z) => ({ label: `${z.name} (tầng ${best[z.id]})`, emoji: '⚡', description: `Gom thưởng 1→${best[z.id]} không phải đánh`.slice(0, 95), value: z.id })));
        components.push(new ActionRowBuilder().addComponents(sweepMenu));
      }
    }

    return interaction.reply({ embeds: [e], components, flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bicanh')
    .setDescription('Thám hiểm bí cảnh, săn yêu thú & cơ duyên (mở khóa ở Kim Đan).'),

  async execute(interaction) { return openBicanh(interaction); },

  buttons: {
    // Nút 🗺️ Bí Cảnh ở panel/hub Luyện Trường -> mở màn bí cảnh (ẩn từng người).
    async panel_bicanh(interaction) { return openBicanh(interaction); },

    async bicanh(interaction) {
      gc();
      const action = interaction.customId.split(':')[1];
      const userId = interaction.user.id;

      // --- Chọn bí cảnh -> bắt đầu lượt thám hiểm (tốn cooldown) ---
      if (action === 'zone') {
        const player = db.getPlayer(userId);
        if (!player) return;
        const zoneId = interaction.values[0];
        const zone = bicanh.getZone(zoneId);
        if (!zone || player.realm < zone.minRealm) {
          return interaction.update({ content: '🔒 Bí cảnh này chưa mở cho cảnh giới của bạn.', embeds: [], components: [] });
        }
        const now = Date.now();
        const left = config.bicanh.cooldownMs - (now - (player.last_bicanh || 0));
        if (left > 0) {
          return interaction.update({ content: `⏳ Còn phải hồi sức **${Math.ceil(left / 60000)} phút** mới vào được.`, embeds: [], components: [] });
        }

        // Khởi tạo lượt: chốt thuộc tính/cấp chiêu lúc vào, build thử để lấy máu tối đa.
        const equipped = db.getEquipped(player);
        const run = {
          zoneId, realm: player.realm, tier: player.tier, sect: player.sect, equipped,
          attrs: db.getAttributes(player), skillLevels: db.getSkillLevels(player), joinStage: player.sect_join_stage || 0, gearBonus: db.combatGearBonus(player),
          maxHp: 0, hp: 0, floor: 0, loot: emptyLoot(), ts: now,
        };
        const tmp = combat.build(interaction.user.username, run.realm, run.tier, run.sect, equipped, runOpts(run));
        run.maxHp = tmp.maxHp; run.hp = tmp.maxHp;
        db.setBicanhTs(userId, now);        // tính cooldown từ lúc VÀO
        saveRun(userId, run);               // bền hóa lượt (floor 0) trước khi đánh tầng 1
        return startFloorFight(interaction, run, true); // mở trận tầng 1 (đánh theo lượt)
      }

      // --- Quét: gom thưởng nhanh tới tầng sâu nhất đã đạt (tốn cooldown, không phải đánh) ---
      if (action === 'sweep') {
        const player = db.getPlayer(userId);
        if (!player) return;
        const zoneId = interaction.values[0];
        const zone = bicanh.getZone(zoneId);
        const best = db.getBicanhBest(player)[zoneId] || 0;
        if (!zone || player.realm < zone.minRealm || best <= 0) {
          return interaction.update({ content: '⚡ Chưa thể quét vùng này (chưa từng vượt tầng nào).', embeds: [], components: [] });
        }
        const now = Date.now();
        const left = config.bicanh.cooldownMs - (now - (player.last_bicanh || 0));
        if (left > 0) {
          return interaction.update({ content: `⏳ Còn phải hồi sức **${Math.ceil(left / 60000)} phút** mới quét được.`, embeds: [], components: [] });
        }
        const loot = bicanh.sweepLoot(zone, best, player.realm);
        db.setBicanhTs(userId, now);
        let tuViRes = { damp: 1, bottleneck: 1 };
        if (loot.stones) loot.stones = db.addStones(userId, loot.stones).gained;
        if (loot.tuVi) { tuViRes = db.addTuVi(userId, loot.tuVi); loot.tuVi = tuViRes.gained; }
        if (Object.keys(loot.mats).length) db.addMaterials(userId, loot.mats);
        db.addDailyProgress(userId, 'bicanh_floor', best);

        const note = dampen.tuViNote(tuViRes);
        const e = new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle(`⚡ Quét Bí Cảnh — ${zone.emoji} ${zone.name}`)
          .setDescription(`Đạo hữu vận thần thông càn quét **${best} tầng** trong nháy mắt, gom sạch chiến lợi phẩm.${note ? `\n\n${note}` : ''}`)
          .addFields({ name: '🎁 Thu hoạch', value: lootLine(loot) })
          .setFooter({ text: 'Quét tốn lượt hồi như vào bí cảnh. Vượt sâu hơn (đánh tay) để mở khóa quét xa hơn.' });
        return interaction.update({ embeds: [e], components: [] });
      }

      // --- Đi sâu hơn ---
      if (action === 'deeper') {
        const run = loadRun(userId, db.getPlayer(userId));
        if (!run) {
          return interaction.update({ content: '🌫️ Lượt thám hiểm đã kết thúc. Gõ `/bicanh` để vào lại.', embeds: [], components: [] });
        }
        if (run.floor >= config.bicanh.maxFloors) {
          return interaction.update({ content: 'Đã ở tầng sâu nhất rồi — hãy rời bí cảnh nhận thưởng.', components: [runButtons(false)] });
        }
        return startFloorFight(interaction, run, true); // đánh tầng kế tiếp theo lượt
      }

      // --- Rời bí cảnh: NHẬN thưởng vào túi ---
      if (action === 'leave') {
        const run = loadRun(userId, db.getPlayer(userId));
        if (!run) {
          return interaction.update({ content: '🌫️ Lượt thám hiểm đã kết thúc rồi.', embeds: [], components: [] });
        }
        dropRun(userId);
        const loot = run.loot;
        let tuViRes = { damp: 1, bottleneck: 1 };
        if (loot.stones) loot.stones = db.addStones(userId, loot.stones).gained;
        if (loot.tuVi) { tuViRes = db.addTuVi(userId, loot.tuVi); loot.tuVi = tuViRes.gained; }
        if (Object.keys(loot.mats).length) db.addMaterials(userId, loot.mats);

        const zone = bicanh.getZone(run.zoneId);
        const note = dampen.tuViNote(tuViRes);
        const e = new EmbedBuilder()
          .setColor(config.colors.gold)
          .setTitle('🚪 Xuất Bí Cảnh — An Toàn Trở Về')
          .setDescription(`Bạn rút lui khỏi **${zone.emoji} ${zone.name}** sau khi vượt **${run.floor} tầng**.${note ? `\n\n${note}` : ''}`)
          .addFields({ name: '🎁 Thu hoạch nhận về túi', value: lootLine(loot) })
          .setFooter({ text: 'Nguyên liệu mang đi /luyendan chế đan dược. Nghỉ ngơi rồi /bicanh lượt mới.' });
        return interaction.update({ embeds: [e], components: [] });
      }
    },
  },
};
