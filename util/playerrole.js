// =====================================================================
//  ROLE NGƯỜI CHƠI — cấp khi nhập đạo lần đầu (để @nhận thông báo game).
//  Ưu tiên config.playerRoleId (.env PLAYER_ROLE_ID). Nếu rỗng -> TÌM role theo
//  tên config.playerRoleName, không có thì TỰ TẠO (cần bot có quyền Manage Roles).
//  Mọi lỗi đều nuốt êm — KHÔNG được chặn việc đăng ký người chơi.
// =====================================================================
const config = require('../config');

// Lấy (hoặc tạo) role người chơi cho 1 guild. Trả role | null.
async function getPlayerRole(guild) {
  if (!guild || !guild.roles) return null;
  // 1) Theo ID cấu hình sẵn.
  if (config.playerRoleId) {
    const r = guild.roles.cache.get(config.playerRoleId)
      || await guild.roles.fetch(config.playerRoleId).catch(() => null);
    if (r) return r;
  }
  // 2) Tìm theo tên.
  const name = config.playerRoleName || 'Đạo Hữu';
  const found = guild.roles.cache.find((r) => r.name === name);
  if (found) return found;
  // 3) Tự tạo (cần quyền Manage Roles).
  try {
    return await guild.roles.create({
      name,
      mentionable: true,
      reason: 'Role người chơi Tiên Đồ Lộ (nhận thông báo game)',
    });
  } catch (_) {
    return null;
  }
}

// Gán role người chơi cho người vừa nhập đạo (qua interaction). Trả true nếu gán được.
async function assignPlayerRole(interaction) {
  try {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member || !member.roles || typeof member.roles.add !== 'function') return false;
    const role = await getPlayerRole(guild);
    if (!role) return false;
    if (member.roles.cache && member.roles.cache.has(role.id)) return true;
    await member.roles.add(role).catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { getPlayerRole, assignPlayerRole };
