// =====================================================================
//  /trangbi — KHO TRANG BỊ (hệ trang bị đầy đủ: 6 ô · độ hiếm · cường hóa).
//  Xem đồ đang mặc + tổng chỉ số cộng thêm; chọn 1 món trong kho để Mặc /
//  Cường hóa / Phân giải. Phản hồi ẩn (ephemeral) — cô lập theo người.
//  customId: panel_trangbi (panel) · gear:<action>[:uid|slot] (router 'gear').
// =====================================================================
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const gear = require('../gear');
const forge = require('../forge'); // cap cường hóa theo độ hiếm (cường hóa/nâng bậc ở Lò Rèn)
const equipment = require('../equipment'); // đồ nhập môn (cường hóa gộp ở đây)
const ui = require('../util/ui');
const features = require('../features');
const cult = require('../cultivation');
const assets = require('../assets'); // ảnh trang bị theo ô×độ hiếm (tự bỏ qua nếu chưa có)

const CK = 'trangBi';
const cur = config.currency;

// --- Màn chính: 6 ô + tổng bonus + kho ---
function mainView(player) {
  const equippedMap = db.getGearEquipped(player);
  const inv = db.getGearInv(player);
  const byU = new Map(inv.map((it) => [it.u, it]));
  const refine = db.getRefine(player);

  const slotLines = gear.SLOTS.map((s) => {
    const u = equippedMap[s.key];
    const it = u && byU.get(u);
    if (!it) return `${s.emoji} **${s.name}** — *(trống)*`;
    return `${s.emoji} **${s.name}** — ${gear.nameOf(it)}\n   ${gear.statsText(it, player.sect)}`;
  }).join('\n');

  const bonus = gear.sumBonus(db.getEquippedItems(player), player.sect);
  const bonusParts = [];
  for (const k of ['hp', 'atk', 'def', 'spd', 'mp', 'crit', 'dodge', 'critDmg']) {
    if (!bonus[k]) continue;
    const pct = (k === 'crit' || k === 'dodge' || k === 'critDmg');
    bonusParts.push(`${gear.STAT_EMOJI[k]}+${pct ? Math.round(bonus[k] * 100) + '%' : bonus[k]} ${gear.STAT_LABEL[k]}`);
  }

  // Đồ nhập môn (set cố định theo phái) — luôn kích hoạt; cường hóa được.
  const sectIds = db.getEquipment(player);
  const enhMap = db.getEquipEnh(player);
  const sectStr = sectIds.length
    ? '\n\n**🎴 Đồ nhập môn** _(luôn kích hoạt · cường hóa được)_\n' +
      sectIds.map((id) => {
        const it = equipment.itemInfo(id); if (!it) return null;
        const lv = enhMap[id] || 0;
        return `${equipment.displayName(id, lv)} _(${equipment.bonusText(equipment.effectiveBonus(id, lv))})_`;
      }).filter(Boolean).join('\n')
    : '';

  const e = ui.panelEmbed(CK, {
    title: `🛡️ Trang Bị — ${player.username}`,
    desc:
      slotLines +
      `\n\n**Tổng cộng thêm (6 ô):** ${bonusParts.length ? bonusParts.join(' · ') : '*(chưa mặc gì)*'}` +
      sectStr +
      `\n\n🔩 Tinh Thiết: **${refine}** · 🎒 Kho: **${inv.length}/${config.gear.invMax}** · ${cur.emoji} ${ui.num(player.stones)}${cur.short}`,
    footer: 'Chọn món trong kho để Mặc/Cường hóa/Phân giải · chọn đồ nhập môn để cường hóa.',
  });

  const comps = [];
  // Select cường hóa đồ nhập môn (luôn trước kho 6 ô nếu có).
  if (sectIds.length) {
    comps.push(ui.select('gear:selsect', '🎴 Cường hóa đồ nhập môn…', sectIds.map((id) => {
      const it = equipment.itemInfo(id); const lv = enhMap[id] || 0; const rar = equipment.rarityOf(id);
      return {
        label: `${it ? it.name : id}${lv ? ' +' + lv : ''}`.slice(0, 90),
        description: `${rar ? rar.name : ''} · ${it ? equipment.bonusText(equipment.effectiveBonus(id, lv)) : ''}`.slice(0, 90),
        emoji: rar ? rar.emoji : '⚪',
        value: id,
      };
    })));
  }
  if (inv.length) {
    // Sắp theo sức mạnh giảm dần; select tối đa 25.
    const sorted = [...inv].sort((a, b) => gear.power(b) - gear.power(a));
    const shown = sorted.slice(0, 25);
    const equippedSet = new Set(Object.values(equippedMap));
    comps.push(ui.select('gear:sel', '🎒 Chọn món để quản lý…', shown.map((it) => ({
      label: `${gear.rarity(it.r)?.name || ''} ${gear.SLOT_BY[it.s]?.noun || ''}${it.e ? ' +' + it.e : ''}`.slice(0, 90),
      description: `Sức mạnh ${gear.power(it)}${equippedSet.has(it.u) ? ' · đang mặc' : ''}`.slice(0, 90),
      emoji: gear.rarity(it.r)?.emoji || '⚪',
      value: it.u,
    }))));
    if (inv.length > 25) e.setFooter({ text: `Hiển thị 25/${inv.length} món mạnh nhất · phân giải bớt để gọn kho.` });
  }
  return { embeds: [e], components: comps };
}

