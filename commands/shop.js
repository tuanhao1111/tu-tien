// =====================================================================
//  /shop — PHƯỜNG THỊ: mua VẬT PHẨM TIÊU HAO bằng linh thạch.
//  Nguyên liệu · 🔩 Tinh Thiết · đan dược (KHÔNG bán trang bị).
//  Phản hồi ẩn (ephemeral). customId: panel_shop · shop:<action>[:id:qty].
// =====================================================================
const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config');
const shop = require('../shop');
const premiumshop = require('../premiumshop');
const titles = require('../titles');
const forge = require('../forge');
const gear = require('../gear');
const bicanh = require('../bicanh');
const alchemy = require('../alchemy');
const cult = require('../cultivation');
const petbeasts = require('../petbeasts'); // catalog Ngự Thú (bậc + giá mua thẳng)
const ui = require('../util/ui');
const assets = require('../assets');
const shopCard = require('../render/shopCard'); // thẻ shop kiểu RPG (kệ vật phẩm + giá)
const petGachaCard = require('../render/petGachaCard'); // thẻ kết quả quay Chiêu Hồn

const CK = 'shop';
const cur = config.currency;
const pcur = config.premiumCurrency;
const REFINE = { emoji: '🔩', name: 'Tinh Thiết', desc: 'Vật phẩm cường hóa trang bị (cũng nhận từ phân giải).' };

// Thông tin hiển thị 1 mục shop (emoji/name/desc) tùy loại.
function info(item) {
  if (item.cat === 'mat') { const m = bicanh.materialInfo(item.id); return m ? { emoji: m.emoji, name: m.name, desc: m.desc || '' } : null; }
  if (item.cat === 'pill') { const p = alchemy.pillInfo(item.id); return p ? { emoji: p.emoji, name: p.name, desc: p.desc || '' } : null; }
  if (item.cat === 'refine') return REFINE;
  return null;
}

// Select + nút (chung cho cả thẻ ảnh & fallback embed).
function mainComponents() {
  const opts = shop.STOCK.map((it) => {
    const i = info(it);
    return { label: `${i.name} — ${ui.num(shop.priceOf(it))}${cur.short}`.slice(0, 90), emoji: i.emoji, value: it.id, description: (i.desc || '').slice(0, 90) };
  });
  return [
    ui.select('shop:sel', '🛒 Chọn món muốn mua…', opts),
    ui.row(
      ui.btn('shop:premium', 'Phường Thị Cao Cấp', 'primary', { emoji: '🔮' }),
      ui.btn('gacha:open', 'Chiêu Hồn Đài', 'success', { emoji: '🎰' }),
    ),
  ];
}

// Embed văn bản (FALLBACK khi render thẻ lỗi).
function mainEmbedText(player) {
  const lines = { mat: [], refine: [], pill: [] };
  for (const it of shop.STOCK) {
    const i = info(it); if (!i) continue;
    lines[it.cat].push(`${i.emoji} **${i.name}** — ${cur.emoji} ${ui.num(shop.priceOf(it))}${cur.short}`);
  }
  return ui.panelEmbed(CK, {
    title: '🛒 Phường Thị',
    desc:
      `Mua vật phẩm tiêu hao bằng linh thạch. Túi của bạn: ${cur.emoji} **${ui.num(player.stones)}**${cur.short}\n\n` +
      `**🧪 Nguyên liệu** _(luyện đan)_\n${lines.mat.join('\n')}\n\n` +
      `**🔩 Cường hóa**\n${lines.refine.join('\n')}\n\n` +
      `**💊 Đan dược**\n${lines.pill.join('\n')}`,
    footer: 'Chọn món bên dưới để mua (x1 / x5 / x10).',
  });
}

