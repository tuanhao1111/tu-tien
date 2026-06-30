// =====================================================================
//  /monphai — Xem, GIA NHẬP, hoặc ĐỔI môn phái.
//  Mở khóa ở Trúc Cơ. Gia nhập lần đầu miễn phí; đổi phái tốn linh thạch.
//  Mỗi phái có 1 bị động + kho chiêu chủ động (trang bị qua /kynang).
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const sects = require('../sects');
const skills = require('../skills');
const cult = require('../cultivation');
const sectquest = require('../sectquest');
const equipment = require('../equipment');
const assets = require('../assets'); // thumbnail môn phái (tự bỏ qua nếu chưa có)
const { requireUnlocked } = require('../util/feature-gate');

const stone = `${config.currency.emoji}`;

function fmtDur(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  return `${m} phút`;
}

// Quy tắc đổi phái: KHÓA đổi tiếp `switchLockMs` sau mỗi lần đổi; được VỀ phái
//  cũ (prev_sect) MIỄN PHÍ sau `freeReturnMs`. Trả { allowed, free, cost, lockLeft }.
function switchInfo(player, targetId, now) {
  const sw = config.sect;
  const lastTs = player.sect_switch_ts || 0;
  const isReturn = !!player.prev_sect && !!targetId && targetId === player.prev_sect;
  const freeReady = isReturn && (now - lastTs >= sw.freeReturnMs);
  const lockLeft = Math.max(0, lastTs + sw.switchLockMs - now);
  if (freeReady) return { allowed: true, free: true, cost: 0, lockLeft: 0 };
  if (lockLeft > 0) return { allowed: false, free: false, cost: sw.switchCost, lockLeft };
  return { allowed: true, free: false, cost: sw.switchCost, lockLeft: 0 };
}

// Dòng trạng thái đổi phái cho embed (không gắn target cụ thể).
function switchStatusLine(player, now) {
  const sw = config.sect;
  const lastTs = player.sect_switch_ts || 0;
  const lockLeft = Math.max(0, lastTs + sw.switchLockMs - now);
  const prev = player.prev_sect ? sects.getSect(player.prev_sect) : null;
  if (lockLeft > 0) return `🔒 Khóa đổi phái: còn **${fmtDur(lockLeft)}**.`;
  if (prev) {
    const freeLeft = sw.freeReturnMs - (now - lastTs);
    if (freeLeft <= 0) return `🔁 Được **về ${prev.emoji} ${prev.name} MIỄN PHÍ** (đã đủ thời gian).`;
    return `Đổi phái: ${stone} ${sw.switchCost}${config.currency.short} · về **${prev.name}** miễn phí sau **${fmtDur(freeLeft)}**.`;
  }
  return `Đổi phái: ${stone} ${sw.switchCost}${config.currency.short}.`;
}

// Hàng nút khi đã là đệ tử: đổi phái + nhiệm vụ nhập môn.
function mySectComponents() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('panel_kynang').setLabel('🎴 Kỹ năng').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('panel_dautap').setLabel('🥊 Đấu tập').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('sectquest_open').setLabel('📿 Nhiệm vụ nhập môn').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('sect_switchbtn').setLabel('🔄 Đổi / Về phái').setStyle(ButtonStyle.Secondary),
  )];
}

// Giao diện chuỗi nhiệm vụ nhập môn (mở dần chiêu + nhận trang bị).
function sectQuestView(player) {
  const sect = sects.getSect(player.sect);
  const sq = db.getSectQuest(player); // { stage, progress, total, done, legacy }
  const set = equipment.setFor(sect.id);
  const lines = sectquest.steps().map((st, i) => {
    const item = (st.reward.equipIndex != null) ? set[st.reward.equipIndex] : null;
    let status;
    if (sq.legacy || i < sq.stage) status = '✅ *Đã hoàn thành*';
    else if (i === sq.stage) {
      const goal = st.objective.goal || 1;
      const cur = Math.min(sq.progress, goal);
      status = `\`${cult.progressBar(cur, goal, 10)}\` ${cur}/${goal}` + (sq.progress >= goal ? '  🎁 *Sẵn sàng lãnh!*' : '');
    } else status = '🔒 *Chưa mở*';
    const reward = [item ? `${item.emoji} ${item.name}` : null, st.reward.stones ? `${stone}${st.reward.stones}` : null, st.reward.tuVi ? `🧘${st.reward.tuVi}` : null]
      .filter(Boolean).join(' · ');
    const skillNote = i < 2 ? ` + mở chiêu cơ bản #${i + 2}` : '';
    return `${st.emoji} **${st.name}** — ${status}\n   ${st.desc}\n   🎁 ${reward}${skillNote}`;
  });

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`📿 Nhiệm Vụ Nhập Môn — ${sect.emoji} ${sect.name}`)
    .setDescription(
      (sq.legacy
        ? '*(Đạo hữu là đệ tử kỳ cựu — đã thông thạo toàn bộ chiêu cơ bản.)*\n\n'
        : 'Hoàn thành từng bước để **mở dần chiêu cơ bản** và nhận **trang bị nhập môn**.\n\n') +
      lines.join('\n\n'),
    )
    .setFooter({ text: 'Chiêu mở khóa xem ở /kynang · trang bị xem ở Hồ Sơ' });

  const rows = [];
  const goal = !sq.done ? (sectquest.stepAt(sq.stage)?.objective.goal || 1) : 0;
  const canClaim = !sq.done && sq.progress >= goal;
  if (!sq.done) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sectquest_claim').setLabel('🎁 Lãnh thưởng bước hiện tại')
        .setStyle(canClaim ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(!canClaim),
    ));
  }
  return { embeds: [e], components: rows };
}

