// =====================================================================
//  Đăng ký lệnh gạch chéo (slash commands) lên server.
//  Chạy mỗi khi thêm/sửa lệnh:  npm run deploy
// =====================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`⏳ Đang đăng ký ${commands.length} lệnh lên server...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Xong! Vào server gõ "/" là thấy lệnh.');
  } catch (err) {
    console.error(err);
  }
})();