// Màn chính = THẺ SHOP kiểu RPG (kệ vật phẩm + giá). Lỗi render -> fallback embed text.
async function mainView(player) {
  try {
    const items = shop.STOCK.map((it) => {
      const i = info(it); if (!i) return null;
      // Ảnh vật phẩm theo quy ước: mat_<id> · pill_<id> · mat_refine. Thiếu -> null (thẻ tự fallback tile).
      const key = it.cat === 'refine' ? 'mat_refine' : `${it.cat}_${it.id}`;
      return { name: i.name, desc: i.desc, price: ui.num(shop.priceOf(it)), cat: it.cat, iconDataUri: assets.dataUri(key) };
    }).filter(Boolean);
    const buf = await shopCard.render({
      title: 'PHƯỜNG THỊ', subtitle: 'Mua vật phẩm tiêu hao bằng linh thạch',
      walletText: `${ui.num(player.stones)}${cur.short}`, items, bgDataUri: shopCard.bgDataUri(),
    });
    const e = ui.panelEmbed(CK, {
      title: '🛒 Phường Thị',
      desc: `Túi của bạn: ${cur.emoji} **${ui.num(player.stones)}**${cur.short} — chọn món bên dưới để mua (x1 / x5 / x10).`,
      footer: 'Phường Thị Cao Cấp đổi bằng 🔮 Tiên Ngọc.',
    });
    e.setImage('attachment://shop.png');
    return { embeds: [e], components: mainComponents(), files: [new AttachmentBuilder(buf, { name: 'shop.png' })] };
  } catch (err) {
    console.error('[shopCard] render fail:', err && err.message);
    const e = mainEmbedText(player);
    const files = assets.misc(e, 'shop', 'image');
    return { embeds: [e], components: mainComponents(), files };
  }
}

// =====================================================================
//  PHƯỜNG THỊ CAO CẤP — mua bằng 🔮 Tiên Ngọc (vé giới tính · rương · đan · danh hiệu)
// =====================================================================
function premiumComponents(player) {
  const opts = premiumshop.PREMIUM.map((it) => ({
    label: `${it.name} — ${it.price}${pcur.short}`.slice(0, 90), emoji: it.emoji, value: it.id, description: (it.desc || '').slice(0, 90),
  }));
  return [
    ui.select('pshop:sel', '🔮 Chọn vật phẩm cao cấp…', opts),
    ui.row(
      ui.btn('pshop:usevoucher', 'Dùng vé đổi giới tính', 'danger', { emoji: '🎟️', disabled: (player.gender_tickets || 0) < 1 }),
      ui.btn('pshop:normal', 'Phường Thị thường', 'secondary', { emoji: '🛒' }),
    ),
  ];
}
function premiumEmbedText(player) {
  const g = { gender: [], chest: [], refine: [], pill: [], charm: [], title: [] };
  for (const it of premiumshop.PREMIUM) (g[it.cat] || (g[it.cat] = [])).push(`${it.emoji} **${it.name}** — ${pcur.emoji} ${it.price}${pcur.short}`);
  return ui.panelEmbed(CK, {
    title: '🔮 Phường Thị Cao Cấp',
    desc:
      `Vật phẩm CAO CẤP đổi bằng ${pcur.emoji} **${pcur.name}**.\n` +
      `Túi của bạn: ${pcur.emoji} **${ui.num(player.premium || 0)}**${pcur.short} · 🎟️ Vé đổi giới tính: **${player.gender_tickets || 0}**\n\n` +
      `**🎟️ Đặc biệt**\n${g.gender.join('\n')}\n\n**🎁 Rương trang bị**\n${g.chest.join('\n')}\n\n` +
      `**🔩 Tinh Thiết & 💊 Đan dược**\n${[...g.refine, ...g.pill].join('\n')}\n\n**🔨 Phù Rèn**\n${(g.charm || []).join('\n')}\n\n` +
      `**🏷️ Danh hiệu** _(đeo ở Hồ Sơ)_\n${g.title.join('\n')}`,
    footer: 'Chọn món để mua · 🎟️ Vé dùng ngay tại đây · 🏷️ Danh hiệu: mua xong qua Hồ Sơ để đeo.',
  });
}
// Phường Thị Cao Cấp = THẺ kệ RPG (đồng Tiên Ngọc tím). Lỗi render -> fallback embed text.
async function premiumMainView(player) {
  try {
    const items = premiumshop.PREMIUM.map((it) => {
      // Ảnh RIÊNG cho từng món cao cấp: pshop_<id>.png. Thiếu -> tái dùng ảnh sẵn có
      //  (Tinh Thiết / bó đan); thiếu nữa -> tile chữ.
      let uri = assets.dataUri(`pshop_${it.id}`);
      if (!uri) {
        if (it.cat === 'refine') uri = assets.dataUri('mat_refine');
        else if (it.cat === 'pill' && it.pillId) uri = assets.dataUri(`pill_${it.pillId}`);
      }
      return { name: it.name, desc: it.desc, price: String(it.price), cat: it.cat, iconDataUri: uri };
    });
    const buf = await shopCard.render({
      title: 'PHƯỜNG THỊ CAO CẤP', subtitle: 'Vật phẩm cao cấp đổi bằng Tiên Ngọc',
      walletText: `${ui.num(player.premium || 0)}${pcur.short}`, coin: 'gem', items, bgDataUri: shopCard.bgDataUri(),
    });
    const e = ui.panelEmbed(CK, {
      title: '🔮 Phường Thị Cao Cấp',
      desc: `Túi của bạn: ${pcur.emoji} **${ui.num(player.premium || 0)}**${pcur.short} · 🎟️ Vé đổi giới tính: **${player.gender_tickets || 0}** — chọn món bên dưới để mua.`,
      footer: 'Tiên Ngọc rất khó cày (Boss / Phó Bản Tổ Đội / vượt cảnh giới). 🏷️ Danh hiệu: mua xong đeo ở Hồ Sơ.',
    });
    e.setImage('attachment://pshop.png');
    return { embeds: [e], components: premiumComponents(player), files: [new AttachmentBuilder(buf, { name: 'pshop.png' })] };
  } catch (err) {
    console.error('[shopCard premium] render fail:', err && err.message);
    return { embeds: [premiumEmbedText(player)], components: premiumComponents(player) };
  }
}