// --- Màn chi tiết 1 món ---
function itemView(player, uid) {
  const inv = db.getGearInv(player);
  const it = inv.find((x) => x.u === uid);
  if (!it) return mainView(player);
  const equippedMap = db.getGearEquipped(player);
  const isEquipped = equippedMap[it.s] === uid;
  const rar = gear.rarity(it.r);
  const sal = gear.salvageYield(it);

  // So sánh với món đang mặc cùng ô (nếu khác).
  const equippedU = equippedMap[it.s];
  const equippedItem = equippedU && equippedU !== uid && inv.find((x) => x.u === equippedU);
  let cmp = '';
  if (equippedItem) cmp = `\n\n↔️ *Đang mặc cùng ô:* ${gear.nameOf(equippedItem)} _(sức mạnh ${gear.power(equippedItem)})_`;

  const e = ui.panelEmbed(CK, {
    title: `${rar?.emoji || '⚪'} ${gear.nameOf(it)}`,
    desc:
      `**Ô:** ${gear.SLOT_BY[it.s]?.emoji} ${gear.SLOT_BY[it.s]?.name}  ·  **Độ hiếm:** ${rar?.emoji} ${rar?.name}\n` +
      `**Cường hóa:** +${it.e || 0}/${forge.enhCap(it.r)} _(cap theo độ hiếm)_\n\n` +
      `📊 **Chỉ số:** ${gear.statsText(it, player.sect)}\n` +
      `⚡ **Sức mạnh:** ${gear.power(it)}` +
      (isEquipped ? '\n\n✅ *Đang trang bị.*' : '') + cmp +
      `\n\n— — —\n` +
      `🔨 **Cường hóa / Nâng bậc:** tới **Lò Rèn** (\`/loren\`) — bấm nút bên dưới.\n` +
      `♻️ **Phân giải:** nhận 🔩 **${sal}** Tinh Thiết _(mất món)_`,
    footer: 'Mặc để kích hoạt chỉ số · Cường hóa/Nâng bậc ở Lò Rèn · Phân giải lấy Tinh Thiết.',
  });

  const btns = [];
  if (!isEquipped) btns.push(ui.btn(`gear:equip:${uid}`, 'Mặc', 'success', { emoji: '🫳' }));
  else btns.push(ui.btn(`gear:unequip:${it.s}`, 'Tháo', 'secondary', { emoji: '🧤' }));
  btns.push(ui.btn('panel_loren', 'Lò Rèn', 'primary', { emoji: '🔨' }));
  btns.push(ui.btn(`gear:salvage:${uid}`, `Phân giải (+${sal}🔩)`, 'danger', { emoji: '♻️' }));
  btns.push(ui.btn('gear:back', 'Về kho', 'secondary', { emoji: '◀️' }));
  // Ảnh món đồ (theo ô × độ hiếm) — hiện ở DƯỚI CÙNG.
  const files = assets.gearById(e, it.id, 'image');
  return { embeds: [e], components: ui.rows(btns), files };
}

// --- Màn chi tiết 1 món ĐỒ NHẬP MÔN (luôn kích hoạt; chỉ cường hóa) ---
function sectItemView(player, itemId) {
  const it = equipment.itemInfo(itemId);
  if (!it || !db.getEquipment(player).includes(itemId)) return mainView(player);
  const lv = db.getEquipEnh(player)[itemId] || 0;
  const rar = equipment.rarityOf(itemId);
  const pseudo = { e: lv, st: cult.globalStage(player.realm, player.tier) };
  const canEnh = gear.canEnhance(pseudo);
  const cost = gear.enhanceCost(pseudo);
  const rate = gear.enhanceRate(pseudo);

  const e = ui.panelEmbed(CK, {
    title: `${rar ? rar.emoji : '⚪'} ${it.emoji} ${it.name}`,
    desc:
      `_${it.desc || ''}_\n\n` +
      `**Loại:** Đồ nhập môn · ${equipment.SLOT_NAMES[it.slot] || it.slot}  ·  **Độ hiếm:** ${rar ? rar.emoji + ' ' + rar.name : '—'}\n` +
      `**Cường hóa:** +${lv}/${equipment.enhanceMax()}\n\n` +
      `📊 **Chỉ số:** ${equipment.bonusText(equipment.effectiveBonus(itemId, lv))}\n` +
      `✅ *Đồ nhập môn luôn kích hoạt — không cần mặc.*\n\n— — —\n` +
      (canEnh
        ? `🔨 **Cường hóa +${lv + 1}:** ${cur.emoji} ${ui.num(cost.stones)} + 🔩 ${cost.refine} · tỉ lệ **${Math.round(rate * 100)}%** _(trượt mất nguyên liệu, không tụt cấp)_`
        : `🔨 *Đã đạt cường hóa tối đa.*`),
    footer: 'Cường hóa để mạnh hơn · đồ nhập môn không phân giải/tháo được.',
  });

  const btns = [];
  if (canEnh) btns.push(ui.btn(`gear:enhsect:${itemId}`, `Cường hóa (+${lv + 1})`, 'primary', { emoji: '🔨' }));
  btns.push(ui.btn('gear:back', 'Về kho', 'secondary', { emoji: '◀️' }));
  return { embeds: [e], components: ui.rows(btns) };
}

