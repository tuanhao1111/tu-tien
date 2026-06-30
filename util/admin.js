// =====================================================================
//  Helper QUYỀN QUẢN TRỊ (dùng chung cho /setup và /quantri).
//  Cho phép khi: có role config.adminRoleId, HOẶC có quyền Manage Guild.
// =====================================================================
const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

function isAdmin(interaction) {
  const roleId = config.adminRoleId;
  if (roleId && interaction.member && interaction.member.roles && interaction.member.roles.cache && interaction.member.roles.cache.has(roleId)) {
    return true;
  }
  return !!(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
}

module.exports = { isAdmin };
