// =====================================================================
//  COACH — THÔNG BÁO RIÊNG (DM) dẫn dắt người chơi theo tiến trình:
//    • Lên CẢNH GIỚI mới (độ kiếp thành công) -> mừng + tính năng vừa mở
//      + gợi ý "cảnh giới kế mở khóa gì".
//    • Đủ tu vi để ĐỘT PHÁ (sau tu luyện / bế quan đạt mốc) -> nhắc 1 lần.
//
//  Thuần + an toàn: gửi DM bọc try/catch (người chơi tắt DM cũng không sao).
//  KHÔNG đụng DB ở đây — caller tự lo dedup (notified_stage) để module nhẹ.
// =====================================================================
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const cult = require('../cultivation');
const features = require('../features');

// Cảnh giới KẾ có tính năng mới: { realm, features:[...] } | null.
function nextFeatureRealm(curRealm) {
  let best = null;
  for (const f of features.FEATURES) {
    if (f.realm > curRealm && (best === null || f.realm < best)) best = f.realm;
  }
  if (best === null) return null;
  return { realm: best, features: features.FEATURES.filter((f) => f.realm === best) };
}

// Gợi ý 1 dòng "cảnh giới kế mở khóa gì" (rỗng nếu đã mở hết).
function nextUnlockHint(curRealm) {
  const nx = nextFeatureRealm(curRealm);
  if (!nx) return '';
  const list = nx.features.map((f) => `${f.emoji} ${f.name}`).join(' · ');
  return `🔭 **Sắp mở khóa — ${features.realmName(nx.realm)}:**\n${list}`;
}

// DM an toàn (nuốt lỗi nếu người chơi chặn DM). Trả true/false.
async function dm(user, payload) {
  if (!user) return false;
  try { await user.send(payload); return true; } catch (_) { return false; }
}

// Embed mừng LÊN CẢNH GIỚI + tính năng vừa mở + gợi ý kế tiếp.
function realmUpEmbed(username, oldRealm, newRealm) {
  const opened = features.newlyUnlocked(oldRealm, newRealm);
  const lines = [`🎉 **${username}** vừa đột phá lên **${features.realmName(newRealm)}**!`];
  if (opened.length) {
    lines.push('', '🗝️ **Tính năng vừa mở khóa:**');
    for (const f of opened) lines.push(`${f.emoji} **${f.name}** — \`/${f.commands[0]}\`  ·  ${f.desc}`);
  }
  const hint = nextUnlockHint(newRealm);
  if (hint) lines.push('', hint);
  lines.push('', '💡 *Tu luyện · bế quan để tích tu vi, đủ rồi thì `/dotpha` đột phá tiếp.*');
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('📈 Tu Vi Tăng Tiến — Cảnh Giới Mới!')
    .setDescription(lines.join('\n'));
}

// Embed nhắc "đủ tu vi để đột phá" (sau tu luyện/bế quan đạt mốc).
function readyEmbed(username, player) {
  const need = cult.tuViNeeded(player.realm, player.tier);
  const next = cult.nextStage(player.realm, player.tier);
  const major = next && next.isMajor;
  const lines = [
    `**${username}**, đạo hữu đã **tích đủ tu vi** để đột phá!`,
    `**${cult.realmLabel(player.realm, player.tier)}** → **${cult.realmLabel(next.realm, next.tier)}** (cần ${need} tu vi).`,
    '',
    major
      ? '🌩️ Đây là **VƯỢT CẢNH GIỚI = ĐỘ KIẾP** — nhớ chuẩn bị đan Hộ Đạo trước khi `/dotpha`.'
      : '✨ Lên **tầng nhỏ** — luôn thành công. Mở **Đột Phá Đường** hoặc gõ `/dotpha`.',
  ];
  return new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle('⚡ Đã Đủ Tu Vi — Có Thể Đột Phá!')
    .setDescription(lines.join('\n'));
}

// Tiện ích cho caller (tu luyện / bế quan): nếu đủ tu vi & CHƯA nhắc bậc này -> DM + đánh dấu.
//  db truyền vào để tránh require vòng. Trả true nếu đã gửi.
async function maybeNotifyReady(db, user, player) {
  if (!player || cult.isMaxed(player.realm, player.tier)) return false;
  const need = cult.tuViNeeded(player.realm, player.tier);
  if (player.tu_vi < need) return false;
  const gstage = cult.globalStage(player.realm, player.tier);
  if (gstage <= (player.notified_stage ?? -1)) return false; // đã nhắc bậc này rồi
  db.setNotifiedStage(player.discord_id, gstage);
  return dm(user, { embeds: [readyEmbed(player.username, player)] });
}

module.exports = { dm, nextUnlockHint, realmUpEmbed, readyEmbed, maybeNotifyReady };
