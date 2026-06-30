// =====================================================================
//  /loren — RÈN KHÍ LÔ (3 chế độ). Mở khóa ở Kim Đan (realm 3).
//   ① Chế tạo  — tạo món mới (ô + độ hiếm).
//   ② Cường hóa — +1 chỉ số 1 món (cap theo độ hiếm; bại cao có thể tụt cấp).
//   ③ Nâng bậc — nâng độ hiếm món (giữ cấp cường hóa; bại có thể tụt bậc).
//  Phù 🔮: 🧧 Hộ Khí (bại không tụt) · 📜 Thiên Mệnh (+15% tỉ lệ). Mua ở Phường Thị Cao Cấp.
//  customId: panel_loren · forge:<action>...
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const gear = require('../gear');
const forge = require('../forge');
const bicanh = require('../bicanh');
const features = require('../features');
const { requireUnlocked } = require('../util/feature-gate');

const stone = config.currency.emoji;

function rarLabel(r) { const rr = gear.rarity(r); return rr ? `${rr.emoji} ${rr.name}` : r; }
function pct(x) { return `${Math.round(x * 100)}%`; }
// Nhãn gọn 1 món cho select/hiển thị: "🟢 🗡️ Tên +3".
function itemLabel(it) { return gear.nameOf(it); }

// Khối chi phí (nguyên liệu + Tinh Thiết + linh thạch) với ✅/❌ theo túi.
function costBlock(p, rc) {
  const bag = db.getMaterials(p);
  const out = [];
  for (const [m, q] of Object.entries(rc.mats || {})) {
    const i = bicanh.materialInfo(m); const have = bag[m] || 0;
    out.push(`${i ? i.emoji : ''} ${i ? i.name : m}: **${have}/${q}** ${have >= q ? '✅' : '❌'}`);
  }
  if (rc.refine) out.push(`🔩 Tinh Thiết: **${db.getRefine(p)}/${rc.refine}** ${db.getRefine(p) >= rc.refine ? '✅' : '❌'}`);
  if (rc.stones) out.push(`${stone} Linh thạch: **${p.stones}/${rc.stones}** ${p.stones >= rc.stones ? '✅' : '❌'}`);
  return out.join('\n');
}
function affordMats(p, rc) {
  const bag = db.getMaterials(p);
  for (const [m, q] of Object.entries(rc.mats || {})) if ((bag[m] || 0) < q) return false;
  return db.getRefine(p) >= (rc.refine || 0) && p.stones >= (rc.stones || 0);
}

