// =====================================================================
//  BỘ DỰNG UI DÙNG CHUNG (thuần — chỉ phụ thuộc discord.js + config)
//  Mục tiêu ĐẠI TU UI/UX: mọi panel/view dùng CHUNG 1 ngôn ngữ hình ảnh
//  -> nhất quán màu/emoji/bố cục, gọn gàng, dễ nhìn, không rối mắt.
//
//  Quy ước:
//   - Mỗi KÊNH một sắc màu riêng (config.colors.chan[key]).
//   - Thanh tiến trình & thanh máu dùng cùng kí tự khối.
//   - Nút bấm dựng qua factory để đồng nhất style.
// =====================================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('./../config');

const STYLES = { primary: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, success: ButtonStyle.Success, danger: ButtonStyle.Danger };

// Màu chủ đạo của 1 kênh (fallback primary).
function chanColor(key) {
  return (config.colors.chan && config.colors.chan[key]) || config.colors.primary;
}

// Thanh khối tô (▰ đầy / ▱ rỗng). len mặc định 14.
function bar(cur, max, len = 14) {
  if (!max || max <= 0) return '▱'.repeat(len);
  const f = Math.max(0, Math.min(len, Math.round((cur / max) * len)));
  return '▰'.repeat(f) + '▱'.repeat(len - f);
}

// Dòng thanh có nhãn: "❤️ Sinh Mệnh ▰▰▰▱▱ 60/100".
function barLine(emoji, label, cur, max, len = 14) {
  return `${emoji} **${label}** \`${bar(cur, max, len)}\` ${Math.max(0, Math.round(cur))}/${Math.round(max)}`;
}

// Embed panel chuẩn của 1 kênh: tiêu đề + mô tả + footer + màu kênh.
function panelEmbed(channelKey, { title, desc, footer, fields } = {}) {
  const e = new EmbedBuilder().setColor(chanColor(channelKey));
  if (title) e.setTitle(title);
  if (desc) e.setDescription(desc);
  if (fields && fields.length) e.addFields(fields);
  if (footer) e.setFooter({ text: footer });
  return e;
}

// Embed view (ẩn) chuẩn — như panelEmbed nhưng tách tên cho rõ ý đồ.
function view(channelKey, opts) { return panelEmbed(channelKey, opts); }

// Factory 1 nút.
function btn(id, label, style = 'primary', opts = {}) {
  const b = new ButtonBuilder().setCustomId(id).setLabel(String(label).slice(0, 78)).setStyle(STYLES[style] || ButtonStyle.Secondary);
  if (opts.emoji) b.setEmoji(opts.emoji);
  if (opts.disabled) b.setDisabled(true);
  return b;
}

// Gộp danh sách nút thành các hàng (tối đa 5 nút/hàng, 5 hàng).
function rows(buttons) {
  const out = [];
  for (let i = 0; i < buttons.length; i += 5) {
    out.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
  }
  return out.slice(0, 5);
}
// 1 hàng nút tiện lợi.
function row(...buttons) { return new ActionRowBuilder().addComponents(buttons.filter(Boolean)); }

// Menu chọn (select).
function select(id, placeholder, options) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options.slice(0, 25)),
  );
}

// --- Định dạng số/thời gian ---
function num(n) { return Math.round(n).toLocaleString('vi-VN'); }

// Khoảng thời gian người-đọc: "2h 5p" / "45s".
function dur(ms) {
  if (ms <= 0) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60 ? ' ' + (m % 60) + 'p' : ''}`;
  return `${m}p${s % 60 ? ' ' + (s % 60) + 's' : ''}`;
}

// Cooldown còn lại từ mốc bắt đầu: dùng cho nút "⏳ còn …".
function cdLeft(startTs, cdMs, now = Date.now()) {
  return Math.max(0, startTs + cdMs - now);
}

// Khối chỉ số chiến đấu chuẩn (dùng ở Hồ Sơ + nơi khác).
function statBlock(c) {
  return (
    `❤️ Sinh Lực **${num(c.maxHp)}** · ⚔️ Công **${num(c.base.atk)}** · 🛡️ Phòng **${num(c.base.def)}**\n` +
    `🌀 Tốc **${num(c.base.spd)}** · 💠 Linh Lực **${num(c.maxMp)}** · 💥 Bạo **${Math.round(c.crit * 100)}%** · 💨 Né **${Math.round(c.dodge * 100)}%**`
  );
}

module.exports = {
  STYLES, chanColor, bar, barLine, panelEmbed, view, btn, rows, row, select, num, dur, cdLeft, statBlock,
};