// Menu chọn phái (dùng cho cả gia nhập & đổi). mode = 'join' | 'switch'.
function sectSelect(mode) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sect_pick:${mode}`)
    .setPlaceholder(mode === 'switch' ? 'Chọn phái muốn chuyển sang…' : 'Chọn môn phái để bái nhập…')
    .addOptions(
      sects.allSects().map((s) => ({
        label: `${s.name}`,
        emoji: s.emoji,
        description: s.archetype.slice(0, 95),
        value: s.id,
      })),
    );
  return new ActionRowBuilder().addComponents(menu);
}

// Embed danh sách các phái (khi chưa gia nhập).
function listEmbed() {
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🏯 Chiêu Hiền Đại Điện — Chọn Môn Phái')
    .setDescription('Mỗi phái một lối đánh, **cân bằng & khắc chế lẫn nhau** — chọn phái hợp với bạn. Chọn xong còn đổi được (tốn linh thạch).');
  for (const s of sects.allSects()) {
    const passive = skills.passiveForSect(s.id);
    e.addFields({
      name: `${s.emoji} ${s.name}  ·  👥 ${db.countSect(s.id)} đệ tử`,
      value: `${s.archetype}\n*Bị động:* **${passive.name}** — ${passive.desc}`,
    });
  }
  return e;
}

// Embed thông tin phái hiện tại của người chơi.
function mySectEmbed(player) {
  const s = sects.getSect(player.sect);
  const passive = skills.passiveForSect(s.id);
  const eqIds = db.getEquipped(player);
  const eq = (eqIds.length ? eqIds : s.defaultLoadout)
    .map((id) => skills.getSkill(id))
    .filter(Boolean)
    .map((sk) => `${sk.emoji} **${sk.name}**`);
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(`${s.emoji} ${s.name}`)
    .setDescription(s.archetype)
    .addFields(
      { name: '🌟 Bị động', value: `**${passive.name}** — ${passive.desc}` },
      { name: '🎴 Chiêu đang trang bị', value: eq.length ? eq.join('\n') : '*(chưa có — dùng `/kynang`)*' },
      { name: '👥 Số đệ tử', value: `${db.countSect(s.id)}`, inline: true },
      { name: '🔄 Đổi phái', value: switchStatusLine(player, Date.now()), inline: false },
    )
    .setFooter({ text: 'Đổi loadout: /kynang · Thử sức: /dautap' });
}

// View "đã là đệ tử" kèm ảnh phái (dưới cùng; files rỗng nếu chưa có ảnh).
function mySectView(player) {
  const e = mySectEmbed(player);
  const files = assets.sect(e, player.sect, 'image');
  return { embeds: [e], components: mySectComponents(), files };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monphai')
    .setDescription('Xem, gia nhập hoặc đổi môn phái (mở khóa ở Trúc Cơ).'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;

    if (player.sect && sects.getSect(player.sect)) {
      return interaction.reply({ ...mySectView(player), flags: MessageFlags.Ephemeral });
    }

    // Đã đặt nguyện vọng nhưng CHƯA hoàn thành nghi thức nhập môn.
    if (player.pending_sect && sects.getSect(player.pending_sect)) {
      const ps = sects.getSect(player.pending_sect);
      return interaction.reply({
        content: `${ps.emoji} Bạn đang có **nguyện vọng bái nhập ${ps.name}**.\n` +
          `→ Mở \`/cottruyen\` (chương "Bái Nhập Sư Môn") hoàn thành **nghi thức nhập môn** để chính thức vào phái.\n\n` +
          `Muốn đổi nguyện vọng sang phái khác? Chọn lại bên dưới:`,
        components: [sectSelect('join')],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({ embeds: [listEmbed()], components: [sectSelect('join')], flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Panel Môn Phái: mở giao diện xem/chọn phái (ẩn từng người). Gating thủ công.
    async panel_sect(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) {
        return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" đã.', flags: MessageFlags.Ephemeral });
      }
      if (player.realm < sects.JOIN_REALM) {
        const r = cult.REALMS[sects.JOIN_REALM];
        return interaction.reply({
          content: `🔒 Chức năng môn phái mở ở **${r.emoji} ${r.name}**. Hiện đạo hữu đang **${cult.realmLabel(player.realm, player.tier)}** — làm nhiệm vụ chính tuyến tu luyện thêm nhé!`,
          flags: MessageFlags.Ephemeral,
        });
      }
      if (player.sect && sects.getSect(player.sect)) {
        return interaction.reply({ ...mySectView(player), flags: MessageFlags.Ephemeral });
      }
      if (player.pending_sect && sects.getSect(player.pending_sect)) {
        const ps = sects.getSect(player.pending_sect);
        return interaction.reply({
          content: `${ps.emoji} Bạn đang có **nguyện vọng bái nhập ${ps.name}**.\n` +
            `→ Mở \`/cottruyen\` (chương "Bái Nhập Sư Môn") hoàn thành **nghi thức nhập môn** để chính thức vào phái.\n\n` +
            `Muốn đổi nguyện vọng? Chọn lại bên dưới:`,
          components: [sectSelect('join')],
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({ embeds: [listEmbed()], components: [sectSelect('join')], flags: MessageFlags.Ephemeral });
    },

    // Mở chuỗi nhiệm vụ nhập môn (chỉ khi đã là đệ tử).
    async sectquest_open(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player || !player.sect || !sects.getSect(player.sect)) {
        return interaction.reply({ content: '🏯 Đạo hữu chưa là đệ tử phái nào. Gia nhập phái trước đã.', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ ...sectQuestView(player), flags: MessageFlags.Ephemeral });
    },

    // Lãnh thưởng bước nhiệm vụ nhập môn hiện tại.
    async sectquest_claim(interaction) {
      const res = db.claimSectQuestStep(interaction.user.id);
      if (res.err) {
        const msg = {
          nosect: '🏯 Chưa có môn phái.',
          done: 'Đạo hữu đã hoàn thành toàn bộ nhiệm vụ nhập môn rồi! 🎉',
          incomplete: 'Bước này chưa hoàn thành — làm xong mục tiêu đã nhé.',
        }[res.err] || 'Không lãnh được.';
        return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
      const player = db.getPlayer(interaction.user.id);
      const sect = sects.getSect(player.sect);
      await interaction.update(sectQuestView(player));
      // Chiêu cơ bản vừa mở (nếu có): defaultLoadout[newStage] khi newStage < 3.
      const newSkill = res.newStage < sect.defaultLoadout.length ? skills.getSkill(sect.defaultLoadout[res.newStage]) : null;
      const bits = [];
      if (res.item) bits.push(`${res.item.emoji} **${res.item.name}**`);
      if (res.stones) bits.push(`${stone}${res.stones}${config.currency.short}`);
      if (res.tuVi) bits.push(`🧘${res.tuVi} tu vi`);
      if (newSkill) bits.push(`🎴 mở chiêu **${newSkill.name}**`);
      return interaction.followUp({
        content: `🎁 **Hoàn thành ${res.step.emoji} ${res.step.name}!** Nhận: ${bits.join(' · ')}.` +
          (newSkill ? `\n→ Trang bị chiêu mới ở \`/kynang\`.` : '') +
          (res.allDone ? `\n🏅 Đã xong **toàn bộ** nhiệm vụ nhập môn — đầy đủ chiêu cơ bản & trang bị!` : ''),
        flags: MessageFlags.Ephemeral,
      });
    },

    // Bấm "Đổi môn phái" -> kiểm tra KHÓA + linh thạch rồi hiện menu chọn.
    async sect_switchbtn(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) return;
      const now = Date.now();
      const lockLeft = Math.max(0, (player.sect_switch_ts || 0) + config.sect.switchLockMs - now);
      if (lockLeft > 0) {
        const prev = player.prev_sect ? sects.getSect(player.prev_sect) : null;
        const freeLeft = config.sect.freeReturnMs - (now - (player.sect_switch_ts || 0));
        return interaction.reply({
          content: `🔒 Vừa đổi phái xong nên đang **khóa đổi tiếp** — còn **${fmtDur(lockLeft)}**.` +
            (prev ? `\n🔁 Sau **${fmtDur(freeLeft)}** nữa, đạo hữu được **quay về ${prev.emoji} ${prev.name} MIỄN PHÍ**.` : ''),
          flags: MessageFlags.Ephemeral,
        });
      }
      const prev = player.prev_sect ? sects.getSect(player.prev_sect) : null;
      const freeReady = prev && (now - (player.sect_switch_ts || 0) >= config.sect.freeReturnMs);
      return interaction.reply({
        content: `Chọn phái muốn chuyển sang:\n` +
          `• Sang phái mới: trừ ${stone} **${config.sect.switchCost}${config.currency.short}**.` +
          (prev ? `\n• Về phái cũ **${prev.emoji} ${prev.name}**: ${freeReady ? '**MIỄN PHÍ** ✅' : `vẫn trừ ${config.sect.switchCost}${config.currency.short} (chưa tới hạn miễn phí)`}.` : ''),
        components: [sectSelect('switch')],
        flags: MessageFlags.Ephemeral,
      });
    },

    // Chọn phái từ menu (gia nhập hoặc đổi).
    async sect_pick(interaction) {
      const mode = interaction.customId.split(':')[1];
      const sectId = interaction.values[0];
      const sect = sects.getSect(sectId);
      const player = db.getPlayer(interaction.user.id);
      if (!sect || !player) return;

      if (mode === 'switch') {
        if (player.sect === sectId) {
          return interaction.update({ content: 'Đây đang là phái của bạn rồi 😅', components: [] });
        }
        const now = Date.now();
        const info = switchInfo(player, sectId, now);
        if (!info.allowed) {
          return interaction.update({ content: `🔒 Đang **khóa đổi phái** — còn **${fmtDur(info.lockLeft)}** mới đổi tiếp được.`, embeds: [], components: [] });
        }
        if (!info.free && player.stones < info.cost) {
          return interaction.update({ content: `😅 Không đủ linh thạch để đổi phái! Cần ${stone} **${info.cost}${config.currency.short}**.`, embeds: [], components: [] });
        }
        if (!info.free && info.cost > 0) db.addStones(interaction.user.id, -info.cost);
        // Đổi phái: tức thì. Mốc bậc gia nhập = bậc hiện tại (buff chiêu tính lại từ đầu).
        //  setSect tự ghi prev_sect + mốc đổi (cho khóa đổi tiếp & về phái cũ miễn phí).
        db.setSect(interaction.user.id, sectId, sect.defaultLoadout, cult.globalStage(player.realm, player.tier));
        return interaction.update({
          content: `${sect.emoji} Bạn vừa chuyển sang **${sect.name}**! ${info.free ? '🔁 *(Về phái cũ — MIỄN PHÍ.)* ' : ''}` +
            `Đệ tử kỳ cựu nên đã **thông thạo cả 3 chiêu cơ bản** + nhận **trọn bộ trang bị nhập môn** của phái mới.\n` +
            `🔒 Khóa đổi phái tiếp trong **${fmtDur(config.sect.switchLockMs)}**.\n` +
            `→ Dùng \`/kynang\` để đổi chiêu, \`/dautap\` để thử sức, xem trang bị ở **Hồ Sơ**.`,
          embeds: [],
          components: [],
        });
      }

      // mode === 'join': CHƯA vào phái ngay — chỉ ghi NGUYỆN VỌNG, phải hoàn
      // thành "nghi thức nhập môn" trong cốt truyện (/cottruyen) mới chính thức vào.
      if (player.sect) {
        return interaction.update({ content: 'Bạn đã có môn phái rồi. Dùng nút "Đổi môn phái" nhé.', components: [] });
      }
      db.setPendingSect(interaction.user.id, sectId);
      return interaction.update({
        content: `${sect.emoji} Đã ghi **nguyện vọng bái nhập ${sect.name}**!\n` +
          `→ Giờ mở \`/cottruyen\` (chương "Bái Nhập Sư Môn") và hoàn thành **nghi thức nhập môn** để chính thức trở thành đệ tử.`,
        embeds: [],
        components: [],
      });
    },
  },
};
