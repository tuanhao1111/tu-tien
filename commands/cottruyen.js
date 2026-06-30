// =====================================================================
//  /cottruyen — CỐT TRUYỆN CHÍNH "Tiên Đồ Lộ Ký" (engine nhiều cảnh)
//  Mỗi chương = chuỗi cảnh: dẫn truyện (Tiếp ▶️) · lựa chọn hội thoại ·
//  nhiệm vụ thật. Đi hết cảnh -> 🎁 Lãnh thưởng -> mở chương kế.
//  Bảng hiển thị ẩn (ephemeral), cập nhật mỗi khi bấm nút. Tiến độ ở
//  bảng story_progress. Kho cảnh ở story.js.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const story = require('../story');
const cult = require('../cultivation');
const features = require('../features');

const stoneUnit = `${config.currency.emoji}`;

// Nhãn + (cur, goal) cho cảnh NHIỆM VỤ, để vẽ thanh tiến độ.
function objectiveInfo(scene, player, row) {
  const o = scene.objective;
  switch (o.type) {
    case 'talk':
      return { label: 'Trò chuyện để đi tiếp.', cur: row.progress, goal: o.goal };
    case 'tuluyen':
      return { label: `Tu luyện **${o.goal}** lần (\`/tuluyen\`).`, cur: row.progress, goal: o.goal };
    case 'bequan':
      return { label: `Xuất quan **${o.goal}** lần (\`/bequan\`).`, cur: row.progress, goal: o.goal };
    case 'dotpha':
      return { label: `Đột phá thành công **${o.goal}** lần (\`/dotpha\`).`, cur: row.progress, goal: o.goal };
    case 'reach_realm': {
      const done = player.realm >= o.realm ? 1 : 0;
      return { label: `Đạt cảnh giới **${features.realmName(o.realm)}** (hiện **${cult.realmLabel(player.realm, player.tier)}**).`, cur: done, goal: 1 };
    }
    case 'join_sect': {
      const done = player.sect ? 1 : 0;
      return { label: 'Gia nhập một môn phái (mở `/monphai` để chọn).', cur: done, goal: 1 };
    }
    case 'pending_sect': {
      const done = (player.pending_sect || player.sect) ? 1 : 0;
      return { label: 'Đặt **nguyện vọng môn phái** (panel Môn Phái hoặc `/monphai`).', cur: done, goal: 1 };
    }
    case 'finalize_sect': {
      const done = player.sect ? 1 : 0;
      return { label: 'Hoàn thành **nghi thức nhập môn** (bấm nút bên dưới).', cur: done, goal: 1 };
    }
    case 'pay_stones':
      return { label: `Dâng **${o.cost}${config.currency.short}** ${stoneUnit}.`, cur: row.progress, goal: o.goal };
    case 'chat':
      return { label: `Trò chuyện **${o.goal}** câu trong server.`, cur: row.progress, goal: o.goal };
    default:
      return { label: 'Mục tiêu bí ẩn.', cur: row.progress, goal: o.goal };
  }
}

function rewardLine(reward) {
  const parts = [];
  if (reward.tuVi) parts.push(`🧘 ${reward.tuVi} tu vi`);
  if (reward.stones) parts.push(`${stoneUnit} ${reward.stones}${config.currency.short}`);
  return parts.join(' + ') || '—';
}

function renderScene(ch, scene) {
  if (!scene) return '';
  if (scene.type === 'line') {
    if (scene.who === 'npc') return `${ch.npc.emoji} **${ch.npc.name}**\n\n${scene.text}`;
    if (scene.who === 'me') return `🧍 ${scene.text}`;
    return `*${scene.text}*`; // narrator
  }
  if (scene.type === 'choice') return `❓ ${scene.prompt}`;
  if (scene.type === 'task') return scene.text || '';
  return '';
}

