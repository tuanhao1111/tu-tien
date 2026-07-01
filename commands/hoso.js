// =====================================================================
//  /hoso — HỒ SƠ NHÂN VẬT (panel Hồ Sơ).
//  Xem mọi thứ về bản thân: cảnh giới, chỉ số combat hiệu dụng, THUỘC TÍNH
//  (cộng điểm), điểm nâng chiêu, môn phái. Tương tác: cộng điểm thuộc tính,
//  rửa điểm, quản lý/nâng cấp chiêu. Xem người khác = chỉ đọc.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, MessageFlags, AttachmentBuilder,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const sects = require('../sects');
const skills = require('../skills');
const titles = require('../titles');
const achievements = require('../achievements');
const combat = require('../combat');
const attrsLib = require('../attributes');
const guide = require('../guide');
const bicanh = require('../bicanh');
const alchemy = require('../alchemy');
const equipment = require('../equipment');
const gear = require('../gear');
const petbeasts = require('../petbeasts');
const health = require('../health');
const ui = require('../util/ui');
const assets = require('../assets'); // ảnh banner cảnh giới (tự bỏ qua nếu chưa có)
const card = require('../util/card'); // engine dựng ảnh động (Satori)
const profileCard = require('../render/profileCard'); // thẻ Hồ Sơ dạng ảnh

function sectLabel(p) {
  const s = p.sect ? sects.getSect(p.sect) : null;
  return s ? `${s.emoji} ${s.name}` : '— Tán Tu —';
}

function stagesSinceJoin(p) {
  return Math.max(0, cult.globalStage(p.realm, p.tier) - (p.sect_join_stage || 0));
}

// Build combatant hiệu dụng để hiển thị chỉ số đã cộng thuộc tính + cấp chiêu + trang bị.
function effective(p) {
  return combat.build(p.username, p.realm, p.tier, p.sect, db.getEquipped(p), {
    attrs: db.getAttributes(p),
    skillLevels: db.getSkillLevels(p),
    stagesSinceJoin: stagesSinceJoin(p),
    gearBonus: db.combatGearBonus(p),
  });
}

// Embed hồ sơ đầy đủ.
function profileEmbed(user, p) {
  const c = config.currency;
  const maxed = cult.isMaxed(p.realm, p.tier);
  const need = cult.tuViNeeded(p.realm, p.tier);
  const bar = cult.progressBar(p.tu_vi, need);
  const rank = db.rankOf(p);
  const me = effective(p);
  const attrs = db.getAttributes(p);
  const primary = p.sect ? (sects.getSect(p.sect).primaryAttrs || []) : [];

  const tuViLine = maxed
    ? '🪙 **Viên mãn đại đạo**'
    : `\`${bar}\` **${p.tu_vi}/${need}**` + (p.tu_vi >= need ? '  ⚡*(đủ để đột phá!)*' : '');
  const secLine = p.seclusion_ts ? '\n🚪 *Đang bế quan…*' : '';

  const vit = db.getVit(p);
  const vitLine = health.enabled()
    ? `\n${ui.barLine('💗', 'Sinh Mệnh', vit.cur, vit.max, 12)}${vit.wounded ? '  🩸 *Trọng thương*' : (vit.full ? '' : '  ⏳*hồi dần*')}`
    : '';
  const statLine =
    `❤️ Sinh Lực **${me.maxHp}** · ⚔️ Công **${me.base.atk}** · 🛡️ Phòng **${me.base.def}**\n` +
    `🌀 Tốc **${me.base.spd}** · 💠 Linh Lực **${me.maxMp}** · 💥 Bạo **${Math.round(me.crit * 100)}%** · 💨 Né **${Math.round(me.dodge * 100)}%**` +
    vitLine;

  const attrLine = attrsLib.ORDER.map((k) => {
    const a = attrsLib.getAttr(k);
    const star = primary.includes(k) ? '⭐' : '';
    return `${a.emoji} ${a.name}${star}: **${attrs[k] || 0}**`;
  }).join('\n');

  const pc = config.premiumCurrency;
  const titleLabel = titles.label(p.title);
  const titleBuff = titles.buffText(p.title);
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(`📜 Đạo Tịch — ${p.username}`)
    .setThumbnail(user.displayAvatarURL())
    .addFields(
      ...(titleLabel ? [{ name: '🏷️ Danh hiệu', value: `${titleLabel}${titleBuff ? ` _(✨ ${titleBuff})_` : ''}`, inline: false }] : []),
      { name: 'Cảnh giới', value: cult.realmLabel(p.realm, p.tier), inline: true },
      { name: 'Xếp hạng', value: `#${rank}`, inline: true },
      { name: `${c.name}`, value: `${p.stones}${c.short} ${c.emoji}`, inline: true },
      { name: `${pc.name}`, value: `${p.premium || 0}${pc.short} ${pc.emoji}`, inline: true },
      { name: 'Môn phái', value: sectLabel(p), inline: true },
      { name: 'Tu vi', value: tuViLine + secLine, inline: false },
      { name: '⚔️ Chỉ số chiến đấu', value: statLine, inline: false },
      { name: `🧬 Thuộc tính ${p.attr_points ? `(còn **${p.attr_points}** điểm chưa cộng)` : ''}`, value: attrLine + (primary.length ? '\n*⭐ = thuộc tính chính của phái.*' : ''), inline: false },
    )
    .setFooter({ text: `🎴 Điểm nâng chiêu: ${p.skill_points || 0} · Tiên Đồ Lộ` });

  // Trang bị nhập môn (chỉ khi đã có phái).
  if (p.sect) {
    const gearIds = db.getEquipment(p);
    const enhMap = db.getEquipEnh(p);
    const gearStr = gearIds.length
      ? gearIds.map((id) => {
          const it = equipment.itemInfo(id); if (!it) return null;
          const lv = enhMap[id] || 0;
          return `${equipment.displayName(id, lv)} _(${equipment.bonusText(equipment.effectiveBonus(id, lv))})_`;
        }).filter(Boolean).join('\n')
      : '*(chưa có — hoàn thành **nhiệm vụ nhập môn** ở panel Môn Phái để nhận)*';
    e.addFields({ name: '🛡️ Trang bị nhập môn', value: gearStr, inline: false });
  }

  // Trang bị đầy đủ (6 ô) — LIỆT KÊ từng ô đang mặc (tên = độ hiếm + biến thể +
  //  cảnh giới + bậc cường hóa) + tổng chỉ số cộng thêm.
  const equippedItems = db.getEquippedItems(p);
  if (equippedItems.length) {
    const bySlot = {};
    for (const it of equippedItems) bySlot[it.s] = it;
    const itemLines = gear.SLOTS
      .filter((s) => bySlot[s.key])
      .map((s) => { const it = bySlot[s.key]; return `${s.emoji} ${gear.nameOf(it)}`; });
    const bonus = gear.sumBonus(equippedItems, p.sect);
    const parts = [];
    for (const k of ['hp', 'atk', 'def', 'spd', 'mp', 'crit', 'dodge', 'critDmg']) {
      if (!bonus[k]) continue;
      const pct = (k === 'crit' || k === 'dodge' || k === 'critDmg');
      parts.push(`${gear.STAT_EMOJI[k]}+${pct ? Math.round(bonus[k] * 100) + '%' : bonus[k]}`);
    }
    e.addFields({
      name: `⚔️ Trang bị (${equippedItems.length}/6 ô)`,
      value: `${itemLines.join('\n')}\n**Tổng cộng thêm:** ${parts.join(' · ')}\n*Quản lý ở kênh **Trang Bị** hoặc \`/trangbi\`.*`,
      inline: false,
    });
  }
  return e;
}

