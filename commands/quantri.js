// =====================================================================
//  /quantri (ADMIN) — bảng điều khiển quản trị game đầy đủ chức năng.
//  Sửa trực tiếp dữ liệu tu sĩ: linh thạch, tu vi, cảnh giới, điểm thuộc
//  tính/nâng chiêu, nguyên liệu, đan, trang bị, môn phái, điểm PvP, reset
//  cooldown, xóa người chơi. Quyền: role admin HOẶC Manage Guild.
//  KHÔNG bị khóa theo kênh (dùng được mọi nơi). Phản hồi ẩn (ephemeral).
// =====================================================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const sects = require('../sects');
const bicanh = require('../bicanh');
const alchemy = require('../alchemy');
const equipment = require('../equipment');
const gear = require('../gear');
const attrsLib = require('../attributes');
const pvp = require('../pvp');
const { isAdmin } = require('../util/admin');

const cur = config.currency;

// --- Choices dựng sẵn từ dữ liệu game ---
const MAT_CHOICES = Object.entries(bicanh.MATERIALS).map(([id, m]) => ({ name: `${m.emoji} ${m.name}`, value: id }));
const PILL_CHOICES = alchemy.ORDER.map((id) => { const p = alchemy.pillInfo(id); return { name: `${p.emoji} ${p.name}`, value: id }; });
const SECT_CHOICES = sects.allSects().map((s) => ({ name: `${s.emoji} ${s.name}`, value: s.id }));
const ATTR_CHOICES = attrsLib.ORDER.map((k) => { const a = attrsLib.getAttr(k); return { name: `${a.emoji} ${a.name}`, value: k }; });
// Choices cho /quantri capdo (hệ trang bị đầy đủ 6 ô).
const SLOT_CHOICES = gear.SLOTS.map((s) => ({ name: `${s.emoji} ${s.name}`, value: s.key }));
const RARITY_CHOICES = gear.RARITY_ORDER.map((k) => { const r = gear.rarity(k); return { name: `${r.emoji} ${r.name}`, value: k }; });
const VARIANT_CHOICES = gear.VARIANT_KEYS.map((k) => { const v = gear.VARIANTS[k]; return { name: `${v.emoji} ${v.name}`, value: k }; });

const ok = (msg) => ({ embeds: [new EmbedBuilder().setColor(config.colors.success).setDescription(`✅ ${msg}`)] , flags: MessageFlags.Ephemeral });
const err = (msg) => ({ content: `⚠️ ${msg}`, flags: MessageFlags.Ephemeral });