function premiumItemView(player, id) {
  const it = premiumshop.get(id); if (!it) return { embeds: [premiumEmbedText(player)], components: premiumComponents(player) };
  const owned = it.cat === 'title' && db.getTitles(player).includes(it.titleId);
  const buff = it.cat === 'title' ? titles.buffText(it.titleId) : '';
  const e = ui.panelEmbed(CK, {
    title: `${it.emoji} ${it.name}`,
    desc: `${it.desc || ''}${buff ? `\n✨ **Buff khi đeo:** ${buff}` : ''}\n\nGiá: ${pcur.emoji} **${it.price}**${pcur.short}\nTúi của bạn: ${pcur.emoji} **${ui.num(player.premium || 0)}**${pcur.short}`,
    footer: owned ? 'Đã sở hữu — qua Hồ Sơ để đeo.' : (it.cat === 'title' ? 'Mua xong qua Hồ Sơ → Danh hiệu để đeo.' : 'Xác nhận mua bên dưới.'),
  });
  const canBuy = (player.premium || 0) >= it.price && !owned;
  return { embeds: [e], components: [ui.row(
    ui.btn(`pshop:buy:${id}`, owned ? 'Đã sở hữu' : `Mua (${it.price}${pcur.short})`, 'success', { disabled: !canBuy }),
    ui.btn('pshop:back', 'Về quầy cao cấp', 'secondary', { emoji: '◀️' }),
  )] };
}