// Trạng thái hiện tại: 'done'|'locked'|'reading'|'choosing'|'task'|'task_done'|'claimable'
function resolveState(player) {
  const row = db.getStory(player.discord_id);
  if (row.done) return { row, ch: null, state: 'done' };

  const ch = story.getChapter(row.chapter_id);
  if (!ch) return { row, ch: null, state: 'done' };

  if (player.realm < ch.minRealm) return { row, ch, state: 'locked' };

  const n = story.sceneCount(ch);
  if (row.scene >= n) return { row, ch, state: 'claimable' };

  const scene = story.sceneAt(ch, row.scene);
  if (!scene) return { row, ch, state: 'claimable' };

  if (scene.type === 'line') return { row, ch, scene, state: 'reading' };
  if (scene.type === 'choice') return { row, ch, scene, state: 'choosing' };

  // task — reach_realm / join_sect tự đồng bộ tiến độ theo trạng thái (idempotent).
  const o = scene.objective;
  const goal = o.goal || 1;
  const autoDone =
    (o.type === 'reach_realm' && player.realm >= o.realm) ||
    (o.type === 'join_sect' && player.sect) ||
    (o.type === 'pending_sect' && (player.pending_sect || player.sect)) ||
    (o.type === 'finalize_sect' && player.sect);
  if (autoDone && row.progress < goal) {
    db.storySetProgress(player.discord_id, goal);
    row.progress = goal;
  }
  const info = objectiveInfo(scene, player, row);
  const state = info.cur >= info.goal ? 'task_done' : 'task';
  return { row, ch, scene, state, info };
}

function buildEmbed(user, player) {
  const st = resolveState(player);

  if (st.state === 'done') {
    return {
      embed: new EmbedBuilder()
        .setColor(config.colors.success)
        .setAuthor({ name: `Tiên Đồ Lộ Ký của ${player.username}`, iconURL: user.displayAvatarURL() })
        .setTitle('🎉 Đã đi trọn cốt truyện hiện có!')
        .setDescription(
          'Từ một phàm nhân tay trắng quỳ trước đạo quán, đạo hữu đã bước tới cảnh giới **Hóa Thần**, được tông môn dang tay đón nhận.\n\n' +
            '*Con đường Luyện Hư → Đại Thừa → Độ Kiếp → phi thăng thành Tiên… xin hẹn ở những chương sau.*',
        )
        .setFooter({ text: 'Tạm hết chương · tiếp tục tu luyện chờ hồi mới nhé.' }),
      st,
    };
  }

  const ch = st.ch;
  const chNum = story.chapterNumber(ch.id);
  const e = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setAuthor({ name: `Tiên Đồ Lộ Ký của ${player.username}`, iconURL: user.displayAvatarURL() })
    .setTitle(`📖 Chương ${chNum}/${story.total} — ${ch.title}`);

  if (st.state === 'locked') {
    const teaser = renderScene(ch, story.sceneAt(ch, 0));
    e.setDescription(
      `${teaser}\n\n🔒 **Khóa** — cần đạt **${features.realmName(ch.minRealm)}** mới mở chương này.\n` +
        `Hiện đạo hữu đang **${cult.realmLabel(player.realm, player.tier)}** — tu luyện thêm rồi quay lại!`,
    ).setFooter({ text: `NPC: ${ch.npc.name} · lên cảnh giới rồi gõ /cottruyen` });
    return { embed: e, st };
  }

  if (st.state === 'claimable') {
    e.setDescription(
      `🎁 **Đã đi hết chương "${ch.title}"!**\n\n` +
        `Bấm **Lãnh thưởng** để nhận — và mở chương kế.\n\n💎 **Thưởng chương:** ${rewardLine(ch.reward || {})}`,
    ).setFooter({ text: `Chương ${chNum}/${story.total} · hoàn thành!` });
    return { embed: e, st };
  }

  const nScenes = story.sceneCount(ch);
  const body = renderScene(ch, st.scene);
  let tail = '';

  if (st.state === 'reading') {
    tail = '\n\n▶️ *Bấm **Tiếp** để đọc tiếp…*';
  } else if (st.state === 'choosing') {
    tail = '\n\n*Chọn một câu trả lời ở dưới…*';
  } else if (st.state === 'task' || st.state === 'task_done') {
    const info = st.info;
    const microNote = st.scene.micro
      ? `  _(xong cảnh: ${st.scene.micro.tuVi ? '+' + st.scene.micro.tuVi + ' tu vi' : ''}${st.scene.micro.stones ? ' +' + st.scene.micro.stones + config.currency.short : ''})_`
      : '';
    if (st.state === 'task_done') {
      tail = `\n\n✅ **Xong mục tiêu!**${microNote}\n▶️ *Bấm **Tiếp** để đi tiếp.*`;
    } else {
      const bar = `${cult.progressBar(info.cur, info.goal, 12)} \`${info.cur}/${info.goal}\``;
      tail = `\n\n🎯 **Mục tiêu:** ${info.label}${microNote}\n${bar}`;
    }
  }

  e.setDescription(`${body}${tail}`)
    .setFooter({ text: `Chương ${chNum}/${story.total} · Cảnh ${st.row.scene + 1}/${nScenes} · cốt truyện không reset, cứ từ từ` });
  return { embed: e, st };
}