// Hàng nút cộng điểm thuộc tính + thao tác (chỉ cho bản thân).
function profileComponents(p) {
  const rows = [];
  const canAlloc = (p.attr_points || 0) > 0;
  const attrRow = new ActionRowBuilder();
  for (const k of attrsLib.ORDER) {
    const a = attrsLib.getAttr(k);
    attrRow.addComponents(
      new ButtonBuilder().setCustomId(`attr_alloc:${k}`).setLabel(`${a.emoji} +1`).setStyle(ButtonStyle.Secondary).setDisabled(!canAlloc),
    );
  }
  rows.push(attrRow);

  // GIỮ nút cộng điểm (hàng trên). Các nút CHỨC NĂNG gộp vào 1 MENU CUỘN (dropdown)
  //  cho gọn — chọn 1 mục để mở. Router: 'hoso_menu' (xem buttons.hoso_menu).
  const opts = [
    { label: 'Trang bị', description: 'Kho trang bị: mặc · cường hóa · phân giải', emoji: '🛡️', value: 'trangbi' },
    { label: 'Túi đồ', description: 'Nguyên liệu (Bí Cảnh) + đan dược (Luyện Đan)', emoji: '🎒', value: 'bag' },
    { label: 'Danh hiệu', description: 'Đeo/đổi danh hiệu (cộng buff chỉ số)', emoji: '🏷️', value: 'titles' },
    { label: 'Thành tựu', description: 'Xem & lãnh thưởng thành tựu (🔮 Tiên Ngọc)', emoji: '🏆', value: 'achievements' },
    { label: 'Rửa điểm thuộc tính', description: `Hoàn toàn bộ điểm về quỹ (tốn ${config.attributes.respecCost}${config.currency.short})`, emoji: '♻️', value: 'respec' },
  ];
  if (p.sect) {
    opts.splice(2, 0, { label: 'Quản lý chiêu', description: 'Xem & trang bị tối đa 3 chiêu chủ động', emoji: '🎴', value: 'skill' });
  }
  // Ngự Thú: quản lý ngay trong Hồ Sơ (mở ở Nguyên Anh).
  if ((p.realm || 0) >= ((config.pet && config.pet.minRealm) || 4)) {
    opts.splice(p.sect ? 4 : 3, 0, { label: 'Ngự Thú', description: 'Thu phục & nuôi bạn chiến (dùng cả PvE lẫn PvP)', emoji: '🐉', value: 'nguthu' });
  }
  // Thần Thông: tu luyện Nguyên Thần ngay trong Hồ Sơ (mở ở Hóa Thần).
  if ((p.realm || 0) >= ((config.thanthong && config.thanthong.minRealm) || 5)) {
    opts.push({ label: 'Thần Thông', description: 'Tu Nguyên Thần & vận Thần Thông (PvE + PvP)', emoji: '👁️', value: 'thanthong' });
  }
  if (health.enabled()) {
    const vit = db.getVit(p);
    if (!vit.full) {
      opts.push({ label: 'Liệu Thương', description: `Hồi đầy Sinh Mệnh (${health.restCost(p.realm, p.tier)}${config.currency.short})`, emoji: '💗', value: 'heal' });
    }
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('hoso_menu')
    .setPlaceholder('⚙️ Chức năng — chọn để mở…')
    .addOptions(opts);
  rows.push(new ActionRowBuilder().addComponents(menu));
  return rows;
}

// --- Cẩm nang hướng dẫn (mở từ Hồ Sơ) ---
function guideView(sectionId) {
  const sec = guide.getSection(sectionId) || guide.firstSection();
  const e = new EmbedBuilder()
    .setColor(config.colors.info)
    .setTitle(sec.title)
    .setDescription(sec.body)
    .setFooter({ text: 'Cẩm Nang Tiên Đồ Lộ · chọn mục khác bên dưới' });
  const menu = new StringSelectMenuBuilder()
    .setCustomId('guide_sec')
    .setPlaceholder('📖 Chọn mục hướng dẫn…')
    .addOptions(guide.SECTIONS.map((s) => ({ label: s.label, emoji: s.emoji, value: s.id, default: s.id === sec.id })));
  return { embeds: [e], components: [new ActionRowBuilder().addComponents(menu)] };
}

// --- Danh hiệu: xem sở hữu + đeo/bỏ (chuyển từ shop sang Hồ Sơ). Đeo = cộng buff. ---
function titlesManageView(player) {
  const owned = db.getTitles(player);
  const active = player.title;
  const lines = owned.length
    ? owned.map((tid) => {
        const t = titles.get(tid);
        const bt = titles.buffText(tid);
        return `${t ? t.emoji : '🏷️'} **${t ? t.name : tid}**${tid === active ? ' ✅ *(đang đeo)*' : ''}` +
          `${t && t.desc ? `\n   _${t.desc}_` : ''}${bt ? `\n   ✨ **Buff:** ${bt}` : ''}`;
      })
    : ['*(Chưa có danh hiệu nào — mua ở **Phường Thị Cao Cấp** hoặc đạt **Thành Tựu** để nhận.)*'];
  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('🏷️ Danh Hiệu Của Bạn')
    .setDescription(`Đang đeo: **${titles.label(active) || '— không đeo —'}**\n\n${lines.join('\n\n')}`)
    .setFooter({ text: 'Đeo danh hiệu để hiện trên Hồ Sơ & Bảng Xếp Hạng + cộng buff chỉ số.' });
  const comps = [];
  if (owned.length) {
    const opts = owned.map((tid) => {
      const t = titles.get(tid);
      return { label: (t ? t.name : tid).slice(0, 90), emoji: t ? t.emoji : undefined, value: tid, description: (titles.buffText(tid) || (t && t.desc) || '').slice(0, 90), default: tid === active };
    });
    comps.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('title_wear').setPlaceholder('🏷️ Chọn danh hiệu để đeo…').addOptions(opts),
    ));
    comps.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('title_off').setLabel('🚫 Bỏ đeo').setStyle(ButtonStyle.Secondary),
    ));
  }
  return { embeds: [e], components: comps };
}