// Mua 1 vật phẩm cao cấp. Trả { ok, detail } | { err, ... }.
function buyPremium(userId, id) {
  const it = premiumshop.get(id); if (!it) return { err: 'noitem' };
  const p = db.getPlayer(userId); if (!p) return { err: 'noplayer' };
  if (it.cat === 'title' && db.getTitles(p).includes(it.titleId)) return { err: 'owned' };
  const sp = db.spendPremium(userId, it.price);
  if (sp.err === 'nopremium') return { err: 'nopremium', need: it.price };
  if (sp.err) return { err: sp.err };
  let detail = '';
  if (it.cat === 'gender') { db.addGenderTickets(userId, 1); detail = '🎟️ +1 Vé Đổi Giới Tính (bấm **Dùng vé đổi giới tính** để dùng).'; }
  else if (it.cat === 'refine') { db.addRefine(userId, it.qty); detail = `🔩 +${it.qty} Tinh Thiết`; }
  else if (it.cat === 'pill') { db.addPills(userId, { [it.pillId]: it.qty }); const pi = alchemy.pillInfo(it.pillId); detail = `💊 +${it.qty} ${pi ? pi.name : it.pillId}`; }
  else if (it.cat === 'charm') { db.addForgeCharms(userId, { [it.charmId]: it.qty }); const ci = forge.charm(it.charmId); detail = `${ci ? ci.emoji : '🔨'} +${it.qty} ${ci ? ci.name : it.charmId} — dùng ở **Lò Rèn**.`; }
  else if (it.cat === 'petcharm') { db.addPetCharm(userId, it.qty); detail = `🪬 +${it.qty} Ngự Thú Phù — dùng khi **đột phá cấp Ngự Thú**.`; }
  else if (it.cat === 'title') { db.grantTitle(userId, it.titleId); detail = `🏷️ Nhận danh hiệu ${titles.label(it.titleId)} — qua **Hồ Sơ → ⚙️ Chức năng → Danh hiệu** để đeo.`; }
  else if (it.cat === 'chest') {
    const item = gear.rollDrop(p.realm, p.tier, { rarity: it.rarity, aff: p.sect || undefined });
    const r = db.addGearItem(userId, item);
    detail = r && r.item ? `🎁 ${gear.nameOf(r.item)}` : (r && r.salvaged ? `🎁 Kho đầy → tự phân giải +${r.refine}🔩` : '🎁 (lỗi rương)');
  }
  return { ok: true, item: it, detail };
}

function itemView(player, id) {
  const it = shop.get(id); if (!it) return { embeds: [mainEmbedText(player)], components: mainComponents() };
  const i = info(it); const unit = shop.priceOf(it);
  const e = ui.panelEmbed(CK, {
    title: `${i.emoji} ${i.name}`,
    desc:
      `${i.desc || ''}\n\n` +
      `Đơn giá: ${cur.emoji} **${ui.num(unit)}**${cur.short}\n` +
      `Túi của bạn: ${cur.emoji} **${ui.num(player.stones)}**${cur.short}`,
    footer: 'Chọn số lượng mua.',
  });
  const mk = (q) => ui.btn(`shop:buy:${id}:${q}`, `Mua x${q} (${ui.num(unit * q)}${cur.short})`, 'success', { disabled: player.stones < unit * q });
  return { embeds: [e], components: [ui.row(mk(1), mk(5), mk(10), ui.btn('shop:back', 'Về quầy', 'secondary', { emoji: '◀️' }))] };
}

// Mua: trừ linh thạch (raw) + cộng vật phẩm. Trả { ok, err, cost }.
function buy(userId, id, qty) {
  const it = shop.get(id); if (!it) return { err: 'noitem' };
  qty = Math.max(1, Math.min(99, qty | 0));
  const cost = shop.priceOf(it) * qty;
  const p = db.getPlayer(userId); if (!p) return { err: 'noplayer' };
  if (p.stones < cost) return { err: 'nostones', cost };
  db.addStonesRaw(userId, -cost); // trừ linh thạch (không dính nerf)
  if (it.cat === 'mat') db.addMaterials(userId, { [id]: qty });
  else if (it.cat === 'pill') db.addPills(userId, { [id]: qty });
  else if (it.cat === 'refine') db.addRefine(userId, qty);
  return { ok: true, cost, qty };
}

// =====================================================================
//  🎰 CHIÊU HỒN ĐÀI — GACHA BẮT NGỰ THÚ (GĐ25)
// =====================================================================
const GACHA_MIN_REALM = (config.pet && config.pet.minRealm) || 4;

