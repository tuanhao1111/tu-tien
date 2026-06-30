// =====================================================================
//  /luyendan — LUYỆN ĐAN. Mở khóa ở Kim Đan (realm 3).
//  Tiêu NGUYÊN LIỆU gom từ Bí Cảnh -> chế ĐAN DƯỢC. Hai loại:
//    • Đan tu vi   -> uống tức thì, +tu vi (theo % tu vi cần lên bậc).
//    • Đan độ kiếp -> giữ trong túi, TỰ dùng khi /dotpha vượt cảnh giới
//                     để cộng tỉ lệ thành công (cứu mạng lúc độ kiếp).
//  Luyện đan có RỦI RO: thất bại vẫn mất nguyên liệu + linh thạch.
// =====================================================================
const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, MessageFlags,
} = require('discord.js');
const db = require('../database');
const config = require('../config');
const cult = require('../cultivation');
const bicanh = require('../bicanh');
const alchemy = require('../alchemy');
const { requireUnlocked } = require('../util/feature-gate');
const { announce } = require('../util/announce');

const stone = config.currency.emoji;

// Mô tả công dụng 1 đan.
function effectText(pill) {
  if (pill.kind === 'tuvi') return `🌀 +${Math.round(pill.pctNeed * 100)}% tu vi cần lên bậc`;
  if (pill.kind === 'tribulation') return `⚡ Độ kiếp +${Math.round(pill.rateBonus * 100)}% tỉ lệ`;
  return pill.desc;
}

// Mô tả chi phí nguyên liệu của 1 đan phương (ngắn gọn).
function costText(recipe) {
  const parts = Object.entries(recipe.cost).map(([m, q]) => {
    const info = bicanh.materialInfo(m);
    return info ? `${info.emoji}${q}` : `${m}×${q}`;
  });
  if (recipe.stoneCost > 0) parts.push(`${stone}${recipe.stoneCost}`);
  return parts.join(' ');
}

// Đủ nguyên liệu + linh thạch để luyện 1 mẻ?
function canAfford(player, recipe) {
  const bag = db.getMaterials(player);
  for (const [m, q] of Object.entries(recipe.cost)) if ((bag[m] || 0) < q) return false;
  return player.stones >= (recipe.stoneCost || 0);
}