// Lấy người chơi mục tiêu (option 'nguoi'); báo lỗi nếu chưa nhập đạo.
function target(interaction) {
  const user = interaction.options.getUser('nguoi');
  const p = user ? db.getPlayer(user.id) : null;
  return { user, p };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quantri')
    .setDescription('[Admin] Bảng quản trị game: chỉnh dữ liệu tu sĩ.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('xem').setDescription('Xem chi tiết dữ liệu một tu sĩ.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ cần xem').setRequired(true)))
    .addSubcommand((s) => s.setName('linhthach').setDescription('Cấp/trừ linh thạch (số âm = trừ).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('tuvi').setDescription('Cấp/trừ tu vi (số âm = trừ).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('canhgioi').setDescription('Đặt cảnh giới/tầng (reset tu vi về 0).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('canhgioi').setDescription('Chỉ số cảnh giới 0-9 (0=Phàm Nhân)').setRequired(true).setMinValue(0).setMaxValue(9))
      .addIntegerOption((o) => o.setName('tang').setDescription('Tầng trong cảnh giới (1-9)').setRequired(true).setMinValue(1).setMaxValue(9)))
    .addSubcommand((s) => s.setName('diemthuoctinh').setDescription('Cấp/trừ điểm thuộc tính chưa cộng.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('diemchieu').setDescription('Cấp/trừ điểm nâng chiêu.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('thuoctinh').setDescription('Cộng/trừ THẲNG vào 1 thuộc tính đã phân bổ.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addStringOption((o) => o.setName('loai').setDescription('Thuộc tính').setRequired(true).addChoices(...ATTR_CHOICES))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('nguyenlieu').setDescription('Cấp/trừ nguyên liệu.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addStringOption((o) => o.setName('loai').setDescription('Loại nguyên liệu').setRequired(true).addChoices(...MAT_CHOICES))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('dan').setDescription('Cấp/trừ đan dược.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addStringOption((o) => o.setName('loai').setDescription('Loại đan').setRequired(true).addChoices(...PILL_CHOICES))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('trangbi').setDescription('Cấp trọn bộ trang bị nhập môn của phái hiện tại.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ (phải có môn phái)').setRequired(true)))
    .addSubcommand((s) => s.setName('capdo').setDescription('Cấp 1 trang bị ĐẦY ĐỦ (6 ô) tùy chọn vào kho tu sĩ.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ nhận đồ').setRequired(true))
      .addStringOption((o) => o.setName('o').setDescription('Ô trang bị').setRequired(true).addChoices(...SLOT_CHOICES))
      .addStringOption((o) => o.setName('dohiem').setDescription('Độ hiếm').setRequired(true).addChoices(...RARITY_CHOICES))
      .addStringOption((o) => o.setName('bienthe').setDescription('Biến thể (bỏ trống = không có)').addChoices(...VARIANT_CHOICES))
      .addStringOption((o) => o.setName('tutinh').setDescription('Tứ tính hợp phái (bỏ trống = không có)').addChoices(...SECT_CHOICES))
      .addIntegerOption((o) => o.setName('cuonghoa').setDescription(`Bậc cường hóa 0-${config.gear.enhanceMax} (mặc định 0)`).setMinValue(0).setMaxValue(config.gear.enhanceMax)))
    .addSubcommand((s) => s.setName('monphai').setDescription('Đặt/đổi môn phái (kèm bộ trang bị + mở hết chiêu).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addStringOption((o) => o.setName('phai').setDescription('Môn phái').setRequired(true).addChoices(...SECT_CHOICES)))
    .addSubcommand((s) => s.setName('diempvp').setDescription('Đặt điểm Đấu Pháp (tuyệt đối).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('diem').setDescription('Điểm đấu mới').setRequired(true).setMinValue(0)))
    .addSubcommand((s) => s.setName('tinhthiet').setDescription('Cấp/trừ 🔩 Tinh Thiết (vật phẩm cường hóa).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addIntegerOption((o) => o.setName('so').setDescription('Lượng (âm để trừ)').setRequired(true)))
    .addSubcommand((s) => s.setName('lieuthuong').setDescription('Hồi đầy Sinh Mệnh cho tu sĩ (miễn phí).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true)))
    .addSubcommand((s) => s.setName('boss').setDescription('Boss Thế Giới: triệu hồi ngay hoặc hạ boss hiện tại.')
      .addStringOption((o) => o.setName('hanhdong').setDescription('Hành động').setRequired(true)
        .addChoices({ name: '🐲 Triệu hồi boss mới ngay', value: 'spawn' }, { name: '💀 Hạ/hủy boss hiện tại', value: 'kill' })))
    .addSubcommand((s) => s.setName('hoicooldown').setDescription('Reset mọi cooldown hành động của tu sĩ.')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true)))
    .addSubcommand((s) => s.setName('xoa').setDescription('XÓA HẲN tu sĩ khỏi DB (không hoàn tác!).')
      .addUserOption((o) => o.setName('nguoi').setDescription('Tu sĩ').setRequired(true))
      .addBooleanOption((o) => o.setName('xacnhan').setDescription('Bật TRUE để xác nhận xóa').setRequired(true))),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      return interaction.reply({ content: '⛔ Lệnh này chỉ dành cho quản trị (role admin hoặc quyền Manage Guild).', flags: MessageFlags.Ephemeral });
    }
    const sub = interaction.options.getSubcommand();

    // --- Subcommand TOÀN CỤC (không cần người chơi): boss thế giới ---
    if (sub === 'boss') {
      const act = interaction.options.getString('hanhdong');
      const bossCmd = require('./boss');
      if (act === 'spawn') {
        const now = Date.now();
        const { boss, row } = db.spawnWorldBoss(now);
        bossCmd.announceSpawn(interaction.client, boss, row);
        return interaction.reply(ok(`Đã triệu hồi **${boss.emoji} ${boss.name}** (HP ${row.max_hp.toLocaleString()}). Đã loan ra Vọng Âm Đài.`));
      }
      if (act === 'kill') {
        const row = db.getWorldBoss();
        if (!row || row.dead) return interaction.reply(err('Hiện không có boss nào đang sống.'));
        db.expireWorldBoss(Date.now());
        return interaction.reply(ok(`Đã hủy boss hiện tại (không chia thưởng). Boss mới sẽ tới sau theo chu kỳ.`));
      }
      return interaction.reply(err('Hành động boss không hợp lệ.'));
    }

    const { user, p } = target(interaction);
    if (!user) return interaction.reply(err('Thiếu người chơi.'));
    if (!p) return interaction.reply(err(`**${user.username}** chưa nhập đạo (không có trong DB).`));
    const id = user.id;

    switch (sub) {
      case 'xem': {
        const s = db.getPvp(p);
        const mats = db.getMaterials(p); const pills = db.getPills(p);
        const gear = db.getEquipment(p); const attrs = db.getAttributes(p);
        const sect = p.sect ? sects.getSect(p.sect) : null;
        const need = cult.tuViNeeded(p.realm, p.tier);
        const matStr = Object.entries(mats).filter(([, q]) => q > 0).map(([k, q]) => { const m = bicanh.materialInfo(k); return m ? `${m.emoji}${q}` : null; }).filter(Boolean).join(' ') || '—';
        const pillStr = Object.entries(pills).filter(([, q]) => q > 0).map(([k, q]) => { const x = alchemy.pillInfo(k); return x ? `${x.emoji}${q}` : null; }).filter(Boolean).join(' ') || '—';
        const attrStr = attrsLib.ORDER.map((k) => `${attrsLib.getAttr(k).emoji}${attrs[k] || 0}`).join(' ');
        const e = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle(`🔧 Quản trị — ${p.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: 'Cảnh giới', value: `${cult.realmLabel(p.realm, p.tier)} _(r${p.realm}/t${p.tier})_`, inline: true },
            { name: 'Tu vi', value: `${p.tu_vi}/${need}`, inline: true },
            { name: cur.name, value: `${p.stones}${cur.short} ${cur.emoji}`, inline: true },
            { name: 'Môn phái', value: sect ? `${sect.emoji} ${sect.name}` : '— Tán Tu —', inline: true },
            { name: 'Điểm TT / chiêu', value: `🧬 ${p.attr_points || 0} · 🎴 ${p.skill_points || 0}`, inline: true },
            { name: 'Đấu Pháp', value: `${pvp.rankOf(s.rating).emoji} ${s.rating} (${s.wins}T/${s.losses}B)`, inline: true },
            { name: 'Thuộc tính đã cộng', value: attrStr, inline: false },
            { name: 'Nguyên liệu', value: matStr, inline: true },
            { name: 'Đan dược', value: pillStr, inline: true },
            { name: 'Trang bị', value: `${gear.length} món`, inline: true },
          )
          .setFooter({ text: `ID: ${id} · nhập đạo ${p.created_at ? p.created_at.slice(0, 10) : '?'}` });
        return interaction.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
      }

      case 'linhthach': {
        const n = interaction.options.getInteger('so');
        db.addStonesRaw(id, n); // admin: cấp/trừ thẳng, KHÔNG dính nerf Linh Khí Loãng
        return interaction.reply(ok(`**${p.username}** ${n >= 0 ? '+' : ''}${n}${cur.short} ${cur.emoji} → còn **${db.getPlayer(id).stones}${cur.short}**.`));
      }
      case 'tuvi': {
        const n = interaction.options.getInteger('so');
        db.addTuViRaw(id, n); // admin: cấp/trừ thẳng, KHÔNG dính nerf
        return interaction.reply(ok(`**${p.username}** ${n >= 0 ? '+' : ''}${n} tu vi → còn **${db.getPlayer(id).tu_vi}**.`));
      }
      case 'canhgioi': {
        const realm = interaction.options.getInteger('canhgioi');
        const tier = interaction.options.getInteger('tang');
        const r = cult.REALMS[realm];
        if (!r) return interaction.reply(err('Cảnh giới không hợp lệ.'));
        if (tier > r.tiers) return interaction.reply(err(`**${r.name}** chỉ có ${r.tiers} tầng (bạn nhập tầng ${tier}).`));
        db.adminSetStage(id, realm, tier);
        return interaction.reply(ok(`**${p.username}** → **${cult.realmLabel(realm, tier)}** (tu vi reset 0).`));
      }
      case 'diemthuoctinh': {
        const n = interaction.options.getInteger('so');
        db.addAttrPoints(id, n);
        return interaction.reply(ok(`**${p.username}** ${n >= 0 ? '+' : ''}${n} điểm thuộc tính → còn **${db.getPlayer(id).attr_points || 0}**.`));
      }
      case 'diemchieu': {
        const n = interaction.options.getInteger('so');
        db.addSkillPoints(id, n);
        return interaction.reply(ok(`**${p.username}** ${n >= 0 ? '+' : ''}${n} điểm nâng chiêu → còn **${db.getPlayer(id).skill_points || 0}**.`));
      }
      case 'thuoctinh': {
        const key = interaction.options.getString('loai');
        const n = interaction.options.getInteger('so');
        const a = db.getAttributes(p);
        a[key] = Math.max(0, (a[key] || 0) + n);
        // Ghi lại (giữ nguyên quỹ điểm chưa cộng).
        db.db.prepare('UPDATE players SET attributes = ? WHERE discord_id = ?').run(JSON.stringify(a), id);
        return interaction.reply(ok(`**${p.username}** ${attrsLib.getAttr(key).name} → **${a[key]}**.`));
      }
      case 'nguyenlieu': {
        const loai = interaction.options.getString('loai');
        const n = interaction.options.getInteger('so');
        db.addMaterials(id, { [loai]: n });
        const m = bicanh.materialInfo(loai);
        const have = db.getMaterials(db.getPlayer(id))[loai] || 0;
        return interaction.reply(ok(`**${p.username}** ${m.emoji} ${m.name} ${n >= 0 ? '+' : ''}${n} → còn **${have}**.`));
      }
      case 'dan': {
        const loai = interaction.options.getString('loai');
        const n = interaction.options.getInteger('so');
        db.addPills(id, { [loai]: n });
        const x = alchemy.pillInfo(loai);
        const have = db.getPills(db.getPlayer(id))[loai] || 0;
        return interaction.reply(ok(`**${p.username}** ${x.emoji} ${x.name} ${n >= 0 ? '+' : ''}${n} → còn **${have}**.`));
      }
      case 'trangbi': {
        if (!p.sect || !sects.getSect(p.sect)) return interaction.reply(err(`**${p.username}** chưa có môn phái nên không có bộ trang bị.`));
        const set = equipment.setFor(p.sect);
        for (const it of set) db.grantEquipItem(id, it.id);
        return interaction.reply(ok(`**${p.username}** đã nhận trọn bộ trang bị **${sects.getSect(p.sect).name}** (${set.length} món).`));
      }
      case 'capdo': {
        const slot = interaction.options.getString('o');
        const rar = interaction.options.getString('dohiem');
        const variant = interaction.options.getString('bienthe'); // null nếu bỏ trống
        const aff = interaction.options.getString('tutinh');       // null nếu bỏ trống
        const enh = Math.max(0, Math.min(config.gear.enhanceMax, interaction.options.getInteger('cuonghoa') || 0));
        // Dựng instance trực tiếp (không random): { id, s, r, st(cost proxy), e, v?, aff? }. uid do addGearItem gán.
        const item = { id: gear.catalogId(slot, rar), s: slot, r: rar, st: gear.rarityRank(rar) * 4, e: enh };
        if (variant) item.v = variant;
        if (aff) item.aff = aff;
        const res = db.addGearItem(id, item);
        if (!res) return interaction.reply(err('Không cấp được (tu sĩ không hợp lệ).'));
        if (res.salvaged) {
          return interaction.reply(ok(`🎒 Kho **${p.username}** đã đầy → món tự phân giải thành 🔩 **${res.refine}** Tinh Thiết.`));
        }
        const granted = res.item;
        return interaction.reply(ok(
          `**${p.username}** nhận trang bị:\n${gear.nameOf(granted)}\n📊 ${gear.statsText(granted, p.sect)}\n⚡ Sức mạnh: **${gear.power(granted)}** _(quản lý ở \`/trangbi\`)_`,
        ));
      }
      case 'monphai': {
        const sectId = interaction.options.getString('phai');
        const sect = sects.getSect(sectId);
        if (!sect) return interaction.reply(err('Môn phái không hợp lệ.'));
        db.setSect(id, sectId, sect.defaultLoadout || [], cult.globalStage(p.realm, p.tier));
        return interaction.reply(ok(`**${p.username}** → môn phái **${sect.emoji} ${sect.name}** (mở hết chiêu cơ bản + trọn bộ trang bị).`));
      }
      case 'diempvp': {
        const diem = interaction.options.getInteger('diem');
        db.adminSetPvpRating(id, diem);
        return interaction.reply(ok(`**${p.username}** điểm Đấu Pháp → **${diem}** (${pvp.rankOf(diem).emoji} ${pvp.rankOf(diem).name}).`));
      }
      case 'tinhthiet': {
        const so = interaction.options.getInteger('so');
        db.addRefine(id, so);
        return interaction.reply(ok(`**${p.username}** ${so >= 0 ? 'nhận' : 'bị trừ'} 🔩 **${Math.abs(so)}** Tinh Thiết.`));
      }
      case 'lieuthuong': {
        const st = db.healVit(id, 'full');
        return interaction.reply(ok(`Đã hồi đầy Sinh Mệnh cho **${p.username}** (${st ? st.cur + '/' + st.max : 'đầy'}).`));
      }
      case 'hoicooldown': {
        db.adminResetCooldowns(id);
        return interaction.reply(ok(`Đã reset mọi cooldown của **${p.username}** (tu luyện, ngộ tính, bí cảnh, săn yêu, tháp, đấu pháp).`));
      }
      case 'xoa': {
        if (!interaction.options.getBoolean('xacnhan')) {
          return interaction.reply(err(`Cần bật **xacnhan = True** để xóa **${p.username}**. Thao tác KHÔNG hoàn tác!`));
        }
        db.adminDeletePlayer(id);
        return interaction.reply(ok(`🗑️ Đã **xóa hẳn** tu sĩ **${p.username}** khỏi DB (cả tiến độ cốt truyện).`));
      }
      default:
        return interaction.reply(err('Chức năng không xác định.'));
    }
  },
};
