// =====================================================================
//  ROLE MỞ KHÓA KÊNH theo CẢNH GIỚI (GĐ23)
//  Đạt cảnh giới mốc -> bot cấp role tương ứng -> role đó cho người chơi
//  THẤY các kênh vừa mở khóa. Cấu hình ở config.channelRoles.
//
//  • getOrCreateRole : tìm/tạo role theo tên (cần bot có Manage Roles).
//  • grantUpTo(member, realm) : cấp mọi role có realm <= cảnh giới hiện tại
//    (chỉ thêm role còn THIẾU — rẻ, idempotent). Gọi lúc đăng ký, đột phá,
//    và lazy-sync khi người chơi tương tác (bù cho người chơi cũ).
//  • applyChannelPermissions(client) : /setup đặt quyền ẩn @everyone + mở
//    cho role ở từng kênh (chỉ khi autoPermissions bật).
//
//  Mọi lỗi NUỐT ÊM — không bao giờ chặn đăng ký/đột phá/đặt panel.
// =====================================================================
const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const CR = () => config.channelRoles || {};
function enabled() { return !!CR().enabled; }
function thresholds() { return CR().thresholds || []; }

// Tìm role theo tên (cache trước, rồi fetch toàn bộ để chắc).
async function findRole(guild, name) {
  if (!guild || !guild.roles) return null;
  const cached = guild.roles.cache.find((r) => r.name === name);
  if (cached) return cached;
  const all = await guild.roles.fetch().catch(() => null);
  return all ? all.find((r) => r.name === name) || null : null;
}

// Tìm hoặc TẠO role (cần Manage Roles). Trả role | null.
async function getOrCreateRole(guild, name) {
  const existing = await findRole(guild, name);
  if (existing) return existing;
  try {
    return await guild.roles.create({
      name, mentionable: false, hoist: false,
      reason: 'Tiên Đồ Lộ — role mở khóa kênh theo cảnh giới',
    });
  } catch (_) { return null; }
}

// Cấp cho member mọi role có realm <= cảnh giới hiện tại (chỉ thêm cái thiếu).
async function grantUpTo(member, realm) {
  if (!enabled() || !member || !member.guild || !member.roles) return;
  const guild = member.guild;
  for (const t of thresholds()) {
    if ((realm || 0) < t.realm) continue;
    try {
      const role = await getOrCreateRole(guild, t.name);
      if (!role) continue;
      if (member.roles.cache && member.roles.cache.has(role.id)) continue;
      await member.roles.add(role).catch(() => {});
    } catch (_) { /* nuốt lỗi */ }
  }
}

// Lazy-sync khi người chơi tương tác (bù cho người đã ở cảnh giới cao trước khi có hệ role).
async function maybeSync(interaction, player) {
  if (!enabled() || !interaction || !interaction.member || !player) return;
  try { await grantUpTo(interaction.member, player.realm || 0); } catch (_) {}
}

// Tìm guild đang dùng (từ kênh cấu hình đầu tiên, rồi fallback guild đầu tiên).
async function resolveGuild(client) {
  for (const t of thresholds()) {
    for (const key of t.channelKeys || []) {
      const chId = config.channels[key];
      if (!chId) continue;
      const ch = await client.channels.fetch(chId).catch(() => null);
      if (ch && ch.guild) return ch.guild;
    }
  }
  return (client.guilds && client.guilds.cache.first()) || null;
}

// /setup: tạo role + đặt quyền kênh (ẩn @everyone, mở cho role). Trả mảng dòng kết quả.
async function applyChannelPermissions(client) {
  const out = [];
  if (!enabled()) return out;
  if (!CR().autoPermissions) {
    out.push('ℹ️ Role kênh: `autoPermissions` TẮT — bot chỉ cấp role, bạn tự đặt quyền kênh.');
    return out;
  }
  const guild = await resolveGuild(client);
  if (!guild) { out.push('⚠️ Role kênh: không tìm thấy guild để đặt quyền.'); return out; }

  // Kiểm tra quyền bot TRƯỚC — nguyên nhân #1 khiến kênh không ẩn/role không cấp được.
  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (me) {
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) out.push('❗ Bot **thiếu quyền Manage Channels** — KHÔNG ẩn/hiện kênh được. Hãy cấp quyền rồi chạy lại `/setup`.');
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) out.push('❗ Bot **thiếu quyền Manage Roles** — KHÔNG tạo/cấp role được. Hãy cấp quyền rồi chạy lại `/setup`.');
  }

  for (const t of thresholds()) {
    const role = await getOrCreateRole(guild, t.name);
    if (!role) { out.push(`⚠️ Role kênh: không tạo được role **${t.name}** (thiếu quyền Manage Roles?).`); continue; }
    // Role bot phải nằm TRÊN role game thì bot mới cấp được role đó cho người chơi.
    if (me && me.roles.highest && me.roles.highest.comparePositionTo(role) <= 0) {
      out.push(`❗ Role **${t.name}** đang nằm TRÊN role của bot → bot KHÔNG cấp được. Vào Server Settings → Roles, kéo role bot lên trên các role game.`);
    }
    for (const key of t.channelKeys || []) {
      const chId = config.channels[key];
      if (!chId) continue; // kênh chưa cấu hình -> bỏ qua
      const ch = await client.channels.fetch(chId).catch(() => null);
      if (!ch || !ch.permissionOverwrites) { out.push(`⚠️ Role kênh: không thấy kênh \`${key}\`.`); continue; }
      try {
        await ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
        await ch.permissionOverwrites.edit(role, { ViewChannel: true });
        if (client.user) await ch.permissionOverwrites.edit(client.user.id, { ViewChannel: true }).catch(() => {});
        out.push(`🔒 **${key}**: ẩn @everyone · mở cho **${t.name}**.`);
      } catch (e) {
        out.push(`⚠️ Role kênh \`${key}\`: không đặt được quyền (${(e && e.message) || e}).`);
      }
    }
  }

  // MỞ LẠI các kênh LUÔN công khai (gỡ lệnh ẩn @everyone nếu trước đó lỡ gate — vd shop).
  for (const key of CR().openChannels || []) {
    const chId = config.channels[key];
    if (!chId) continue;
    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.permissionOverwrites) continue;
    const ow = ch.permissionOverwrites.cache && ch.permissionOverwrites.cache.get(guild.roles.everyone.id);
    if (!ow) continue; // chưa từng đặt overwrite -> vốn đã mở, bỏ qua
    try {
      await ch.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null }); // trả về neutral -> hiện cho mọi người
      out.push(`🔓 **${key}**: mở lại cho mọi người (nguồn quan trọng).`);
    } catch (e) {
      out.push(`⚠️ Mở lại kênh \`${key}\`: không gỡ được lệnh ẩn (${(e && e.message) || e}).`);
    }
  }
  return out;
}

module.exports = { enabled, getOrCreateRole, grantUpTo, maybeSync, applyChannelPermissions };
