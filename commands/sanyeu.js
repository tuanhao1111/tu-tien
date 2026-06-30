// =====================================================================
//  /sanyeu — BÃI SĂN YÊU (mở ở 🌬️ Luyện Khí · chưa cần môn phái).
//  Đánh nhanh 1 yêu hoang/lượt kiếm linh thạch + tu vi (+ cơ hội kỳ ngộ).
//  Toàn bộ logic (view, trận, thưởng, cooldown) tái dùng từ commands/luyentruong.js
//  -> lệnh này chỉ là cửa vào tiện lợi; nút bấm vẫn do luyentruong xử lý.
// =====================================================================
const { SlashCommandBuilder } = require('discord.js');
const { openSanYeu } = require('./luyentruong');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sanyeu')
    .setDescription('Săn Yêu — săn yêu hoang kiếm linh thạch + tu vi (mở ở Luyện Khí, chưa cần môn phái).'),
  async execute(interaction) { return openSanYeu(interaction); },
};