function chieuHonView(player) {
  const g = (config.pet && config.pet.gacha) || {};
  const yhp = db.getMaterials(player).yeu_hon_phach || 0;
  const pity = player.pet_pity || 0;
  const tierStr = petbeasts.TIER_ORDER.map((t) => { const ti = petbeasts.tierInfo(t); return `${ti.emoji}${ti.name}`; }).join(' · ');
  const e = ui.panelEmbed(CK, {
    title: '🎰 Chiêu Hồn Đài — Bắt Ngự Thú',
    desc:
      `Triệu hồn yêu thú làm **bạn chiến**! Bậc: ${tierStr} _(🟡 Thần cực hiếm)_.\n\n` +
      `🌀 **Quay thường** — ${cur.emoji}${ui.num(g.ltStones)}${cur.short} + 👻${g.ltYhp} Yêu Hồn Phách _(KHÔNG pity)_\n` +
      `🔮 **Quay cao cấp** — ${pcur.emoji}${g.premiumTienngoc}${pcur.short} _(pity **${pity}/${g.pityPremium}** — đủ là CHẮC CHẮN 🟡 Thần)_\n\n` +
      `Túi: ${cur.emoji}**${ui.num(player.stones)}** · 👻**${yhp}** · ${pcur.emoji}**${player.premium || 0}**\n\n` +
      `_Trùng thú → trả về 👻 Yêu Hồn Phách. Tỉ lệ Thần cực thấp — chăm cày hoặc **mua thẳng** thú (giá cao)._`,
    footer: 'Yêu Hồn Phách farm ở Luyện Trường → Truy Tung Nhiếp Hồn.',
  });
  return { embeds: [e], components: [ui.row(
    ui.btn('gacha:roll:lt', 'Quay thường', 'success', { emoji: '🌀' }),
    ui.btn('gacha:roll:premium', 'Quay cao cấp', 'primary', { emoji: '🔮' }),
    ui.btn('gacha:buy', 'Mua thú thẳng', 'secondary', { emoji: '🛒' }),
    ui.btn('gacha:back', 'Về quầy', 'secondary', { emoji: '◀️' }),
  )] };
}

async function gachaResultView(res) {
  const ti = petbeasts.tierInfo(res.tier);
  const comps = [ui.row(
    ui.btn('gacha:roll:lt', 'Quay thường', 'success', { emoji: '🌀' }),
    ui.btn('gacha:roll:premium', 'Quay cao cấp', 'primary', { emoji: '🔮' }),
    ui.btn('gacha:open', 'Chiêu Hồn Đài', 'secondary', { emoji: '◀️' }),
  )];
  const resultLine = res.dup
    ? `🔁 **Trùng** → +👻 **${res.yhp}** Yêu Hồn Phách.`
    : '✨ **Thú mới!** Vào **Hồ Sơ → 🐉 Ngự Thú** để trang bị.';
  const pityLine = res.pityHit ? '\n🎯 *Pity kích hoạt — chắc chắn Thần Thú!*' : '';
  try {
    const buf = await petGachaCard.render({
      header: res.pityHit ? 'PITY · THẦN THÚ' : 'CHIÊU HỒN',
      name: res.beast.name, emoji: res.beast.emoji,
      tierColor: '#' + ti.color.toString(16).padStart(6, '0'), tierName: ti.name, tierEmoji: ti.emoji,
      petDataUri: assets.dataUri(`pet_${res.beast.key}`),
      sub: res.dup ? `Trùng → +👻 ${res.yhp} Yêu Hồn Phách` : 'Thú mới!',
    });
    const e = ui.panelEmbed(CK, { title: `${ti.emoji} ${res.beast.name} — ${ti.name}`, desc: `_${res.beast.lore}_\n\n${resultLine}${pityLine}`, footer: 'Quay tiếp hoặc về Chiêu Hồn Đài.' });
    e.setImage('attachment://gacha.png');
    return { embeds: [e], components: comps, files: [new AttachmentBuilder(buf, { name: 'gacha.png' })] };
  } catch (err) {
    console.error('[petGachaCard] render fail:', err && err.message);
    const e = ui.panelEmbed(CK, { title: `${ti.emoji} ${res.beast.name} — ${ti.name}`, desc: `${res.beast.emoji} **${res.beast.name}**\n_${res.beast.lore}_\n\n${resultLine}${pityLine}`, footer: 'Quay tiếp hoặc về Chiêu Hồn Đài.' });
    return { embeds: [e], components: comps };
  }
}