function buildRow(ownerId, st) {
  const row = new ActionRowBuilder();

  if (st.state === 'reading' || st.state === 'task_done') {
    row.addComponents(new ButtonBuilder().setCustomId(`story_next:${ownerId}`).setLabel('Tiếp ▶️').setStyle(ButtonStyle.Primary));
    return row;
  }
  if (st.state === 'choosing') {
    (st.scene.options || []).slice(0, 3).forEach((opt, i) => {
      row.addComponents(new ButtonBuilder().setCustomId(`story_choice:${ownerId}:${i}`).setLabel(opt.label.slice(0, 80)).setStyle(ButtonStyle.Secondary));
    });
    return row;
  }
  if (st.state === 'claimable') {
    row.addComponents(new ButtonBuilder().setCustomId(`story_claim:${ownerId}`).setLabel('🎁 Lãnh thưởng').setStyle(ButtonStyle.Success));
    return row;
  }
  if (st.state === 'task') {
    const o = st.scene.objective;
    if (o.type === 'talk') {
      row.addComponents(new ButtonBuilder().setCustomId(`story_talk:${ownerId}`).setLabel('💬 Trò chuyện').setStyle(ButtonStyle.Primary));
      return row;
    }
    if (o.type === 'pay_stones') {
      row.addComponents(new ButtonBuilder().setCustomId(`story_pay:${ownerId}`).setLabel(`💎 Dâng ${o.cost}${config.currency.short}`).setStyle(ButtonStyle.Primary));
      return row;
    }
    if (o.type === 'finalize_sect') {
      row.addComponents(new ButtonBuilder().setCustomId(`story_finalize_sect:${ownerId}`).setLabel('🏯 Bái nhập sư môn').setStyle(ButtonStyle.Primary));
      return row;
    }
    // tuluyen / bequan / dotpha / reach_realm / chat / pending_sect -> đi làm việc đó + nút làm mới
    row.addComponents(new ButtonBuilder().setCustomId(`story_refresh:${ownerId}`).setLabel('🔄 Kiểm tra tiến độ').setStyle(ButtonStyle.Secondary));
    return row;
  }
  return null; // locked / done -> không nút
}

function view(user, player) {
  const { embed, st } = buildEmbed(user, player);
  const components = [];
  const r = buildRow(player.discord_id, st);
  if (r) components.push(r);
  return { embeds: [embed], components };
}

async function notRegistered(interaction) {
  return interaction.reply({
    content: 'Đạo hữu chưa nhập đạo! Gõ `/batdau` để bắt đầu hành trình tu tiên đã nhé.',
    flags: MessageFlags.Ephemeral,
  });
}

async function refresh(interaction, ownerId) {
  const player = db.getPlayer(ownerId);
  await interaction.update(view(interaction.user, player));
}

