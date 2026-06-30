// =====================================================================
//  BOSS THẾ GIỚI (thuần — catalog + công thức, KHÔNG đụng DB/combat)
//  Boss CHUNG toàn server: HP khổng lồ bền trong DB, mọi người công phạt góp
//  sát thương; hạ gục -> chia thưởng theo % đóng góp + rớt trang bị.
//
//  worldboss.js chỉ giữ DỮ LIỆU boss + CÔNG THỨC (HP/thưởng/chia phần). Việc
//  đo sát thương 1 đòn công phạt do lệnh thực hiện (dùng combat engine) rồi trừ
//  vào HP chung (atomic ở DB). Spawn/định tuyến do index.js + commands/boss.js.
// =====================================================================
const config = require('./config');
const cult = require('./cultivation');

const WB = () => config.worldboss || {};

// --- Catalog boss (sức mạnh & thưởng tăng dần; chọn xoay vòng theo lượt spawn) ---
//  realm/tier: dùng để dựng combatant boss (def/tốc cho công thức sát thương).
//  hpMult/rewardMult: nhân HP & quỹ thưởng. color/emoji/lore cho UI + loan báo.
const BOSSES = [
  { key: 'huyet_lang',  name: 'Huyết Lang Vương',   emoji: '🐺', realm: 4, tier: 3, hpMult: 1.0, rewardMult: 1.0, color: 0xc0392b,
    lore: 'Yêu lang ngàn năm khát máu, lông đỏ như lửa, một tiếng hú khiến vạn thú quỳ rạp.' },
  { key: 'thiet_giap',  name: 'Thiết Giáp Huyền Quy', emoji: '🐢', realm: 4, tier: 7, hpMult: 1.6, rewardMult: 1.2, color: 0x16a085,
    lore: 'Linh quy mai cứng hơn thần thiết, ngủ vùi dưới vực sâu, thức giấc là địa chấn.' },
  { key: 'cuu_u',       name: 'Cửu U Ma Giao',      emoji: '🐍', realm: 5, tier: 4, hpMult: 2.0, rewardMult: 1.5, color: 0x8e44ad,
    lore: 'Giao long từ cửu u địa ngục, thân quấn chín tầng âm khí, nuốt cả nhật nguyệt.' },
  { key: 'kim_si',      name: 'Kim Sí Đại Bằng',    emoji: '🦅', realm: 6, tier: 3, hpMult: 2.6, rewardMult: 1.9, color: 0xf39c12,
    lore: 'Đại bằng cánh vàng che kín trời, một cú vỗ cánh cuốn bay cả tòa linh sơn.' },
  { key: 'hon_don',     name: 'Hỗn Độn Cổ Thần',    emoji: '🌑', realm: 7, tier: 5, hpMult: 3.4, rewardMult: 2.6, color: 0x2c3e50,
    lore: 'Tàn hồn cổ thần thời hồng hoang, thân thể là hư không, ánh mắt nuốt chửng đạo lý.' },
];
const BOSS_BY = Object.fromEntries(BOSSES.map((b) => [b.key, b]));
function bossInfo(key) { return BOSS_BY[key] || null; }
// Chọn boss theo số thứ tự lần spawn (xoay vòng).
function bossForSpawn(n) { return BOSSES[((n % BOSSES.length) + BOSSES.length) % BOSSES.length]; }

// Bậc toàn cục của boss (cho công thức HP/thưởng).
function bossStage(boss) { return cult.globalStage(boss.realm, boss.tier); }

// HP tối đa của 1 boss.
function maxHp(boss) {
  const s = bossStage(boss);
  return Math.round(((WB().hpBase || 0) + (WB().hpPerStage || 0) * s) * (boss.hpMult || 1));
}

// Quỹ thưởng tổng (chia theo % đóng góp). Trả { stones, tuVi }.
function rewardPool(boss) {
  const s = bossStage(boss);
  const stones = Math.round(((WB().rewardStoneBase || 0) + (WB().rewardStonePerStage || 0) * s) * (boss.rewardMult || 1));
  const tuVi = Math.round((WB().rewardTuViPctNeed || 0) * cult.tuViNeeded(boss.realm, boss.tier) * (boss.rewardMult || 1));
  return { stones, tuVi };
}

// Phần thưởng của 1 người theo sát thương đóng góp.
//  isTop: top-1 nhận thêm topShareBonus. Trả { stones, tuVi, share }.
function shareFor(damage, totalDamage, pool, isTop = false) {
  const share = totalDamage > 0 ? damage / totalDamage : 0;
  const mult = 1 + (isTop ? (WB().topShareBonus || 0) : 0);
  return {
    share,
    stones: Math.round(pool.stones * share * mult),
    tuVi: Math.round(pool.tuVi * share * mult),
  };
}

// Boss còn hiệu lực? GĐ17: nếu lifetimeMs=0 thì KHÔNG hết hạn -> chỉ chết khi bị giết.
function isActive(row, now = Date.now()) {
  if (!row || row.dead || row.hp <= 0) return false;
  const life = WB().lifetimeMs || 0;
  if (life > 0 && row.expire_ts && row.expire_ts <= now) return false; // chỉ kiểm hạn khi bật lifetime
  return true;
}
// Đã tới lúc spawn boss mới? (không có boss sống + qua respawn kể từ lần chết gần nhất)
function shouldSpawn(row, now = Date.now()) {
  if (isActive(row, now)) return false;
  if (!row) return true;
  const since = row.died_ts || row.born_ts || 0;
  return now - since >= (WB().respawnMs || 0);
}

module.exports = {
  BOSSES, bossInfo, bossForSpawn, bossStage, maxHp, rewardPool, shareFor, isActive, shouldSpawn,
};