function petBuyView(player) {
  const pets = db.getPets(player);
  const e = ui.panelEmbed(CK, {
    title: '🛒 Mua Thú Thẳng',
    desc:
      'Mua thẳng Ngự Thú bằng linh thạch — **giá cao** (đường cày chắc ăn thay hên xui gacha):\n\n' +
      petbeasts.BEASTS.map((b) => { const ti = petbeasts.tierInfo(b.tier); return `${ti.emoji} ${b.emoji} **${b.name}** — ${cur.emoji}${ui.num(petbeasts.buyStonesOf(b))}${cur.short}${pets[b.key] ? ' ✅' : ''}`; }).join('\n') +
      `\n\nTúi: ${cur.emoji}**${ui.num(player.stones)}**${cur.short}`,
    footer: 'Chọn thú muốn mua (món đã có không hiện).',
  });
  const opts = petbeasts.BEASTS.filter((b) => !pets[b.key]).map((b) => { const ti = petbeasts.tierInfo(b.tier); return { label: `${b.name} — ${ui.num(petbeasts.buyStonesOf(b))}${cur.short}`.slice(0, 90), emoji: b.emoji, value: b.key, description: ti.name }; });
  const comps = [];
  if (opts.length) comps.push(ui.select('gacha:buysel', '🛒 Chọn thú muốn mua…', opts));
  comps.push(ui.row(ui.btn('gacha:open', 'Chiêu Hồn Đài', 'secondary', { emoji: '◀️' })));
  return { embeds: [e], components: comps };
}

async function open(interaction) {
  const p = db.getPlayer(interaction.user.id);
  if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** trước nhé.', flags: MessageFlags.Ephemeral });
  // Render thẻ ảnh có thể ~2-3s -> DEFER trước để khỏi quá hạn 3s của Discord, rồi editReply.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  return interaction.editReply(await mainView(p));
}

// Cập nhật view CÓ RENDER ẢNH (chậm): defer trước (báo Discord chờ) rồi editReply.
//  Tránh "This interaction failed" khi render thẻ vượt 3s trên host yếu.
async function updCard(interaction, viewPromise) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();
  return interaction.editReply({ ...(await viewPromise), attachments: [] });
}