// --- Thành tựu: danh sách + lãnh thưởng (🔮 Tiên Ngọc / danh hiệu). ---
function achievementsView(player) {
  const st = achievements.statusFor(player, db.getAchievements(player));
  const claimedCnt = st.filter((s) => s.claimed).length;
  const lines = st.map((s) => {
    const a = s.a;
    const icon = s.claimed ? '✅' : s.claimable ? '🎁' : (s.done ? '✔️' : '🔒');
    const bar = cult.progressBar(s.cur, a.goal, 10);
    const prog = a.goal > 1 ? ` \`${bar}\` ${s.cur}/${a.goal}` : '';
    const status = s.claimed ? ' *(đã lãnh)*' : s.claimable ? ' **— SẴN SÀNG LÃNH!**' : '';
    return `${icon} ${a.emoji} **${a.name}** — ${a.desc}${prog}\n   🎁 ${achievements.rewardText(a.reward)}${status}`;
  });
  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`🏆 Thành Tựu — ${player.username}`)
    .setDescription(`Đã hoàn thành: **${claimedCnt}/${st.length}**\n\n${lines.join('\n\n')}`)
    .setFooter({ text: 'Đạt mốc rồi bấm nút bên dưới để lãnh 🔮 Tiên Ngọc (+ danh hiệu nếu có).' });

  // Nút lãnh: chỉ cho thành tựu SẴN SÀNG (tối đa 25 nút / 5 hàng).
  const btns = st.filter((s) => s.claimable).slice(0, 25).map((s) =>
    new ButtonBuilder().setCustomId(`ach_claim:${s.a.id}`).setLabel(`🎁 ${s.a.name}`.slice(0, 80)).setStyle(ButtonStyle.Success));
  const components = [];
  for (let i = 0; i < btns.length && components.length < 5; i += 5) {
    components.push(new ActionRowBuilder().addComponents(btns.slice(i, i + 5)));
  }
  return { embeds: [e], components };
}