// 3 nút chuyển chế độ (active tô sáng).
function modeRow(active) {
  const mk = (id, label, on) => new ButtonBuilder().setCustomId(`forge:mode:${id}`).setLabel(label)
    .setStyle(active === id ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(active === id);
  return new ActionRowBuilder().addComponents(
    mk('craft', '🔨 Chế tạo', active === 'craft'),
    mk('enh', '⚒️ Cường hóa', active === 'enh'),
    mk('upg', '⬆️ Nâng bậc', active === 'upg'),
  );
}

// Hàng bật/tắt phù cho 1 thao tác (prefix 'e'|'u'). Khóa nút nếu không có phù & đang tắt.
function charmRow(prefix, uid, ho, tm, p) {
  const have = db.getForgeCharms(p);
  const hoN = have.ho_khi || 0; const tmN = have.thien_menh || 0;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`forge:${prefix}tgl:ho:${uid}:${ho ? 1 : 0}:${tm ? 1 : 0}`)
      .setLabel(`🧧 Hộ Khí: ${ho ? 'BẬT' : 'tắt'} (${hoN})`).setStyle(ho ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(hoN <= 0 && !ho),
    new ButtonBuilder().setCustomId(`forge:${prefix}tgl:tm:${uid}:${ho ? 1 : 0}:${tm ? 1 : 0}`)
      .setLabel(`📜 Thiên Mệnh: ${tm ? 'BẬT' : 'tắt'} (${tmN})`).setStyle(tm ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(tmN <= 0 && !tm),
  );
}

// ---------------------------------------------------------------------
//  ① CHẾ TẠO
// ---------------------------------------------------------------------
function craftView(p, slot, rarity, tm) {
  const unlocked = forge.unlockedCraft(p.realm);
  slot = gear.SLOT_BY[slot] ? slot : 'weapon';
  rarity = unlocked.includes(rarity) ? rarity : unlocked[unlocked.length - 1];
  const rc = forge.craftRecipe(rarity);
  const si = gear.SLOT_BY[slot];
  const nextLock = forge.nextLockedCraft(p.realm);
  const have = db.getForgeCharms(p);
  const useTm = !!tm && (have.thien_menh || 0) > 0;
  const rate = Math.min(0.99, rc.rate + (useTm ? forge.THIEN_MENH_BONUS : 0));

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🔨 Lò Rèn — Chế Tạo')
    .setDescription(
      `Tạo 1 **${si.emoji} ${si.name}** độ hiếm **${rarLabel(rarity)}**${p.sect ? ' (mang **tứ tính** đúng phái)' : ''}.\n\n` +
      `**Đang chọn:** ${si.emoji} ${si.name} · ${rarLabel(rarity)}\n` +
      `🎯 Tỉ lệ: **${pct(rate)}**${useTm ? ' _(📜 +15%)_' : ''}\n\n**Chi phí:**\n${costBlock(p, rc)}` +
      (nextLock ? `\n\n🔒 *${rarLabel(nextLock)} mở ở ${features.realmName(forge.craftRecipe(nextLock).minRealm)}.*` : ''),
    )
    .setFooter({ text: 'Thất bại chỉ mất nguyên liệu + linh thạch (giữ Tinh Thiết).' });

  const slotMenu = new StringSelectMenuBuilder().setCustomId('forge:slot').setPlaceholder('Chọn ô…')
    .addOptions(gear.SLOTS.map((s) => ({ label: s.name, emoji: s.emoji, value: s.key, default: s.key === slot })));
  const rarMenu = new StringSelectMenuBuilder().setCustomId(`forge:rarity:${slot}`).setPlaceholder('Chọn độ hiếm…')
    .addOptions(unlocked.map((r) => { const rr = gear.rarity(r); return { label: `${rr.name} — ${pct(forge.craftRecipe(r).rate)}`, emoji: rr.emoji, value: r, default: r === rarity }; }));
  const tmN = have.thien_menh || 0;
  const tmBtn = new ButtonBuilder().setCustomId(`forge:ctgl:${slot}:${rarity}:${useTm ? 1 : 0}`)
    .setLabel(`📜 Thiên Mệnh: ${useTm ? 'BẬT' : 'tắt'} (${tmN})`).setStyle(useTm ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(tmN <= 0 && !useTm);
  const doBtn = new ButtonBuilder().setCustomId(`forge:do:${slot}:${rarity}:${useTm ? 1 : 0}`)
    .setLabel(`🔨 Rèn (${rarLabel(rarity)})`).setStyle(ButtonStyle.Success).setDisabled(!affordMats(p, rc));

  return { embeds: [e], components: [
    modeRow('craft'),
    new ActionRowBuilder().addComponents(slotMenu),
    new ActionRowBuilder().addComponents(rarMenu),
    new ActionRowBuilder().addComponents(tmBtn, doBtn),
  ] };
}

// ---------------------------------------------------------------------
//  ② CƯỜNG HÓA
// ---------------------------------------------------------------------
function enhanceView(p, uid, ho, tm) {
  const inv = db.getGearInv(p);
  const list = inv.filter((it) => forge.canEnhance(it)).slice(0, 25);
  const it = uid ? inv.find((x) => x.u === uid) : null;
  const have = db.getForgeCharms(p);
  const useHo = !!ho && (have.ho_khi || 0) > 0;
  const useTm = !!tm && (have.thien_menh || 0) > 0;

  const e = new EmbedBuilder().setColor(config.colors.gold).setTitle('⚒️ Lò Rèn — Cường Hóa');
  const comps = [modeRow('enh')];

  if (!list.length) {
    e.setDescription('Kho chưa có món nào cường hóa được (hoặc đã tới cap). Đi `/bicanh`/rèn để có đồ trước nhé.');
    return { embeds: [e], components: comps };
  }
  const selMenu = new StringSelectMenuBuilder().setCustomId('forge:esel').setPlaceholder('Chọn món để cường hóa…')
    .addOptions(list.map((x) => ({ label: itemLabel(x).slice(0, 90), value: x.u, default: it && x.u === it.u })));
  comps.push(new ActionRowBuilder().addComponents(selMenu));

  if (!it || !forge.canEnhance(it)) {
    e.setDescription('Chọn 1 món trong menu để xem chi phí & cường hóa.');
    return { embeds: [e], components: comps };
  }
  const e0 = it.e || 0; const cap = forge.enhCap(it.r);
  const cost = forge.enhanceCost(it);
  const rate = Math.min(0.99, forge.enhanceBaseRate(it) + (useTm ? forge.THIEN_MENH_BONUS : 0));
  const risk = e0 >= forge.ENH_DROP_FROM;
  e.setDescription(
    `**${itemLabel(it)}**\nCường hóa: **+${e0} → +${e0 + 1}** (cap ${rarLabel(it.r)}: **+${cap}**)\n` +
    `🎯 Tỉ lệ: **${pct(rate)}**${useTm ? ' _(📜 +15%)_' : ''}\n` +
    `**Chi phí:** 🔩 ${cost.refine} · ${stone} ${cost.stones}\n` +
    (risk
      ? `\n⚠️ **Rủi ro:** bại có **${pct(forge.ENH_DROP_CHANCE)}** tụt 1 cấp${useHo ? ' — 🧧 Hộ Khí đang BẢO VỆ' : ' (bật 🧧 Hộ Khí để chặn)'}.`
      : `\n✅ Dưới +${forge.ENH_DROP_FROM} — bại chỉ mất tài nguyên, không tụt cấp.`),
  ).setFooter({ text: 'Cap cường hóa tăng theo độ hiếm — muốn +cao phải nâng bậc trước.' });
  const afford = p.stones >= cost.stones && db.getRefine(p) >= cost.refine;
  comps.push(charmRow('e', it.u, useHo, useTm, p));
  comps.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`forge:edo:${it.u}:${useHo ? 1 : 0}:${useTm ? 1 : 0}`)
      .setLabel(`⚒️ Cường hóa +${e0 + 1}`).setStyle(ButtonStyle.Success).setDisabled(!afford),
  ));
  return { embeds: [e], components: comps };
}