function bagLine(map, infoFn) {
  const parts = Object.entries(map).filter(([, q]) => q > 0)
    .map(([id, q]) => { const i = infoFn(id); return i ? `${i.emoji} ${i.name} ×${q}` : null; })
    .filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

// Dựng view luyện đan đầy đủ (embed + select luyện + select uống).
function alchemyView(player) {
  const recipes = alchemy.recipesFor(player.realm);
  const matBag = db.getMaterials(player);
  const pillBag = db.getPills(player);

  const recipeLines = recipes.map(({ id, pill, recipe }) => {
    const rate = Math.round(alchemy.craftSuccessRate(id, player.realm) * 100);
    const ok = canAfford(player, recipe);
    return `${ok ? '🔹' : '▫️'} ${pill.emoji} **${pill.name}** — ${effectText(pill)}\n` +
      `   🧪 ${costText(recipe)} · 🎯 TL thành: **${rate}%**`;
  });

  const e = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('💊 Luyện Đan Phòng')
    .setDescription(
      'Đốt lò luyện nguyên liệu Bí Cảnh thành đan dược.\n' +
      '⚠️ Luyện đan có rủi ro — **thất bại vẫn mất nguyên liệu & linh thạch**.\n\n' +
      (recipeLines.join('\n') || '*(Chưa có đan phương nào mở ở cảnh giới này.)*'),
    )
    .addFields(
      { name: '🎒 Túi nguyên liệu', value: bagLine(matBag, bicanh.materialInfo) || '*(trống — đi `/bicanh` gom nguyên liệu)*' },
      { name: '💊 Túi đan dược', value: bagLine(pillBag, alchemy.pillInfo) || '*(chưa có đan nào)*' },
    )
    .setFooter({ text: 'Đan độ kiếp tự dùng khi /dotpha vượt cảnh giới. Đan tu vi chọn để uống.' });

  const rows = [];
  // Select LUYỆN đan.
  if (recipes.length) {
    const craftMenu = new StringSelectMenuBuilder()
      .setCustomId('luyendan:craft')
      .setPlaceholder('🔥 Chọn đan phương để luyện…')
      .addOptions(recipes.map(({ id, pill, recipe }) => ({
        label: `${pill.name}`.slice(0, 100),
        emoji: pill.emoji,
        description: `${costText(recipe)} · ${effectText(pill)}`.slice(0, 100),
        value: id,
      })));
    rows.push(new ActionRowBuilder().addComponents(craftMenu));
  }
  // Select UỐNG đan tu vi đang có.
  const usable = Object.entries(pillBag)
    .filter(([id, q]) => q > 0 && alchemy.pillInfo(id)?.kind === 'tuvi');
  if (usable.length) {
    const useMenu = new StringSelectMenuBuilder()
      .setCustomId('luyendan:use')
      .setPlaceholder('🍶 Uống đan tu vi…')
      .addOptions(usable.map(([id, q]) => {
        const pill = alchemy.pillInfo(id);
        return { label: `${pill.name} ×${q}`.slice(0, 100), emoji: pill.emoji, description: effectText(pill).slice(0, 100), value: id };
      }));
    rows.push(new ActionRowBuilder().addComponents(useMenu));
  }
  return { embeds: [e], components: rows };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('luyendan')
    .setDescription('Luyện đan từ nguyên liệu Bí Cảnh — đan trợ tu & cứu mạng độ kiếp (mở ở Kim Đan).'),

  async execute(interaction) {
    const player = await requireUnlocked(interaction);
    if (!player) return;
    return interaction.reply({ ...alchemyView(player), flags: MessageFlags.Ephemeral });
  },

  buttons: {
    // Panel Tu Luyện: nút 💊 Luyện đan — mở lò (kiểm cảnh giới Kim Đan).
    async panel_luyendan(interaction) {
      const p = db.getPlayer(interaction.user.id);
      if (!p) {
        return interaction.reply({ content: 'Đạo hữu chưa nhập đạo! Tới kênh **Sơ Nhập** bấm "Nhập đạo" đã.', flags: MessageFlags.Ephemeral });
      }
      const needRealm = 3; // Kim Đan
      if (p.realm < needRealm) {
        const r = cult.REALMS[needRealm];
        return interaction.reply({
          content: `🔒 **💊 Luyện Đan** mở ở **${r.emoji} ${r.name}**. Hiện đạo hữu đang **${cult.realmLabel(p.realm, p.tier)}** — tu luyện thêm nhé!`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return interaction.reply({ ...alchemyView(p), flags: MessageFlags.Ephemeral });
    },

    async luyendan(interaction) {
      const action = interaction.customId.split(':')[1];
      const userId = interaction.user.id;

      // --- LUYỆN 1 mẻ đan ---
      if (action === 'craft') {
        const pillId = interaction.values[0];
        const res = db.craftPill(userId, pillId);
        if (res.err) {
          const msg = {
            invalid: 'Đan phương không hợp lệ.',
            locked: 'Cảnh giới chưa đủ để luyện đan này.',
            nomats: '🧪 Thiếu nguyên liệu! Vào `/bicanh` gom thêm đã.',
            nostones: `${stone} Không đủ linh thạch (cần ${res.cost}${config.currency.short}) để nhóm lò.`,
          }[res.err] || 'Không luyện được đan này.';
          return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        if (res.success) db.addDailyProgress(userId, 'craft', 1);
        const pill = alchemy.pillInfo(res.pillId);
        // Vọng Âm Đài: luyện thành THẦN ĐAN cấp cao (tier >= 4) = kỳ tích.
        if (res.success && pill && pill.tier >= 4) {
          announce(interaction.client, new EmbedBuilder()
            .setColor(config.colors.gold)
            .setTitle('💊 Thần Đan Xuất Thế!')
            .setDescription(`**${interaction.user.username}** vừa luyện thành **${pill.emoji} ${pill.name}** — thần đan kinh thế, hương đan ngát trời!`));
        }
        const player = db.getPlayer(userId);
        await interaction.update(alchemyView(player));
        const note = res.success
          ? `✅ **Đan thành!** Thu được ${pill.emoji} **${pill.name}** ×${res.yield}. 🎉`
          : `💥 **Luyện thất bại!** Đan dược nổ tan, nguyên liệu hóa tro. (TL thành ${Math.round(res.rate * 100)}%) Thử lại nhé.`;
        return interaction.followUp({ content: note, flags: MessageFlags.Ephemeral });
      }

      // --- UỐNG đan tu vi ---
      if (action === 'use') {
        const pillId = interaction.values[0];
        const res = db.useTuViPill(userId, pillId);
        if (res.err) {
          const msg = {
            invalid: 'Đan này không uống trực tiếp được.',
            none: 'Đạo hữu không còn đan này trong túi.',
            maxed: '🪙 Đã viên mãn đại đạo — uống đan tu vi cũng vô ích.',
          }[res.err] || 'Không dùng được đan này.';
          return interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
        }
        const pill = alchemy.pillInfo(pillId);
        const player = db.getPlayer(userId);
        await interaction.update(alchemyView(player));
        return interaction.followUp({ content: `🍶 Uống ${pill.emoji} **${pill.name}** — tu vi **+${res.amount}**! 🌀`, flags: MessageFlags.Ephemeral });
      }
    },
  },
};