// --- Túi đồ: nguyên liệu (Bí Cảnh) + đan dược (Luyện Đan) ---
function bagLine(map, infoFn) {
  const parts = Object.entries(map).filter(([, q]) => q > 0)
    .map(([id, q]) => { const i = infoFn(id); return i ? `${i.emoji} ${i.name} ×${q}` : null; })
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
function bagView(player) {
  const mats = db.getMaterials(player);
  const pills = db.getPills(player);
  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`🎒 Túi Đồ — ${player.username}`)
    .addFields(
      { name: '🧪 Nguyên liệu', value: bagLine(mats, bicanh.materialInfo) || '*(trống — đi `/bicanh` gom nguyên liệu)*' },
      { name: '💊 Đan dược', value: bagLine(pills, alchemy.pillInfo) || '*(chưa có đan — `/luyendan` để chế)*' },
    )
    .setFooter({ text: 'Chọn 1 vật phẩm bên dưới để xem chi tiết & hình ảnh.' });
  const files = assets.misc(e, 'bag', 'image'); // banner túi đồ (tự bỏ qua nếu chưa có)

  // Select xem chi tiết: gộp nguyên liệu + đan đang SỞ HỮU (value 'mat:id' / 'pill:id').
  const opts = [];
  for (const [id, q] of Object.entries(mats)) { if (q <= 0) continue; const i = bicanh.materialInfo(id); if (i) opts.push({ label: `${i.name} ×${q}`.slice(0, 90), emoji: i.emoji, value: `mat:${id}` }); }
  for (const [id, q] of Object.entries(pills)) { if (q <= 0) continue; const i = alchemy.pillInfo(id); if (i) opts.push({ label: `${i.name} ×${q}`.slice(0, 90), emoji: i.emoji, value: `pill:${id}` }); }
  const components = opts.length ? [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('bag_item').setPlaceholder('🔍 Xem chi tiết vật phẩm…').addOptions(opts.slice(0, 25)),
  )] : [];
  return { embeds: [e], components, files };
}

// Chi tiết 1 vật phẩm túi đồ (nguyên liệu/đan) — kèm ảnh + CHỈ SỐ/CÔNG DỤNG.
function bagItemView(player, kind, id) {
  const info = kind === 'mat' ? bicanh.materialInfo(id) : alchemy.pillInfo(id);
  if (!info) return bagView(player);
  const qty = (kind === 'mat' ? db.getMaterials(player) : db.getPills(player))[id] || 0;
  const detail = [];

  if (kind === 'pill') {
    if (info.kind === 'tuvi') {
      const gain = Math.round((info.pctNeed || 0) * cult.tuViNeeded(player.realm, player.tier));
      detail.push(`🍶 **Loại:** Đan Tu Vi — uống tức thì **+${Math.round((info.pctNeed || 0) * 100)}%** tu vi cần (≈ **+${gain}** ở cảnh giới hiện tại).`);
    } else if (info.kind === 'tribulation') {
      detail.push(`🛡️ **Loại:** Đan Độ Kiếp — tự dùng khi vượt cảnh giới, **+${Math.round((info.rateBonus || 0) * 100)}%** tỉ lệ thành công.`);
    }
    detail.push(`⭐ Phẩm cấp: **${info.tier}**`);
    const r = alchemy.RECIPES[id];
    if (r) {
      const cost = Object.entries(r.cost).map(([m, q]) => `${(bicanh.materialInfo(m) || {}).emoji || ''}${q}`).join(' ');
      const rm = cult.REALMS[r.minRealm];
      detail.push(`🔥 **Đan phương:** ${cost} + ${config.currency.emoji}${r.stoneCost} _(mở ${rm ? rm.emoji + ' ' + rm.name : '?'}, tỉ lệ nền ${Math.round(r.baseSuccess * 100)}%)_`);
    }
  } else { // nguyên liệu
    detail.push(`⭐ Phẩm cấp: **${info.tier}**`);
    if (id === (config.farm.linhDien.seedId || 'linh_chung')) {
      detail.push('🌱 **Công dụng:** gieo ở **Linh Điền** (panel Tu Luyện) để thu Linh Thảo.');
    }
    const uses = Object.entries(alchemy.RECIPES).filter(([, r]) => r.cost && r.cost[id])
      .map(([pid]) => { const pi = alchemy.pillInfo(pid); return pi ? `${pi.emoji} ${pi.name}` : null; }).filter(Boolean);
    if (uses.length) detail.push(`🔥 **Luyện được:** ${uses.join(' · ')}`);
  }

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`${info.emoji} ${info.name}`)
    .setDescription(`_${info.desc || ''}_\n\n${detail.join('\n')}\n\n📦 Đang có: **${qty}**`)
    .setFooter({ text: kind === 'mat' ? 'Nguyên liệu — mang đi /luyendan chế đan.' : 'Đan dược — uống/dùng ở /luyendan hoặc khi độ kiếp.' });
  const files = assets.misc(e, `${kind === 'mat' ? 'mat' : 'pill'}_${id}`, 'image');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('bag_back').setLabel('◀️ Về túi đồ').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [e], components: [row], files };
}

// Gom DATA THUẦN cho thẻ ảnh Hồ Sơ (từ player + chỉ số hiệu dụng).
const hexColor = (n) => '#' + Number(n || 0).toString(16).padStart(6, '0');