// ---------------------------------------------------------------------
//  ③ NÂNG BẬC
// ---------------------------------------------------------------------
function upgradeView(p, uid, ho, tm) {
  const inv = db.getGearInv(p);
  const list = inv.filter((it) => forge.nextRarity(it.r)).slice(0, 25);
  const it = uid ? inv.find((x) => x.u === uid) : null;
  const have = db.getForgeCharms(p);
  const useHo = !!ho && (have.ho_khi || 0) > 0;
  const useTm = !!tm && (have.thien_menh || 0) > 0;

  const e = new EmbedBuilder().setColor(config.colors.gold).setTitle('⬆️ Lò Rèn — Nâng Bậc');
  const comps = [modeRow('upg')];

  if (!list.length) {
    e.setDescription('Kho chưa có món nào nâng bậc được (đồ Thần Khí là đỉnh rồi). Đi kiếm đồ trước nhé.');
    return { embeds: [e], components: comps };
  }
  const selMenu = new StringSelectMenuBuilder().setCustomId('forge:usel').setPlaceholder('Chọn món để nâng bậc…')
    .addOptions(list.map((x) => ({ label: itemLabel(x).slice(0, 90), value: x.u, default: it && x.u === it.u })));
  comps.push(new ActionRowBuilder().addComponents(selMenu));

  const to = it ? forge.nextRarity(it.r) : null;
  const rc = to ? forge.upgradeRecipe(to) : null;
  if (!it || !rc) {
    e.setDescription('Chọn 1 món trong menu để xem chi phí & nâng bậc.');
    return { embeds: [e], components: comps };
  }
  const rate = Math.min(0.99, rc.rate + (useTm ? forge.THIEN_MENH_BONUS : 0));
  const locked = p.realm < rc.minRealm;
  const down = forge.prevRarity(it.r);
  e.setDescription(
    `**${itemLabel(it)}**\nNâng bậc: **${rarLabel(it.r)} → ${rarLabel(to)}** (giữ +${it.e || 0} cường hóa)\n` +
    `🎯 Tỉ lệ: **${pct(rate)}**${useTm ? ' _(📜 +15%)_' : ''}\n\n**Chi phí:**\n${costBlock(p, rc)}` +
    (locked ? `\n\n🔒 *Cần ${features.realmName(rc.minRealm)} mới nâng lên ${rarLabel(to)}.*` : '') +
    (down ? `\n\n⚠️ **Rủi ro:** bại có **${pct(forge.UP_DROP_CHANCE)}** tụt về **${rarLabel(down)}**${useHo ? ' — 🧧 Hộ Khí đang BẢO VỆ' : ' (bật 🧧 Hộ Khí để chặn)'}.` : ''),
  ).setFooter({ text: 'Nâng bậc giữ nguyên cấp cường hóa hiện có.' });
  const afford = !locked && affordMats(p, rc);
  comps.push(charmRow('u', it.u, useHo, useTm, p));
  comps.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`forge:udo:${it.u}:${useHo ? 1 : 0}:${useTm ? 1 : 0}`)
      .setLabel(`⬆️ Nâng lên ${gear.rarity(to).name}`).setStyle(ButtonStyle.Success).setDisabled(!afford),
  ));
  return { embeds: [e], components: comps };
}

