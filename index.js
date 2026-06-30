// =====================================================================
//  TIÊN ĐỒ LỘ — Bot game tu tiên Discord (MVP)
//  Core loop: tu vi -> đột phá cảnh giới -> mạnh hơn -> lặp lại.
// =====================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  MessageFlags,
} = require('discord.js');

const db = require('./database');
const config = require('./config');
const cult = require('./cultivation');
const quests = require('./quests'); // dùng chung dayKey (reset trần voice theo ngày VN)
const livepanels = require('./util/livepanels'); // panel chung auto-cập nhật + sticky (GĐ16)
const channelroles = require('./util/channelroles'); // role mở khóa kênh theo cảnh giới (GĐ23)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,    // nghe tin nhắn để cộng ngộ tính
    GatewayIntentBits.GuildVoiceStates, // theo dõi ai đang ngồi voice để tu luyện
  ],
});

// --- Nạp toàn bộ lệnh trong thư mục commands/ ---
client.commands = new Collection();
client.buttons = new Collection(); // tiền-tố custom_id -> handler (dành cho nút bấm sau này)
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsDir, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
  if (command.buttons) {
    for (const [key, handler] of Object.entries(command.buttons)) {
      client.buttons.set(key, handler);
    }
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Đã đăng nhập: ${c.user.tag}. Tiên Đồ Lộ khai mở!`);
  c.user.setActivity('tu luyện thành tiên 🧘');
  // Làm nóng engine ảnh động (Satori) để lần render thẻ đầu tiên không bị trễ.
  require('./util/card').warmup().then(() => console.log('🎨 Engine ảnh động sẵn sàng.'));
});

// --- Lệnh gạch chéo + nút bấm ---
client.on(Events.InteractionCreate, async (interaction) => {
  // Lazy-sync role mở kênh theo cảnh giới (bù cho người chơi cũ đã ở cảnh giới cao). Fire-and-forget.
  if (channelroles.enabled() && interaction.member && (interaction.isChatInputCommand() || interaction.isButton())) {
    const lp = db.getPlayer(interaction.user.id);
    if (lp) channelroles.maybeSync(interaction, lp).catch(() => {});
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    // Khóa lệnh theo kênh: chỉ chặn khi kênh đích ĐÃ cấu hình (rỗng -> bỏ qua).
    const gateKey = config.commandChannels[interaction.commandName];
    const gateId = gateKey && config.channels[gateKey];
    if (gateId && interaction.channelId !== gateId) {
      return interaction.reply({
        content: `🚫 Lệnh \`/${interaction.commandName}\` chỉ dùng được ở kênh <#${gateId}>. Qua đó dùng nhé!`,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: '😵 Đạo pháp trục trặc rồi, thử lại sau nhé.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isUserSelectMenu() || interaction.isModalSubmit()) {
    const key = interaction.customId.split(':')[0];
    const handler = client.buttons.get(key);
    if (!handler) return;
    try {
      await handler(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: '😵 Nút này trục trặc rồi, thử lại sau nhé.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  }
});

// --- NGỘ TÍNH khi chat: người đã nhập đạo, chat thì tích chút tu vi (có cooldown) ---
client.on(Events.MessageCreate, (message) => {
  if (message.author.bot || !message.guild) return;
  // STICKY: panel chung + tin TỔ ĐỘI đang hoạt động tự nổi xuống đáy (nuốt lỗi).
  try { livepanels.onMessage(message); } catch (_) {}
  try { require('./commands/toduoi').onChannelMessage(message); } catch (_) {}
  const p = db.getPlayer(message.author.id);
  if (!p) return; // chưa /batdau thì bỏ qua

  // Tiến độ cốt truyện "chat" — đếm MỌI tin (không dính cooldown).
  db.addStoryProgress(message.author.id, 'chat', 1);
  db.addDailyProgress(message.author.id, 'chat', 1); // tiến độ nhiệm vụ ngày "luận đạo"

  if (cult.isMaxed(p.realm, p.tier)) return; // viên mãn rồi thì thôi

  const now = Date.now();
  if (now - p.last_insight < config.insight.cooldownMs) return;

  if (p.username !== message.author.username) {
    db.touchUsername(message.author.id, message.author.username);
  }

  const { min, max } = config.insight;
  const gain = Math.floor(Math.random() * (max - min + 1)) + min;
  db.addInsight(message.author.id, gain, now);
});

// --- TU LUYỆN QUA VOICE: mỗi phút quét các kênh thoại, cộng tu vi cho người ngồi voice ---
//  CHỈ tính cho người đã BẬT chế độ Voice ở /tuluyen (cultivate_mode='voice').
//  Điều kiện (config.voice): cần >= minCompany người THẬT cùng kênh (khuyến khích
//  tu luyện cộng đồng, chống AFK 1 mình), bỏ qua kênh AFK, có trần phút/ngày.
//  Trần ngày BỀN trong DB (voice_day/voice_used) -> restart KHÔNG reset trần (chống lách).
function creditVoiceTick() {
  const v = config.voice;
  if (!v || !v.enabled) return;
  const factor = (v.tickMs || 60000) / 60000; // số "phút" mỗi tick
  const cap = v.dailyCapMinutes || Infinity;
  const today = quests.dayKey();
  for (const guild of client.guilds.cache.values()) {
    const afkId = guild.afkChannelId;
    for (const channel of guild.channels.cache.values()) {
      if (typeof channel.isVoiceBased !== 'function' || !channel.isVoiceBased()) continue;
      if (afkId && channel.id === afkId) continue;
      const humans = channel.members.filter((m) => !m.user.bot);
      if (humans.size < (v.minCompany || 1)) continue;
      for (const member of humans.values()) {
        const p = db.getPlayer(member.id);
        if (!p || cult.isMaxed(p.realm, p.tier)) continue;
        if (p.cultivate_mode !== 'voice') continue; // chỉ tính khi đã BẬT chế độ Voice ở /tuluyen
        const minutes = db.bumpVoiceMinutes(member.id, today, factor, cap); // trần ngày bền trong DB
        const gain = Math.round((v.ratePerMin || 0) * minutes);
        if (gain > 0) db.addTuVi(member.id, gain);
      }
    }
  }
}

let _voiceTimer = null;
if (config.voice && config.voice.enabled) {
  _voiceTimer = setInterval(creditVoiceTick, config.voice.tickMs || 60000);
  if (typeof _voiceTimer.unref === 'function') _voiceTimer.unref();
}

// --- PANEL CHUNG cập nhật thời gian thực: tự edit boss/BXH/đấu pháp định kỳ ---
let _liveTimer = null;
if (config.ui && config.ui.liveRefreshMs) {
  _liveTimer = setInterval(() => { livepanels.tick(client).catch(() => {}); }, config.ui.liveRefreshMs);
  if (typeof _liveTimer.unref === 'function') _liveTimer.unref();
}

// --- BOSS THẾ GIỚI: quét định kỳ -> spawn boss mới khi tới hạn (loan Vọng Âm Đài) ---
let _bossTimer = null;
if (config.worldboss && config.worldboss.enabled) {
  const boss = require('./commands/boss');
  const tick = () => { try { boss.maybeSpawn(client); } catch (e) { console.error('worldboss tick:', e); } };
  client.once(Events.ClientReady, tick); // thử spawn ngay khi sẵn sàng
  _bossTimer = setInterval(tick, config.worldboss.tickMs || 300000);
  if (typeof _bossTimer.unref === 'function') _bossTimer.unref();
}

client.login(process.env.DISCORD_TOKEN);

// --- AN TOÀN DỮ LIỆU khi tắt/restart ---
const WAL_CHECKPOINT_MS = 5 * 60 * 1000;
const _walTimer = setInterval(() => db.checkpoint(), WAL_CHECKPOINT_MS);
if (typeof _walTimer.unref === 'function') _walTimer.unref();

let _shuttingDown = false;
function gracefulExit(signal) {
  if (_shuttingDown) return;
  _shuttingDown = true;
  console.log(`\n🛑 Nhận ${signal} — đang lưu dữ liệu + đóng động phủ...`);
  clearInterval(_walTimer);
  if (_voiceTimer) clearInterval(_voiceTimer);
  if (_bossTimer) clearInterval(_bossTimer);
  if (_liveTimer) clearInterval(_liveTimer);
  try { client.destroy(); } catch (_) {}
  db.shutdown();
  console.log('✅ Đã lưu xong. Hẹn gặp lại trên Tiên Đồ Lộ!');
  process.exit(0);
}
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => gracefulExit(sig));