async function profileCardData(user, p) {
  const me = effective(p);
  const nf = (n) => Number(n || 0).toLocaleString('vi-VN');
  const pctOf = (x) => Math.round((x || 0) * 100) + '%';
  let avatarDataUri = null;
  try { avatarDataUri = await card.fetchImageDataUri(user.displayAvatarURL({ extension: 'png', size: 256 })); } catch (_) { /* bỏ avatar */ }

  // --- 6 ô trang bị (slot -> món đang mặc -> icon + màu độ hiếm) ---
  const rarities = (config.gear && config.gear.rarities) || {};
  const bySlot = {};
  for (const it of db.getEquippedItems(p)) bySlot[it.s] = it;
  const slots = gear.SLOTS.map((s) => {
    const it = bySlot[s.key];
    const rar = it ? rarities[it.r] : null;
    return {
      emoji: s.emoji,
      filled: !!it,
      // Ảnh icon: thử art riêng theo id món (nếu có) -> LÙI về art theo ô×độ hiếm -> null (emoji).
      icon: it ? ((it.id && assets.dataUri(`gear_${it.id}`)) || assets.dataUri(`gear_${s.key}_${it.r}`)) : null,
      enhance: it ? (it.e || 0) : 0,
      rarityColor: rar ? hexColor(rar.color) : null,
      rarityName: rar ? rar.name : null,
    };
  });
  const armorTier = bySlot.armor ? bySlot.armor.r : null; // cho biến thể ảnh theo giáp

  // --- Chiêu thức & đồng hành: nội tại (bị động phái) + chiêu chủ động đang trang bị
  //  + Ngự Thú đang theo + Thần Thông đang vận. Icon = ảnh; thiếu -> fallback emoji.
  //  type: 'passive'(nội tại) | 'active'(chiêu) | 'pet'(thú) | 'thanthong' -> màu ô khác nhau.
  const skillData = [];
  const passive = p.sect ? skills.passiveForSect(p.sect) : null;
  if (passive) skillData.push({ icon: assets.dataUri(`skill_${passive.id}`), emoji: passive.emoji || '🔰', type: 'passive' });
  for (const id of db.getEquipped(p).slice(0, 3)) {
    const s = skills.getSkill(id);
    skillData.push({ icon: assets.dataUri(`skill_${id}`), emoji: s ? s.emoji : '🎴', type: 'active' });
  }
  // Ngự Thú đang theo (đòn phụ) — ô riêng màu cam.
  const activePet = db.getActivePet(p);
  if (activePet) skillData.push({ icon: assets.dataUri(petbeasts.imageKey(activePet.key, activePet.lv)), emoji: activePet.beast.emoji, type: 'pet' });
  // Thần Thông đang vận (GĐ25 — Hóa Thần): thêm ô type:'thanthong' khi build xong.
  for (const t of (db.getActiveThanThong ? db.getActiveThanThong(p) : [])) {
    skillData.push({ icon: assets.dataUri(`thanthong_${t.id}`), emoji: t.emoji || '👁️', type: 'thanthong' });
  }

  // --- Bảng thuộc tính 2 cột con: [chỉ số chiến đấu] | [thuộc tính cộng điểm] ---
  const statCol0 = [
    { icon: '❤️', label: 'Sinh Lực', value: nf(me.maxHp) },
    { icon: '💠', label: 'Linh Lực', value: nf(me.maxMp) },
    { icon: '⚔️', label: 'Lực Sát', value: nf(me.base.atk) },
    { icon: '🛡️', label: 'Phòng Ngự', value: nf(me.base.def) },
    { icon: '🌀', label: 'Tốc Độ', value: nf(me.base.spd) },
    { icon: '💥', label: 'Bạo Kích', value: pctOf(me.crit) },
    { icon: '🔥', label: 'ST Bạo', value: pctOf(me.critDmg) },
    { icon: '💨', label: 'Né Tránh', value: pctOf(me.dodge) },
  ];
  const attrs = db.getAttributes(p);
  const primary = p.sect ? (sects.getSect(p.sect).primaryAttrs || []) : [];
  const statCol1 = attrsLib.ORDER.map((k) => {
    const a = attrsLib.getAttr(k);
    return { icon: a.emoji, label: a.name + (primary.includes(k) ? ' ⭐' : ''), value: nf(attrs[k] || 0) };
  });
  if ((p.attr_points || 0) > 0) statCol1.push({ icon: '✨', label: 'Điểm dư', value: nf(p.attr_points), color: '#9be15d' });
  if ((p.skill_points || 0) > 0) statCol1.push({ icon: '🎴', label: 'Điểm chiêu', value: nf(p.skill_points), color: '#9be15d' });

  const rank = db.rankOf(p);
  return {
    name: p.username,
    title: cult.realmLabel(p.realm, p.tier),
    titleBadge: titles.label(p.title), // danh hiệu đang đeo (rỗng nếu không có)
    stones: nf(p.stones), currencyShort: config.currency.short,
    subInfo: [`🏯 ${sectLabel(p)}`, `🏅 Xếp hạng: #${rank}`],
    avatarDataUri,
    charDataUri: profileCard.charDataUri(p.realm, p.gender, armorTier),
    slots,
    skills: skillData,
    statCols: [statCol0, statCol1],
    bgDataUri: profileCard.bgDataUri(),
  };
}