// Gate thủ công theo cảnh giới (dùng được cho cả slash lẫn nút panel).
async function open(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" trước nhé.', flags: MessageFlags.Ephemeral });
  const f = features.featureForCommand('trangbi');
  if (f && !features.isUnlocked(p, f)) {
    return interaction.reply({
      content: `🔒 **${f.emoji} ${f.name}** mở khóa ở **${features.realmName(f.realm)}**. Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  return interaction.reply({ ...mainView(p), flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder().setName('trangbi').setDescription('Kho trang bị: mặc, cường hóa, phân giải.'),
  async execute(interaction) { return open(interaction); },
  buttons: {
    async panel_trangbi(interaction) { return open(interaction); },

    // Router 'gear': mọi customId bắt đầu bằng "gear:".
    async gear(interaction) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const uid = parts[2];
      const id = interaction.user.id;
      // attachments:[] để ảnh món cũ không đọng khi đổi view.
      const upd = (v) => interaction.update({ ...v, attachments: [] });

      if (interaction.isStringSelectMenu() && action === 'sel') {
        return upd(itemView(db.getPlayer(id), interaction.values[0]));
      }
      // Chọn 1 đồ nhập môn để cường hóa.
      if (interaction.isStringSelectMenu() && action === 'selsect') {
        return upd(sectItemView(db.getPlayer(id), interaction.values[0]));
      }
      // Cường hóa đồ nhập môn.
      if (action === 'enhsect') {
        const itemId = parts[2];
        const res = db.enhanceSectItem(id, itemId);
        const p = db.getPlayer(id);
        if (res.err === 'nostones') return interaction.reply({ content: `😅 Thiếu linh thạch — cần ${cur.emoji} ${ui.num(res.cost.stones)}.`, flags: MessageFlags.Ephemeral });
        if (res.err === 'norefine') return interaction.reply({ content: `😅 Thiếu 🔩 Tinh Thiết — cần ${res.cost.refine} (phân giải đồ thừa để có).`, flags: MessageFlags.Ephemeral });
        if (res.err === 'maxed') return interaction.reply({ content: 'Món này đã cường hóa tối đa rồi! ✨', flags: MessageFlags.Ephemeral });
        if (res.err) return upd(mainView(p));
        await upd(sectItemView(p, itemId));
        return interaction.followUp({
          content: res.success ? `🔨✨ Cường hóa **THÀNH CÔNG** → +${res.level}!` : '💥 Cường hóa **thất bại** — nguyên liệu tan thành mây khói (cấp giữ nguyên).',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (action === 'back') return upd(mainView(db.getPlayer(id)));
      if (action === 'equip') {
        const res = db.equipGear(id, uid);
        const p = db.getPlayer(id);
        return upd(res.err ? mainView(p) : itemView(p, uid));
      }
      if (action === 'unequip') {
        db.unequipGear(id, uid); // uid ở đây là slot
        return upd(mainView(db.getPlayer(id)));
      }
      if (action === 'enhance') {
        const res = db.enhanceGear(id, uid);
        const p = db.getPlayer(id);
        if (res.err === 'nostones') return interaction.reply({ content: `😅 Thiếu linh thạch — cần ${cur.emoji} ${ui.num(res.cost.stones)}.`, flags: MessageFlags.Ephemeral });
        if (res.err === 'norefine') return interaction.reply({ content: `😅 Thiếu 🔩 Tinh Thiết — cần ${res.cost.refine} (phân giải đồ thừa để có).`, flags: MessageFlags.Ephemeral });
        if (res.err === 'maxed') return interaction.reply({ content: 'Món này đã cường hóa tối đa rồi! ✨', flags: MessageFlags.Ephemeral });
        if (res.err) return upd(mainView(p));
        await upd(itemView(p, uid));
        return interaction.followUp({
          content: res.success ? `🔨✨ Cường hóa **THÀNH CÔNG** → +${res.level}!` : '💥 Cường hóa **thất bại** — nguyên liệu tan thành mây khói (cấp giữ nguyên).',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (action === 'salvage') {
        const res = db.salvageGear(id, uid);
        await upd(mainView(db.getPlayer(id)));
        if (res.ok) return interaction.followUp({ content: `♻️ Đã phân giải → nhận 🔩 **${res.refine}** Tinh Thiết.`, flags: MessageFlags.Ephemeral });
        return;
      }
    },
  },
};