// Chặn người lạ bấm nút của người khác.
function notOwner(interaction, ownerId) {
  if (interaction.user.id === ownerId) return false;
  interaction.reply({ content: 'Cốt truyện của người ta, xớ rớ chi 👀', flags: MessageFlags.Ephemeral }).catch(() => {});
  return true;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cottruyen')
    .setDescription('Tiên Đồ Lộ Ký — cốt truyện chính dẫn dắt hành trình tu tiên.'),

  async execute(interaction) {
    const player = db.getPlayer(interaction.user.id);
    if (!player) return notRegistered(interaction);
    return interaction.reply({ ...view(interaction.user, player), flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Mở cốt truyện ẩn của CHÍNH người bấm (dùng cho nút trên /batdau).
    async story_open(interaction) {
      const player = db.getPlayer(interaction.user.id);
      if (!player) return notRegistered(interaction);
      return interaction.reply({ ...view(interaction.user, player), flags: MessageFlags.Ephemeral });
    },

    async story_next(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      const res = db.storyNextScene(ownerId);
      await refresh(interaction, ownerId);
      if (res && res.micro && (res.micro.tuVi || res.micro.stones)) {
        const bits = [];
        if (res.micro.tuVi) bits.push(`🧘 ${res.micro.tuVi} tu vi`);
        if (res.micro.stones) bits.push(`${stoneUnit} ${res.micro.stones}${config.currency.short}`);
        return interaction.followUp({ content: `✅ Xong cảnh — nhận ${bits.join(' + ')}.`, flags: MessageFlags.Ephemeral });
      }
    },

    async story_choice(interaction) {
      const [, ownerId, idxStr] = interaction.customId.split(':');
      if (notOwner(interaction, ownerId)) return;
      const row = db.getStory(ownerId);
      const ch = story.getChapter(row.chapter_id);
      const scene = ch ? story.sceneAt(ch, row.scene) : null;
      let reply = null;
      if (scene && scene.type === 'choice') {
        const opt = (scene.options || [])[parseInt(idxStr, 10)];
        if (opt) reply = opt.reply;
        db.storyNextScene(ownerId); // choice không phải task -> luôn sang cảnh kế
      }
      await refresh(interaction, ownerId);
      if (reply) return interaction.followUp({ content: `🧍 ${reply}`, flags: MessageFlags.Ephemeral });
    },

    async story_talk(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      const t = db.storyTaskScene(ownerId);
      if (t && t.scene.objective.type === 'talk') {
        db.storySetProgress(ownerId, t.scene.objective.goal || 1);
      }
      return refresh(interaction, ownerId);
    },

    async story_pay(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      const t = db.storyTaskScene(ownerId);
      if (!t || t.scene.objective.type !== 'pay_stones') return refresh(interaction, ownerId);
      const res = db.storyPayStones(ownerId);
      if (res.short) {
        return interaction.reply({
          content: `😅 Không đủ linh thạch! Cần ${stoneUnit} **${res.cost}${config.currency.short}**. Đi đột phá kiếm thêm đã.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return refresh(interaction, ownerId);
    },

    async story_refresh(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      return refresh(interaction, ownerId);
    },

    // Nghi thức nhập môn: chốt phái từ nguyện vọng (pending_sect) -> chính thức vào phái.
    async story_finalize_sect(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      const res = db.finalizeSect(ownerId);
      if (res.err === 'nopending') {
        return interaction.reply({
          content: '🏯 Đạo hữu chưa đặt nguyện vọng môn phái! Tới panel **Môn Phái** (hoặc `/monphai`) chọn phái trước đã.',
          flags: MessageFlags.Ephemeral,
        });
      }
      await refresh(interaction, ownerId);
      if (res.ok && res.sect && !res.already) {
        return interaction.followUp({
          content: `${res.sect.emoji} **Bái nhập ${res.sect.name} thành công!** Đệ tử mới chỉ được truyền **1 chiêu cơ bản** — tới panel **Môn Phái** mở **📿 Nhiệm vụ nhập môn** để học nốt 2 chiêu còn lại & nhận **trang bị nhập môn**. Thử sức ở \`/dautap\`.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    },

    async story_claim(interaction) {
      const ownerId = interaction.customId.split(':')[1];
      if (notOwner(interaction, ownerId)) return;
      const claimed = db.claimStory(ownerId);
      if (!claimed) {
        return interaction.reply({ content: 'Chưa đi hết cảnh mà đòi lãnh 😏 Đọc/làm cho xong đã!', flags: MessageFlags.Ephemeral });
      }
      await refresh(interaction, ownerId);
      const fin = claimed.finishedCh;
      const nextNote = claimed.nextCh
        ? `\n➡️ Mở chương mới: **${claimed.nextCh.title}**` +
          (claimed.nextCh.minRealm > 0 ? ` *(cần ${features.realmName(claimed.nextCh.minRealm)})*` : '')
        : '\n🎉 Đạo hữu đã đi hết cốt truyện hiện có!';
      return interaction.followUp({
        content: `🎁 **Xong chương "${fin.title}"** — nhận ${rewardLine(claimed.reward)}.${nextNote}`,
        flags: MessageFlags.Ephemeral,
      });
    },
  },
};