// Payload Hồ Sơ: cố render THẺ ẢNH (Satori) làm ảnh chính; lỗi -> fallback banner.
//  opts.interactive=false -> xem người khác (không gắn nút thao tác).
async function profileView(user, p, opts = {}) {
  const interactive = opts.interactive !== false;
  const e = profileEmbed(user, p);
  const components = interactive ? profileComponents(p) : [];
  try {
    const buf = await profileCard.render(await profileCardData(user, p));
    e.setImage('attachment://profile.png');
    return { embeds: [e], components, files: [new AttachmentBuilder(buf, { name: 'profile.png' })] };
  } catch (err) {
    // Render lỗi -> KHÔNG sập: quay về banner cảnh giới tĩnh như cũ.
    console.error('[profileCard] render fail:', err && err.message);
    const files = assets.realm(e, p.realm, 'image');
    return { embeds: [e], components, files };
  }
}

// --- Quản lý / nâng cấp chiêu ---
function skillView(user, p) {
  const sect = sects.getSect(p.sect);
  const qStage = db.getSectQuestStage(p);
  const unlocked = skills.unlockedActivesForSect(sect.id, p.realm, qStage);
  const unlockedIds = new Set(unlocked.map((s) => s.id));
  const locked = skills.activesForSect(sect.id).filter((s) => !unlockedIds.has(s.id));
  const levels = db.getSkillLevels(p);
  const max = config.skills.maxLevel;

  const lines = unlocked.map((s) => {
    const lv = levels[s.id] || 0;
    return `${s.emoji} **${s.name}** — ⭐ **${lv}/${max}**\n   ${s.desc}`;
  });
  for (const s of locked) {
    // Tuyệt kỹ -> mở theo cảnh giới; chiêu cơ bản -> mở qua nhiệm vụ nhập môn.
    if (skills.unlockRealmOf(s) > 2) {
      const r = cult.REALMS[skills.unlockRealmOf(s)];
      lines.push(`🔒 ${s.emoji} **${s.name}** _(tuyệt kỹ — mở ở ${r ? r.emoji + ' ' + r.name : '?'})_`);
    } else {
      lines.push(`🔒 ${s.emoji} **${s.name}** _(mở qua **nhiệm vụ nhập môn** ở Môn Phái)_`);
    }
  }

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`🎴 Quản Lý Chiêu — ${sect.emoji} ${sect.name}`)
    .setDescription(
      `Điểm nâng chiêu: **${p.skill_points || 0}** _(nhận khi **độ kiếp** thành công)_\n` +
      `Mỗi cấp: +${Math.round(config.skills.levelPowerStep * 100)}% sát thương/DoT, giảm hồi chiêu.\n\n` +
      lines.join('\n\n'),
    )
    .setFooter({ text: 'Chọn 1 chiêu để xem chi tiết & hình ảnh · nâng cấp · đổi loadout ở /kynang' });

  const rows = [];
  // Select xem chi tiết từng chiêu (kèm ảnh) — gồm cả tuyệt kỹ đã mở.
  if (unlocked.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('skill_view').setPlaceholder('🔍 Xem chi tiết chiêu…')
        .addOptions(unlocked.slice(0, 25).map((s) => ({ label: `${s.name} (⭐${levels[s.id] || 0}/${max})`.slice(0, 90), emoji: s.emoji, value: s.id }))),
    ));
  }
  const upRow = new ActionRowBuilder();
  const canUp = (p.skill_points || 0) > 0;
  for (const s of unlocked.slice(0, 5)) {
    const lv = levels[s.id] || 0;
    upRow.addComponents(
      new ButtonBuilder().setCustomId(`skill_up:${s.id}`).setLabel(`⬆️ ${s.name}`.slice(0, 80))
        .setStyle(ButtonStyle.Success).setDisabled(!canUp || lv >= max),
    );
  }
  if (upRow.components.length) rows.push(upRow);
  return { embeds: [e], components: rows };
}