module.exports = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Phường Thị — mua nguyên liệu, Tinh Thiết, đan dược.'),
  async execute(interaction) { return open(interaction); },
  buttons: {
    async panel_shop(interaction) { return open(interaction); },
    async shop(interaction) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const id = interaction.user.id;
      const upd = (v) => interaction.update({ ...v, attachments: [] }); // ảnh banner không đọng
      if (interaction.isStringSelectMenu() && action === 'sel') {
        return upd(itemView(db.getPlayer(id), interaction.values[0]));
      }
      if (action === 'back') return updCard(interaction, mainView(db.getPlayer(id)));
      if (action === 'premium') return updCard(interaction, premiumMainView(db.getPlayer(id)));
      if (action === 'buy') {
        const res = buy(id, parts[2], parseInt(parts[3], 10));
        if (res.err === 'nostones') return interaction.reply({ content: `😅 Thiếu linh thạch — cần ${cur.emoji} ${ui.num(res.cost)}${cur.short}.`, flags: MessageFlags.Ephemeral });
        if (res.err) return updCard(interaction, mainView(db.getPlayer(id)));
        const i = info(shop.get(parts[2]));
        await upd(itemView(db.getPlayer(id), parts[2]));
        return interaction.followUp({ content: `🛒 Đã mua **${i.name} ×${res.qty}** _(−${cur.emoji}${ui.num(res.cost)}${cur.short})_.`, flags: MessageFlags.Ephemeral });
      }
    },

    // --- 🎰 Chiêu Hồn Đài (gacha bắt Ngự Thú) ---
    async gacha(interaction) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const id = interaction.user.id;
      const p = db.getPlayer(id);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
      if ((p.realm || 0) < GACHA_MIN_REALM) {
        const r = cult.REALMS[GACHA_MIN_REALM];
        return interaction.reply({ content: `🔒 **Chiêu Hồn Đài** mở ở **${r.emoji} ${r.name}** (cùng Ngự Thú).`, flags: MessageFlags.Ephemeral });
      }
      const upd = (v) => interaction.update({ ...v, attachments: [] });

      if (action === 'open') return upd(chieuHonView(p));
      if (action === 'back') return updCard(interaction, mainView(p));
      if (action === 'buy') return upd(petBuyView(p));

      if (action === 'buysel' && interaction.isStringSelectMenu()) {
        const res = db.buyPetDirect(id, interaction.values[0]);
        if (res.err === 'nostones') return interaction.reply({ content: `😅 Thiếu linh thạch — cần ${cur.emoji}${ui.num(res.need)}${cur.short}.`, flags: MessageFlags.Ephemeral });
        if (res.err) return upd(petBuyView(db.getPlayer(id)));
        await upd(petBuyView(db.getPlayer(id)));
        return interaction.followUp({ content: `🎉 Đã mua **${res.beast.emoji} ${res.beast.name}** _(−${cur.emoji}${ui.num(res.cost)}${cur.short})_! Vào **Hồ Sơ → 🐉 Ngự Thú** để trang bị.`, flags: MessageFlags.Ephemeral });
      }

      if (action === 'roll') {
        const mode = parts[2] === 'premium' ? 'premium' : 'lt';
        const res = db.gachaPet(id, mode);
        if (res.err === 'nostones') return interaction.reply({ content: `😅 Thiếu linh thạch — cần ${cur.emoji}${ui.num(res.need)}${cur.short}.`, flags: MessageFlags.Ephemeral });
        if (res.err === 'noyhp') return interaction.reply({ content: `👻 Thiếu Yêu Hồn Phách — cần **${res.need}**. Farm ở **Luyện Trường → 👻 Truy Tung Nhiếp Hồn**.`, flags: MessageFlags.Ephemeral });
        if (res.err === 'nopremium') return interaction.reply({ content: `😅 Thiếu Tiên Ngọc — cần ${pcur.emoji}${res.need}${pcur.short}.`, flags: MessageFlags.Ephemeral });
        if (res.err) return upd(chieuHonView(db.getPlayer(id)));
        return updCard(interaction, gachaResultView(res));
      }
    },

    // --- Phường Thị Cao Cấp (🔮 Tiên Ngọc) ---
    async pshop(interaction) {
      const parts = interaction.customId.split(':');
      const action = parts[1];
      const id = interaction.user.id;
      const upd = (v) => interaction.update({ ...v, attachments: [] });

      // Chọn vật phẩm cao cấp.
      if (interaction.isStringSelectMenu() && action === 'sel') {
        return upd(premiumItemView(db.getPlayer(id), interaction.values[0]));
      }
      if (action === 'back') return updCard(interaction, premiumMainView(db.getPlayer(id)));
      if (action === 'normal') return updCard(interaction, mainView(db.getPlayer(id)));

      // Dùng vé đổi giới tính (toggle nam<->nữ).
      if (action === 'usevoucher') {
        const res = db.useGenderTicket(id);
        if (res.err === 'noticket') return interaction.reply({ content: '🎟️ Bạn chưa có Vé Đổi Giới Tính — mua ở Phường Thị Cao Cấp trước.', flags: MessageFlags.Ephemeral });
        await updCard(interaction, premiumMainView(db.getPlayer(id)));
        return interaction.followUp({ content: `✨ Đã đổi giới tính sang **${res.gender === 'nu' ? '♀️ Nữ' : '♂️ Nam'}** _(−1 vé)_. Ảnh Hồ Sơ sẽ cập nhật.`, flags: MessageFlags.Ephemeral });
      }

      // Mua vật phẩm cao cấp.
      if (action === 'buy') {
        const res = buyPremium(id, parts[2]);
        if (res.err === 'nopremium') return interaction.reply({ content: `😅 Thiếu Tiên Ngọc — cần ${pcur.emoji} ${ui.num(res.need)}${pcur.short}. Hạ Boss Thế Giới / Phó Bản Tổ Đội / vượt cảnh giới để tích.`, flags: MessageFlags.Ephemeral });
        if (res.err === 'owned') return interaction.reply({ content: '🏷️ Bạn đã sở hữu danh hiệu này rồi.', flags: MessageFlags.Ephemeral });
        if (res.err) return upd(await premiumMainView(db.getPlayer(id)));
        await upd(premiumItemView(db.getPlayer(id), parts[2]));
        return interaction.followUp({ content: `🔮 Đã mua **${res.item.name}** — ${res.detail} _(−${pcur.emoji}${res.item.price}${pcur.short})_.`, flags: MessageFlags.Ephemeral });
      }
    },
  },
};