async function open(interaction) {
  const p = await requireUnlocked(interaction);
  if (!p) return;
  return interaction.reply({ ...craftView(p), flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder().setName('loren').setDescription('Rèn Khí Lô — chế tạo · cường hóa · nâng bậc trang bị (mở ở Kim Đan).'),
  async execute(interaction) { return open(interaction); },

  buttons: {
    async panel_loren(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` trước đã.', flags: MessageFlags.Ephemeral });
      if (p.realm < forge.MIN_REALM) {
        return interaction.reply({ content: `🔒 **Rèn Khí Lô** mở ở **${features.realmName(forge.MIN_REALM)}**. Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}**.`, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...craftView(p), flags: MessageFlags.Ephemeral });
    },

    async forge(interaction) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const id = interaction.user.id;
      const upd = (v) => interaction.update({ ...v, attachments: [] });
      const P = () => db.getPlayer(id);

      // --- Chuyển chế độ ---
      if (action === 'mode') {
        const m = parts[2];
        if (m === 'enh') return upd(enhanceView(P()));
        if (m === 'upg') return upd(upgradeView(P()));
        return upd(craftView(P()));
      }

      // --- ① Chế tạo ---
      if (interaction.isStringSelectMenu() && action === 'slot') return upd(craftView(P(), interaction.values[0], null));
      if (interaction.isStringSelectMenu() && action === 'rarity') return upd(craftView(P(), parts[2], interaction.values[0]));
      if (action === 'ctgl') return upd(craftView(P(), parts[2], parts[3], parts[4] !== '1')); // toggle Thiên Mệnh
      if (action === 'do') {
        const slot = parts[2]; const rarity = parts[3]; const tm = parts[4] === '1';
        const res = db.forgeCraft(id, slot, rarity, { thien_menh: tm });
        if (res.err) { await upd(craftView(P(), slot, rarity, tm)); return interaction.followUp({ content: forgeErr(res), flags: MessageFlags.Ephemeral }); }
        await upd(craftView(P(), slot, rarity, false));
        const tmNote = res.usedTm ? ' _(dùng 1 📜)_' : '';
        const msg = res.success
          ? `🔨✨ **Rèn thành công!** Nhận **${gear.nameOf(res.item)}**${res.salvaged ? ` _(kho đầy → +${res.refine}🔩)_` : ''}${tmNote} — vào **Trang Bị** để mặc.`
          : `🔨💥 **Rèn thất bại!** Mất nguyên liệu + linh thạch (giữ 🔩 Tinh Thiết)${tmNote}.`;
        return interaction.followUp({ content: msg, flags: MessageFlags.Ephemeral });
      }

      // --- ② Cường hóa ---
      if (interaction.isStringSelectMenu() && action === 'esel') return upd(enhanceView(P(), interaction.values[0], false, false));
      if (action === 'etgl') { const which = parts[2], uid = parts[3]; let ho = parts[4] === '1', tm = parts[5] === '1'; if (which === 'ho') ho = !ho; else tm = !tm; return upd(enhanceView(P(), uid, ho, tm)); }
      if (action === 'edo') {
        const uid = parts[2]; const ho = parts[3] === '1'; const tm = parts[4] === '1';
        const res = db.forgeEnhance(id, uid, { ho_khi: ho, thien_menh: tm });
        if (res.err) { await upd(enhanceView(P(), uid, ho, tm)); return interaction.followUp({ content: forgeErr(res), flags: MessageFlags.Ephemeral }); }
        await upd(enhanceView(P(), uid, false, false));
        return interaction.followUp({ content: enhMsg(res), flags: MessageFlags.Ephemeral });
      }

      // --- ③ Nâng bậc ---
      if (interaction.isStringSelectMenu() && action === 'usel') return upd(upgradeView(P(), interaction.values[0], false, false));
      if (action === 'utgl') { const which = parts[2], uid = parts[3]; let ho = parts[4] === '1', tm = parts[5] === '1'; if (which === 'ho') ho = !ho; else tm = !tm; return upd(upgradeView(P(), uid, ho, tm)); }
      if (action === 'udo') {
        const uid = parts[2]; const ho = parts[3] === '1'; const tm = parts[4] === '1';
        const res = db.forgeUpgrade(id, uid, { ho_khi: ho, thien_menh: tm });
        if (res.err) { await upd(upgradeView(P(), uid, ho, tm)); return interaction.followUp({ content: forgeErr(res), flags: MessageFlags.Ephemeral }); }
        await upd(upgradeView(P(), uid, false, false));
        return interaction.followUp({ content: upgMsg(res), flags: MessageFlags.Ephemeral });
      }
    },
  },
};

// --- Thông báo lỗi/kết quả ---
function forgeErr(res) {
  if (res.err === 'realm') return `🔒 Cần **${features.realmName(res.need)}** mới làm được.`;
  if (res.err === 'mats' || res.err === 'refine' || res.err === 'stones') return '😅 Không đủ nguyên liệu / Tinh Thiết / linh thạch.';
  if (res.err === 'maxed') return '✅ Món đã đạt cap cường hóa của độ hiếm này — nâng bậc để cường hóa tiếp.';
  if (res.err === 'maxrarity') return '✅ Món đã là Thần Khí — đỉnh độ hiếm, không nâng tiếp được.';
  if (res.err === 'notfound') return 'Không tìm thấy món (có thể đã đổi/bán).';
  return 'Lò rèn trục trặc, thử lại sau.';
}
function enhMsg(res) {
  const tm = res.usedTm ? ' _(1 📜)_' : '';
  if (res.success) return `⚒️✨ **Cường hóa thành công!** Món lên **+${res.to}**${tm}.`;
  if (res.savedByCharm) return `⚒️💥 Thất bại — nhưng 🧧 **Hộ Khí Phù** giữ nguyên **+${res.to}** (mất tài nguyên + 1 🧧)${tm}.`;
  if (res.dropped) return `⚒️💔 **Thất bại — TỤT 1 CẤP!** Còn **+${res.to}** (lần sau bật 🧧 Hộ Khí)${tm}.`;
  return `⚒️💥 **Thất bại!** Giữ **+${res.to}**, mất tài nguyên${tm}.`;
}
function upgMsg(res) {
  const tm = res.usedTm ? ' _(1 📜)_' : '';
  if (res.success) return `⬆️✨ **Nâng bậc thành công!** Lên **${rarLabel(res.toR)}**${tm}.`;
  if (res.savedByCharm) return `⬆️💥 Thất bại — 🧧 **Hộ Khí Phù** giữ nguyên **${rarLabel(res.toR)}** (mất tài nguyên + 1 🧧)${tm}.`;
  if (res.dropped) return `⬆️💔 **Thất bại — TỤT BẬC!** Rớt về **${rarLabel(res.toR)}** (lần sau bật 🧧 Hộ Khí)${tm}.`;
  return `⬆️💥 **Thất bại!** Giữ **${rarLabel(res.toR)}**, mất tài nguyên${tm}.`;
}