// Chi tiết 1 chiêu (kèm ảnh skill_<id>) + nút nâng cấp / quay lại.
function skillDetailView(p, skillId) {
  const sk = skills.getSkill(skillId);
  if (!sk) return skillView(null, p);
  const lv = (db.getSkillLevels(p))[skillId] || 0;
  const max = config.skills.maxLevel;
  const step = config.skills.levelPowerStep;
  // Tóm tắt thông số chiêu.
  const stat = [];
  if (sk.mp) stat.push(`💠 Linh lực ${sk.mp}`);
  if (sk.cd) stat.push(`⏳ Hồi ${sk.cd} lượt`);
  if (sk.power) stat.push(`⚔️ Sát thương ×${sk.power.toFixed(2)}${sk.hits > 1 ? ` (${sk.hits} đòn)` : ''}`);
  if (sk.dot) stat.push(`☣️ DoT ×${sk.dot.mult.toFixed(2)}/${sk.dot.turns} lượt`);
  if (sk.heal) stat.push(`💚 Hồi ${Math.round(sk.heal * 100)}% máu`);
  if (sk.shield) stat.push(`🧱 Khiên ${Math.round(sk.shield * 100)}% máu`);
  if (sk.lifesteal) stat.push(`🩸 Hút máu ${Math.round(sk.lifesteal * 100)}%`);
  if (sk.buff) stat.push(`⬆️ Tăng ${String(sk.buff.stat).toUpperCase()} ${Math.round((sk.buff.mult - 1) * 100)}%`);
  if (sk.debuff) stat.push(`⬇️ Giảm ${String(sk.debuff.stat).toUpperCase()} ${Math.round((1 - sk.debuff.mult) * 100)}%`);

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`${sk.emoji} ${sk.name}  ⭐ ${lv}/${max}`)
    .setDescription(
      `${sk.desc || ''}\n\n` +
      (stat.length ? `**Thông số:** ${stat.join(' · ')}\n` : '') +
      (lv > 0 ? `_(đã nâng: +${Math.round(step * lv * 100)}% sát thương/DoT)_` : ''),
    )
    .setFooter({ text: `Điểm nâng chiêu: ${p.skill_points || 0} · trang bị loadout ở /kynang` });
  const files = assets.skill(e, skillId, 'image'); // ảnh skill_<id> (dưới cùng)
  const canUp = (p.skill_points || 0) > 0 && lv < max;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`skill_up:${skillId}`).setLabel(canUp ? `⬆️ Nâng cấp (+1)` : (lv >= max ? '✨ Tối đa' : '⬆️ Nâng cấp')).setStyle(ButtonStyle.Success).setDisabled(!canUp),
    new ButtonBuilder().setCustomId('skill_back').setLabel('◀️ Về danh sách').setStyle(ButtonStyle.Secondary),
  );
  return { embeds: [e], components: [row], files };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hoso')
    .setDescription('Xem hồ sơ tu tiên của bản thân hoặc đạo hữu khác.')
    .addUserOption((o) =>
      o.setName('ai').setDescription('Xem hồ sơ của đạo hữu nào (bỏ trống = xem mình)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('ai') || interaction.user;
    const isSelf = target.id === interaction.user.id;
    const p = db.getPlayer(target.id);
    if (!p) {
      return interaction.reply({
        content: `${isSelf ? 'Đạo hữu' : `**${target.username}**`} chưa nhập đạo tu tiên. ${isSelf ? 'Gõ `/batdau` để bắt đầu!' : ''}`,
        flags: MessageFlags.Ephemeral,
      });
    }
    // Render thẻ ảnh ~2-3s -> DEFER trước cho khỏi quá hạn 3s, rồi editReply.
    if (isSelf) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return interaction.editReply(await profileView(target, p));
    }
    // Xem người khác: chỉ đọc, không nút.
    await interaction.deferReply();
    return interaction.editReply(await profileView(target, p, { interactive: false }));
  },

  buttons: {
    // Panel Hồ Sơ: mở hồ sơ ẩn của chính người bấm.
    async panel_profile(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) {
        return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" trước nhé.', flags: MessageFlags.Ephemeral });
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      return interaction.editReply(await profileView(interaction.user, p));
    },

    // Menu CUỘN chức năng ở Hồ Sơ: chuyển hướng tới handler tương ứng (giữ logic cũ).
    async hoso_menu(interaction) {
      const v = interaction.values[0];
      if (v === 'titles') { // quản lý danh hiệu (chuyển từ shop sang Hồ Sơ)
        const p = db.getPlayer(interaction.user.id);
        if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
        return interaction.reply({ ...titlesManageView(p), flags: MessageFlags.Ephemeral });
      }
      if (v === 'achievements') { // bảng thành tựu + lãnh thưởng
        const p = db.getPlayer(interaction.user.id);
        if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
        return interaction.reply({ ...achievementsView(p), flags: MessageFlags.Ephemeral });
      }
      const route = { respec: 'attr_respec', skill: 'skill_open', trangbi: 'panel_trangbi', bag: 'bag_open', heal: 'heal_rest', nguthu: 'panel_nguthu', thanthong: 'panel_thanthong' }[v];
      const h = route && interaction.client.buttons.get(route);
      if (h) return h(interaction);
      return interaction.deferUpdate().catch(() => {});
    },

    // Đeo danh hiệu (đổi đang đeo) — cập nhật ngay bảng danh hiệu.
    async title_wear(interaction) {
      db.setActiveTitle(interaction.user.id, interaction.values[0]);
      return interaction.update(titlesManageView(db.getPlayer(interaction.user.id)));
    },
    // Bỏ đeo danh hiệu.
    async title_off(interaction) {
      db.setActiveTitle(interaction.user.id, null);
      return interaction.update(titlesManageView(db.getPlayer(interaction.user.id)));
    },

    // Lãnh thưởng 1 thành tựu (chỉ khi đủ điều kiện & chưa lãnh).
    async ach_claim(interaction) {
      const achId = interaction.customId.split(':')[1];
      const userId = interaction.user.id;
      const p = db.getPlayer(userId);
      if (!p) return interaction.reply({ content: 'Đạo hữu chưa nhập đạo!', flags: MessageFlags.Ephemeral });
      const a = achievements.get(achId);
      const st = a && achievements.statusFor(p, db.getAchievements(p)).find((s) => s.a.id === achId);
      if (!st || !st.claimable) return interaction.update(achievementsView(p)); // hết hạn/đã lãnh -> refresh
      const r = a.reward || {};
      const got = [];
      if (r.premium) { db.addPremium(userId, r.premium); got.push(`🔮 +${r.premium} Tiên Ngọc`); }
      if (r.stones) { db.addStonesRaw(userId, r.stones); got.push(`💰 +${r.stones} linh thạch`); }
      let titleNote = '';
      if (r.title) { const newly = db.grantTitle(userId, r.title); got.push(`🏷️ ${titles.label(r.title)}`); if (newly) titleNote = ' — vào mục **Danh hiệu** để đeo'; }
      db.markAchievement(userId, achId);
      await interaction.update(achievementsView(db.getPlayer(userId)));
      return interaction.followUp({ content: `🏆 Lãnh thành tựu **${a.name}**: ${got.join(' · ')}${titleNote}.`, flags: MessageFlags.Ephemeral });
    },

    async attr_alloc(interaction) {
      const key = interaction.customId.split(':')[1];
      const res = db.allocateAttr(interaction.user.id, key, 1);
      if (res.err === 'nopoints') {
        return interaction.reply({ content: '😅 Hết điểm thuộc tính rồi! Đột phá để nhận thêm.', flags: MessageFlags.Ephemeral });
      }
      // DEFER trước (render thẻ chậm) rồi editReply thay ảnh sạch.
      await interaction.deferUpdate();
      const p = db.getPlayer(interaction.user.id);
      return interaction.editReply({ ...(await profileView(interaction.user, p)), attachments: [] });
    },

    async attr_respec(interaction) {
      const res = db.respecAttrs(interaction.user.id);
      if (res.err === 'empty') {
        return interaction.reply({ content: 'Đạo hữu chưa cộng điểm nào để rửa 😅', flags: MessageFlags.Ephemeral });
      }
      if (res.err === 'nostones') {
        return interaction.reply({ content: `😅 Không đủ linh thạch! Rửa điểm tốn ${config.currency.emoji} **${res.cost}${config.currency.short}**.`, flags: MessageFlags.Ephemeral });
      }
      await interaction.deferUpdate();
      const p = db.getPlayer(interaction.user.id);
      await interaction.editReply({ ...(await profileView(interaction.user, p)), attachments: [] });
      return interaction.followUp({ content: `♻️ Đã rửa **${res.refunded}** điểm về quỹ.`, flags: MessageFlags.Ephemeral });
    },

    // Liệu Thương: hồi đầy Sinh Mệnh, tốn linh thạch.
    async heal_rest(interaction) {
      const res = db.restHeal(interaction.user.id);
      if (res.err === 'full') return interaction.reply({ content: '💗 Sinh Mệnh đã đầy rồi, không cần liệu thương.', flags: MessageFlags.Ephemeral });
      if (res.err === 'nostones') return interaction.reply({ content: `😅 Không đủ linh thạch! Liệu thương tốn ${config.currency.emoji} **${res.cost}${config.currency.short}**.`, flags: MessageFlags.Ephemeral });
      if (res.err) return interaction.reply({ content: 'Không liệu thương được lúc này.', flags: MessageFlags.Ephemeral });
      await interaction.deferUpdate();
      const p = db.getPlayer(interaction.user.id);
      await interaction.editReply({ ...(await profileView(interaction.user, p)), attachments: [] });
      return interaction.followUp({ content: `💗 Đã liệu thương — Sinh Mệnh hồi đầy! _(tốn ${config.currency.emoji} ${res.cost}${config.currency.short})_`, flags: MessageFlags.Ephemeral });
    },

    async skill_open(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p || !p.sect) {
        return interaction.reply({ content: '🏯 Chưa có môn phái thì chưa có chiêu để quản lý.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...skillView(interaction.user, p), flags: MessageFlags.Ephemeral });
    },

    // Cẩm nang hướng dẫn — mở mục đầu (ai cũng xem được, kể cả chưa nhập đạo).
    async guide_open(interaction) {
      return interaction.reply({ ...guideView(guide.firstSection().id), flags: MessageFlags.Ephemeral });
    },
    async guide_sec(interaction) {
      const id = interaction.values[0];
      return interaction.update(guideView(id));
    },

    // Túi đồ — nguyên liệu + đan dược của chính người bấm.
    async bag_open(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) {
        return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" trước nhé.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...bagView(p), flags: MessageFlags.Ephemeral });
    },
    // Chọn xem chi tiết 1 vật phẩm túi đồ (kèm ảnh).
    async bag_item(interaction) {
      const [kind, id] = interaction.values[0].split(':');
      const p = db.getPlayer(interaction.user.id);
      if (!p) return;
      return interaction.update({ ...bagItemView(p, kind, id), attachments: [] });
    },
    async bag_back(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) return;
      return interaction.update({ ...bagView(p), attachments: [] });
    },
    // Chọn xem chi tiết 1 chiêu (kèm ảnh).
    async skill_view(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p || !p.sect) return;
      return interaction.update({ ...skillDetailView(p, interaction.values[0]), attachments: [] });
    },
    async skill_back(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p || !p.sect) return;
      return interaction.update({ ...skillView(interaction.user, p), attachments: [] });
    },

    async skill_up(interaction) {
      const skillId = interaction.customId.split(':')[1];
      const res = db.upgradeSkill(interaction.user.id, skillId);
      if (res.err) {
        const msg = {
          nopoints: '😅 Hết điểm nâng chiêu! Độ kiếp (vượt cảnh giới) để nhận thêm.',
          maxed: 'Chiêu này đã đạt cấp tối đa rồi! ⭐',
          locked: 'Chiêu này chưa mở khóa.',
          notyours: 'Chiêu này không thuộc phái của bạn.',
          nostones: `Không đủ linh thạch (cần ${res.cost}${config.currency.short}).`,
        }[res.err] || 'Không nâng được chiêu này.';
        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
      const p = db.getPlayer(interaction.user.id);
      // Sau khi nâng -> hiện màn CHI TIẾT chiêu (cấp mới + ảnh). attachments:[] để ảnh sạch.
      return interaction.update({ ...skillDetailView(p, skillId), attachments: [] });
    },
  },
};
